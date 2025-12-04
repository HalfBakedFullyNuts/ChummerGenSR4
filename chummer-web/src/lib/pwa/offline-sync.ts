/**
 * Offline Sync Module
 * ===================
 * Handles offline data persistence and synchronization.
 * Queues changes when offline and syncs when connection is restored.
 */

import { writable, derived, type Readable } from 'svelte/store';
import type { Character } from '$types';

/** Sync operation types. */
export type SyncOperation = 'create' | 'update' | 'delete';

/** Queued change entry. */
export interface QueuedChange {
	readonly id: string;
	readonly operation: SyncOperation;
	readonly collection: string;
	readonly documentId: string;
	readonly data: Record<string, unknown> | null;
	readonly timestamp: string;
	readonly retryCount: number;
}

/** Sync conflict. */
export interface SyncConflict {
	readonly id: string;
	readonly documentId: string;
	readonly collection: string;
	readonly localData: Record<string, unknown>;
	readonly remoteData: Record<string, unknown>;
	readonly localTimestamp: string;
	readonly remoteTimestamp: string;
}

/** Conflict resolution strategy. */
export type ConflictResolution = 'keep_local' | 'keep_remote' | 'merge';

/** Sync state. */
interface SyncState {
	readonly isOnline: boolean;
	readonly isSyncing: boolean;
	readonly pendingChanges: number;
	readonly conflicts: SyncConflict[];
	readonly lastSyncAt: string | null;
	readonly error: string | null;
}

/** Storage keys. */
const QUEUE_KEY = 'chummer-sync-queue';
const CONFLICTS_KEY = 'chummer-sync-conflicts';
const LAST_SYNC_KEY = 'chummer-last-sync';

/** Internal state. */
const syncState = writable<SyncState>({
	isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
	isSyncing: false,
	pendingChanges: 0,
	conflicts: [],
	lastSyncAt: null,
	error: null
});

/** Change queue. */
let changeQueue: QueuedChange[] = [];

/** Conflict list. */
let conflicts: SyncConflict[] = [];

/** Sync callback (set by Firebase integration). */
let syncCallback: ((change: QueuedChange) => Promise<boolean>) | null = null;

/** Conflict check callback. */
let conflictCheckCallback: ((change: QueuedChange) => Promise<SyncConflict | null>) | null = null;

/**
 * Initialize offline sync.
 * Call this in the root layout's onMount.
 */
export function initOfflineSync(): void {
	if (typeof window === 'undefined') return;

	/* Load persisted data */
	loadQueue();
	loadConflicts();
	loadLastSync();

	/* Update online status */
	syncState.update((s) => ({ ...s, isOnline: navigator.onLine }));

	/* Listen for online/offline events */
	window.addEventListener('online', handleOnline);
	window.addEventListener('offline', handleOffline);

	/* Attempt sync on init if online */
	if (navigator.onLine && changeQueue.length > 0) {
		processQueue();
	}
}

/**
 * Cleanup offline sync listeners.
 */
export function destroyOfflineSync(): void {
	if (typeof window === 'undefined') return;

	window.removeEventListener('online', handleOnline);
	window.removeEventListener('offline', handleOffline);
}

/**
 * Set the sync callback function.
 * This should be called by the Firebase integration to provide the actual sync logic.
 */
export function setSyncCallback(
	callback: (change: QueuedChange) => Promise<boolean>
): void {
	syncCallback = callback;
}

/**
 * Set the conflict check callback.
 */
export function setConflictCheckCallback(
	callback: (change: QueuedChange) => Promise<SyncConflict | null>
): void {
	conflictCheckCallback = callback;
}

/**
 * Queue a change for sync.
 */
export function queueChange(
	operation: SyncOperation,
	collection: string,
	documentId: string,
	data: Record<string, unknown> | null
): void {
	const change: QueuedChange = {
		id: crypto.randomUUID(),
		operation,
		collection,
		documentId,
		data,
		timestamp: new Date().toISOString(),
		retryCount: 0
	};

	/* Remove any existing changes for the same document */
	changeQueue = changeQueue.filter(
		(c) => !(c.collection === collection && c.documentId === documentId)
	);

	/* Add new change */
	changeQueue.push(change);
	saveQueue();
	updatePendingCount();

	/* Try to sync immediately if online */
	if (navigator.onLine) {
		processQueue();
	}
}

/**
 * Queue a character save.
 */
export function queueCharacterSave(character: Character): void {
	queueChange('update', 'characters', character.id, character as unknown as Record<string, unknown>);
}

/**
 * Queue a character delete.
 */
export function queueCharacterDelete(characterId: string): void {
	queueChange('delete', 'characters', characterId, null);
}

/**
 * Process the sync queue.
 */
async function processQueue(): Promise<void> {
	if (!syncCallback || changeQueue.length === 0) return;

	syncState.update((s) => ({ ...s, isSyncing: true, error: null }));

	const processed: string[] = [];
	const failed: QueuedChange[] = [];

	for (const change of changeQueue) {
		try {
			/* Check for conflicts first */
			if (conflictCheckCallback && change.operation === 'update') {
				const conflict = await conflictCheckCallback(change);
				if (conflict) {
					conflicts.push(conflict);
					saveConflicts();
					syncState.update((s) => ({ ...s, conflicts: [...conflicts] }));
					continue;
				}
			}

			/* Attempt sync */
			const success = await syncCallback(change);
			if (success) {
				processed.push(change.id);
			} else {
				failed.push({ ...change, retryCount: change.retryCount + 1 });
			}
		} catch (error) {
			console.error('[Sync] Error processing change:', error);
			failed.push({ ...change, retryCount: change.retryCount + 1 });
		}
	}

	/* Update queue */
	changeQueue = failed.filter((c) => c.retryCount < 3);
	saveQueue();
	updatePendingCount();

	/* Update last sync time */
	const now = new Date().toISOString();
	localStorage.setItem(LAST_SYNC_KEY, now);

	syncState.update((s) => ({
		...s,
		isSyncing: false,
		lastSyncAt: now,
		error: failed.length > 0 ? `${failed.length} changes failed to sync` : null
	}));

	console.log(`[Sync] Processed ${processed.length}, failed ${failed.length}`);
}

/**
 * Resolve a sync conflict.
 */
export function resolveConflict(
	conflictId: string,
	resolution: ConflictResolution,
	mergedData?: Record<string, unknown>
): void {
	const conflict = conflicts.find((c) => c.id === conflictId);
	if (!conflict) return;

	let dataToSave: Record<string, unknown>;

	switch (resolution) {
		case 'keep_local':
			dataToSave = conflict.localData;
			break;
		case 'keep_remote':
			dataToSave = conflict.remoteData;
			break;
		case 'merge':
			if (!mergedData) {
				console.error('[Sync] Merge resolution requires mergedData');
				return;
			}
			dataToSave = mergedData;
			break;
	}

	/* Queue the resolved data */
	queueChange('update', conflict.collection, conflict.documentId, dataToSave);

	/* Remove conflict */
	conflicts = conflicts.filter((c) => c.id !== conflictId);
	saveConflicts();
	syncState.update((s) => ({ ...s, conflicts: [...conflicts] }));
}

/**
 * Dismiss a conflict (keep remote version without queueing).
 */
export function dismissConflict(conflictId: string): void {
	conflicts = conflicts.filter((c) => c.id !== conflictId);
	saveConflicts();
	syncState.update((s) => ({ ...s, conflicts: [...conflicts] }));
}

/** Handle coming online. */
function handleOnline(): void {
	console.log('[Sync] Online');
	syncState.update((s) => ({ ...s, isOnline: true }));

	if (changeQueue.length > 0) {
		processQueue();
	}
}

/** Handle going offline. */
function handleOffline(): void {
	console.log('[Sync] Offline');
	syncState.update((s) => ({ ...s, isOnline: false }));
}

/** Update pending count in state. */
function updatePendingCount(): void {
	syncState.update((s) => ({ ...s, pendingChanges: changeQueue.length }));
}

/** Load queue from storage. */
function loadQueue(): void {
	try {
		const stored = localStorage.getItem(QUEUE_KEY);
		changeQueue = stored ? JSON.parse(stored) : [];
		updatePendingCount();
	} catch {
		changeQueue = [];
	}
}

/** Save queue to storage. */
function saveQueue(): void {
	try {
		localStorage.setItem(QUEUE_KEY, JSON.stringify(changeQueue));
	} catch (e) {
		console.error('[Sync] Failed to save queue:', e);
	}
}

/** Load conflicts from storage. */
function loadConflicts(): void {
	try {
		const stored = localStorage.getItem(CONFLICTS_KEY);
		conflicts = stored ? JSON.parse(stored) : [];
		syncState.update((s) => ({ ...s, conflicts: [...conflicts] }));
	} catch {
		conflicts = [];
	}
}

/** Save conflicts to storage. */
function saveConflicts(): void {
	try {
		localStorage.setItem(CONFLICTS_KEY, JSON.stringify(conflicts));
	} catch (e) {
		console.error('[Sync] Failed to save conflicts:', e);
	}
}

/** Load last sync time. */
function loadLastSync(): void {
	const lastSync = localStorage.getItem(LAST_SYNC_KEY);
	syncState.update((s) => ({ ...s, lastSyncAt: lastSync }));
}

/** Force a sync attempt. */
export function forceSync(): void {
	if (navigator.onLine) {
		processQueue();
	}
}

/** Clear the sync queue (use with caution). */
export function clearQueue(): void {
	changeQueue = [];
	saveQueue();
	updatePendingCount();
}

/** Get current queue for debugging. */
export function getQueue(): readonly QueuedChange[] {
	return [...changeQueue];
}

/** Exported read-only state store. */
export const offlineSyncState: Readable<SyncState> = { subscribe: syncState.subscribe };

/** Derived store for online status. */
export const isOnline: Readable<boolean> = derived(syncState, ($s) => $s.isOnline);

/** Derived store for syncing status. */
export const isSyncing: Readable<boolean> = derived(syncState, ($s) => $s.isSyncing);

/** Derived store for pending changes count. */
export const pendingChanges: Readable<number> = derived(syncState, ($s) => $s.pendingChanges);

/** Derived store for conflicts. */
export const syncConflicts: Readable<SyncConflict[]> = derived(syncState, ($s) => $s.conflicts);

/** Derived store for has pending changes. */
export const hasPendingChanges: Readable<boolean> = derived(syncState, ($s) => $s.pendingChanges > 0);

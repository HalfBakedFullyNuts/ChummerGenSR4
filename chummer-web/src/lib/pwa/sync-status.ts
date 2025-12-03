/**
 * Sync Status Store
 * =================
 * Tracks online/offline status and sync state.
 */

import { writable, derived, type Readable } from 'svelte/store';

/** Sync status types. */
export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

/** Sync state interface. */
interface SyncState {
	readonly online: boolean;
	readonly status: SyncStatus;
	readonly lastSync: string | null;
	readonly pendingChanges: number;
	readonly error: string | null;
}

/** Internal writable store. */
const syncState = writable<SyncState>({
	online: typeof navigator !== 'undefined' ? navigator.onLine : true,
	status: 'online',
	lastSync: null,
	pendingChanges: 0,
	error: null
});

/**
 * Initialize sync status listeners.
 * Call this in the root layout's onMount.
 */
export function initSyncStatus(): () => void {
	if (typeof window === 'undefined') {
		return () => {};
	}

	const handleOnline = (): void => {
		syncState.update((s) => ({
			...s,
			online: true,
			status: s.pendingChanges > 0 ? 'syncing' : 'online',
			error: null
		}));
	};

	const handleOffline = (): void => {
		syncState.update((s) => ({
			...s,
			online: false,
			status: 'offline'
		}));
	};

	window.addEventListener('online', handleOnline);
	window.addEventListener('offline', handleOffline);

	// Set initial state
	syncState.update((s) => ({
		...s,
		online: navigator.onLine,
		status: navigator.onLine ? 'online' : 'offline'
	}));

	// Cleanup function
	return () => {
		window.removeEventListener('online', handleOnline);
		window.removeEventListener('offline', handleOffline);
	};
}

/**
 * Mark sync as started.
 */
export function startSync(): void {
	syncState.update((s) => ({
		...s,
		status: 'syncing',
		error: null
	}));
}

/**
 * Mark sync as completed.
 */
export function completeSync(): void {
	syncState.update((s) => ({
		...s,
		status: s.online ? 'online' : 'offline',
		lastSync: new Date().toISOString(),
		pendingChanges: 0,
		error: null
	}));
}

/**
 * Mark sync as failed.
 */
export function syncFailed(error: string): void {
	syncState.update((s) => ({
		...s,
		status: 'error',
		error
	}));
}

/**
 * Increment pending changes count.
 */
export function addPendingChange(): void {
	syncState.update((s) => ({
		...s,
		pendingChanges: s.pendingChanges + 1
	}));
}

/**
 * Clear pending changes.
 */
export function clearPendingChanges(): void {
	syncState.update((s) => ({
		...s,
		pendingChanges: 0
	}));
}

/** Exported read-only store. */
export const syncStatusStore: Readable<SyncState> = { subscribe: syncState.subscribe };

/** Derived store for online status. */
export const isOnline: Readable<boolean> = derived(syncState, ($sync) => $sync.online);

/** Derived store for sync status. */
export const syncStatus: Readable<SyncStatus> = derived(syncState, ($sync) => $sync.status);

/** Derived store for pending changes. */
export const hasPendingChanges: Readable<boolean> = derived(
	syncState,
	($sync) => $sync.pendingChanges > 0
);

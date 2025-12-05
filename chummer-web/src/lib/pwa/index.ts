/**
 * PWA Module
 * ==========
 * Exports for Progressive Web App functionality.
 */

export {
	registerServiceWorker,
	applyUpdate,
	checkForUpdates,
	serviceWorkerState,
	hasUpdate,
	isRegistered
} from './service-worker';

export {
	initSyncStatus,
	startSync,
	completeSync,
	syncFailed,
	addPendingChange,
	clearPendingChanges,
	syncStatusStore,
	isOnline,
	syncStatus,
	hasPendingChanges,
	type SyncStatus
} from './sync-status';

export {
	initInstallPrompt,
	showInstallPrompt,
	dismissInstallPrompt,
	resetInstallPrompt,
	pwaInstallState,
	showInstallButton,
	isAppInstalled
} from './install-prompt';

export {
	initOfflineSync,
	destroyOfflineSync,
	setSyncCallback,
	setConflictCheckCallback,
	queueChange,
	queueCharacterSave,
	queueCharacterDelete,
	resolveConflict,
	dismissConflict,
	forceSync,
	clearQueue,
	getQueue,
	offlineSyncState,
	isSyncing,
	pendingChanges,
	syncConflicts,
	hasPendingChanges as hasOfflinePendingChanges,
	type QueuedChange,
	type SyncConflict,
	type ConflictResolution,
	type SyncOperation
} from './offline-sync';

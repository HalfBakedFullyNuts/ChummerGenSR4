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

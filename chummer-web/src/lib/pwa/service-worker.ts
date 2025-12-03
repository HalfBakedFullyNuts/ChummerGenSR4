/**
 * Service Worker Registration
 * ===========================
 * Handles PWA service worker lifecycle and updates.
 */

import { writable, derived, type Readable } from 'svelte/store';

/** Service worker registration state. */
interface SWState {
	readonly supported: boolean;
	readonly registered: boolean;
	readonly updateAvailable: boolean;
	readonly installing: boolean;
	readonly error: string | null;
}

/** Internal writable store. */
const swState = writable<SWState>({
	supported: false,
	registered: false,
	updateAvailable: false,
	installing: false,
	error: null
});

/** Current service worker registration. */
let registration: ServiceWorkerRegistration | null = null;

/** Waiting service worker (new version). */
let waitingWorker: ServiceWorker | null = null;

/**
 * Register the service worker.
 * Call this in the root layout's onMount.
 */
export async function registerServiceWorker(): Promise<void> {
	// Check if service workers are supported
	if (!('serviceWorker' in navigator)) {
		swState.update((s) => ({ ...s, supported: false }));
		return;
	}

	swState.update((s) => ({ ...s, supported: true, installing: true }));

	try {
		registration = await navigator.serviceWorker.register('/service-worker.js', {
			scope: '/'
		});

		swState.update((s) => ({
			...s,
			registered: true,
			installing: false
		}));

		// Check for updates
		registration.addEventListener('updatefound', () => {
			const newWorker = registration?.installing;
			if (!newWorker) return;

			newWorker.addEventListener('statechange', () => {
				if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
					// New version available
					waitingWorker = newWorker;
					swState.update((s) => ({ ...s, updateAvailable: true }));
				}
			});
		});

		// Listen for controller change (after skipWaiting)
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			// Reload the page to use the new service worker
			window.location.reload();
		});

		console.log('[PWA] Service worker registered');
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		swState.update((s) => ({
			...s,
			registered: false,
			installing: false,
			error: message
		}));
		console.error('[PWA] Service worker registration failed:', error);
	}
}

/**
 * Apply waiting update.
 * Tells the waiting service worker to take over.
 */
export function applyUpdate(): void {
	if (!waitingWorker) return;

	waitingWorker.postMessage('skipWaiting');
	swState.update((s) => ({ ...s, updateAvailable: false }));
}

/**
 * Check for service worker updates.
 */
export async function checkForUpdates(): Promise<void> {
	if (!registration) return;

	try {
		await registration.update();
	} catch (error) {
		console.error('[PWA] Update check failed:', error);
	}
}

/** Exported read-only store. */
export const serviceWorkerState: Readable<SWState> = { subscribe: swState.subscribe };

/** Derived store for update notification. */
export const hasUpdate: Readable<boolean> = derived(swState, ($sw) => $sw.updateAvailable);

/** Derived store for registration status. */
export const isRegistered: Readable<boolean> = derived(swState, ($sw) => $sw.registered);

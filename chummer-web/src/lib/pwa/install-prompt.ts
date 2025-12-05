/**
 * PWA Install Prompt
 * ==================
 * Manages the PWA install prompt and provides UI for installation.
 */

import { writable, derived, type Readable } from 'svelte/store';

/** Install prompt state. */
interface InstallState {
	readonly canInstall: boolean;
	readonly isInstalled: boolean;
	readonly dismissed: boolean;
}

/** BeforeInstallPromptEvent type. */
interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	prompt(): Promise<void>;
}

/** Internal state store. */
const installState = writable<InstallState>({
	canInstall: false,
	isInstalled: false,
	dismissed: false
});

/** Deferred install prompt. */
let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Initialize install prompt handling.
 * Call this in the root layout's onMount.
 */
export function initInstallPrompt(): void {
	if (typeof window === 'undefined') return;

	/* Check if already installed */
	const isStandalone =
		window.matchMedia('(display-mode: standalone)').matches ||
		(window.navigator as Navigator & { standalone?: boolean }).standalone === true;

	if (isStandalone) {
		installState.update((s) => ({ ...s, isInstalled: true }));
		return;
	}

	/* Check if previously dismissed */
	const dismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
	if (dismissed) {
		installState.update((s) => ({ ...s, dismissed: true }));
	}

	/* Listen for install prompt */
	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		deferredPrompt = e as BeforeInstallPromptEvent;
		installState.update((s) => ({ ...s, canInstall: true }));
		console.log('[PWA] Install prompt available');
	});

	/* Listen for app installed */
	window.addEventListener('appinstalled', () => {
		deferredPrompt = null;
		installState.update((s) => ({ ...s, canInstall: false, isInstalled: true }));
		console.log('[PWA] App installed');
	});
}

/**
 * Show the install prompt.
 */
export async function showInstallPrompt(): Promise<boolean> {
	if (!deferredPrompt) {
		console.log('[PWA] No install prompt available');
		return false;
	}

	try {
		await deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;

		if (outcome === 'accepted') {
			console.log('[PWA] User accepted install');
			deferredPrompt = null;
			installState.update((s) => ({ ...s, canInstall: false }));
			return true;
		} else {
			console.log('[PWA] User dismissed install');
			return false;
		}
	} catch (error) {
		console.error('[PWA] Install prompt error:', error);
		return false;
	}
}

/**
 * Dismiss the install prompt.
 */
export function dismissInstallPrompt(): void {
	localStorage.setItem('pwa-install-dismissed', 'true');
	installState.update((s) => ({ ...s, dismissed: true }));
}

/**
 * Reset dismissed state (for testing or settings).
 */
export function resetInstallPrompt(): void {
	localStorage.removeItem('pwa-install-dismissed');
	installState.update((s) => ({ ...s, dismissed: false }));
}

/** Exported read-only store. */
export const pwaInstallState: Readable<InstallState> = { subscribe: installState.subscribe };

/** Derived store for showing install button. */
export const showInstallButton: Readable<boolean> = derived(
	installState,
	($state) => $state.canInstall && !$state.dismissed && !$state.isInstalled
);

/** Derived store for installed status. */
export const isAppInstalled: Readable<boolean> = derived(
	installState,
	($state) => $state.isInstalled
);

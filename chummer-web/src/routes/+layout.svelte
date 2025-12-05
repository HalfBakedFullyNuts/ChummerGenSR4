<script lang="ts">
	import '../app.css';
	import { onMount, onDestroy } from 'svelte';
	import { initializeFirebase } from '$firebase/config';
	import { loadGameData } from '$stores/gamedata';
	import { registerServiceWorker, initSyncStatus } from '$lib/pwa';
	import SyncStatus from '$lib/components/SyncStatus.svelte';

	let initialized = false;
	let initError: string | null = null;
	let cleanupSync: (() => void) | null = null;

	/**
	 * Initialize Firebase, PWA, and load game data on mount.
	 * Sets initialized flag on success, captures error message on failure.
	 */
	onMount(async () => {
		/* Initialize sync status listeners */
		cleanupSync = initSyncStatus();

		/* Register service worker for offline support */
		registerServiceWorker();

		const result = initializeFirebase();
		if (result.success) {
			await loadGameData();
			initialized = true;
		} else {
			initError = result.error ?? 'Unknown initialization error';
		}
	});

	onDestroy(() => {
		if (cleanupSync) {
			cleanupSync();
		}
	});
</script>

<svelte:head>
	<title>ChummerWeb - SR4 Character Generator</title>
</svelte:head>

{#if initError}
	<div class="min-h-screen bg-background flex items-center justify-center p-4">
		<div class="cw-card max-w-md text-center">
			<h1 class="text-error text-xl mb-4">Initialization Error</h1>
			<p class="text-secondary-text mb-4">{initError}</p>
			<p class="text-muted-text text-sm">
				Please check your Firebase configuration.
			</p>
		</div>
	</div>
{:else if !initialized}
	<div class="min-h-screen bg-background flex items-center justify-center">
		<div class="text-accent-primary animate-pulse">Loading...</div>
	</div>
{:else}
	<div class="min-h-screen bg-background">
		<!-- Skip to main content (Accessibility) -->
		<a href="#main-content" class="skip-link">
			Skip to main content
		</a>
		<!-- Global sync status indicator -->
		<div class="fixed top-2 right-2 z-50">
			<SyncStatus />
		</div>
		<main id="main-content" role="main">
			<slot />
		</main>
	</div>
{/if}

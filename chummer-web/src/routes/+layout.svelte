<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { initializeFirebase } from '$firebase/config';

	let initialized = false;
	let initError: string | null = null;

	/**
	 * Initialize Firebase on mount.
	 * Sets initialized flag on success, captures error message on failure.
	 */
	onMount(async () => {
		const result = initializeFirebase();
		if (result.success) {
			initialized = true;
		} else {
			initError = result.error ?? 'Unknown initialization error';
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
		<slot />
	</div>
{/if}

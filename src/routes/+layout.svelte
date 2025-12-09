<script lang="ts">
	import '../app.css';
	import '$styles/chummer-design-system.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	// FIREBASE DISABLED:
	// import { initializeFirebase } from '$firebase/config';
	import { loadGameData } from '$stores/gamedata';
	import { user } from '$stores/user';
	// FIREBASE DISABLED:
	// import { signOutUser } from '$firebase/auth';
	import AddCharacterButton from '$lib/components/AddCharacterButton.svelte';

	let initialized = false;
	let initError: string | null = null;

	// Derive section name from current route
	$: currentPath = $page.url.pathname;
	$: sectionName = getSectionName(currentPath);

	function getSectionName(path: string): string {
		if (path === '/') return 'Home';
		if (path.startsWith('/character/new')) return 'New Character';
		if (path.startsWith('/character/')) return 'Character';
		if (path.startsWith('/characters')) return 'My Characters';
		if (path.startsWith('/browse')) return 'Data Browser';
		return '';
	}

	async function handleSignOut(): Promise<void> {
		// FIREBASE DISABLED: No sign out needed in local mode
		console.log('Sign out not available - Firebase disabled');
	}

	onMount(async () => {
		// FIREBASE DISABLED: Skip Firebase initialization
		try {
			await loadGameData();
			initialized = true;
		} catch (error) {
			initError = error instanceof Error ? error.message : 'Failed to load game data';
		}
	});
</script>

<svelte:head>
	<title>ChummerWeb - SR4 Character Generator</title>
</svelte:head>

{#if initError}
	<div class="min-h-screen bg-background flex items-center justify-center p-4">
		<div class="cw-panel p-6 max-w-md text-center">
			<span class="material-icons text-error text-4xl mb-4">error_outline</span>
			<h1 class="text-error text-xl mb-4">Initialization Error</h1>
			<p class="text-text-secondary mb-4">{initError}</p>
			<p class="text-text-muted text-sm">
				Please refresh the page or check the console for details.
			</p>
		</div>
	</div>
{:else if !initialized}
	<div class="min-h-screen bg-background flex items-center justify-center">
		<div class="flex flex-col items-center gap-4">
			<span class="material-icons text-primary text-4xl animate-pulse">hourglass_empty</span>
			<span class="text-primary animate-pulse">Initializing...</span>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-background flex flex-col">
		<!-- App Header -->
		<header class="cw-app-header">
			<!-- Left: Title -->
			<div class="flex items-center flex-1">
				<a href="/" class="cw-app-title">
					<span class="text-primary font-bold">CHUMMER</span>
					{#if sectionName}
						<span class="text-text-muted mx-2">::</span>
						<span class="text-text-secondary">{sectionName}</span>
					{/if}
				</a>
			</div>

			<!-- Center: Navigation -->
			<nav class="flex items-center gap-2">
				<a href="/" class="cw-btn cw-btn-icon" title="Home">
					<span class="material-icons text-sm">home</span>
				</a>
				<AddCharacterButton variant="icon" position="bottom-center" userId={$user?.uid ?? null} />
				<a href="/characters" class="cw-btn cw-btn-icon" title="My Characters">
					<span class="material-icons text-sm">folder</span>
				</a>
				<a href="/browse" class="cw-btn cw-btn-icon" title="Browse Data">
					<span class="material-icons text-sm">search</span>
				</a>
			</nav>

			<!-- Right: User actions -->
			<div class="flex items-center flex-1 justify-end">
				{#if $user}
					<button class="cw-btn cw-btn-icon" title="Sign Out" on:click={handleSignOut}>
						<span class="material-icons text-sm">logout</span>
					</button>
				{/if}
			</div>
		</header>

		<!-- Main Content -->
		<main class="flex-1">
			<slot />
		</main>
	</div>
{/if}

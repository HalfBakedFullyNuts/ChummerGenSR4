<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { loadSavedCharacter, character } from '$stores';
	import { CharacterSheet } from '$lib/components';

	/** Loading state. */
	let loading = true;
	let loadError: string | null = null;

	/** Load character on mount. */
	onMount(async () => {
		const characterId = $page.params.id;

		if (!characterId) {
			loadError = 'No character ID provided';
			loading = false;
			return;
		}

		const result = await loadSavedCharacter(characterId);

		if (!result.success) {
			loadError = result.error || 'Failed to load character';
		} else if (!result.data) {
			loadError = 'Character not found';
		}

		loading = false;
	});

	/** Navigate to edit page. */
	function handleEdit(): void {
		if ($character) {
			goto(`/character/edit/${$character.id}`);
		}
	}
</script>

<svelte:head>
	<title>{$character?.identity.name || 'Character'} - Chummer Web</title>
</svelte:head>

<main class="container mx-auto px-4 py-6 max-w-6xl">
	{#if loading}
		<div class="flex items-center justify-center h-64">
			<span class="text-accent-primary animate-pulse">Loading character...</span>
		</div>
	{:else if loadError}
		<div class="cw-card text-center py-12">
			<h2 class="text-xl text-accent-danger mb-4">Error Loading Character</h2>
			<p class="text-secondary-text mb-6">{loadError}</p>
			<a href="/characters" class="cw-btn cw-btn-primary">
				Back to Characters
			</a>
		</div>
	{:else if $character}
		<!-- Header with actions -->
		<header class="flex items-center justify-between mb-6">
			<a href="/characters" class="cw-btn cw-btn-secondary text-sm">
				Back to Characters
			</a>
			<div class="flex gap-2">
				<button
					class="cw-btn cw-btn-primary"
					on:click={handleEdit}
				>
					Edit Character
				</button>
				<button
					class="cw-btn"
					on:click={() => window.print()}
					title="Print character sheet"
				>
					Print
				</button>
			</div>
		</header>

		<!-- Character Sheet -->
		<CharacterSheet char={$character} />
	{:else}
		<div class="cw-card text-center py-12">
			<p class="text-secondary-text">No character data available.</p>
			<a href="/characters" class="cw-btn cw-btn-primary mt-4">
				Back to Characters
			</a>
		</div>
	{/if}
</main>

<style>
	@media print {
		header {
			display: none;
		}
	}
</style>

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$stores/user';
	import {
		character,
		startManualCharacter,
		saveCurrentCharacter
	} from '$stores/character';
	import { metatypes, skills as skillsStore, qualities as qualitiesStore } from '$stores/gamedata';
	import ManualEntryForm from '$lib/components/manual/ManualEntryForm.svelte';

	/** Save in progress. */
	let saving = false;

	/** Error message. */
	let error: string | null = null;

	/** Success message. */
	let success: string | null = null;

	onMount(() => {
		/* Initialize manual character if none exists */
		if (!$character) {
			const userId = $user?.uid ?? 'guest';
			startManualCharacter(userId);
		}
	});

	/** Save character and navigate to wizard. */
	async function handleSave() {
		saving = true;
		error = null;

		const result = await saveCurrentCharacter();

		if (result.success) {
			success = 'Character saved! Redirecting to character view...';
			setTimeout(() => {
				goto('/character/new');
			}, 1500);
		} else {
			error = result.error || 'Failed to save character';
		}

		saving = false;
	}

	/** Save and stay on page. */
	async function handleQuickSave() {
		saving = true;
		error = null;

		const result = await saveCurrentCharacter();

		if (result.success) {
			success = 'Saved!';
			setTimeout(() => {
				success = null;
			}, 2000);
		} else {
			error = result.error || 'Failed to save character';
		}

		saving = false;
	}
</script>

<div class="container mx-auto px-4 py-6 max-w-4xl">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-primary-dark">Manual Character Entry</h1>
			<p class="text-text-muted text-sm mt-1">
				Quick entry mode - no restrictions or validation
			</p>
		</div>
		<div class="flex items-center gap-3">
			{#if success}
				<span class="text-success-main text-sm flex items-center gap-1">
					<span class="material-icons text-sm">check_circle</span>
					{success}
				</span>
			{/if}
			{#if error}
				<span class="text-error text-sm flex items-center gap-1">
					<span class="material-icons text-sm">error</span>
					{error}
				</span>
			{/if}
			<button
				class="cw-btn"
				on:click={handleQuickSave}
				disabled={saving || !$character}
			>
				{#if saving}
					<span class="material-icons text-sm animate-spin">sync</span>
				{:else}
					<span class="material-icons text-sm">save</span>
				{/if}
				Quick Save
			</button>
			<button
				class="cw-btn cw-btn-primary"
				on:click={handleSave}
				disabled={saving || !$character}
			>
				{#if saving}
					<span class="material-icons text-sm animate-spin">sync</span>
				{:else}
					<span class="material-icons text-sm">done_all</span>
				{/if}
				Save & View
			</button>
		</div>
	</div>

	<!-- Main Form -->
	{#if $character}
		<ManualEntryForm
			character={$character}
			metatypes={$metatypes}
			skills={$skillsStore}
			qualities={$qualitiesStore}
		/>
	{:else}
		<div class="cw-panel p-8 text-center">
			<span class="material-icons text-primary text-4xl animate-pulse">hourglass_empty</span>
			<p class="text-text-muted mt-4">Initializing character...</p>
		</div>
	{/if}
</div>

<style>
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}
</style>

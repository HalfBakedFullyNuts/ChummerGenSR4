<script lang="ts">
	import { goto } from '$app/navigation';
	import DropdownMenu from './ui/DropdownMenu.svelte';
	import type { DropdownItem } from './ui/DropdownMenu.svelte';
	import { importFromFile as importXmlFromFile } from '$lib/xml';
	import { importFromFile as importJsonFromFile } from '$lib/json/importer';
	import {
		loadImportedCharacter,
		saveCurrentCharacter
	} from '$stores/character';

	/** Visual variant of the button. */
	export let variant: 'card' | 'button' | 'icon' = 'button';

	/** Dropdown position. */
	export let position: 'bottom-left' | 'bottom-right' | 'bottom-center' = 'bottom-left';

	/** Whether the button is disabled. */
	export let disabled: boolean = false;

	/** Current user ID for import. */
	export let userId: string | null = null;

	/** Loading/importing state. */
	let importing = false;

	/** Error message. */
	let error: string | null = null;

	/** File input reference. */
	let fileInput: HTMLInputElement;

	/** Dropdown menu items. */
	const menuItems: DropdownItem[] = [
		{
			id: 'new',
			label: 'New Character',
			icon: 'person_add',
			description: 'Start the character creation wizard'
		},
		{
			id: 'import',
			label: 'Import Character',
			icon: 'upload_file',
			description: 'Load from Chummer XML or JSON'
		},
		{
			id: 'manual',
			label: 'Manual Entry',
			icon: 'edit_note',
			description: 'Quick entry with no restrictions'
		}
	];

	/** Handle dropdown item selection. */
	async function handleSelect(event: CustomEvent<DropdownItem>) {
		const item = event.detail;
		error = null;

		switch (item.id) {
			case 'new':
				goto('/character/new');
				break;
			case 'import':
				triggerImport();
				break;
			case 'manual':
				goto('/character/manual');
				break;
		}
	}

	/** Trigger file input click. */
	function triggerImport() {
		if (!userId) {
			error = 'Please sign in to import characters';
			return;
		}
		fileInput?.click();
	}

	/** Handle file selection for import. */
	async function handleImportFile(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file || !userId) return;

		importing = true;
		error = null;

		try {
			/* Determine file type by extension */
			const isJson = file.name.toLowerCase().endsWith('.json');
			const isXml = file.name.toLowerCase().endsWith('.xml') ||
			              file.name.toLowerCase().endsWith('.chum');

			let result;
			if (isJson) {
				result = await importJsonFromFile(file, userId);
			} else if (isXml) {
				result = await importXmlFromFile(file, userId);
			} else {
				error = 'Unsupported file type. Please use .xml, .chum, or .json files.';
				importing = false;
				target.value = '';
				return;
			}

			if (result.success && result.character) {
				/* Load into store and save */
				loadImportedCharacter(result.character);
				const saveResult = await saveCurrentCharacter();
				if (saveResult.success) {
					/* Navigate to wizard to view/edit imported character */
					goto('/character/new');
				} else {
					error = saveResult.error || 'Failed to save imported character';
				}
			} else {
				error = result.error || 'Failed to import character';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Import failed';
		}

		importing = false;
		/* Reset file input */
		target.value = '';
	}
</script>

<!-- Hidden file input for import -->
<input
	type="file"
	accept=".chum,.xml,.json"
	class="hidden"
	bind:this={fileInput}
	on:change={handleImportFile}
/>

<!-- Error toast (shown above button) -->
{#if error}
	<div class="cw-add-character-error" role="alert">
		<span class="material-icons text-sm">error</span>
		{error}
		<button class="ml-2 hover:text-white" on:click={() => error = null}>
			<span class="material-icons text-sm">close</span>
		</button>
	</div>
{/if}

<DropdownMenu items={menuItems} {position} disabled={disabled || importing} on:select={handleSelect}>
	<svelte:fragment slot="trigger">
		{#if variant === 'card'}
			<!-- Card variant - large clickable card -->
			<div class="cw-add-character-card" class:cw-add-character-disabled={disabled || importing}>
				<div class="cw-add-character-card-icon">
					{#if importing}
						<span class="material-icons animate-spin">sync</span>
					{:else}
						<span class="material-icons">add</span>
					{/if}
				</div>
				<div class="cw-add-character-card-content">
					<h3 class="cw-add-character-card-title">
						{importing ? 'Importing...' : 'Add Character'}
					</h3>
					<p class="cw-add-character-card-desc">New, import, or manual entry</p>
				</div>
				<span class="material-icons cw-add-character-card-arrow">expand_more</span>
			</div>
		{:else if variant === 'icon'}
			<!-- Icon variant - compact icon button for header -->
			<button
				class="cw-add-character-icon"
				class:cw-add-character-disabled={disabled || importing}
				aria-label="Add character"
			>
				{#if importing}
					<span class="material-icons animate-spin">sync</span>
				{:else}
					<span class="material-icons">add</span>
				{/if}
			</button>
		{:else}
			<!-- Button variant - standard button -->
			<button
				class="cw-btn cw-btn-primary cw-add-character-btn"
				class:cw-add-character-disabled={disabled || importing}
			>
				{#if importing}
					<span class="material-icons animate-spin text-lg">sync</span>
					Importing...
				{:else}
					<span class="material-icons text-lg">add</span>
					Add Character
				{/if}
				<span class="material-icons text-sm">expand_more</span>
			</button>
		{/if}
	</svelte:fragment>
</DropdownMenu>

<style>
	.cw-add-character-error {
		position: absolute;
		bottom: 100%;
		left: 0;
		right: 0;
		margin-bottom: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--cw-error);
		color: var(--cw-error-contrast);
		font-size: 0.75rem;
		border-radius: 0.25rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		z-index: 100;
	}

	.cw-add-character-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background: var(--cw-panel);
		border: 1px solid var(--cw-border);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
		width: 100%;
	}

	.cw-add-character-card:hover:not(.cw-add-character-disabled) {
		border-color: var(--cw-primary);
	}

	.cw-add-character-card-icon {
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		background: var(--cw-primary-glow);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--cw-primary);
		font-size: 1.5rem;
		flex-shrink: 0;
		transition: all 0.15s ease;
	}

	.cw-add-character-card:hover:not(.cw-add-character-disabled) .cw-add-character-card-icon {
		background: var(--cw-primary);
		color: var(--cw-primary-contrast);
	}

	.cw-add-character-card-content {
		flex: 1;
	}

	.cw-add-character-card-title {
		color: var(--cw-text-primary);
		font-weight: 500;
		font-family: var(--cw-font-display);
	}

	.cw-add-character-card-desc {
		color: var(--cw-text-muted);
		font-size: 0.875rem;
		margin-top: 0.125rem;
	}

	.cw-add-character-card-arrow {
		color: var(--cw-text-muted);
		transition: transform 0.15s ease;
	}

	.cw-add-character-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		background: var(--cw-primary-glow);
		color: var(--cw-primary);
		border: none;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.cw-add-character-icon:hover:not(.cw-add-character-disabled) {
		background: var(--cw-primary);
		color: var(--cw-primary-contrast);
	}

	.cw-add-character-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.cw-add-character-disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}
</style>

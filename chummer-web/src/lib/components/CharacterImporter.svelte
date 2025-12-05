<script lang="ts">
	/**
	 * Character Importer Component
	 * ============================
	 * Drag-and-drop interface for importing Chummer XML characters.
	 * Shows import summary and allows confirmation before saving.
	 */

	import { createEventDispatcher } from 'svelte';
	import { importFromFile, type ImportResult, type ImportSummary } from '$lib/xml/importer';
	import type { Character } from '$types';

	const dispatch = createEventDispatcher<{
		import: { character: Character };
		cancel: void;
	}>();

	/** Current user ID for import. */
	export let userId: string;

	/** Drag state. */
	let isDragOver = false;

	/** Import state. */
	let importState: 'idle' | 'loading' | 'preview' | 'error' = 'idle';
	let importResult: ImportResult | null = null;
	let errorMessage = '';
	let selectedFileName = '';

	/** Handle file drop. */
	async function handleDrop(event: DragEvent): Promise<void> {
		event.preventDefault();
		isDragOver = false;

		const files = event.dataTransfer?.files;
		if (!files || files.length === 0) return;

		const file = files[0];
		await processFile(file);
	}

	/** Handle file selection via input. */
	async function handleFileSelect(event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (!files || files.length === 0) return;

		const file = files[0];
		await processFile(file);
	}

	/** Process selected file. */
	async function processFile(file: File): Promise<void> {
		if (!file.name.endsWith('.chum4') && !file.name.endsWith('.xml')) {
			errorMessage = 'Please select a Chummer XML file (.chum4 or .xml)';
			importState = 'error';
			return;
		}

		selectedFileName = file.name;
		importState = 'loading';

		const result = await importFromFile(file, userId);

		if (result.success && result.character) {
			importResult = result;
			importState = 'preview';
		} else {
			errorMessage = result.error || 'Failed to import character';
			importState = 'error';
		}
	}

	/** Confirm import. */
	function confirmImport(): void {
		if (importResult?.character) {
			dispatch('import', { character: importResult.character });
		}
	}

	/** Cancel and reset. */
	function cancel(): void {
		importState = 'idle';
		importResult = null;
		errorMessage = '';
		selectedFileName = '';
		dispatch('cancel');
	}

	/** Reset to try another file. */
	function reset(): void {
		importState = 'idle';
		importResult = null;
		errorMessage = '';
		selectedFileName = '';
	}

	/** Format number with locale. */
	function formatNumber(n: number): string {
		return n.toLocaleString();
	}
</script>

<div class="space-y-4">
	{#if importState === 'idle'}
		<!-- Drag and Drop Zone -->
		<div
			class="border-2 border-dashed rounded-lg p-8 text-center transition-colors
				{isDragOver ? 'border-accent-primary bg-accent-primary/10' : 'border-border hover:border-accent-primary/50'}"
			on:dragover|preventDefault={() => (isDragOver = true)}
			on:dragleave={() => (isDragOver = false)}
			on:drop={handleDrop}
			role="button"
			tabindex="0"
		>
			<div class="text-4xl mb-4">
				{isDragOver ? '📥' : '📄'}
			</div>
			<p class="text-lg text-primary-text mb-2">
				{isDragOver ? 'Drop to import' : 'Drag & Drop Chummer File'}
			</p>
			<p class="text-sm text-muted-text mb-4">
				or click to browse
			</p>
			<input
				type="file"
				accept=".chum4,.xml"
				class="hidden"
				id="file-input"
				on:change={handleFileSelect}
			/>
			<label
				for="file-input"
				class="inline-block px-4 py-2 rounded bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 cursor-pointer transition-colors"
			>
				Browse Files
			</label>
			<p class="text-xs text-muted-text mt-4">
				Supports Chummer SR4 files (.chum4, .xml)
			</p>
		</div>

	{:else if importState === 'loading'}
		<!-- Loading State -->
		<div class="cw-panel p-8 text-center">
			<div class="animate-spin text-4xl mb-4">⏳</div>
			<p class="text-primary-text">Importing {selectedFileName}...</p>
		</div>

	{:else if importState === 'error'}
		<!-- Error State -->
		<div class="cw-panel p-6">
			<div class="flex items-start gap-4">
				<div class="text-3xl text-accent-danger">⚠️</div>
				<div class="flex-1">
					<h4 class="text-lg font-medium text-accent-danger mb-2">Import Failed</h4>
					<p class="text-secondary-text mb-4">{errorMessage}</p>
					<button
						class="px-4 py-2 rounded bg-surface-light text-secondary-text hover:bg-surface-lighter transition-colors"
						on:click={reset}
					>
						Try Another File
					</button>
				</div>
			</div>
		</div>

	{:else if importState === 'preview' && importResult?.character && importResult?.summary}
		<!-- Preview State -->
		<div class="space-y-4">
			<!-- Character Header -->
			<div class="cw-panel p-4">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-xl font-medium text-primary-text">
							{importResult.character.identity.name || 'Unnamed Character'}
						</h3>
						<p class="text-sm text-muted-text">
							{importResult.summary.metatype} • {importResult.summary.buildMethod} •
							{importResult.summary.status === 'career' ? 'Career Mode' : 'Creation'}
						</p>
					</div>
					<div class="text-right">
						<div class="text-sm text-muted-text">From</div>
						<div class="text-sm text-secondary-text">{selectedFileName}</div>
					</div>
				</div>
			</div>

			<!-- Warnings -->
			{#if importResult.summary.warnings.length > 0}
				<div class="cw-panel p-4 border-l-4 border-accent-warning">
					<h4 class="text-sm font-medium text-accent-warning mb-2">Import Warnings</h4>
					<ul class="text-sm text-secondary-text space-y-1">
						{#each importResult.summary.warnings as warning}
							<li class="flex items-center gap-2">
								<span class="text-accent-warning">•</span>
								{warning}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Summary Stats -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
				<div class="cw-panel p-3 text-center">
					<div class="text-2xl font-mono text-accent-primary">{importResult.summary.skillCount}</div>
					<div class="text-xs text-muted-text">Active Skills</div>
				</div>
				<div class="cw-panel p-3 text-center">
					<div class="text-2xl font-mono text-accent-cyan">{importResult.summary.knowledgeSkillCount}</div>
					<div class="text-xs text-muted-text">Knowledge Skills</div>
				</div>
				<div class="cw-panel p-3 text-center">
					<div class="text-2xl font-mono text-accent-magenta">{importResult.summary.qualityCount}</div>
					<div class="text-xs text-muted-text">Qualities</div>
				</div>
				<div class="cw-panel p-3 text-center">
					<div class="text-2xl font-mono text-accent-success">{importResult.summary.contactCount}</div>
					<div class="text-xs text-muted-text">Contacts</div>
				</div>
			</div>

			<!-- Equipment Stats -->
			<div class="cw-panel p-4">
				<h4 class="text-xs text-muted-text uppercase tracking-wide mb-3">Equipment</h4>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
					<div>
						<div class="text-lg font-mono text-primary-text">{importResult.summary.weaponCount}</div>
						<div class="text-xs text-muted-text">Weapons</div>
					</div>
					<div>
						<div class="text-lg font-mono text-primary-text">{importResult.summary.armorCount}</div>
						<div class="text-xs text-muted-text">Armor</div>
					</div>
					<div>
						<div class="text-lg font-mono text-primary-text">{importResult.summary.cyberwareCount}</div>
						<div class="text-xs text-muted-text">Cyberware</div>
					</div>
					<div>
						<div class="text-lg font-mono text-primary-text">{importResult.summary.gearCount}</div>
						<div class="text-xs text-muted-text">Gear</div>
					</div>
				</div>
			</div>

			<!-- Magic/Resonance Stats -->
			{#if importResult.summary.spellCount > 0 || importResult.summary.powerCount > 0}
				<div class="cw-panel p-4">
					<h4 class="text-xs text-muted-text uppercase tracking-wide mb-3">Magic</h4>
					<div class="grid grid-cols-2 gap-4 text-center">
						<div>
							<div class="text-lg font-mono text-accent-primary">{importResult.summary.spellCount}</div>
							<div class="text-xs text-muted-text">Spells</div>
						</div>
						<div>
							<div class="text-lg font-mono text-accent-warning">{importResult.summary.powerCount}</div>
							<div class="text-xs text-muted-text">Adept Powers</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Resources -->
			<div class="cw-panel p-4">
				<h4 class="text-xs text-muted-text uppercase tracking-wide mb-3">Resources</h4>
				<div class="grid grid-cols-2 gap-4 text-center">
					<div>
						<div class="text-lg font-mono text-accent-cyan">{formatNumber(importResult.summary.nuyen)}¥</div>
						<div class="text-xs text-muted-text">Nuyen</div>
					</div>
					<div>
						<div class="text-lg font-mono text-accent-magenta">{importResult.summary.karma}</div>
						<div class="text-xs text-muted-text">Karma</div>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex gap-3 justify-end">
				<button
					class="px-4 py-2 rounded bg-surface-light text-secondary-text hover:bg-surface-lighter transition-colors"
					on:click={reset}
				>
					Try Another File
				</button>
				<button
					class="px-4 py-2 rounded bg-accent-success/20 text-accent-success hover:bg-accent-success/30 transition-colors"
					on:click={confirmImport}
				>
					Import Character
				</button>
			</div>
		</div>
	{/if}
</div>

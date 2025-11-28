<script lang="ts">
	/**
	 * Custom Content Manager
	 * ======================
	 * UI for importing and managing custom SR4 content packs.
	 */

	import {
		parseCustomContentFile,
		getStoredCustomContent,
		saveCustomContent,
		removeCustomContent,
		getContentSummary,
		type CustomContentManifest
	} from '$lib/utils/customContent';

	/** Currently stored content packs. */
	let contentPacks: CustomContentManifest[] = [];

	/** Loading state. */
	let importing = false;

	/** Error message. */
	let error: string | null = null;

	/** Success message. */
	let success: string | null = null;

	/** File input reference. */
	let fileInput: HTMLInputElement;

	/** Load stored content on mount. */
	$: contentPacks = getStoredCustomContent();

	/** Clear messages after delay. */
	function showMessage(type: 'error' | 'success', message: string): void {
		if (type === 'error') {
			error = message;
			success = null;
		} else {
			success = message;
			error = null;
		}
		setTimeout(() => {
			error = null;
			success = null;
		}, 5000);
	}

	/** Handle file selection. */
	async function handleFileSelect(event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		importing = true;
		error = null;
		success = null;

		try {
			const result = await parseCustomContentFile(file);

			if (!result.success) {
				showMessage('error', result.errors.join(', '));
				return;
			}

			if (result.manifest) {
				saveCustomContent(result.manifest);
				contentPacks = getStoredCustomContent();

				const summary = getContentSummary(result.manifest);
				showMessage('success', `Imported "${result.manifest.name}": ${summary}`);

				if (result.warnings.length > 0) {
					console.warn('Import warnings:', result.warnings);
				}
			}
		} catch (err) {
			showMessage('error', 'Failed to import file: ' + String(err));
		} finally {
			importing = false;
			input.value = '';
		}
	}

	/** Remove a content pack. */
	function handleRemove(manifestId: string): void {
		const pack = contentPacks.find(p => p.id === manifestId);
		if (pack && confirm(`Remove "${pack.name}"?`)) {
			removeCustomContent(manifestId);
			contentPacks = getStoredCustomContent();
			showMessage('success', `Removed "${pack.name}"`);
		}
	}

	/** Trigger file input click. */
	function triggerFileInput(): void {
		fileInput?.click();
	}
</script>

<div class="cw-card">
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-lg font-medium text-accent-primary">Custom Content</h2>
		<button
			class="cw-btn cw-btn-primary text-sm"
			on:click={triggerFileInput}
			disabled={importing}
		>
			{importing ? 'Importing...' : 'Import XML'}
		</button>
		<input
			bind:this={fileInput}
			type="file"
			accept=".xml"
			class="hidden"
			on:change={handleFileSelect}
		/>
	</div>

	{#if error}
		<div class="p-2 mb-4 bg-accent-danger/20 border border-accent-danger/50 rounded text-accent-danger text-sm">
			{error}
		</div>
	{/if}

	{#if success}
		<div class="p-2 mb-4 bg-accent-success/20 border border-accent-success/50 rounded text-accent-success text-sm">
			{success}
		</div>
	{/if}

	{#if contentPacks.length === 0}
		<div class="text-center py-8 text-muted-text">
			<p class="mb-2">No custom content loaded.</p>
			<p class="text-sm">Import XML files to add custom qualities, spells, gear, and more.</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each contentPacks as pack (pack.id)}
				<div class="p-3 bg-surface rounded flex items-start justify-between">
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<span class="font-medium text-primary-text">{pack.name}</span>
							<span class="text-xs text-muted-text">v{pack.version}</span>
						</div>
						{#if pack.author}
							<div class="text-xs text-muted-text">by {pack.author}</div>
						{/if}
						{#if pack.description}
							<div class="text-sm text-secondary-text mt-1">{pack.description}</div>
						{/if}
						<div class="text-xs text-accent-cyan mt-1">
							{getContentSummary(pack)}
						</div>
					</div>
					<button
						class="cw-btn text-xs text-accent-danger"
						on:click={() => handleRemove(pack.id)}
					>
						Remove
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<div class="mt-4 p-3 bg-surface-light rounded text-sm text-muted-text">
		<h3 class="font-medium text-secondary-text mb-1">XML Format</h3>
		<p class="text-xs">
			Custom content files should use the same XML format as Chummer data files.
			Supported types: qualities, spells, powers, weapons, armor, cyberware, gear.
		</p>
	</div>
</div>

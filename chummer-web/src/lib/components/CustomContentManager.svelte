<script lang="ts">
	/**
	 * Custom Content Manager Component
	 * =================================
	 * Manages custom XML content imports and toggles.
	 */

	import { onMount } from 'svelte';

	/** Custom content pack. */
	interface CustomPack {
		id: string;
		name: string;
		filename: string;
		enabled: boolean;
		itemCount: number;
		importedAt: string;
	}

	/** Error message. */
	let error = '';

	/** Success message. */
	let success = '';

	/** Loading state. */
	let loading = false;

	/** Custom packs. */
	let customPacks: CustomPack[] = [];

	/** File input reference. */
	let fileInput: HTMLInputElement;

	onMount(() => {
		loadCustomPacks();
	});

	/** Load custom packs from localStorage. */
	function loadCustomPacks(): void {
		try {
			const stored = localStorage.getItem('chummer-custom-content');
			if (stored) {
				customPacks = JSON.parse(stored);
			}
		} catch (e) {
			console.error('Failed to load custom content:', e);
		}
	}

	/** Save custom packs to localStorage. */
	function saveCustomPacks(): void {
		try {
			localStorage.setItem('chummer-custom-content', JSON.stringify(customPacks));
		} catch (e) {
			console.error('Failed to save custom content:', e);
			error = 'Failed to save custom content';
		}
	}

	/** Handle file selection. */
	async function handleFileSelect(event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		error = '';
		success = '';
		loading = true;

		try {
			const content = await file.text();

			/* Parse XML */
			const parser = new DOMParser();
			const doc = parser.parseFromString(content, 'text/xml');

			/* Check for parse errors */
			const parseError = doc.querySelector('parsererror');
			if (parseError) {
				throw new Error('Invalid XML file');
			}

			/* Get root element and count items */
			const root = doc.documentElement;
			const items = root.querySelectorAll(
				'metatype, skill, quality, spell, power, weapon, armor, gear, cyberware, bioware, vehicle, program, martialart, echo, tradition, mentor'
			);

			if (items.length === 0) {
				throw new Error('No recognizable content found in XML file');
			}

			/* Create pack entry */
			const pack: CustomPack = {
				id: crypto.randomUUID(),
				name: root.getAttribute('name') || file.name.replace(/\.xml$/i, ''),
				filename: file.name,
				enabled: true,
				itemCount: items.length,
				importedAt: new Date().toISOString()
			};

			/* Store the actual content */
			localStorage.setItem(`chummer-custom-${pack.id}`, content);

			/* Add to packs list */
			customPacks = [...customPacks, pack];
			saveCustomPacks();

			success = `Imported "${pack.name}" with ${items.length} items`;

			/* Clear input */
			input.value = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to import file';
		} finally {
			loading = false;
		}
	}

	/** Toggle pack enabled state. */
	function togglePack(packId: string): void {
		customPacks = customPacks.map((p) =>
			p.id === packId ? { ...p, enabled: !p.enabled } : p
		);
		saveCustomPacks();
	}

	/** Remove a custom pack. */
	function removePack(packId: string): void {
		if (!confirm('Remove this custom content pack?')) return;

		/* Remove content data */
		localStorage.removeItem(`chummer-custom-${packId}`);

		/* Remove from list */
		customPacks = customPacks.filter((p) => p.id !== packId);
		saveCustomPacks();
	}

	/** Format date. */
	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-medium text-primary-text">Custom Content</h3>
	</div>

	<p class="text-sm text-secondary-text">
		Import custom XML content files to add homebrew rules, gear, and more.
	</p>

	{#if error}
		<div class="p-3 bg-accent-danger/10 border border-accent-danger/30 rounded text-sm text-accent-danger">
			{error}
		</div>
	{/if}

	{#if success}
		<div class="p-3 bg-accent-success/10 border border-accent-success/30 rounded text-sm text-accent-success">
			{success}
		</div>
	{/if}

	<!-- Import Button -->
	<div class="cw-panel p-4">
		<h4 class="text-sm font-medium text-secondary-text mb-3">Import Custom Content</h4>

		<input
			type="file"
			accept=".xml"
			class="hidden"
			bind:this={fileInput}
			on:change={handleFileSelect}
		/>

		<button
			class="cw-btn cw-btn-primary"
			on:click={() => fileInput.click()}
			disabled={loading}
		>
			{loading ? 'Importing...' : 'Select XML File'}
		</button>

		<p class="text-xs text-muted-text mt-2">
			Supports Chummer-compatible XML format for custom content.
		</p>
	</div>

	<!-- Installed Packs -->
	<div class="space-y-2">
		<h4 class="text-sm font-medium text-secondary-text">Installed Content</h4>

		{#if customPacks.length > 0}
			{#each customPacks as pack}
				<div class="cw-panel p-3 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<label class="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								class="sr-only peer"
								checked={pack.enabled}
								on:change={() => togglePack(pack.id)}
							/>
							<div class="w-9 h-5 bg-surface-light peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-success"></div>
						</label>
						<div>
							<div class="flex items-center gap-2">
								<span class="font-medium text-primary-text">{pack.name}</span>
								<span class="text-xs text-muted-text">({pack.itemCount} items)</span>
							</div>
							<div class="text-xs text-muted-text">
								{pack.filename} - Imported {formatDate(pack.importedAt)}
							</div>
						</div>
					</div>
					<button
						class="text-xs text-accent-danger hover:underline"
						on:click={() => removePack(pack.id)}
					>
						Remove
					</button>
				</div>
			{/each}
		{:else}
			<div class="cw-panel p-6 text-center">
				<p class="text-muted-text">No custom content installed.</p>
				<p class="text-xs text-muted-text mt-1">
					Import XML files to add custom content.
				</p>
			</div>
		{/if}
	</div>

	<!-- Info -->
	<div class="p-3 bg-surface-light rounded text-xs text-muted-text">
		<p class="font-medium text-secondary-text mb-1">Supported Content Types:</p>
		<ul class="list-disc list-inside space-y-0.5">
			<li>Metatypes and Metavariants</li>
			<li>Skills and Skill Groups</li>
			<li>Qualities (Positive and Negative)</li>
			<li>Spells and Adept Powers</li>
			<li>Weapons, Armor, and Gear</li>
			<li>Cyberware and Bioware</li>
			<li>Vehicles and Drones</li>
			<li>Programs and Complex Forms</li>
			<li>Martial Arts and Techniques</li>
			<li>Traditions and Mentor Spirits</li>
		</ul>
	</div>
</div>

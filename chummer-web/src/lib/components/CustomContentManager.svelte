<script lang="ts">
	/**
	 * Custom Content Manager Component
	 * =================================
	 * Manages custom XML content imports with merge logic and conflict resolution.
	 */

	import { onMount } from 'svelte';

	/** Content type for categorization. */
	type ContentType = 'metatype' | 'skill' | 'quality' | 'spell' | 'power' | 'weapon' |
		'armor' | 'gear' | 'cyberware' | 'bioware' | 'vehicle' | 'program' | 'martialart' |
		'echo' | 'tradition' | 'mentor';

	/** Conflict resolution strategy. */
	type ConflictStrategy = 'keep_original' | 'replace' | 'rename_custom';

	/** Content item summary. */
	interface ContentItem {
		type: ContentType;
		name: string;
		hasConflict: boolean;
	}

	/** Custom content pack. */
	interface CustomPack {
		id: string;
		name: string;
		filename: string;
		enabled: boolean;
		itemCount: number;
		importedAt: string;
		items: { type: ContentType; count: number }[];
		conflicts: string[];
		conflictStrategy: ConflictStrategy;
	}

	/** Import preview state. */
	interface ImportPreview {
		filename: string;
		packName: string;
		items: ContentItem[];
		conflicts: ContentItem[];
		totalCount: number;
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

	/** Import preview. */
	let importPreview: ImportPreview | null = null;

	/** Selected conflict resolution strategy. */
	let selectedStrategy: ConflictStrategy = 'keep_original';

	/** Pending import content. */
	let pendingContent: string | null = null;

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

	/** Get existing content names for conflict detection. */
	function getExistingNames(): Set<string> {
		const names = new Set<string>();
		/* Get names from existing custom packs */
		for (const pack of customPacks) {
			if (pack.enabled) {
				const content = localStorage.getItem(`chummer-custom-${pack.id}`);
				if (content) {
					const parser = new DOMParser();
					const doc = parser.parseFromString(content, 'text/xml');
					doc.querySelectorAll('[name]').forEach(el => {
						const name = el.getAttribute('name');
						if (name) names.add(name.toLowerCase());
					});
					doc.querySelectorAll('name').forEach(el => {
						const name = el.textContent;
						if (name) names.add(name.toLowerCase());
					});
				}
			}
		}
		return names;
	}

	/** Handle file selection - show preview with conflicts. */
	async function handleFileSelect(event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		error = '';
		success = '';
		importPreview = null;
		loading = true;

		try {
			const content = await file.text();
			pendingContent = content;

			/* Parse XML */
			const parser = new DOMParser();
			const doc = parser.parseFromString(content, 'text/xml');

			/* Check for parse errors */
			const parseError = doc.querySelector('parsererror');
			if (parseError) {
				throw new Error('Invalid XML file');
			}

			/* Get root element and categorize items */
			const root = doc.documentElement;
			const existingNames = getExistingNames();
			const contentTypes: ContentType[] = [
				'metatype', 'skill', 'quality', 'spell', 'power', 'weapon',
				'armor', 'gear', 'cyberware', 'bioware', 'vehicle', 'program',
				'martialart', 'echo', 'tradition', 'mentor'
			];

			const items: ContentItem[] = [];
			const conflicts: ContentItem[] = [];

			for (const type of contentTypes) {
				const elements = root.querySelectorAll(type);
				elements.forEach(el => {
					/* Get name from attribute or child element */
					const name = el.getAttribute('name') || el.querySelector('name')?.textContent || 'Unknown';
					const hasConflict = existingNames.has(name.toLowerCase());

					const item: ContentItem = { type, name, hasConflict };
					items.push(item);
					if (hasConflict) {
						conflicts.push(item);
					}
				});
			}

			if (items.length === 0) {
				throw new Error('No recognizable content found in XML file');
			}

			/* Create preview */
			importPreview = {
				filename: file.name,
				packName: root.getAttribute('name') || file.name.replace(/\.xml$/i, ''),
				items,
				conflicts,
				totalCount: items.length
			};

			/* Clear input */
			input.value = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to parse file';
			pendingContent = null;
		} finally {
			loading = false;
		}
	}

	/** Confirm import with selected conflict strategy. */
	function confirmImport(): void {
		if (!importPreview || !pendingContent) return;

		/* Summarize items by type */
		const itemCounts = new Map<ContentType, number>();
		for (const item of importPreview.items) {
			itemCounts.set(item.type, (itemCounts.get(item.type) || 0) + 1);
		}

		/* Create pack entry */
		const pack: CustomPack = {
			id: crypto.randomUUID(),
			name: importPreview.packName,
			filename: importPreview.filename,
			enabled: true,
			itemCount: importPreview.totalCount,
			importedAt: new Date().toISOString(),
			items: Array.from(itemCounts.entries()).map(([type, count]) => ({ type, count })),
			conflicts: importPreview.conflicts.map(c => c.name),
			conflictStrategy: selectedStrategy
		};

		/* Store the actual content */
		localStorage.setItem(`chummer-custom-${pack.id}`, pendingContent);

		/* Add to packs list */
		customPacks = [...customPacks, pack];
		saveCustomPacks();

		success = `Imported "${pack.name}" with ${importPreview.totalCount} items`;
		if (importPreview.conflicts.length > 0) {
			success += ` (${importPreview.conflicts.length} conflicts resolved with "${getStrategyLabel(selectedStrategy)}")`;
		}

		/* Reset preview state */
		importPreview = null;
		pendingContent = null;
		selectedStrategy = 'keep_original';
	}

	/** Cancel import preview. */
	function cancelImport(): void {
		importPreview = null;
		pendingContent = null;
		selectedStrategy = 'keep_original';
	}

	/** Get human-readable strategy label. */
	function getStrategyLabel(strategy: ConflictStrategy): string {
		switch (strategy) {
			case 'keep_original': return 'Keep Original';
			case 'replace': return 'Replace';
			case 'rename_custom': return 'Rename Custom';
		}
	}

	/** Get content type icon. */
	function getTypeIcon(type: ContentType): string {
		const icons: Record<ContentType, string> = {
			metatype: '👤',
			skill: '⚡',
			quality: '✨',
			spell: '🔮',
			power: '💪',
			weapon: '🗡️',
			armor: '🛡️',
			gear: '🎒',
			cyberware: '🤖',
			bioware: '🧬',
			vehicle: '🚗',
			program: '💻',
			martialart: '🥋',
			echo: '📡',
			tradition: '📿',
			mentor: '🧙'
		};
		return icons[type] || '📦';
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

	<!-- Import Preview (if active) -->
	{#if importPreview}
		<div class="cw-panel p-4 space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<h4 class="text-lg font-medium text-primary-text">{importPreview.packName}</h4>
					<p class="text-sm text-muted-text">{importPreview.filename}</p>
				</div>
				<span class="text-2xl font-mono text-accent-primary">{importPreview.totalCount}</span>
			</div>

			<!-- Content Summary -->
			<div class="space-y-2">
				<h5 class="text-xs text-muted-text uppercase tracking-wide">Content Types</h5>
				<div class="flex flex-wrap gap-2">
					{#each [...new Set(importPreview.items.map(i => i.type))] as type}
						{@const count = importPreview.items.filter(i => i.type === type).length}
						<span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-light text-sm">
							<span>{getTypeIcon(type)}</span>
							<span class="text-secondary-text">{type}</span>
							<span class="text-muted-text">({count})</span>
						</span>
					{/each}
				</div>
			</div>

			<!-- Conflicts Warning -->
			{#if importPreview.conflicts.length > 0}
				<div class="p-3 bg-accent-warning/10 border border-accent-warning/30 rounded space-y-3">
					<div class="flex items-center gap-2">
						<span class="text-lg">⚠️</span>
						<span class="font-medium text-accent-warning">
							{importPreview.conflicts.length} Conflict{importPreview.conflicts.length > 1 ? 's' : ''} Detected
						</span>
					</div>

					<div class="text-sm text-secondary-text">
						The following items already exist in your installed content:
					</div>

					<div class="max-h-32 overflow-y-auto space-y-1">
						{#each importPreview.conflicts as conflict}
							<div class="flex items-center gap-2 text-sm">
								<span>{getTypeIcon(conflict.type)}</span>
								<span class="text-accent-warning">{conflict.name}</span>
								<span class="text-muted-text">({conflict.type})</span>
							</div>
						{/each}
					</div>

					<!-- Conflict Resolution Strategy -->
					<div class="pt-2 border-t border-accent-warning/30">
						<label class="text-sm text-secondary-text block mb-2">Resolve conflicts by:</label>
						<div class="flex flex-wrap gap-2">
							<label class="inline-flex items-center gap-2 cursor-pointer">
								<input
									type="radio"
									bind:group={selectedStrategy}
									value="keep_original"
									class="accent-accent-primary"
								/>
								<span class="text-sm">Keep Original</span>
							</label>
							<label class="inline-flex items-center gap-2 cursor-pointer">
								<input
									type="radio"
									bind:group={selectedStrategy}
									value="replace"
									class="accent-accent-primary"
								/>
								<span class="text-sm">Replace with Custom</span>
							</label>
							<label class="inline-flex items-center gap-2 cursor-pointer">
								<input
									type="radio"
									bind:group={selectedStrategy}
									value="rename_custom"
									class="accent-accent-primary"
								/>
								<span class="text-sm">Rename Custom Items</span>
							</label>
						</div>
					</div>
				</div>
			{/if}

			<!-- Action Buttons -->
			<div class="flex gap-3 justify-end">
				<button
					class="px-4 py-2 rounded bg-surface-light text-secondary-text hover:bg-surface-lighter transition-colors"
					on:click={cancelImport}
				>
					Cancel
				</button>
				<button
					class="px-4 py-2 rounded bg-accent-success/20 text-accent-success hover:bg-accent-success/30 transition-colors"
					on:click={confirmImport}
				>
					Import {importPreview.totalCount} Items
				</button>
			</div>
		</div>
	{:else}
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
				{loading ? 'Analyzing...' : 'Select XML File'}
			</button>

			<p class="text-xs text-muted-text mt-2">
				Supports Chummer-compatible XML format for custom content.
			</p>
		</div>
	{/if}

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

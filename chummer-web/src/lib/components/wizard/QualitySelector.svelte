<script lang="ts">
	import {
		positiveQualities,
		negativeQualities,
		type GameQuality
	} from '$stores/gamedata';
	import { character, addQuality, removeQuality } from '$stores/character';
	import { qualityMatchesSearch, formatQualityBonus, generateQualityTags, type QualityTag } from '$lib/utils/qualities';
	import Tooltip from '$lib/components/Tooltip.svelte';

	/** Current tab - positive or negative qualities. */
	let activeTab: 'positive' | 'negative' = 'positive';

	/** Search filter for quality names. */
	let searchQuery = '';

	/** Active tag filter (null = no tag filter). */
	let activeTagFilter: QualityTag | null = null;

	/** Maximum BP from positive qualities. */
	const MAX_POSITIVE_BP = 35;

	/** Maximum BP from negative qualities. */
	const MAX_NEGATIVE_BP = 35;

	/** Available tags for filtering. */
	const AVAILABLE_TAGS: QualityTag[] = [
		'combat', 'social', 'magic', 'matrix', 'physical', 'mental',
		'skill', 'attribute', 'movement', 'resistance', 'essence', 'initiative'
	];

	/** Filter qualities by search query and tags (searches name, category, effects, bonuses, and tags). */
	function filterQualities(quals: readonly GameQuality[], search: string, tagFilter: QualityTag | null): GameQuality[] {
		let filtered = [...quals];

		// Apply tag filter first
		if (tagFilter) {
			filtered = filtered.filter(q => generateQualityTags(q).includes(tagFilter));
		}

		// Then apply text search
		if (search) {
			filtered = filtered.filter(q => qualityMatchesSearch(q, search));
		}

		return filtered;
	}

	/** Check if quality is already selected. */
	function isSelected(name: string): boolean {
		return $character?.qualities.some((q) => q.name === name) ?? false;
	}

	/** Get selected quality ID by name. */
	function getSelectedId(name: string): string | null {
		return $character?.qualities.find((q) => q.name === name)?.id ?? null;
	}

	/** Calculate total BP from positive qualities. */
	function getPositiveBP(): number {
		if (!$character) return 0;
		return $character.qualities
			.filter((q) => q.category === 'Positive')
			.reduce((sum, q) => sum + q.bp, 0);
	}

	/** Calculate total BP from negative qualities (should be negative). */
	function getNegativeBP(): number {
		if (!$character) return 0;
		return $character.qualities
			.filter((q) => q.category === 'Negative')
			.reduce((sum, q) => sum + Math.abs(q.bp), 0);
	}

	/** Handle quality toggle. */
	function toggleQuality(quality: GameQuality): void {
		if (isSelected(quality.name)) {
			const id = getSelectedId(quality.name);
			if (id) removeQuality(id);
		} else {
			const category = quality.bp >= 0 ? 'Positive' : 'Negative';
			addQuality(quality.name, category, quality.bp);
		}
	}

	$: filteredPositive = filterQualities($positiveQualities ?? [], searchQuery, activeTagFilter);
	$: filteredNegative = filterQualities($negativeQualities ?? [], searchQuery, activeTagFilter);
	$: displayQualities = activeTab === 'positive' ? filteredPositive : filteredNegative;
	$: positiveBP = getPositiveBP();
	$: negativeBP = getNegativeBP();

	/** Clear tag filter. */
	function clearTagFilter(): void {
		activeTagFilter = null;
	}

	/** Toggle tag filter. */
	function toggleTagFilter(tag: QualityTag): void {
		if (activeTagFilter === tag) {
			activeTagFilter = null;
		} else {
			activeTagFilter = tag;
		}
	}
</script>

<div class="space-y-6">
	<!-- BP Summary -->
	<div class="grid grid-cols-2 gap-4">
		<div class="cw-panel p-4">
			<div class="flex items-center justify-between">
				<span class="text-secondary-text">Positive Qualities:</span>
				<span
					class="font-mono text-xl
						{positiveBP > MAX_POSITIVE_BP ? 'text-error' : 'text-success'}"
				>
					{positiveBP} / {MAX_POSITIVE_BP} BP
				</span>
			</div>
		</div>
		<div class="cw-panel p-4">
			<div class="flex items-center justify-between">
				<span class="text-secondary-text">Negative Qualities:</span>
				<span
					class="font-mono text-xl
						{negativeBP > MAX_NEGATIVE_BP ? 'text-error' : 'text-warning'}"
				>
					{negativeBP} / {MAX_NEGATIVE_BP} BP
				</span>
			</div>
		</div>
	</div>

	<!-- Tabs and Search -->
	<div class="flex flex-wrap gap-4 items-center">
		<div class="flex gap-1">
			<button
				class="px-4 py-2 rounded transition-colors
					{activeTab === 'positive'
						? 'bg-success text-background'
						: 'bg-surface text-secondary-text hover:bg-surface-light'}"
				on:click={() => (activeTab = 'positive')}
			>
				Positive ({$positiveQualities?.length ?? 0})
			</button>
			<button
				class="px-4 py-2 rounded transition-colors
					{activeTab === 'negative'
						? 'bg-warning text-background'
						: 'bg-surface text-secondary-text hover:bg-surface-light'}"
				on:click={() => (activeTab = 'negative')}
			>
				Negative ({$negativeQualities?.length ?? 0})
			</button>
		</div>

		<input
			type="text"
			placeholder="Search qualities (or tag:combat, tag:magic...)"
			class="cw-input flex-1 min-w-[200px]"
			bind:value={searchQuery}
		/>
	</div>

	<!-- Tag Filters -->
	<div class="flex flex-wrap gap-2 items-center">
		<span class="text-muted-text text-sm">Filter by tag:</span>
		{#each AVAILABLE_TAGS as tag}
			<button
				class="px-2 py-1 text-xs rounded transition-colors
					{activeTagFilter === tag
						? 'bg-accent-primary text-background'
						: 'bg-surface text-secondary-text hover:bg-surface-light'}"
				on:click={() => toggleTagFilter(tag)}
			>
				{tag}
			</button>
		{/each}
		{#if activeTagFilter}
			<button
				class="px-2 py-1 text-xs rounded bg-accent-danger/20 text-accent-danger hover:bg-accent-danger/30"
				on:click={clearTagFilter}
			>
				Clear
			</button>
		{/if}
	</div>

	<!-- Selected Qualities -->
	{#if $character && $character.qualities.length > 0}
		<div class="cw-card">
			<h3 class="cw-card-header mb-3">Selected Qualities</h3>
			<div class="flex flex-wrap gap-2">
				{#each $character.qualities as quality}
					{@const gameQual = [...($positiveQualities ?? []), ...($negativeQualities ?? [])].find(
						(q) => q.name === quality.name
					)}
					{@const bonuses = gameQual ? formatQualityBonus(gameQual.bonus) : []}
					{@const hasTooltip = gameQual?.effect || bonuses.length > 0}
					<button
						class="px-3 py-1 rounded text-sm flex items-center gap-2 group relative
							{quality.category === 'Positive'
								? 'bg-success/20 text-success border border-success/30'
								: 'bg-warning/20 text-warning border border-warning/30'}"
						on:click={() => removeQuality(quality.id)}
					>
						{quality.name}
						<span class="opacity-70">{quality.bp} BP</span>
						<span class="text-xs opacity-50">×</span>
						<Tooltip show={hasTooltip} maxWidth="20rem">
							<div slot="content" class="text-left">
								{#if gameQual?.effect}
									<div class="mb-1">{gameQual.effect}</div>
								{/if}
								{#if bonuses.length > 0}
									<div class="border-t border-border/50 pt-1 mt-1 space-y-0.5">
										{#each bonuses as bonus}
											<div class:text-accent-success={bonus.positive}
												 class:text-accent-danger={!bonus.positive}>
												{bonus.text}
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</Tooltip>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Quality List -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
		{#each displayQualities as quality}
			{@const selected = isSelected(quality.name)}
			{@const bonuses = formatQualityBonus(quality.bonus)}
			{@const tags = generateQualityTags(quality)}
			<button
				class="cw-card text-left p-3 transition-all
					{selected
						? activeTab === 'positive'
							? 'border-success bg-success/10'
							: 'border-warning bg-warning/10'
						: 'hover:border-accent-primary/50'}"
				on:click={() => toggleQuality(quality)}
			>
				<div class="flex items-start justify-between gap-2">
					<div class="flex-1">
						<h4
							class="font-medium
								{selected
									? activeTab === 'positive'
										? 'text-success'
										: 'text-warning'
									: 'text-primary-text'}"
						>
							{quality.name}
						</h4>
						{#if quality.category}
							<span class="text-muted-text text-xs">{quality.category}</span>
						{/if}
					</div>
					<span
						class="cw-badge text-xs
							{activeTab === 'positive' ? 'cw-badge-success' : 'cw-badge-warning'}"
					>
						{Math.abs(quality.bp)} BP
					</span>
				</div>

				{#if quality.effect}
					<div class="text-accent-secondary text-xs mt-2 italic">
						{quality.effect}
					</div>
				{/if}

				<!-- Mechanical Bonuses -->
				{#if bonuses.length > 0}
					<div class="mt-2 pt-2 border-t border-border/50">
						<div class="flex flex-wrap gap-1">
							{#each bonuses as bonus}
								<span class="px-1.5 py-0.5 text-xs rounded
									{bonus.positive
										? 'bg-success/20 text-success'
										: 'bg-warning/20 text-warning'}">
									{bonus.text}
								</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Tags -->
				{#if tags.length > 0}
					<div class="flex flex-wrap gap-1 mt-2">
						{#each tags as tag}
							<span class="px-1 py-0.5 text-xs bg-surface-light text-muted-text rounded">
								{tag}
							</span>
						{/each}
					</div>
				{/if}

				<div class="text-muted-text text-xs mt-1">
					{quality.source}{quality.page ? ` p.${quality.page}` : ''}
				</div>
			</button>
		{/each}
	</div>

	<!-- Empty State -->
	{#if displayQualities.length === 0}
		<div class="cw-panel p-8 text-center">
			<p class="text-secondary-text">No qualities found matching your search.</p>
		</div>
	{/if}

	<!-- Help Text -->
	<div class="cw-panel p-4 text-sm">
		<h4 class="text-accent-primary mb-2">Quality Guidelines</h4>
		<ul class="text-secondary-text space-y-1 list-disc list-inside">
			<li>Maximum 35 BP in positive qualities</li>
			<li>Maximum 35 BP from negative qualities</li>
			<li>Negative qualities give you bonus BP to spend elsewhere</li>
			<li>Some qualities have multiple levels (not yet implemented)</li>
			<li>Use tag buttons or type "tag:combat" to filter by category</li>
			<li>Mechanical bonuses are shown on each quality card</li>
		</ul>
	</div>
</div>

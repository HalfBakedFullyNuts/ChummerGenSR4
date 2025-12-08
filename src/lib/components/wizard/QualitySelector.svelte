<script lang="ts">
	import {
		positiveQualities,
		negativeQualities,
		type GameQuality
	} from '$stores/gamedata';
	import { character, addQuality, removeQuality, addQualityAgain } from '$stores/character';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { formatQualityBonus, type FormattedBonus } from '$lib/utils/qualities';
	import { groupQualities, formatBPRange, type GroupedQuality } from '$lib/utils/qualityGrouping';

	/** Current tab - positive or negative qualities. */
	let activeTab: 'positive' | 'negative' = 'positive';

	/** Search filter for quality names. */
	let searchQuery = '';

	/** Currently open variant selector group (null if none open). */
	let openVariantGroup: GroupedQuality | null = null;

	/** Maximum BP from positive qualities. */
	const MAX_POSITIVE_BP = 35;

	/** Maximum BP from negative qualities. */
	const MAX_NEGATIVE_BP = 35;

	/** Filter grouped qualities by search query. */
	function filterGroupedQualities(groups: GroupedQuality[], search: string): GroupedQuality[] {
		if (!search) return groups;
		const lower = search.toLowerCase();
		return groups.filter((g) => {
			// Match base name
			if (g.baseName.toLowerCase().includes(lower)) return true;
			// Match any variant name
			return g.variants.some(v => v.name.toLowerCase().includes(lower));
		});
	}

	/** Check if quality is already selected. */
	function isSelected(name: string): boolean {
		return $character?.qualities.some((q) => q.name === name) ?? false;
	}

	/** Check if any variant in a group is selected. */
	function isGroupSelected(group: GroupedQuality): boolean {
		return group.variants.some(v => isSelected(v.name));
	}

	/** Get the selected variant(s) from a group. */
	function getSelectedVariants(group: GroupedQuality): GameQuality[] {
		return group.variants.filter(v => isSelected(v.name));
	}

	/** Get selected quality ID by name. */
	function getSelectedId(name: string): string | null {
		return $character?.qualities.find((q) => q.name === name)?.id ?? null;
	}

	/** Calculate total BP from positive qualities. */
	function getPositiveBP(char: typeof $character): number {
		if (!char) return 0;
		return char.qualities
			.filter((q) => q.category === 'Positive')
			.reduce((sum, q) => sum + q.bp, 0);
	}

	/** Calculate total BP from negative qualities (should be negative). */
	function getNegativeBP(char: typeof $character): number {
		if (!char) return 0;
		return char.qualities
			.filter((q) => q.category === 'Negative')
			.reduce((sum, q) => sum + Math.abs(q.bp), 0);
	}

	/** Calculate BP from metagenetic qualities (for Changelings). */
	function getMetageneticBP(char: typeof $character): number {
		if (!char) return 0;
		return char.qualities
			.filter((q) => {
				// Get base name for variants
				const baseName = q.name.replace(/\s+#\d+$/, '');
				const gameQual = getGameQuality(baseName);
				return gameQual?.mutant === true;
			})
			.reduce((sum, q) => sum + Math.abs(q.bp), 0);
	}

	/** Check if character has Changeling quality. */
	function hasChangeling(char: typeof $character): boolean {
		if (!char) return false;
		return char.qualities.some((q) => q.name.startsWith('Changeling'));
	}

	/** Handle quality selection (for ungrouped qualities). */
	function toggleQuality(quality: GameQuality): void {
		if (isSelected(quality.name)) {
			const id = getSelectedId(quality.name);
			if (id) removeQuality(id);
		} else {
			const category = quality.bp >= 0 ? 'Positive' : 'Negative';
			addQuality(quality.name, category, quality.bp);
		}
	}

	/** Handle group click - open variant selector if group, else toggle. */
	function handleGroupClick(group: GroupedQuality): void {
		if (group.isGroup) {
			openVariantGroup = group;
		} else {
			toggleQuality(group.variants[0]);
		}
	}

	/** Select a specific variant from the popover. */
	function selectVariant(quality: GameQuality): void {
		if (isSelected(quality.name)) {
			const id = getSelectedId(quality.name);
			if (id) removeQuality(id);
		} else {
			const category = quality.bp >= 0 ? 'Positive' : 'Negative';
			addQuality(quality.name, category, quality.bp);
		}
		openVariantGroup = null;
	}

	/** Close the variant selector. */
	function closeVariantSelector(): void {
		openVariantGroup = null;
	}

	/** Get game quality data by name for tooltip display. */
	function getGameQuality(name: string): GameQuality | undefined {
		const allQualities = [...($positiveQualities ?? []), ...($negativeQualities ?? [])];
		return allQualities.find(q => q.name === name);
	}

	/** Get formatted bonuses for a quality. */
	function getQualityBonuses(quality: GameQuality): FormattedBonus[] {
		return formatQualityBonus(quality.bonus);
	}

	/** Check if a quality can be taken multiple times. */
	function canTakeAgain(qualityName: string): boolean {
		// Get base name (remove #N suffix if present)
		const baseName = qualityName.replace(/\s+#\d+$/, '');
		const gameQual = getGameQuality(baseName);
		return gameQual?.limit === false;
	}

	/** Handle take again button click. */
	function handleTakeAgain(quality: { name: string; category: 'Positive' | 'Negative'; bp: number }): void {
		// Get base name (remove #N suffix if present)
		const baseName = quality.name.replace(/\s+#\d+$/, '');
		addQualityAgain(baseName, quality.category, quality.bp);
	}

	// Group qualities
	$: groupedPositive = groupQualities($positiveQualities ?? []);
	$: groupedNegative = groupQualities($negativeQualities ?? []);
	
	// Filter grouped qualities
	$: filteredPositive = filterGroupedQualities(groupedPositive, searchQuery);
	$: filteredNegative = filterGroupedQualities(groupedNegative, searchQuery);
	$: displayGroups = activeTab === 'positive' ? filteredPositive : filteredNegative;
	
	// BP counters - pass $character to make reactive
	$: positiveBP = getPositiveBP($character);
	$: negativeBP = getNegativeBP($character);
	$: metageneticBP = getMetageneticBP($character);
	$: showMetageneticCounter = hasChangeling($character);
</script>

<div class="space-y-6">
	<!-- BP Summary -->
	<div class="grid grid-cols-2 gap-4">
		<div class="cw-panel p-4">
			<div class="flex items-center justify-between">
				<span class="text-text-secondary">Positive Qualities:</span>
				<span
					class="font-mono text-xl
						{positiveBP > MAX_POSITIVE_BP ? 'text-error-main' : 'text-success-main'}"
				>
					{positiveBP} / {MAX_POSITIVE_BP} BP
				</span>
			</div>
		</div>
		<div class="cw-panel p-4">
			<div class="flex items-center justify-between">
				<span class="text-text-secondary">Negative Qualities:</span>
				<span
					class="font-mono text-xl
						{negativeBP > MAX_NEGATIVE_BP ? 'text-error-main' : 'text-warning-main'}"
				>
					{negativeBP} / {MAX_NEGATIVE_BP} BP
				</span>
			</div>
		</div>
	</div>
	
	<!-- Metagenetic Counter (only shown for Changelings) -->
	{#if showMetageneticCounter}
		<div class="cw-panel p-4 bg-purple-50 border-purple-200">
			<div class="flex items-center justify-between">
				<span class="text-purple-800 flex items-center gap-2">
					<span class="material-icons text-sm">biotech</span>
					Metagenetic Qualities:
				</span>
				<span class="font-mono text-xl text-purple-600">
					{metageneticBP} BP
				</span>
			</div>
			<p class="text-purple-600 text-xs mt-1">
				Positive metagenetic qualities for SURGE characters
			</p>
		</div>
	{/if}

	<!-- Tabs and Search -->
	<div class="flex flex-wrap gap-4 items-center">
		<div class="flex gap-1">
			<button
				class="px-4 py-2 rounded transition-colors
					{activeTab === 'positive'
						? 'bg-success-main text-white'
						: 'bg-surface text-text-secondary hover:bg-surface-variant'}"
				on:click={() => (activeTab = 'positive')}
			>
				Positive ({$positiveQualities?.length ?? 0})
			</button>
			<button
				class="px-4 py-2 rounded transition-colors
					{activeTab === 'negative'
						? 'bg-warning-main text-black'
						: 'bg-surface text-text-secondary hover:bg-surface-variant'}"
				on:click={() => (activeTab = 'negative')}
			>
				Negative ({$negativeQualities?.length ?? 0})
			</button>
		</div>

		<input
			type="text"
			placeholder="Search qualities..."
			class="cw-input flex-1 min-w-[200px]"
			bind:value={searchQuery}
		/>
	</div>

	<!-- Selected Qualities -->
	{#if $character && $character.qualities.length > 0}
		<div class="cw-card">
			<h3 class="cw-card-header mb-3">Selected Qualities</h3>
			<div class="flex flex-wrap gap-2">
				{#each $character.qualities as quality}
					{@const baseQualName = quality.name.replace(/\s+#\d+$/, '')}
					{@const gameQual = getGameQuality(baseQualName)}
					{@const bonuses = gameQual ? getQualityBonuses(gameQual) : []}
					{@const hasTooltip = gameQual?.effect || bonuses.length > 0}
					{@const repeatable = canTakeAgain(quality.name)}
					<div class="flex items-center gap-1 px-3 py-1 rounded text-sm
						{quality.category === 'Positive'
							? 'bg-success-main/20 text-success-main border border-success-main/30'
							: 'bg-warning-main/20 text-warning-main border border-warning-main/30'}">
						<span class="{hasTooltip ? 'cursor-help' : ''}">
							{quality.name}
							<Tooltip show={hasTooltip} maxWidth="20rem">
								<div slot="content" class="text-left">
									{#if gameQual?.effect}
										<div class="mb-1">{gameQual.effect}</div>
									{/if}
									{#if bonuses.length > 0}
										<div class="border-t border-gray-700 pt-1 mt-1 space-y-0.5">
											{#each bonuses as bonus}
												<div class:text-green-400={bonus.positive}
													 class:text-red-400={!bonus.positive}>
													{bonus.text}
												</div>
											{/each}
										</div>
									{/if}
								</div>
							</Tooltip>
						</span>
						<span class="opacity-70">{quality.bp} BP</span>
						{#if repeatable}
							<button
								class="p-0.5 hover:bg-white/20 rounded transition-colors"
								title="Take this quality again"
								on:click|stopPropagation={() => handleTakeAgain(quality)}
							>
								<span class="material-icons text-xs">add</span>
							</button>
						{/if}
						<button
							class="p-0.5 hover:bg-white/20 rounded transition-colors"
							title="Remove quality"
							on:click|stopPropagation={() => removeQuality(quality.id)}
						>
							<span class="material-icons text-xs">close</span>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Quality List (Grouped) -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
		{#each displayGroups as group}
			{@const selected = isGroupSelected(group)}
			{@const selectedVariants = getSelectedVariants(group)}
			{@const bonuses = getQualityBonuses(group.representative)}
			{@const hasTooltip = group.representative.effect || bonuses.length > 0}
			<button
				class="cw-card text-left p-3 transition-all group relative
					{selected
						? activeTab === 'positive'
							? 'border-success-main bg-success-main/10'
							: 'border-warning-main bg-warning-main/10'
						: 'hover:border-primary-main/50'}"
				on:click={() => handleGroupClick(group)}
			>
				<div class="flex items-start justify-between gap-2">
					<div class="flex-1">
						<h4
							class="font-medium
								{selected
									? activeTab === 'positive'
										? 'text-success-main'
										: 'text-warning-main'
									: 'text-text-primary'}"
						>
							{group.displayName}
							{#if group.isGroup}
								<span class="text-text-muted text-xs ml-1">({group.variants.length} options)</span>
							{/if}
						</h4>
						{#if selectedVariants.length > 0}
							<span class="text-xs text-success-main">
								Selected: {selectedVariants.map(v => v.name.replace(group.baseName, '').trim().replace(/^\(|\)$/g, '')).join(', ')}
							</span>
						{/if}
					</div>
					<span
						class="cw-badge text-xs
							{activeTab === 'positive' ? 'cw-badge-success' : 'cw-badge-warning'}"
					>
						{formatBPRange(group)}
					</span>
				</div>

				{#if group.representative.effect}
					<p class="text-text-secondary text-xs mt-2 line-clamp-2">{group.representative.effect}</p>
				{/if}

				<div class="text-text-muted text-xs mt-2">
					{group.source} p.{group.page}
				</div>

				<Tooltip show={hasTooltip} maxWidth="24rem">
					<div slot="content" class="text-left">
						{#if group.representative.effect}
							<div class="mb-2">{group.representative.effect}</div>
						{/if}
						{#if bonuses.length > 0}
							<div class="border-t border-gray-700 pt-2 mt-1 space-y-1">
								<div class="text-xs text-gray-400 font-semibold">Mechanical Effects:</div>
								{#each bonuses as bonus}
									<div class:text-green-400={bonus.positive}
										 class:text-red-400={!bonus.positive}>
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

	<!-- Empty State -->
	{#if displayGroups.length === 0}
		<div class="cw-panel p-8 text-center">
			<p class="text-text-secondary">No qualities found matching your search.</p>
		</div>
	{/if}

	<!-- Variant Selector Modal -->
	{#if openVariantGroup !== null}
		<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
		<div 
			class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
			on:click={closeVariantSelector}
		>
			<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
			<div 
				class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
				on:click|stopPropagation
			>
				<div class="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
					<h3 class="text-lg font-semibold text-text-primary">{openVariantGroup.baseName}</h3>
					<button
						class="p-1 hover:bg-gray-100 rounded"
						on:click={closeVariantSelector}
					>
						<span class="material-icons text-text-muted">close</span>
					</button>
				</div>
				<div class="p-4 space-y-2">
					<p class="text-text-secondary text-sm mb-4">Select a variant:</p>
					{#each openVariantGroup.variants as variant}
						{@const variantSelected = isSelected(variant.name)}
						{@const variantBonuses = getQualityBonuses(variant)}
						<button
							class="w-full text-left p-3 rounded border transition-all
								{variantSelected 
									? 'border-success-main bg-success-main/10' 
									: 'border-gray-200 hover:border-primary-main/50 hover:bg-gray-50'}"
							on:click={() => selectVariant(variant)}
						>
							<div class="flex justify-between items-start">
								<div class="flex-1">
									<div class="font-medium {variantSelected ? 'text-success-main' : 'text-text-primary'}">
										{variant.name}
									</div>
									{#if variant.effect}
										<div class="text-text-secondary text-xs mt-1">{variant.effect}</div>
									{/if}
								</div>
								<span class="cw-badge cw-badge-success text-xs ml-2">
									{Math.abs(variant.bp)} BP
								</span>
							</div>
							{#if variantBonuses.length > 0}
								<div class="mt-2 pt-2 border-t border-gray-100 text-xs space-y-0.5">
									{#each variantBonuses as bonus}
										<div class:text-green-600={bonus.positive} class:text-red-600={!bonus.positive}>
											{bonus.text}
										</div>
									{/each}
								</div>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Help Text -->
	<div class="cw-panel p-4 text-sm">
		<h4 class="text-primary-dark font-semibold mb-2">Quality Guidelines</h4>
		<ul class="text-text-secondary space-y-1 list-disc list-inside">
			<li>Maximum 35 BP in positive qualities</li>
			<li>Maximum 35 BP from negative qualities</li>
			<li>Negative qualities give you bonus BP to spend elsewhere</li>
			<li>Some qualities have variants - click to see options</li>
		</ul>
	</div>
</div>


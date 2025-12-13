<script lang="ts">
	import {
		positiveQualities,
		negativeQualities,
		skills,
		type GameQuality
	} from '$stores/gamedata';
	import { character, addQuality, removeQuality, addQualityAgain } from '$stores/character';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { formatQualityBonus, qualityMatchesSearch, type FormattedBonus } from '$lib/utils/qualities';
	import { groupQualities, formatBPRange, filterQualitiesByMetatype, type GroupedQuality } from '$lib/utils/qualityGrouping';
	import { ATTRIBUTE_NAMES, type AttributeCode } from '$lib/types/attributes';

	/** Current tab - positive or negative qualities. */
	let activeTab: 'positive' | 'negative' = 'positive';

	/** Search filter for quality names. */
	let searchQuery = '';

	/** Currently open variant selector group (null if none open). */
	let openVariantGroup: GroupedQuality | null = null;

	/** Quality pending skill/attribute selection before being added. */
	let pendingSelectionQuality: {
		quality: GameQuality;
		category: 'Positive' | 'Negative';
		requiresSkill: boolean;
		requiresAttribute: boolean;
		skillBonus?: number;
		skillMax?: number;
		attributeBonus?: number;
		attributeMin?: number;
		attributeMax?: number;
	} | null = null;

	/** Selected skill for pending quality. */
	let selectedSkillForQuality: string = '';

	/** Selected attribute for pending quality. */
	let selectedAttributeForQuality: string = '';

	/** Selectable attributes for quality bonuses (excludes special attributes). */
	const SELECTABLE_ATTRIBUTES: { code: AttributeCode; name: string }[] = [
		{ code: 'bod', name: 'Body' },
		{ code: 'agi', name: 'Agility' },
		{ code: 'rea', name: 'Reaction' },
		{ code: 'str', name: 'Strength' },
		{ code: 'cha', name: 'Charisma' },
		{ code: 'int', name: 'Intuition' },
		{ code: 'log', name: 'Logic' },
		{ code: 'wil', name: 'Willpower' },
		{ code: 'edg', name: 'Edge' }
	];

	/** Check if a quality requires skill selection. */
	function requiresSkillSelection(quality: GameQuality): boolean {
		return quality.bonus?.selectskill !== undefined;
	}

	/** Check if a quality requires attribute selection. */
	function requiresAttributeSelection(quality: GameQuality): boolean {
		return quality.bonus?.selectattribute !== undefined;
	}

	/** Open the selection modal for a quality that requires choices. */
	function openSelectionModal(quality: GameQuality): void {
		const category = quality.bp >= 0 ? 'Positive' : 'Negative';
		const skillBonus = quality.bonus?.selectskill?.bonus;
		const skillMax = quality.bonus?.selectskill?.max;
		const attributeBonus = quality.bonus?.selectattribute?.val;
		const attributeMin = quality.bonus?.selectattribute?.min;
		const attributeMax = quality.bonus?.selectattribute?.max;

		pendingSelectionQuality = {
			quality,
			category,
			requiresSkill: requiresSkillSelection(quality),
			requiresAttribute: requiresAttributeSelection(quality),
			...(skillBonus !== undefined ? { skillBonus } : {}),
			...(skillMax !== undefined ? { skillMax } : {}),
			...(attributeBonus !== undefined ? { attributeBonus } : {}),
			...(attributeMin !== undefined ? { attributeMin } : {}),
			...(attributeMax !== undefined ? { attributeMax } : {})
		};
		selectedSkillForQuality = '';
		selectedAttributeForQuality = '';
	}

	/** Close the selection modal without adding the quality. */
	function closeSelectionModal(): void {
		pendingSelectionQuality = null;
		selectedSkillForQuality = '';
		selectedAttributeForQuality = '';
	}

	/** Confirm the selection and add the quality. */
	function confirmSelection(): void {
		if (!pendingSelectionQuality) return;

		const { quality, category, requiresSkill, requiresAttribute } = pendingSelectionQuality;

		// Validate selections
		if (requiresSkill && !selectedSkillForQuality) return;
		if (requiresAttribute && !selectedAttributeForQuality) return;

		// Build options object, only including properties that have values
		const options: { selectedSkill?: string; selectedAttribute?: string } = {};
		if (requiresSkill && selectedSkillForQuality) {
			options.selectedSkill = selectedSkillForQuality;
		}
		if (requiresAttribute && selectedAttributeForQuality) {
			options.selectedAttribute = selectedAttributeForQuality;
		}

		// Add the quality with selections
		addQuality(quality.name, category, quality.bp, options);

		closeSelectionModal();
	}

	/** Check if selection is valid for confirming. */
	function isSelectionValid(): boolean {
		if (!pendingSelectionQuality) return false;
		const { requiresSkill, requiresAttribute } = pendingSelectionQuality;
		if (requiresSkill && !selectedSkillForQuality) return false;
		if (requiresAttribute && !selectedAttributeForQuality) return false;
		return true;
	}

	/** Get attribute name from code (helper for templates). */
	function getAttributeName(code: string | undefined): string {
		if (!code) return '';
		return ATTRIBUTE_NAMES[code as AttributeCode] ?? code;
	}

	/** Maximum BP from positive qualities. */
	const MAX_POSITIVE_BP = 35;

	/** Maximum BP from negative qualities. */
	const MAX_NEGATIVE_BP = 35;

	/** Filter grouped qualities by search query.
	 * Searches name, effect description, bonus text, and tags.
	 */
	function filterGroupedQualities(groups: GroupedQuality[], search: string): GroupedQuality[] {
		if (!search) return groups;
		return groups.filter((g) => {
			// Check if any variant matches the search (searches name, effect, bonuses, tags)
			return g.variants.some(v => qualityMatchesSearch(v, search));
		});
	}

	/** Check if quality is already selected. Pass character explicitly for reactivity. */
	function isSelected(name: string, char: typeof $character): boolean {
		return char?.qualities.some((q) => q.name === name) ?? false;
	}

	/** Check if any variant in a group is selected. Pass character explicitly for reactivity. */
	function isGroupSelected(group: GroupedQuality, char: typeof $character): boolean {
		return group.variants.some(v => isSelected(v.name, char));
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

	/** Check if adding a quality would exceed the BP limit. */
	function wouldExceedLimit(quality: GameQuality): boolean {
		const category = quality.bp >= 0 ? 'Positive' : 'Negative';
		const currentBP = category === 'Positive' ? positiveBP : negativeBP;
		const maxBP = category === 'Positive' ? MAX_POSITIVE_BP : MAX_NEGATIVE_BP;
		return currentBP + Math.abs(quality.bp) > maxBP;
	}

	/** Handle quality selection (for ungrouped qualities). */
	function toggleQuality(quality: GameQuality): void {
		if (isSelected(quality.name, $character)) {
			const id = getSelectedId(quality.name);
			if (id) removeQuality(id);
		} else {
			// Check BP limit before adding
			if (wouldExceedLimit(quality)) return;

			// Check if quality requires skill/attribute selection
			if (requiresSkillSelection(quality) || requiresAttributeSelection(quality)) {
				openSelectionModal(quality);
				return;
			}

			const category = quality.bp >= 0 ? 'Positive' : 'Negative';
			addQuality(quality.name, category, quality.bp);
		}
	}

	/** Handle group click - open variant selector if group, else toggle. */
	function handleGroupClick(group: GroupedQuality): void {
		if (group.isGroup) {
			openVariantGroup = group;
		} else {
			const firstVariant = group.variants[0];
			if (firstVariant) {
				toggleQuality(firstVariant);
			}
		}
	}

	/** Select a specific variant from the popover. */
	function selectVariant(quality: GameQuality): void {
		if (isSelected(quality.name, $character)) {
			const id = getSelectedId(quality.name);
			if (id) removeQuality(id);
		} else {
			// Check BP limit before adding
			if (wouldExceedLimit(quality)) return;

			// Check if quality requires skill/attribute selection
			if (requiresSkillSelection(quality) || requiresAttributeSelection(quality)) {
				openVariantGroup = null; // Close variant modal first
				openSelectionModal(quality);
				return;
			}

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
		// Check BP limit before adding
		const currentBP = quality.category === 'Positive' ? positiveBP : negativeBP;
		const maxBP = quality.category === 'Positive' ? MAX_POSITIVE_BP : MAX_NEGATIVE_BP;
		if (currentBP + Math.abs(quality.bp) > maxBP) return;

		// Get base name (remove #N suffix if present)
		const baseName = quality.name.replace(/\s+#\d+$/, '');
		addQualityAgain(baseName, quality.category, quality.bp);
	}

	// Get character's metatype for filtering
	$: characterMetatype = $character?.identity.metatype;

	// Filter qualities by metatype restrictions (e.g., Infected qualities)
	$: metatypeFilteredPositive = filterQualitiesByMetatype($positiveQualities ?? [], characterMetatype);
	$: metatypeFilteredNegative = filterQualitiesByMetatype($negativeQualities ?? [], characterMetatype);

	// Group qualities
	$: groupedPositive = groupQualities(metatypeFilteredPositive);
	$: groupedNegative = groupQualities(metatypeFilteredNegative);

	// Filter grouped qualities by search query
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
			placeholder="Search name, description, effects..."
			class="cw-input flex-1 min-w-[200px]"
			bind:value={searchQuery}
		/>
	</div>

	<!-- Selected Qualities (always visible, split positive/negative) -->
	<div class="grid grid-cols-2 gap-4">
		<!-- Positive Qualities (Left) -->
		<div class="cw-panel p-3 max-h-[600px] overflow-y-auto">
			<h4 class="text-xs font-semibold text-success-main uppercase tracking-wide mb-2 flex items-center gap-1">
				<span class="material-icons text-xs">add_circle</span>
				Positive ({positiveBP}/{MAX_POSITIVE_BP} BP)
			</h4>
			<div class="flex flex-wrap content-start gap-y-px gap-x-[5%] min-h-[4.5rem]">
				{#each ($character?.qualities ?? []).filter(q => q.category === 'Positive') as quality}
					{@const baseQualName = quality.name.replace(/\s+#\d+$/, '')}
					{@const gameQual = getGameQuality(baseQualName)}
					{@const bonuses = gameQual ? getQualityBonuses(gameQual) : []}
					{@const hasTooltip = !!gameQual?.effect || bonuses.length > 0}
					{@const repeatable = canTakeAgain(quality.name)}
					{@const hasSelection = quality.selectedSkill || quality.selectedAttribute}
					{@const selectionLabel = quality.selectedSkill || getAttributeName(quality.selectedAttribute)}
					<button
						class="flex items-center gap-0.5 px-1.5 py-0 rounded text-xs w-[45%] text-left
							bg-success-main/20 text-success-main border border-success-main/30
							hover:bg-success-main/30 transition-colors cursor-pointer"
						on:click={() => removeQuality(quality.id)}
						title="Click to remove">
						<span class="flex-1 truncate {hasTooltip ? 'cursor-help' : ''}">
							{quality.name}{#if hasSelection}: {selectionLabel}{/if}
							<Tooltip show={hasTooltip} maxWidth="20rem">
								<div slot="content" class="text-left">
									{#if gameQual?.effect}
										<div class="mb-1">{gameQual.effect}</div>
									{/if}
									{#if hasSelection}
										<div class="text-green-400 text-xs mb-1">
											Selected: {selectionLabel}
										</div>
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
						<span class="opacity-70 text-xs">{quality.bp}</span>
						{#if repeatable && positiveBP + quality.bp <= MAX_POSITIVE_BP}
							<span
								class="p-0.5 hover:bg-white/20 rounded transition-colors"
								title="Take this quality again"
								on:click|stopPropagation={() => handleTakeAgain(quality)}
								on:keydown|stopPropagation={(e) => e.key === 'Enter' && handleTakeAgain(quality)}
								role="button"
								tabindex="0"
							>
								<span class="material-icons text-xs">add</span>
							</span>
						{/if}
					</button>
				{:else}
					<span class="text-text-muted text-xs italic">No positive qualities selected</span>
				{/each}
			</div>
		</div>

		<!-- Negative Qualities (Right) -->
		<div class="cw-panel p-3 max-h-[600px] overflow-y-auto">
			<h4 class="text-xs font-semibold text-warning-main uppercase tracking-wide mb-2 flex items-center gap-1">
				<span class="material-icons text-xs">remove_circle</span>
				Negative ({negativeBP}/{MAX_NEGATIVE_BP} BP)
			</h4>
			<div class="flex flex-wrap content-start gap-y-px gap-x-[5%] min-h-[4.5rem]">
				{#each ($character?.qualities ?? []).filter(q => q.category === 'Negative') as quality}
					{@const baseQualName = quality.name.replace(/\s+#\d+$/, '')}
					{@const gameQual = getGameQuality(baseQualName)}
					{@const bonuses = gameQual ? getQualityBonuses(gameQual) : []}
					{@const hasTooltip = !!gameQual?.effect || bonuses.length > 0}
					{@const repeatable = canTakeAgain(quality.name)}
					{@const hasSelection = quality.selectedSkill || quality.selectedAttribute}
					{@const selectionLabel = quality.selectedSkill || getAttributeName(quality.selectedAttribute)}
					<button
						class="flex items-center gap-0.5 px-1.5 py-0 rounded text-xs w-[45%] text-left
							bg-warning-main/20 text-warning-main border border-warning-main/30
							hover:bg-warning-main/30 transition-colors cursor-pointer"
						on:click={() => removeQuality(quality.id)}
						title="Click to remove">
						<span class="flex-1 truncate {hasTooltip ? 'cursor-help' : ''}">
							{quality.name}{#if hasSelection}: {selectionLabel}{/if}
							<Tooltip show={hasTooltip} maxWidth="20rem">
								<div slot="content" class="text-left">
									{#if gameQual?.effect}
										<div class="mb-1">{gameQual.effect}</div>
									{/if}
									{#if hasSelection}
										<div class="text-red-400 text-xs mb-1">
											Selected: {selectionLabel}
										</div>
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
						<span class="opacity-70 text-xs">{quality.bp}</span>
						{#if repeatable && negativeBP + Math.abs(quality.bp) <= MAX_NEGATIVE_BP}
							<span
								class="p-0.5 hover:bg-white/20 rounded transition-colors"
								title="Take this quality again"
								on:click|stopPropagation={() => handleTakeAgain(quality)}
								on:keydown|stopPropagation={(e) => e.key === 'Enter' && handleTakeAgain(quality)}
								role="button"
								tabindex="0"
							>
								<span class="material-icons text-xs">add</span>
							</span>
						{/if}
					</button>
				{:else}
					<span class="text-text-muted text-xs italic">No negative qualities selected</span>
				{/each}
			</div>
		</div>
	</div>

	<!-- Quality List (Grouped) -->
	<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
		{#each displayGroups as group}
			{@const selected = isGroupSelected(group, $character)}
			{@const bonuses = getQualityBonuses(group.representative)}
			{@const hasTooltip = !!group.representative.effect || bonuses.length > 0}
			<button
				class="cw-card text-left p-2 transition-all group relative
					{selected ? 'cw-card-selected' : 'hover:border-primary-main/50'}"
				on:click={() => handleGroupClick(group)}
			>
				<div class="flex items-start justify-between gap-1">
					<div class="flex-1 min-w-0">
						<h4 class="font-medium text-sm text-text-primary truncate">
							{group.displayName}
							{#if group.isGroup}
								<span class="text-text-muted text-xs">({group.variants.length})</span>
							{/if}
						</h4>
					</div>
					<span
						class="cw-badge text-xs shrink-0
							{activeTab === 'positive' ? 'cw-badge-success' : 'cw-badge-warning'}"
					>
						{formatBPRange(group)}
					</span>
				</div>

				{#if group.representative.effect}
					<p class="text-text-secondary text-xs mt-1 line-clamp-2">{group.representative.effect}</p>
				{/if}

				<div class="text-text-muted text-xs mt-1">
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
				class="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto"
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
				<div class="p-4">
					<p class="text-text-secondary text-sm mb-4">Select a variant:</p>
					<div class="grid grid-cols-2 gap-2">
					{#each openVariantGroup.variants as variant}
						{@const variantSelected = isSelected(variant.name, $character)}
						{@const variantBonuses = getQualityBonuses(variant)}
						<button
							type="button"
							class="w-full text-left p-3 rounded border transition-all
								{variantSelected
									? 'cw-card-selected'
									: 'border-gray-200 hover:border-primary-main/50 hover:bg-gray-50'}"
							on:click|stopPropagation={() => selectVariant(variant)}
						>
							<div class="flex justify-between items-start">
								<div class="flex-1">
									<div class="font-medium {variantSelected ? 'text-secondary-main' : 'text-text-primary'}">
										{variant.name}
									</div>
									{#if variant.effect}
										<div class="text-text-secondary text-xs mt-1">{variant.effect}</div>
									{/if}
								</div>
								<span class="cw-badge text-xs ml-2 {activeTab === 'positive' ? 'cw-badge-success' : 'cw-badge-warning'}">
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
		</div>
	{/if}

	<!-- Skill/Attribute Selection Modal -->
	{#if pendingSelectionQuality !== null}
		<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
		<div
			class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
			on:click={closeSelectionModal}
		>
			<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
			<div
				class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
				on:click|stopPropagation
			>
				<div class="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
					<h3 class="text-lg font-semibold text-text-primary">{pendingSelectionQuality.quality.name}</h3>
					<button
						type="button"
						class="p-1 hover:bg-gray-100 rounded"
						on:click={closeSelectionModal}
					>
						<span class="material-icons text-text-muted">close</span>
					</button>
				</div>
				<div class="p-4 space-y-4">
					<!-- Quality description -->
					{#if pendingSelectionQuality.quality.effect}
						<p class="text-text-secondary text-sm">{pendingSelectionQuality.quality.effect}</p>
					{/if}

					<!-- Skill Selection -->
					{#if pendingSelectionQuality.requiresSkill}
						<div class="space-y-2">
							<label class="block text-sm font-medium text-text-primary">
								Select Skill
								{#if pendingSelectionQuality.skillMax !== undefined}
									<span class="text-xs text-green-600 ml-1">
										(+{pendingSelectionQuality.skillMax} to max rating)
									</span>
								{:else if pendingSelectionQuality.skillBonus !== undefined}
									<span class="text-xs text-text-muted ml-1">
										({pendingSelectionQuality.skillBonus >= 0 ? '+' : ''}{pendingSelectionQuality.skillBonus} bonus)
									</span>
								{/if}
							</label>
							<select
								class="cw-input w-full"
								bind:value={selectedSkillForQuality}
							>
								<option value="">-- Choose a skill --</option>
								{#each ($skills ?? []).sort((a, b) => a.name.localeCompare(b.name)) as skill}
									<option value={skill.name}>{skill.name}</option>
								{/each}
							</select>
						</div>
					{/if}

					<!-- Attribute Selection -->
					{#if pendingSelectionQuality.requiresAttribute}
						<div class="space-y-2">
							<label class="block text-sm font-medium text-text-primary">
								Select Attribute
								{#if pendingSelectionQuality.attributeMax !== undefined}
									<span class="text-xs text-text-muted ml-1">
										(+{pendingSelectionQuality.attributeMax} to max)
									</span>
								{:else if pendingSelectionQuality.attributeMin !== undefined}
									<span class="text-xs text-red-600 ml-1">
										(-{pendingSelectionQuality.attributeMin} to max)
									</span>
								{/if}
							</label>
							<select
								class="cw-input w-full"
								bind:value={selectedAttributeForQuality}
							>
								<option value="">-- Choose an attribute --</option>
								{#each SELECTABLE_ATTRIBUTES as attr}
									<option value={attr.code}>{attr.name}</option>
								{/each}
							</select>
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="flex gap-3 pt-2">
						<button
							type="button"
							class="flex-1 px-4 py-2 rounded border border-gray-300 text-text-secondary hover:bg-gray-50 transition-colors"
							on:click={closeSelectionModal}
						>
							Cancel
						</button>
						<button
							type="button"
							class="flex-1 px-4 py-2 rounded transition-colors
								{isSelectionValid()
									? pendingSelectionQuality.category === 'Positive'
										? 'bg-success-main text-white hover:bg-success-main/90'
										: 'bg-warning-main text-black hover:bg-warning-main/90'
									: 'bg-gray-200 text-gray-400 cursor-not-allowed'}"
							disabled={!isSelectionValid()}
							on:click={confirmSelection}
						>
							Add Quality
						</button>
					</div>
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


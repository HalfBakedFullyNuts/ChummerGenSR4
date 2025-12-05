<script lang="ts">
	import { gameData, metatypes } from '$stores/gamedata';
	import { character, setMetatype } from '$stores/character';
	import type { Metatype } from '$types';

	let selectedCategory = 'Metahuman';
	let hasAutoSelected = false;

	// Auto-select Human if no metatype is selected
	$: if ($gameData && $character && !$character.identity.metatype && !hasAutoSelected) {
		hasAutoSelected = true;
		setMetatype($gameData, 'Human', null);
	}

	function getCategories(types: readonly Metatype[]): string[] {
		const cats = new Set(types.map((m) => m.category));
		// Sort with Metahuman first
		return Array.from(cats).sort((a, b) => {
			if (a === 'Metahuman') return -1;
			if (b === 'Metahuman') return 1;
			return a.localeCompare(b);
		});
	}

	function filterMetatypes(
		types: readonly Metatype[],
		category: string
	): Metatype[] {
		return types.filter((m) => m.category === category);
	}

	function selectMetatype(name: string): void {
		if (!$gameData) return;
		setMetatype($gameData, name, null);
	}

	function selectMetavariant(metatypeName: string, variantName: string): void {
		if (!$gameData) return;
		setMetatype($gameData, metatypeName, variantName);
	}

	function formatLimits(min: number, max: number): string {
		return `${min}/${max}`;
	}

	$: categories = $metatypes ? getCategories($metatypes) : [];
	$: filteredMetatypes = $metatypes
		? filterMetatypes($metatypes, selectedCategory)
		: [];
	$: selectedMetatype = $character?.identity.metatype ?? null;
	$: selectedVariant = $character?.identity.metavariant ?? null;
</script>

<div class="space-y-4">
	<!-- Category Tabs -->
	<div class="cw-panel p-3">
		<div class="flex flex-wrap gap-2">
			{#each categories as cat}
				<button
					class="cw-btn px-4 py-2 text-xs uppercase tracking-wide transition-all
						{selectedCategory === cat
							? 'cw-btn-primary'
							: 'cw-btn-secondary'}"
					on:click={() => (selectedCategory = cat)}
				>
					{cat}
				</button>
			{/each}
		</div>
	</div>

	<!-- Metatype Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
		{#each filteredMetatypes as metatype}
			{@const isSelected = selectedMetatype === metatype.name && !selectedVariant}
			{@const isThisMetatypeSelected = selectedMetatype === metatype.name}
			{@const activeVariant = isThisMetatypeSelected && selectedVariant
				? metatype.metavariants.find(v => v.name === selectedVariant)
				: null}
			{@const isHighlighted = isSelected || activeVariant}
			{@const displayBP = activeVariant ? activeVariant.bp : metatype.bp}
			<button
				class="text-left transition-all flex flex-col rounded-lg p-4
					{isHighlighted
						? 'bg-primary-main/10 border-2 border-primary-main shadow-lg shadow-primary-main/20'
						: 'bg-white border border-gray-200 shadow-md hover:shadow-lg hover:border-primary-main/50'}"
				on:click={() => selectMetatype(metatype.name)}
			>
				<!-- Fixed Top Section: Header + Attributes -->
				<div>
					<!-- Header -->
					<div class="flex items-center justify-between mb-3">
						<h3 class="font-medium text-black">
							{metatype.name}
							{#if activeVariant}
								<span class="text-sm font-normal text-gray-700 ml-1">({selectedVariant})</span>
							{/if}
						</h3>
						<span class="cw-bp-cost {isHighlighted ? 'bg-primary-main text-black' : ''}">{displayBP} BP</span>
					</div>

					<!-- Attributes Grid -->
					<div class="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
						<div class="flex justify-between items-center py-1">
							<span class="text-black">Body</span>
							<span class="text-black font-medium">
								{formatLimits(metatype.attributes.bod.min, metatype.attributes.bod.max)}
							</span>
						</div>
						<div class="flex justify-between items-center py-1">
							<span class="text-black">Agility</span>
							<span class="text-black font-medium">
								{formatLimits(metatype.attributes.agi.min, metatype.attributes.agi.max)}
							</span>
						</div>
						<div class="flex justify-between items-center py-1">
							<span class="text-black">Reaction</span>
							<span class="text-black font-medium">
								{formatLimits(metatype.attributes.rea.min, metatype.attributes.rea.max)}
							</span>
						</div>
						<div class="flex justify-between items-center py-1">
							<span class="text-black">Strength</span>
							<span class="text-black font-medium">
								{formatLimits(metatype.attributes.str.min, metatype.attributes.str.max)}
							</span>
						</div>
						<div class="flex justify-between items-center py-1">
							<span class="text-black">Charisma</span>
							<span class="text-black font-medium">
								{formatLimits(metatype.attributes.cha.min, metatype.attributes.cha.max)}
							</span>
						</div>
						<div class="flex justify-between items-center py-1">
							<span class="text-black">Intuition</span>
							<span class="text-black font-medium">
								{formatLimits(metatype.attributes.int.min, metatype.attributes.int.max)}
							</span>
						</div>
						<div class="flex justify-between items-center py-1">
							<span class="text-black">Logic</span>
							<span class="text-black font-medium">
								{formatLimits(metatype.attributes.log.min, metatype.attributes.log.max)}
							</span>
						</div>
						<div class="flex justify-between items-center py-1">
							<span class="text-black">Willpower</span>
							<span class="text-black font-medium">
								{formatLimits(metatype.attributes.wil.min, metatype.attributes.wil.max)}
							</span>
						</div>
						<div class="flex justify-between items-center py-1">
							<span class="text-black">Edge</span>
							<span class="text-black font-medium">
								{formatLimits(metatype.attributes.edg.min, metatype.attributes.edg.max)}
							</span>
						</div>
					</div>
				</div>

				<!-- Flexible Middle Section: Qualities (grows to fill space) -->
				<div class="flex-grow mt-3">
					{#if metatype.qualities.positive.length > 0 || metatype.qualities.negative.length > 0}
						<div class="text-xs space-y-1 border-t border-gray-200 pt-2">
							{#if metatype.qualities.positive.length > 0}
								<div class="flex items-start gap-1">
									<span class="material-icons text-green-600 text-xs">add_circle</span>
									<span class="text-green-700">{metatype.qualities.positive.join(', ')}</span>
								</div>
							{/if}
							{#if metatype.qualities.negative.length > 0}
								<div class="flex items-start gap-1">
									<span class="material-icons text-red-600 text-xs">remove_circle</span>
									<span class="text-red-700">{metatype.qualities.negative.join(', ')}</span>
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Fixed Bottom Section: Metavariants + Source (pushed to bottom) -->
				<div class="mt-auto pt-2">
					<!-- Metavariants -->
					{#if metatype.metavariants.length > 0}
						<div class="border-t border-gray-200 pt-2 mb-2">
							<div class="flex items-center gap-1 text-gray-500 text-xs mb-2">
								<span class="material-icons text-xs">alt_route</span>
								<span>Metavariants</span>
							</div>
							<div class="flex flex-wrap gap-1">
								{#each metatype.metavariants as variant}
									{@const isVariantSelected =
										selectedMetatype === metatype.name &&
										selectedVariant === variant.name}
									<button
										class="px-2 py-0.5 text-xs transition-all border rounded
											{isVariantSelected
												? 'bg-primary-main/20 border-primary-main text-black'
												: 'bg-gray-100 border-gray-300 text-gray-700 hover:border-primary-main/50'}"
										on:click|stopPropagation={() =>
											selectMetavariant(metatype.name, variant.name)}
									>
										{variant.name}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Source -->
					<div class="text-gray-500 text-xs flex items-center gap-1 border-t border-gray-200 pt-2">
						<span class="material-icons text-xs">menu_book</span>
						{metatype.source} p.{metatype.page}
					</div>
				</div>
			</button>
		{/each}
	</div>

	<!-- Empty State -->
	{#if filteredMetatypes.length === 0}
		<div class="cw-panel p-8 text-center">
			<span class="material-icons text-text-muted text-4xl mb-2">search_off</span>
			<p class="text-text-secondary">No metatypes found matching your criteria.</p>
		</div>
	{/if}
</div>

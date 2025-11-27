<script lang="ts">
	import { gameData, metatypes } from '$stores/gamedata';
	import { character, setMetatype } from '$stores/character';
	import type { Metatype } from '$types';

	/** Currently selected category filter. */
	let selectedCategory = 'Standard';

	/** Search filter for metatype names. */
	let searchQuery = '';

	/** Get unique categories from metatypes. */
	function getCategories(types: readonly Metatype[]): string[] {
		const cats = new Set(types.map((m) => m.category));
		return Array.from(cats).sort();
	}

	/** Filter metatypes by category and search. */
	function filterMetatypes(
		types: readonly Metatype[],
		category: string,
		search: string
	): Metatype[] {
		return types.filter((m) => {
			const matchesCategory = m.category === category;
			const matchesSearch =
				search === '' || m.name.toLowerCase().includes(search.toLowerCase());
			return matchesCategory && matchesSearch;
		});
	}

	/** Handle metatype selection. */
	function selectMetatype(name: string): void {
		if (!$gameData) return;
		setMetatype($gameData, name, null);
	}

	/** Handle metavariant selection. */
	function selectMetavariant(metatypeName: string, variantName: string): void {
		if (!$gameData) return;
		setMetatype($gameData, metatypeName, variantName);
	}

	/** Format attribute limits for display. */
	function formatLimits(min: number, max: number): string {
		return `${min}/${max}`;
	}

	$: categories = $metatypes ? getCategories($metatypes) : [];
	$: filteredMetatypes = $metatypes
		? filterMetatypes($metatypes, selectedCategory, searchQuery)
		: [];
	$: selectedMetatype = $character?.identity.metatype ?? null;
	$: selectedVariant = $character?.identity.metavariant ?? null;
</script>

<div class="space-y-6">
	<!-- Filters -->
	<div class="flex flex-wrap gap-4">
		<!-- Category Tabs -->
		<div class="flex gap-1">
			{#each categories as cat}
				<button
					class="px-3 py-1 rounded text-sm transition-colors
						{selectedCategory === cat
							? 'bg-accent-primary text-background'
							: 'bg-surface text-secondary-text hover:bg-surface-light'}"
					on:click={() => (selectedCategory = cat)}
				>
					{cat}
				</button>
			{/each}
		</div>

		<!-- Search -->
		<input
			type="text"
			placeholder="Search metatypes..."
			class="cw-input flex-1 min-w-[200px]"
			bind:value={searchQuery}
		/>
	</div>

	<!-- Metatype Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each filteredMetatypes as metatype}
			{@const isSelected = selectedMetatype === metatype.name && !selectedVariant}
			<button
				class="cw-card text-left transition-all
					{isSelected
						? 'border-accent-primary bg-accent-primary/10'
						: 'hover:border-accent-primary/50'}"
				on:click={() => selectMetatype(metatype.name)}
			>
				<!-- Header -->
				<div class="flex items-center justify-between mb-3">
					<h3 class="font-heading text-lg text-accent-primary">
						{metatype.name}
					</h3>
					<span class="cw-badge cw-badge-primary">
						{metatype.bp} BP
					</span>
				</div>

				<!-- Attributes -->
				<div class="grid grid-cols-3 gap-2 text-xs mb-3">
					<div>
						<span class="text-muted-text">BOD:</span>
						<span class="text-primary-text ml-1">
							{formatLimits(metatype.attributes.bod.min, metatype.attributes.bod.max)}
						</span>
					</div>
					<div>
						<span class="text-muted-text">AGI:</span>
						<span class="text-primary-text ml-1">
							{formatLimits(metatype.attributes.agi.min, metatype.attributes.agi.max)}
						</span>
					</div>
					<div>
						<span class="text-muted-text">REA:</span>
						<span class="text-primary-text ml-1">
							{formatLimits(metatype.attributes.rea.min, metatype.attributes.rea.max)}
						</span>
					</div>
					<div>
						<span class="text-muted-text">STR:</span>
						<span class="text-primary-text ml-1">
							{formatLimits(metatype.attributes.str.min, metatype.attributes.str.max)}
						</span>
					</div>
					<div>
						<span class="text-muted-text">CHA:</span>
						<span class="text-primary-text ml-1">
							{formatLimits(metatype.attributes.cha.min, metatype.attributes.cha.max)}
						</span>
					</div>
					<div>
						<span class="text-muted-text">INT:</span>
						<span class="text-primary-text ml-1">
							{formatLimits(metatype.attributes.int.min, metatype.attributes.int.max)}
						</span>
					</div>
					<div>
						<span class="text-muted-text">LOG:</span>
						<span class="text-primary-text ml-1">
							{formatLimits(metatype.attributes.log.min, metatype.attributes.log.max)}
						</span>
					</div>
					<div>
						<span class="text-muted-text">WIL:</span>
						<span class="text-primary-text ml-1">
							{formatLimits(metatype.attributes.wil.min, metatype.attributes.wil.max)}
						</span>
					</div>
					<div>
						<span class="text-muted-text">EDG:</span>
						<span class="text-primary-text ml-1">
							{formatLimits(metatype.attributes.edg.min, metatype.attributes.edg.max)}
						</span>
					</div>
				</div>

				<!-- Racial Qualities -->
				{#if metatype.qualities.positive.length > 0 || metatype.qualities.negative.length > 0}
					<div class="text-xs space-y-1 border-t border-surface-light pt-2">
						{#if metatype.qualities.positive.length > 0}
							<div class="text-success">
								+ {metatype.qualities.positive.join(', ')}
							</div>
						{/if}
						{#if metatype.qualities.negative.length > 0}
							<div class="text-error">
								- {metatype.qualities.negative.join(', ')}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Metavariants -->
				{#if metatype.metavariants.length > 0}
					<div class="mt-3 pt-2 border-t border-surface-light">
						<span class="text-muted-text text-xs block mb-2">Metavariants:</span>
						<div class="flex flex-wrap gap-1">
							{#each metatype.metavariants as variant}
								{@const isVariantSelected =
									selectedMetatype === metatype.name &&
									selectedVariant === variant.name}
								<button
									class="px-2 py-0.5 rounded text-xs transition-colors
										{isVariantSelected
											? 'bg-accent-cyan text-background'
											: 'bg-surface-light text-secondary-text hover:bg-accent-cyan/20'}"
									on:click|stopPropagation={() =>
										selectMetavariant(metatype.name, variant.name)}
								>
									{variant.name} ({variant.bp} BP)
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Source -->
				<div class="mt-2 text-muted-text text-xs">
					{metatype.source} p.{metatype.page}
				</div>
			</button>
		{/each}
	</div>

	<!-- Empty State -->
	{#if filteredMetatypes.length === 0}
		<div class="cw-panel p-8 text-center">
			<p class="text-secondary-text">No metatypes found matching your criteria.</p>
		</div>
	{/if}
</div>

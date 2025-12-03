<script lang="ts">
	import {
		positiveQualities,
		negativeQualities,
		type GameQuality
	} from '$stores/gamedata';
	import { character, addQuality, removeQuality } from '$stores/character';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { formatQualityBonus, type FormattedBonus } from '$lib/utils/qualities';

	/** Current tab - positive or negative qualities. */
	let activeTab: 'positive' | 'negative' = 'positive';

	/** Search filter for quality names. */
	let searchQuery = '';

	/** Maximum BP from positive qualities. */
	const MAX_POSITIVE_BP = 35;

	/** Maximum BP from negative qualities. */
	const MAX_NEGATIVE_BP = 35;

	/** Filter qualities by search query. */
	function filterQualities(quals: readonly GameQuality[], search: string): GameQuality[] {
		if (!search) return [...quals];
		const lower = search.toLowerCase();
		return quals.filter(
			(q) =>
				q.name.toLowerCase().includes(lower) ||
				(q.category?.toLowerCase().includes(lower) ?? false)
		);
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

	/** Get game quality data by name for tooltip display. */
	function getGameQuality(name: string): GameQuality | undefined {
		const allQualities = [...($positiveQualities ?? []), ...($negativeQualities ?? [])];
		return allQualities.find(q => q.name === name);
	}

	/** Get formatted bonuses for a quality. */
	function getQualityBonuses(quality: GameQuality): FormattedBonus[] {
		return formatQualityBonus(quality.bonus);
	}

	$: filteredPositive = filterQualities($positiveQualities ?? [], searchQuery);
	$: filteredNegative = filterQualities($negativeQualities ?? [], searchQuery);
	$: displayQualities = activeTab === 'positive' ? filteredPositive : filteredNegative;
	$: positiveBP = getPositiveBP();
	$: negativeBP = getNegativeBP();
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
					{@const gameQual = getGameQuality(quality.name)}
					{@const bonuses = gameQual ? getQualityBonuses(gameQual) : []}
					{@const hasTooltip = gameQual?.effect || bonuses.length > 0}
					<button
						class="px-3 py-1 rounded text-sm flex items-center gap-2 group relative
							{quality.category === 'Positive'
								? 'bg-success-main/20 text-success-main border border-success-main/30'
								: 'bg-warning-main/20 text-warning-main border border-warning-main/30'}
							{hasTooltip ? 'cursor-help' : ''}"
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
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Quality List -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
		{#each displayQualities as quality}
			{@const selected = isSelected(quality.name)}
			{@const bonuses = getQualityBonuses(quality)}
			{@const hasTooltip = quality.effect || bonuses.length > 0}
			<button
				class="cw-card text-left p-3 transition-all group relative
					{selected
						? activeTab === 'positive'
							? 'border-success-main bg-success-main/10'
							: 'border-warning-main bg-warning-main/10'
						: 'hover:border-primary-main/50'}"
				on:click={() => toggleQuality(quality)}
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
							{quality.name}
						</h4>
						{#if quality.category}
							<span class="text-text-muted text-xs">{quality.category}</span>
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
					<p class="text-text-secondary text-xs mt-2 line-clamp-2">{quality.effect}</p>
				{/if}

				<div class="text-text-muted text-xs mt-2">
					{quality.source} p.{quality.page}
				</div>

				<Tooltip show={hasTooltip} maxWidth="24rem">
					<div slot="content" class="text-left">
						{#if quality.effect}
							<div class="mb-2">{quality.effect}</div>
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
	{#if displayQualities.length === 0}
		<div class="cw-panel p-8 text-center">
			<p class="text-text-secondary">No qualities found matching your search.</p>
		</div>
	{/if}

	<!-- Help Text -->
	<div class="cw-panel p-4 text-sm">
		<h4 class="text-primary-dark font-semibold mb-2">Quality Guidelines</h4>
		<ul class="text-text-secondary space-y-1 list-disc list-inside">
			<li>Maximum 35 BP in positive qualities</li>
			<li>Maximum 35 BP from negative qualities</li>
			<li>Negative qualities give you bonus BP to spend elsewhere</li>
			<li>Some qualities have multiple levels (not yet implemented)</li>
		</ul>
	</div>
</div>

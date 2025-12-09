<script lang="ts">
	import type { Character } from '$types';
	import type { GameQuality } from '$stores/gamedata';
	import { addQuality, removeQuality } from '$stores/character';

	export let character: Character;
	export let qualities: readonly GameQuality[];

	/** Search query. */
	let searchQuery = '';

	/** Filter mode. */
	let filterCategory: 'all' | 'Positive' | 'Negative' = 'all';

	/** Filter qualities. */
	$: filteredQualities = qualities
		.filter(q => {
			const matchesSearch = !searchQuery ||
				q.name.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory = filterCategory === 'all' || q.category === filterCategory;
			return matchesSearch && matchesCategory;
		})
		.slice(0, 30);

	/** Check if quality is already on character. */
	function hasQuality(name: string): boolean {
		return character.qualities.some(q => q.name === name);
	}

	/** Handle adding a quality. */
	function handleAddQuality(quality: GameQuality): void {
		addQuality(quality.name, quality.category, quality.bp);
	}

	/** Handle removing a quality. */
	function handleRemoveQuality(id: string): void {
		removeQuality(id);
	}

	/** Get positive qualities total BP. */
	$: positiveTotal = character.qualities
		.filter(q => q.category === 'Positive')
		.reduce((sum, q) => sum + q.bp, 0);

	/** Get negative qualities total BP. */
	$: negativeTotal = character.qualities
		.filter(q => q.category === 'Negative')
		.reduce((sum, q) => sum + Math.abs(q.bp), 0);
</script>

<div class="space-y-4">
	<!-- Current Qualities Summary -->
	<div class="flex items-center gap-4 text-sm">
		<span class="text-success-main">
			Positive: {positiveTotal} BP
		</span>
		<span class="text-error">
			Negative: {negativeTotal} BP
		</span>
		<span class="text-text-muted">
			Net: {positiveTotal - negativeTotal} BP
		</span>
	</div>

	<!-- Current Qualities -->
	{#if character.qualities.length > 0}
		<div>
			<h3 class="text-text-secondary text-sm font-medium mb-2">
				Current Qualities ({character.qualities.length})
			</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
				{#each character.qualities as quality}
					<div
						class="cw-data-row py-1"
						class:border-l-2={true}
						class:border-l-success-main={quality.category === 'Positive'}
						class:border-l-error={quality.category === 'Negative'}
					>
						<div class="flex-1 pl-2">
							<span class="text-text-primary text-sm">{quality.name}</span>
							<span
								class="text-xs ml-2"
								class:text-success-main={quality.bp > 0}
								class:text-error={quality.bp < 0}
							>
								({quality.bp > 0 ? '+' : ''}{quality.bp} BP)
							</span>
						</div>
						<button
							class="text-error hover:text-error-dark"
							on:click={() => handleRemoveQuality(quality.id)}
							title="Remove quality"
						>
							<span class="material-icons text-sm">close</span>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Search and Filter -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label for="qualitySearch" class="block text-text-secondary text-sm mb-1">Search</label>
			<input
				id="qualitySearch"
				type="text"
				bind:value={searchQuery}
				class="cw-input w-full"
				placeholder="Type to filter..."
			/>
		</div>
		<div>
			<label for="categoryFilter" class="block text-text-secondary text-sm mb-1">Category</label>
			<select
				id="categoryFilter"
				bind:value={filterCategory}
				class="cw-select w-full"
			>
				<option value="all">All</option>
				<option value="Positive">Positive Only</option>
				<option value="Negative">Negative Only</option>
			</select>
		</div>
	</div>

	<!-- Available Qualities -->
	<div>
		<h3 class="text-text-secondary text-sm font-medium mb-2">
			Available Qualities ({filteredQualities.length})
		</h3>
		<div class="grid gap-2 max-h-72 overflow-y-auto">
			{#each filteredQualities as quality}
				{#if !hasQuality(quality.name)}
					<div
						class="cw-data-row py-1 cursor-pointer hover:bg-surface-variant"
						class:border-l-2={true}
						class:border-l-success-main={quality.category === 'Positive'}
						class:border-l-error={quality.category === 'Negative'}
						on:click={() => handleAddQuality(quality)}
						on:keypress={(e) => e.key === 'Enter' && handleAddQuality(quality)}
						role="button"
						tabindex="0"
					>
						<div class="flex-1 pl-2">
							<span class="text-text-primary text-sm">{quality.name}</span>
							<span
								class="text-xs ml-2"
								class:text-success-main={quality.bp > 0}
								class:text-error={quality.bp < 0}
							>
								({quality.bp > 0 ? '+' : ''}{quality.bp} BP)
							</span>
						</div>
						<span class="material-icons text-primary text-sm">add</span>
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>

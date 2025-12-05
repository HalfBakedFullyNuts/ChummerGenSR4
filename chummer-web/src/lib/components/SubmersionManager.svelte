<script lang="ts">
	/**
	 * Submersion Manager Component
	 * ============================
	 * Manages submersion grades and echo abilities.
	 * For technomancers in career mode.
	 */

	import {
		character,
		getSubmersionCost,
		submerge,
		learnEcho,
		removeEcho
	} from '$stores/character';
	import { echoes, type GameEcho } from '$stores/gamedata';

	/** Error message. */
	let error = '';

	/** Success message. */
	let success = '';

	/** Search query. */
	let searchQuery = '';

	/** Handle submersion. */
	function handleSubmerge(): void {
		error = '';
		success = '';

		const result = submerge();
		if (!result.success) {
			error = result.error || 'Failed to submerge';
		} else {
			success = `Successfully submerged to the next grade!`;
		}
	}

	/** Handle learning an echo. */
	function handleLearnEcho(name: string): void {
		error = '';
		success = '';

		const result = learnEcho(name);
		if (!result.success) {
			error = result.error || 'Failed to learn echo';
		} else {
			success = `Learned ${name}!`;
		}
	}

	/** Handle removing an echo. */
	function handleRemoveEcho(name: string): void {
		if (confirm(`Remove ${name}? This cannot be undone.`)) {
			removeEcho(name);
		}
	}

	/** Filter echoes by search. */
	function filterEchoes(all: readonly GameEcho[], search: string, known: readonly string[]): GameEcho[] {
		const lower = search.toLowerCase();
		return all.filter((e) => {
			const matchesSearch = !search || e.name.toLowerCase().includes(lower);
			const notKnown = !known.includes(e.name);
			return matchesSearch && notKnown;
		});
	}

	$: submersionGrade = $character?.resonance?.submersionGrade ?? 0;
	$: knownEchoes = $character?.resonance?.echoes ?? [];
	$: availableSlots = submersionGrade - knownEchoes.length;
	$: karma = $character?.karma ?? 0;
	$: subCost = getSubmersionCost(submersionGrade);
	$: canAffordSub = karma >= subCost;
	$: filteredEchoes = $echoes ? filterEchoes($echoes, searchQuery, knownEchoes) : [];
</script>

<div class="space-y-4">
	<h3 class="text-lg font-medium text-accent-cyan">Submersion</h3>

	<!-- Status Messages -->
	{#if error}
		<div class="text-accent-danger text-sm p-2 bg-accent-danger/10 rounded">{error}</div>
	{/if}
	{#if success}
		<div class="text-accent-success text-sm p-2 bg-accent-success/10 rounded">{success}</div>
	{/if}

	<!-- Current Grade Display -->
	<div class="cw-panel p-4">
		<div class="flex items-center justify-between mb-4">
			<div>
				<span class="text-muted-text text-sm">Submersion Grade</span>
				<div class="text-3xl font-bold text-accent-cyan">{submersionGrade}</div>
			</div>
			<div class="text-right">
				<span class="text-muted-text text-sm">Available Karma</span>
				<div class="text-xl font-mono text-accent-success">{karma}</div>
			</div>
		</div>

		<div class="flex items-center justify-between p-2 bg-surface-light rounded mb-3">
			<div>
				<span class="text-sm text-secondary-text">Next Grade Cost</span>
				<span class="font-mono text-accent-warning ml-2">{subCost} karma</span>
			</div>
			<div class="text-xs text-muted-text">
				(10 + Grade × 3)
			</div>
		</div>

		<button
			class="cw-btn w-full"
			disabled={!canAffordSub}
			on:click={handleSubmerge}
		>
			Submerge to Grade {submersionGrade + 1}
		</button>

		{#if !canAffordSub && subCost > 0}
			<p class="text-accent-warning text-xs mt-2 text-center">
				Need {subCost - karma} more karma
			</p>
		{/if}
	</div>

	<!-- Known Echoes -->
	<div class="cw-card">
		<h4 class="cw-card-header mb-3">
			Known Echoes
			<span class="text-muted-text font-normal text-sm ml-2">
				({knownEchoes.length}/{submersionGrade} slots used)
			</span>
		</h4>

		{#if knownEchoes.length > 0}
			<div class="space-y-2">
				{#each knownEchoes as echo}
					{@const data = $echoes?.find((e) => e.name === echo)}
					<div class="flex items-center justify-between p-2 bg-surface rounded">
						<div>
							<span class="font-medium text-accent-cyan">{echo}</span>
							{#if data}
								<p class="text-muted-text text-xs mt-1">{data.source} p.{data.page}</p>
							{/if}
						</div>
						<button
							class="text-accent-danger hover:text-accent-danger/80 text-xs"
							on:click={() => handleRemoveEcho(echo)}
						>
							Remove
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-muted-text text-sm">No echoes learned yet. Submerge first!</p>
		{/if}
	</div>

	<!-- Learn New Echo -->
	{#if availableSlots > 0}
		<div class="cw-card">
			<h4 class="cw-card-header mb-3">
				Learn Echo
				<span class="text-accent-success text-sm ml-2">
					{availableSlots} slot{availableSlots !== 1 ? 's' : ''} available
				</span>
			</h4>

			<input
				type="text"
				placeholder="Search echoes..."
				class="cw-input w-full mb-3"
				bind:value={searchQuery}
			/>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
				{#each filteredEchoes as echo}
					<button
						class="p-3 rounded text-left bg-surface hover:bg-surface-light
							border border-transparent hover:border-accent-cyan/50 transition-all"
						on:click={() => handleLearnEcho(echo.name)}
					>
						<div class="font-medium text-primary-text">{echo.name}</div>
						<div class="text-muted-text text-xs mt-1">
							{echo.source} p.{echo.page}
						</div>
					</button>
				{/each}
			</div>

			{#if filteredEchoes.length === 0}
				<p class="text-muted-text text-sm text-center py-4">
					{searchQuery ? 'No matching echoes found.' : 'All echoes already learned.'}
				</p>
			{/if}
		</div>
	{/if}
</div>

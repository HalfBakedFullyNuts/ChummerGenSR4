<script lang="ts">
	/**
	 * Initiation Manager Component
	 * ============================
	 * Manages initiation grades and metamagic abilities.
	 * For magicians in career mode.
	 */

	import {
		character,
		getInitiationCost,
		initiate,
		learnMetamagic,
		removeMetamagic
	} from '$stores/character';
	import { metamagics, type GameMetamagic } from '$stores/gamedata';

	/** Error message. */
	let error = '';

	/** Success message. */
	let success = '';

	/** Search query. */
	let searchQuery = '';

	/** Handle initiation. */
	function handleInitiate(): void {
		error = '';
		success = '';

		const result = initiate();
		if (!result.success) {
			error = result.error || 'Failed to initiate';
		} else {
			success = 'Successfully initiated to the next grade!';
		}
	}

	/** Handle learning a metamagic. */
	function handleLearnMetamagic(name: string): void {
		error = '';
		success = '';

		const result = learnMetamagic(name);
		if (!result.success) {
			error = result.error || 'Failed to learn metamagic';
		} else {
			success = `Learned ${name}!`;
		}
	}

	/** Handle removing a metamagic. */
	function handleRemoveMetamagic(name: string): void {
		if (confirm(`Remove ${name}? This cannot be undone.`)) {
			removeMetamagic(name);
		}
	}

	/** Filter metamagics by search. */
	function filterMetamagics(all: readonly GameMetamagic[], search: string, known: readonly string[]): GameMetamagic[] {
		const lower = search.toLowerCase();
		return all.filter((m) => {
			const matchesSearch = !search || m.name.toLowerCase().includes(lower);
			const notKnown = !known.includes(m.name);
			return matchesSearch && notKnown;
		});
	}

	$: initiateGrade = $character?.magic?.initiateGrade ?? 0;
	$: knownMetamagics = $character?.magic?.metamagics ?? [];
	$: availableSlots = initiateGrade - knownMetamagics.length;
	$: karma = $character?.karma ?? 0;
	$: initCost = getInitiationCost() ?? 0;
	$: canAffordInit = karma >= initCost;
	$: filteredMetamagics = $metamagics ? filterMetamagics($metamagics, searchQuery, knownMetamagics) : [];
</script>

<div class="space-y-4">
	<h3 class="text-lg font-medium text-accent-purple">Initiation</h3>

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
				<span class="text-muted-text text-sm">Current Grade</span>
				<div class="text-3xl font-bold text-accent-purple">{initiateGrade}</div>
			</div>
			<div class="text-right">
				<span class="text-muted-text text-sm">Available Karma</span>
				<div class="text-xl font-mono text-accent-success">{karma}</div>
			</div>
		</div>

		<div class="flex items-center justify-between p-2 bg-surface-light rounded mb-3">
			<div>
				<span class="text-sm text-secondary-text">Next Grade Cost</span>
				<span class="font-mono text-accent-warning ml-2">{initCost} karma</span>
			</div>
			<div class="text-xs text-muted-text">
				(10 + Grade × 3)
			</div>
		</div>

		<button
			class="cw-btn w-full"
			disabled={!canAffordInit}
			on:click={handleInitiate}
		>
			Initiate to Grade {initiateGrade + 1}
		</button>

		{#if !canAffordInit && initCost > 0}
			<p class="text-accent-warning text-xs mt-2 text-center">
				Need {initCost - karma} more karma
			</p>
		{/if}
	</div>

	<!-- Known Metamagics -->
	<div class="cw-card">
		<h4 class="cw-card-header mb-3">
			Known Metamagics
			<span class="text-muted-text font-normal text-sm ml-2">
				({knownMetamagics.length}/{initiateGrade} slots used)
			</span>
		</h4>

		{#if knownMetamagics.length > 0}
			<div class="space-y-2">
				{#each knownMetamagics as metamagic}
					{@const data = $metamagics?.find((m) => m.name === metamagic)}
					<div class="flex items-center justify-between p-2 bg-surface rounded">
						<div>
							<span class="font-medium text-accent-purple">{metamagic}</span>
							{#if data}
								<p class="text-muted-text text-xs mt-1">{data.description}</p>
							{/if}
						</div>
						<button
							class="text-accent-danger hover:text-accent-danger/80 text-xs"
							on:click={() => handleRemoveMetamagic(metamagic)}
						>
							Remove
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-muted-text text-sm">No metamagics learned yet. Initiate first!</p>
		{/if}
	</div>

	<!-- Learn New Metamagic -->
	{#if availableSlots > 0}
		<div class="cw-card">
			<h4 class="cw-card-header mb-3">
				Learn Metamagic
				<span class="text-accent-success text-sm ml-2">
					{availableSlots} slot{availableSlots !== 1 ? 's' : ''} available
				</span>
			</h4>

			<input
				type="text"
				placeholder="Search metamagics..."
				class="cw-input w-full mb-3"
				bind:value={searchQuery}
			/>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
				{#each filteredMetamagics as meta}
					<button
						class="p-3 rounded text-left bg-surface hover:bg-surface-light
							border border-transparent hover:border-accent-purple/50 transition-all"
						on:click={() => handleLearnMetamagic(meta.name)}
					>
						<div class="font-medium text-primary-text">{meta.name}</div>
						<p class="text-muted-text text-xs mt-1 line-clamp-2">{meta.description}</p>
						<div class="text-muted-text text-xs mt-1">
							{meta.source} p.{meta.page}
						</div>
					</button>
				{/each}
			</div>

			{#if filteredMetamagics.length === 0}
				<p class="text-muted-text text-sm text-center py-4">
					{searchQuery ? 'No matching metamagics found.' : 'All metamagics already learned.'}
				</p>
			{/if}
		</div>
	{/if}
</div>

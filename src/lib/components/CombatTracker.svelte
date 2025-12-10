<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { rollInitiative, getInitiativeForPass, type InitiativeResult } from '$lib/utils/dice';

	/** Combatant in the tracker. */
	interface Combatant {
		id: string;
		name: string;
		baseInit: number;
		initDice: number;
		initiative: InitiativeResult | null;
		isPlayer: boolean;
		acted: boolean[];  // Track which passes they've acted in
	}

	/** The player character's name. */
	export let playerName = 'Player';

	/** The player character's base initiative (REA + INT). */
	export let playerBaseInit = 10;

	/** The player character's initiative dice. */
	export let playerInitDice = 1;

	/** Event dispatcher. */
	const dispatch = createEventDispatcher<{
		initiativeRolled: { total: number; passes: number; dice: number[] };
	}>();

	/** List of combatants. */
	let combatants: Combatant[] = [];

	/** Current combat turn. */
	let combatTurn = 0;

	/** Current initiative pass (1-4). */
	let currentPass = 1;

	/** New combatant form. */
	let newName = '';
	let newBaseInit = 10;
	let newInitDice = 1;

	/** Whether combat is active. */
	let combatActive = false;

	/** Initialize player character. */
	$: if (playerName && combatants.length === 0) {
		combatants = [{
			id: 'player',
			name: playerName,
			baseInit: playerBaseInit,
			initDice: playerInitDice,
			initiative: null,
			isPlayer: true,
			acted: [false, false, false, false]
		}];
	}

	/** Sorted combatants by initiative (descending). */
	$: sortedCombatants = [...combatants]
		.filter(c => c.initiative !== null)
		.sort((a, b) => (b.initiative?.total ?? 0) - (a.initiative?.total ?? 0));

	/** Combatants who can act this pass. */
	$: activeThisPass = sortedCombatants.filter(c => {
		if (!c.initiative) return false;
		return getInitiativeForPass(c.initiative.total, currentPass) > 0;
	});

	/** Add a new combatant. */
	function addCombatant(): void {
		if (!newName.trim()) return;

		const combatant: Combatant = {
			id: crypto.randomUUID(),
			name: newName.trim(),
			baseInit: newBaseInit,
			initDice: newInitDice,
			initiative: null,
			isPlayer: false,
			acted: [false, false, false, false]
		};

		combatants = [...combatants, combatant];
		newName = '';
		newBaseInit = 10;
		newInitDice = 1;
	}

	/** Remove a combatant. */
	function removeCombatant(id: string): void {
		combatants = combatants.filter(c => c.id !== id);
	}

	/** Roll initiative for all combatants. */
	function rollAllInitiative(): void {
		combatants = combatants.map(c => ({
			...c,
			initiative: rollInitiative({ base: c.baseInit, dice: c.initDice }),
			acted: [false, false, false, false]
		}));

		combatTurn = 1;
		currentPass = 1;
		combatActive = true;

		// Emit player's initiative
		const player = combatants.find(c => c.isPlayer);
		if (player?.initiative) {
			dispatch('initiativeRolled', {
				total: player.initiative.total,
				passes: player.initiative.passes,
				dice: player.initiative.dice
			});
		}
	}

	/** Roll initiative for a single combatant. */
	function rollSingleInitiative(id: string): void {
		combatants = combatants.map(c => {
			if (c.id !== id) return c;
			const initiative = rollInitiative({ base: c.baseInit, dice: c.initDice });

			if (c.isPlayer) {
				dispatch('initiativeRolled', {
					total: initiative.total,
					passes: initiative.passes,
					dice: initiative.dice
				});
			}

			return {
				...c,
				initiative,
				acted: [false, false, false, false]
			};
		});
	}

	/** Mark a combatant as having acted this pass. */
	function markActed(id: string): void {
		combatants = combatants.map(c => {
			if (c.id !== id) return c;
			const newActed = [...c.acted];
			newActed[currentPass - 1] = true;
			return { ...c, acted: newActed };
		});

		// Check if all combatants have acted this pass
		const allActed = activeThisPass.every(c => {
			const combatant = combatants.find(x => x.id === c.id);
			return combatant?.acted[currentPass - 1];
		});

		if (allActed) {
			advancePass();
		}
	}

	/** Advance to the next pass or turn. */
	function advancePass(): void {
		if (currentPass < 4) {
			// Check if anyone can act in the next pass
			const nextPass = currentPass + 1;
			const hasActors = combatants.some(c => {
				if (!c.initiative) return false;
				return getInitiativeForPass(c.initiative.total, nextPass) > 0;
			});

			if (hasActors) {
				currentPass = nextPass;
				return;
			}
		}

		// End of passes, start new turn
		nextTurn();
	}

	/** Start a new combat turn. */
	function nextTurn(): void {
		combatTurn++;
		currentPass = 1;

		// Re-roll initiative for new turn
		combatants = combatants.map(c => ({
			...c,
			initiative: rollInitiative({ base: c.baseInit, dice: c.initDice }),
			acted: [false, false, false, false]
		}));

		// Emit player's new initiative
		const player = combatants.find(c => c.isPlayer);
		if (player?.initiative) {
			dispatch('initiativeRolled', {
				total: player.initiative.total,
				passes: player.initiative.passes,
				dice: player.initiative.dice
			});
		}
	}

	/** End combat. */
	function endCombat(): void {
		combatActive = false;
		combatTurn = 0;
		currentPass = 1;
		combatants = combatants.map(c => ({
			...c,
			initiative: null,
			acted: [false, false, false, false]
		}));
	}

	/** Reset everything. */
	function resetCombat(): void {
		combatants = combatants.filter(c => c.isPlayer);
		combatActive = false;
		combatTurn = 0;
		currentPass = 1;
	}
</script>

<div class="cw-card p-4">
	<h2 class="cw-card-header flex items-center justify-between">
		<span>Combat Tracker</span>
		{#if combatActive}
			<span class="text-sm font-normal text-primary-dark">
				Turn {combatTurn} • Pass {currentPass}
			</span>
		{/if}
	</h2>

	<!-- Combatant List -->
	<div class="space-y-2 mb-4">
		{#if combatants.length === 0}
			<p class="text-text-muted text-sm">No combatants added.</p>
		{:else}
			{#each (combatActive ? sortedCombatants : combatants) as combatant (combatant.id)}
				{@const initForPass = combatant.initiative ? getInitiativeForPass(combatant.initiative.total, currentPass) : 0}
				{@const canActThisPass = initForPass > 0}
				{@const hasActed = combatant.acted[currentPass - 1]}
				<div class="flex items-center justify-between p-2 rounded bg-surface-variant
					{combatant.isPlayer ? 'border-l-2 border-primary-main' : ''}
					{combatActive && !canActThisPass ? 'opacity-50' : ''}
					{combatActive && hasActed ? 'opacity-75' : ''}">
					<div class="flex items-center gap-3">
						<div class="flex flex-col">
							<span class="text-text-primary font-medium">
								{combatant.name}
								{#if combatant.isPlayer}
									<span class="text-primary-dark text-xs">(You)</span>
								{/if}
							</span>
							<span class="text-text-muted text-xs">
								Base: {combatant.baseInit} + {combatant.initDice}d6
							</span>
						</div>
					</div>

					<div class="flex items-center gap-2">
						{#if combatant.initiative}
							<div class="text-right">
								<div class="font-mono font-bold text-secondary-dark">
									{combatant.initiative.total}
								</div>
								<div class="text-text-muted text-xs">
									{combatant.initiative.passes} pass{combatant.initiative.passes !== 1 ? 'es' : ''}
								</div>
							</div>
						{/if}

						{#if combatActive && canActThisPass && !hasActed}
							<button
								class="cw-btn text-xs cw-btn-primary"
								on:click={() => markActed(combatant.id)}
							>
								Act
							</button>
						{:else if combatActive && hasActed}
							<span class="text-success-main text-xs">Done</span>
						{/if}

						{#if !combatActive}
							<button
								class="cw-btn text-xs"
								on:click={() => rollSingleInitiative(combatant.id)}
								title="Roll initiative"
							>
								Roll
							</button>
							{#if !combatant.isPlayer}
								<button
									class="cw-btn text-xs text-error-main"
									on:click={() => removeCombatant(combatant.id)}
									title="Remove combatant"
								>
									X
								</button>
							{/if}
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Add Combatant Form -->
	{#if !combatActive}
		<div class="border-t border-border pt-4 mb-4">
			<h3 class="text-sm font-medium text-text-secondary mb-2">Add Combatant</h3>
			<div class="flex gap-2 flex-wrap">
				<label for="combatant-name" class="sr-only">Combatant Name</label>
				<input
					id="combatant-name"
					type="text"
					bind:value={newName}
					placeholder="Name"
					class="cw-input flex-1 min-w-[120px]"
					on:keydown={(e) => e.key === 'Enter' && addCombatant()}
				/>
				<div class="flex items-center gap-1">
					<label for="combatant-init" class="text-text-muted text-xs">Init:</label>
					<input
						id="combatant-init"
						type="number"
						bind:value={newBaseInit}
						min="1"
						max="50"
						class="cw-input w-14 text-center"
					/>
				</div>
				<div class="flex items-center gap-1">
					<label for="combatant-dice" class="text-text-muted text-xs">Dice:</label>
					<input
						id="combatant-dice"
						type="number"
						bind:value={newInitDice}
						min="1"
						max="5"
						class="cw-input w-14 text-center"
					/>
				</div>
				<button
					class="cw-btn cw-btn-primary"
					on:click={addCombatant}
					disabled={!newName.trim()}
				>
					Add
				</button>
			</div>
		</div>
	{/if}

	<!-- Combat Controls -->
	<div class="border-t border-border pt-4 flex gap-2 flex-wrap">
		{#if !combatActive}
			<button
				class="cw-btn cw-btn-primary"
				on:click={rollAllInitiative}
				disabled={combatants.length === 0}
			>
				Start Combat
			</button>
			{#if combatants.length > 1}
				<button
					class="cw-btn text-error-main"
					on:click={resetCombat}
				>
					Clear NPCs
				</button>
			{/if}
		{:else}
			<button
				class="cw-btn"
				on:click={advancePass}
			>
				Next Pass
			</button>
			<button
				class="cw-btn"
				on:click={nextTurn}
			>
				New Turn
			</button>
			<button
				class="cw-btn text-error-main"
				on:click={endCombat}
			>
				End Combat
			</button>
		{/if}
	</div>
</div>

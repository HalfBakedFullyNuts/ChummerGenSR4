<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	/** Number of dice to roll. */
	export let dicePool = 6;

	/** Edge spent (exploding 6s, pre-edge rerolls). */
	export let useEdge = false;

	/** Threshold for success (defaults to 5 for SR4). */
	export let threshold = 5;

	/** Compact display mode. */
	export let compact = false;

	/** Dispatch events. */
	const dispatch = createEventDispatcher<{
		roll: { results: RollResult };
	}>();

	/** Roll result type. */
	interface RollResult {
		dice: number[];
		hits: number;
		ones: number;
		isGlitch: boolean;
		isCriticalGlitch: boolean;
		edgeUsed: boolean;
		pool: number;
	}

	/** Last roll results. */
	let lastRoll: RollResult | null = null;

	/** Animation state. */
	let rolling = false;

	/** Roll a single d6. */
	function rollD6(): number {
		return Math.floor(Math.random() * 6) + 1;
	}

	/** Roll the dice pool. */
	function roll(): void {
		rolling = true;

		setTimeout(() => {
			const dice: number[] = [];
			let extraDice = 0;

			// Roll initial pool
			for (let i = 0; i < dicePool; i++) {
				const result = rollD6();
				dice.push(result);

				// Edge: 6s explode (roll again)
				if (useEdge && result === 6) {
					extraDice++;
				}
			}

			// Roll exploding dice
			while (extraDice > 0) {
				const result = rollD6();
				dice.push(result);
				extraDice--;

				if (useEdge && result === 6) {
					extraDice++;
				}
			}

			// Count results
			const hits = dice.filter(d => d >= threshold).length;
			const ones = dice.filter(d => d === 1).length;

			// Glitch: more than half are 1s
			const isGlitch = ones > dice.length / 2;
			const isCriticalGlitch = isGlitch && hits === 0;

			lastRoll = {
				dice,
				hits,
				ones,
				isGlitch,
				isCriticalGlitch,
				edgeUsed: useEdge,
				pool: dicePool
			};

			dispatch('roll', { results: lastRoll });
			rolling = false;
		}, 300);
	}

	/** Quick adjustment buttons. */
	function adjustPool(delta: number): void {
		dicePool = Math.max(1, Math.min(30, dicePool + delta));
	}

	/** Get die face display. */
	function getDieFace(value: number): string {
		const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
		return faces[value - 1] || '?';
	}

	/** Get die color class. */
	function getDieClass(value: number): string {
		if (value >= threshold) return 'text-success-main';
		if (value === 1) return 'text-error-main';
		return 'text-text-secondary';
	}
</script>

<div class="cw-card {compact ? 'p-3' : 'p-4'}">
	{#if !compact}
		<h2 class="cw-card-header">Dice Roller</h2>
	{/if}

	<!-- Controls -->
	<div class="flex items-center gap-4 {compact ? '' : 'mb-4'}">
		<div class="flex items-center gap-2">
			<button
				class="cw-btn w-8 h-8 p-0 text-lg"
				on:click={() => adjustPool(-1)}
				disabled={dicePool <= 1}
			>
				-
			</button>
			<input
				type="number"
				class="cw-input w-16 text-center font-mono"
				bind:value={dicePool}
				min="1"
				max="30"
			/>
			<button
				class="cw-btn w-8 h-8 p-0 text-lg"
				on:click={() => adjustPool(1)}
				disabled={dicePool >= 30}
			>
				+
			</button>
			<span class="text-text-muted text-sm">dice</span>
		</div>

		<label class="flex items-center gap-2 cursor-pointer">
			<input
				type="checkbox"
				class="w-4 h-4 accent-primary-main"
				bind:checked={useEdge}
			/>
			<span class="text-text-secondary text-sm">Edge</span>
		</label>

		<button
			class="cw-btn cw-btn-primary flex-1 md:flex-none md:px-8"
			on:click={roll}
			disabled={rolling}
		>
			{rolling ? 'Rolling...' : 'Roll'}
		</button>
	</div>

	<!-- Results -->
	{#if lastRoll}
		<div class="mt-4 pt-4 border-t border-border">
			<!-- Dice Display -->
			<div class="flex flex-wrap gap-1 mb-3">
				{#each lastRoll.dice as die, idx}
					<span
						class="text-2xl {getDieClass(die)} transition-all"
						style="animation-delay: {idx * 50}ms"
						title="Rolled {die}"
					>
						{getDieFace(die)}
					</span>
				{/each}
			</div>

			<!-- Summary -->
			<div class="flex items-center gap-4">
				<div class="text-center">
					<div class="text-3xl font-bold text-success-main">{lastRoll.hits}</div>
					<div class="text-xs text-text-muted">hits</div>
				</div>

				{#if lastRoll.isCriticalGlitch}
					<div class="flex-1 cw-panel p-2 border-l-4 border-error-main bg-error-main/10">
						<span class="text-error-main font-bold">CRITICAL GLITCH!</span>
						<span class="text-text-secondary text-sm ml-2">
							({lastRoll.ones} ones, 0 hits)
						</span>
					</div>
				{:else if lastRoll.isGlitch}
					<div class="flex-1 cw-panel p-2 border-l-4 border-warning-main bg-warning-main/10">
						<span class="text-warning-main font-bold">Glitch!</span>
						<span class="text-text-secondary text-sm ml-2">
							({lastRoll.ones} ones out of {lastRoll.dice.length})
						</span>
					</div>
				{:else}
					<div class="flex-1 text-text-secondary text-sm">
						{lastRoll.dice.length} dice rolled
						{#if lastRoll.edgeUsed}
							<span class="text-primary-dark">(with Edge)</span>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Raw Values (collapsed by default) -->
			<details class="mt-3">
				<summary class="text-text-muted text-xs cursor-pointer hover:text-text-secondary">
					Show raw values
				</summary>
				<div class="mt-2 font-mono text-xs text-text-muted">
					[{lastRoll.dice.join(', ')}]
				</div>
			</details>
		</div>
	{/if}
</div>

<script lang="ts">
	/**
	 * Dice Roller Component
	 * =====================
	 * Integrated dice roller for Shadowrun 4th Edition.
	 * Rolls d6 pools, counts hits, tracks glitches, and maintains history.
	 */

	import { onMount, createEventDispatcher } from 'svelte';
	import {
		rollDicePool,
		type RollResult,
		expectedHits,
		glitchProbability
	} from '$lib/utils/dice';

	/** Number of dice to roll. */
	export let dicePool = 6;

	/** Edge spent (exploding 6s, pre-edge rerolls). */
	export let useEdge = false;

	/** Threshold for success (defaults to 5 for SR4). */
	export let threshold = 5;

	/** Compact display mode. */
	export let compact = false;

	/** Show roll history. */
	export let showHistory = true;

	/** Dispatch events. */
	const dispatch = createEventDispatcher<{
		roll: { results: RollResult };
	}>();

	/** Roll history entry. */
	interface RollHistoryEntry {
		id: string;
		timestamp: Date;
		result: RollResult;
		label: string;
	}

	/** Last roll results. */
	let lastRoll: RollResult | null = null;

	/** Roll history. */
	let history: RollHistoryEntry[] = [];

	/** Maximum history entries. */
	const MAX_HISTORY = 20;

	/** Animation state. */
	let rolling = false;

	/** Common roll shortcuts. */
	const shortcuts = [
		{ label: '4', pool: 4 },
		{ label: '6', pool: 6 },
		{ label: '8', pool: 8 },
		{ label: '10', pool: 10 },
		{ label: '12', pool: 12 },
		{ label: '15', pool: 15 }
	];

	onMount(() => {
		loadHistory();
	});

	/** Roll the dice pool. */
	function roll(label?: string): void {
		rolling = true;

		setTimeout(() => {
			const result = rollDicePool({
				pool: dicePool,
				edge: useEdge,
				threshold
			});

			lastRoll = result;

			/* Add to history */
			if (showHistory) {
				const entry: RollHistoryEntry = {
					id: crypto.randomUUID(),
					timestamp: new Date(),
					result,
					label: label || `${dicePool}d6${useEdge ? ' (Edge)' : ''}`
				};

				history = [entry, ...history.slice(0, MAX_HISTORY - 1)];
				saveHistory();
			}

			dispatch('roll', { results: result });
			rolling = false;
		}, 300);
	}

	/** Quick roll with specific pool. */
	function quickRoll(pool: number): void {
		dicePool = pool;
		roll(`Quick ${pool}d6`);
	}

	/** Quick adjustment buttons. */
	function adjustPool(delta: number): void {
		dicePool = Math.max(1, Math.min(30, dicePool + delta));
	}

	/** Clear history. */
	function clearHistory(): void {
		history = [];
		saveHistory();
	}

	/** Load history from localStorage. */
	function loadHistory(): void {
		try {
			const stored = localStorage.getItem('chummer-dice-history');
			if (stored) {
				const parsed = JSON.parse(stored);
				history = parsed.map((e: RollHistoryEntry) => ({
					...e,
					timestamp: new Date(e.timestamp)
				}));
			}
		} catch {
			history = [];
		}
	}

	/** Save history to localStorage. */
	function saveHistory(): void {
		try {
			localStorage.setItem('chummer-dice-history', JSON.stringify(history));
		} catch {
			/* Ignore storage errors */
		}
	}

	/** Get die face display. */
	function getDieFace(value: number): string {
		const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
		return faces[value - 1] || '?';
	}

	/** Get die color class. */
	function getDieClass(value: number): string {
		if (value >= threshold) return 'text-accent-success';
		if (value === 1) return 'text-accent-danger';
		return 'text-secondary-text';
	}

	/** Format timestamp. */
	function formatTime(date: Date): string {
		return date.toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	/** Calculate expected hits for current pool. */
	$: expectedHitsValue = expectedHits(dicePool, threshold).toFixed(1);

	/** Calculate glitch probability for current pool. */
	$: glitchProb = (glitchProbability(dicePool) * 100).toFixed(1);
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
			<span class="text-muted-text text-sm">dice</span>
		</div>

		<label class="flex items-center gap-2 cursor-pointer">
			<input
				type="checkbox"
				class="w-4 h-4 accent-accent-primary"
				bind:checked={useEdge}
			/>
			<span class="text-secondary-text text-sm">Edge</span>
		</label>

		<button
			class="cw-btn cw-btn-primary flex-1 md:flex-none md:px-8"
			on:click={() => roll()}
			disabled={rolling}
		>
			{rolling ? 'Rolling...' : 'Roll'}
		</button>
	</div>

	<!-- Stats & Shortcuts -->
	{#if !compact}
		<div class="flex items-center justify-between mb-4">
			<div class="flex gap-4 text-xs text-muted-text">
				<span>Expected: <span class="text-accent-cyan font-mono">{expectedHitsValue}</span></span>
				<span>Glitch: <span class="text-accent-warning font-mono">{glitchProb}%</span></span>
			</div>
			<div class="flex gap-1">
				{#each shortcuts as shortcut}
					<button
						class="px-2 py-1 rounded text-xs bg-surface-light text-secondary-text hover:bg-surface-lighter transition-colors"
						on:click={() => quickRoll(shortcut.pool)}
					>
						{shortcut.label}d6
					</button>
				{/each}
			</div>
		</div>
	{/if}

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
					<div class="text-3xl font-bold text-accent-success">{lastRoll.hits}</div>
					<div class="text-xs text-muted-text">hits</div>
				</div>

				{#if lastRoll.isCriticalGlitch}
					<div class="flex-1 cw-panel p-2 border-l-4 border-accent-danger bg-accent-danger/10">
						<span class="text-accent-danger font-bold">CRITICAL GLITCH!</span>
						<span class="text-secondary-text text-sm ml-2">
							({lastRoll.ones} ones, 0 hits)
						</span>
					</div>
				{:else if lastRoll.isGlitch}
					<div class="flex-1 cw-panel p-2 border-l-4 border-accent-warning bg-accent-warning/10">
						<span class="text-accent-warning font-bold">Glitch!</span>
						<span class="text-secondary-text text-sm ml-2">
							({lastRoll.ones} ones out of {lastRoll.dice.length})
						</span>
					</div>
				{:else}
					<div class="flex-1 text-secondary-text text-sm">
						{lastRoll.dice.length} dice rolled
						{#if lastRoll.edgeUsed}
							<span class="text-accent-primary">(with Edge)</span>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Raw Values (collapsed by default) -->
			<details class="mt-3">
				<summary class="text-muted-text text-xs cursor-pointer hover:text-secondary-text">
					Show raw values
				</summary>
				<div class="mt-2 font-mono text-xs text-muted-text">
					[{lastRoll.dice.join(', ')}]
				</div>
			</details>
		</div>
	{/if}

	<!-- History -->
	{#if showHistory && !compact && history.length > 0}
		<div class="mt-4 pt-4 border-t border-border">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs text-muted-text uppercase tracking-wide">Roll History</span>
				<button
					class="text-xs text-accent-danger hover:underline"
					on:click={clearHistory}
				>
					Clear
				</button>
			</div>
			<div class="max-h-32 overflow-y-auto space-y-1">
				{#each history as entry}
					<div class="flex items-center justify-between p-2 bg-surface-light rounded text-sm">
						<div class="flex items-center gap-2">
							<span class="text-xs text-muted-text font-mono">
								{formatTime(entry.timestamp)}
							</span>
							<span class="text-secondary-text">{entry.label}</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="font-mono font-bold text-accent-success">
								{entry.result.hits}
							</span>
							{#if entry.result.isCriticalGlitch}
								<span class="text-xs px-1 rounded bg-accent-danger/20 text-accent-danger font-bold">CG!</span>
							{:else if entry.result.isGlitch}
								<span class="text-xs px-1 rounded bg-accent-warning/20 text-accent-warning">G</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

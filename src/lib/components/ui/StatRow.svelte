<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let label: string;
	export let value: number | string;
	export let max: number | undefined = undefined;
	export let min: number | undefined = undefined;
	export let editable: boolean = false;
	export let showControls: boolean = false;
	export let highlight: boolean = false;
	export let suffix: string = '';

	const dispatch = createEventDispatcher<{
		increment: void;
		decrement: void;
		change: number;
	}>();

	$: canIncrement = max === undefined || (typeof value === 'number' && value < max);
	$: canDecrement = min === undefined || (typeof value === 'number' && value > min);

	function handleIncrement() {
		if (canIncrement) dispatch('increment');
	}

	function handleDecrement() {
		if (canDecrement) dispatch('decrement');
	}
</script>

<div class="cw-stat-row" class:cw-stat-row-highlight={highlight}>
	<span class="cw-stat-label">{label}</span>
	<div class="cw-stat-value-group">
		{#if showControls && editable}
			<button
				type="button"
				class="cw-btn-inc-dec"
				disabled={!canDecrement}
				on:click={handleDecrement}
			>
				<span class="material-icons text-xs">remove</span>
			</button>
		{/if}

		<span class="cw-stat-value" class:text-primary={highlight}>
			{value}{#if max !== undefined}<span class="text-text-muted">/{max}</span>{/if}{suffix}
		</span>

		{#if showControls && editable}
			<button
				type="button"
				class="cw-btn-inc-dec"
				disabled={!canIncrement}
				on:click={handleIncrement}
			>
				<span class="material-icons text-xs">add</span>
			</button>
		{/if}
	</div>
</div>

<style>
	.cw-stat-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px dashed var(--cw-border);
	}
	.cw-stat-row:last-child {
		border-bottom: none;
	}
	.cw-stat-row-highlight {
		background: var(--cw-primary-glow);
	}
	.cw-stat-label {
		color: var(--cw-text-secondary);
		font-size: 0.875rem;
	}
	.cw-stat-value-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.cw-stat-value {
		font-weight: 500;
		min-width: 2rem;
		text-align: center;
	}
</style>

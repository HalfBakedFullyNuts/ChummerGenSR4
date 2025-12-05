<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Option {
		value: string;
		label: string;
		disabled?: boolean;
	}

	interface $$Props extends HTMLSelectAttributes {
		options: Option[];
		label?: string;
		error?: string;
		placeholder?: string;
	}

	export let options: Option[] = [];
	export let label: string = '';
	export let error: string = '';
	export let placeholder: string = '';
	export let value: string = '';
</script>

<div class="cw-select-wrapper">
	{#if label}
		<label class="cw-select-label">{label}</label>
	{/if}
	<div class="cw-select-container" class:cw-select-error={error}>
		<select class="cw-select" bind:value {...$$restProps} on:change on:focus on:blur>
			{#if placeholder}
				<option value="" disabled>{placeholder}</option>
			{/if}
			{#each options as option}
				<option value={option.value} disabled={option.disabled}>
					{option.label}
				</option>
			{/each}
		</select>
		<span class="material-icons cw-select-icon">expand_more</span>
	</div>
	{#if error}
		<span class="cw-select-error-text">{error}</span>
	{/if}
</div>

<style>
	.cw-select-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.cw-select-label {
		font-size: 0.75rem;
		color: var(--cw-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.cw-select-container {
		position: relative;
		display: flex;
		align-items: center;
	}
	.cw-select {
		width: 100%;
		appearance: none;
		background: var(--cw-panel);
		border: 1px solid var(--cw-border);
		color: var(--cw-text-primary);
		padding: 0.5rem 2rem 0.5rem 0.75rem;
		font-family: var(--cw-font-display);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.cw-select:focus {
		outline: none;
		border-color: var(--cw-primary);
		box-shadow: 0 0 0 1px var(--cw-primary-glow);
	}
	.cw-select-icon {
		position: absolute;
		right: 0.5rem;
		font-size: 1.25rem;
		color: var(--cw-text-muted);
		pointer-events: none;
	}
	.cw-select-error .cw-select {
		border-color: var(--cw-error);
	}
	.cw-select-error-text {
		font-size: 0.75rem;
		color: var(--cw-error);
	}
</style>

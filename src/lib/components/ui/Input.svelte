<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface $$Props extends HTMLInputAttributes {
		icon?: string;
		error?: string;
		label?: string;
	}

	export let icon: string = '';
	export let error: string = '';
	export let label: string = '';
	export let value: string = '';
</script>

<div class="cw-input-wrapper">
	{#if label}
		<label class="cw-input-label">{label}</label>
	{/if}
	<div class="cw-input-container" class:cw-input-error={error}>
		{#if icon}
			<span class="material-icons cw-input-icon">{icon}</span>
		{/if}
		<input
			class="cw-input"
			class:pl-9={icon}
			bind:value
			{...$$restProps}
			on:input
			on:change
			on:focus
			on:blur
		/>
	</div>
	{#if error}
		<span class="cw-input-error-text">{error}</span>
	{/if}
</div>

<style>
	.cw-input-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.cw-input-label {
		font-size: 0.75rem;
		color: var(--cw-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.cw-input-container {
		position: relative;
		display: flex;
		align-items: center;
	}
	.cw-input-icon {
		position: absolute;
		left: 0.75rem;
		font-size: 1rem;
		color: var(--cw-text-muted);
		pointer-events: none;
	}
	.cw-input {
		width: 100%;
		background: var(--cw-panel);
		border: 1px solid var(--cw-border);
		color: var(--cw-text-primary);
		padding: 0.5rem 0.75rem;
		font-family: var(--cw-font-display);
		font-size: 0.875rem;
		transition: all 0.15s ease;
	}
	.cw-input:focus {
		outline: none;
		border-color: var(--cw-primary);
		box-shadow: 0 0 0 1px var(--cw-primary-glow);
	}
	.cw-input::placeholder {
		color: var(--cw-text-muted);
	}
	.cw-input-error .cw-input {
		border-color: var(--cw-error);
	}
	.cw-input-error-text {
		font-size: 0.75rem;
		color: var(--cw-error);
	}
</style>

<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
	type ButtonSize = 'sm' | 'md' | 'lg';

	interface $$Props extends HTMLButtonAttributes {
		variant?: ButtonVariant;
		size?: ButtonSize;
		icon?: string;
		iconOnly?: boolean;
		loading?: boolean;
		disabled?: boolean;
	}

	export let variant: ButtonVariant = 'primary';
	export let size: ButtonSize = 'md';
	export let icon: string = '';
	export let iconOnly: boolean = false;
	export let loading: boolean = false;
	export let disabled: boolean = false;
</script>

<button
	class="cw-btn"
	class:cw-btn-primary={variant === 'primary'}
	class:cw-btn-secondary={variant === 'secondary'}
	class:cw-btn-ghost={variant === 'ghost'}
	class:cw-btn-danger={variant === 'danger'}
	class:cw-btn-icon={variant === 'icon' || iconOnly}
	class:cw-btn-sm={size === 'sm'}
	class:cw-btn-lg={size === 'lg'}
	class:opacity-50={loading || disabled}
	class:cursor-not-allowed={loading || disabled}
	disabled={loading || disabled}
	{...$$restProps}
	on:click
	on:mouseenter
	on:mouseleave
>
	{#if loading}
		<span class="material-icons text-sm animate-spin">sync</span>
	{:else if icon}
		<span class="material-icons" class:mr-1.5={!iconOnly && $$slots.default}>{icon}</span>
	{/if}
	{#if !iconOnly}
		<slot />
	{/if}
</button>

<style>
	.cw-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		font-family: var(--cw-font-display);
		font-weight: 500;
		transition: all 0.15s ease;
	}
	.cw-btn-sm {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
	}
	.cw-btn-lg {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
	}
	.cw-btn-ghost {
		background: transparent;
		border: 1px solid transparent;
		color: var(--cw-text-secondary);
	}
	.cw-btn-ghost:hover:not(:disabled) {
		background: var(--cw-primary-glow);
		color: var(--cw-primary);
	}
	.cw-btn-danger {
		background: transparent;
		border: 1px solid var(--cw-error);
		color: var(--cw-error);
	}
	.cw-btn-danger:hover:not(:disabled) {
		background: rgba(248, 81, 73, 0.2);
	}
</style>

<script lang="ts">
	type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
	type BadgeSize = 'sm' | 'md';

	export let variant: BadgeVariant = 'primary';
	export let size: BadgeSize = 'md';
	export let icon: string = '';
</script>

<span
	class="cw-badge"
	class:cw-badge-primary={variant === 'primary'}
	class:cw-badge-secondary={variant === 'secondary'}
	class:cw-badge-success={variant === 'success'}
	class:cw-badge-warning={variant === 'warning'}
	class:cw-badge-error={variant === 'error'}
	class:cw-badge-info={variant === 'info'}
	class:cw-badge-sm={size === 'sm'}
>
	{#if icon}
		<span class="material-icons" class:text-xs={size === 'sm'} class:text-sm={size === 'md'}
			>{icon}</span
		>
	{/if}
	<slot />
</span>

<style>
	.cw-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}
	.cw-badge-sm {
		padding: 0.125rem 0.375rem;
		font-size: 0.625rem;
	}
	.cw-badge-primary {
		background: var(--cw-primary-glow);
		color: var(--cw-primary);
	}
	.cw-badge-secondary {
		background: var(--cw-panel-elevated);
		color: var(--cw-text-secondary);
	}
	.cw-badge-success {
		background: rgba(46, 160, 67, 0.2);
		color: var(--cw-success);
	}
	.cw-badge-warning {
		background: rgba(210, 153, 34, 0.2);
		color: var(--cw-warning);
	}
	.cw-badge-error {
		background: rgba(248, 81, 73, 0.2);
		color: var(--cw-error);
	}
	.cw-badge-info {
		background: var(--cw-primary-glow);
		color: var(--cw-primary);
	}
</style>

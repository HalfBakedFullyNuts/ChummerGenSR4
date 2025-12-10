<script lang="ts">
	type ProgressVariant = 'primary' | 'success' | 'warning' | 'error';

	export let value: number = 0;
	export let max: number = 100;
	export let variant: ProgressVariant = 'primary';
	export let showLabel: boolean = false;
	export let label: string = '';
	export let size: 'sm' | 'md' | 'lg' = 'md';

	$: percentage = Math.min(100, Math.max(0, (value / max) * 100));
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="cw-progress-wrapper">
	{#if showLabel || label}
		<div class="cw-progress-label">
			<span class="cw-progress-label-text">{label || `${value}/${max}`}</span>
			<span class="cw-progress-label-value">{Math.round(percentage)}%</span>
		</div>
	{/if}
	<div
		class="cw-progress"
		class:cw-progress-sm={size === 'sm'}
		class:cw-progress-lg={size === 'lg'}
	>
		<div
			class="cw-progress-bar"
			class:cw-progress-primary={variant === 'primary'}
			class:cw-progress-success={variant === 'success'}
			class:cw-progress-warning={variant === 'warning'}
			class:cw-progress-error={variant === 'error'}
			style="width: {percentage}%"
		/>
	</div>
</div>

<style>
	.cw-progress-wrapper {
		width: 100%;
	}
	.cw-progress-label {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.25rem;
		font-size: 0.75rem;
	}
	.cw-progress-label-text {
		color: var(--cw-text-secondary);
	}
	.cw-progress-label-value {
		color: var(--cw-text-muted);
	}
	.cw-progress {
		width: 100%;
		height: 0.5rem;
		background: var(--cw-panel);
		border: 1px solid var(--cw-border);
		overflow: hidden;
	}
	.cw-progress-sm {
		height: 0.25rem;
	}
	.cw-progress-lg {
		height: 0.75rem;
	}
	.cw-progress-bar {
		height: 100%;
		transition: width 0.3s ease;
	}
	.cw-progress-primary {
		background: var(--cw-primary);
		box-shadow: 0 0 8px var(--cw-primary-glow);
	}
	.cw-progress-success {
		background: var(--cw-success);
		box-shadow: 0 0 8px rgba(46, 160, 67, 0.4);
	}
	.cw-progress-warning {
		background: var(--cw-warning);
		box-shadow: 0 0 8px rgba(210, 153, 34, 0.4);
	}
	.cw-progress-error {
		background: var(--cw-error);
		box-shadow: 0 0 8px rgba(248, 81, 73, 0.4);
	}
</style>

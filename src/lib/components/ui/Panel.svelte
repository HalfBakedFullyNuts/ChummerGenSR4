<script lang="ts">
	export let title: string = '';
	export let variant: 'default' | 'solid' | 'elevated' = 'default';
	export let padding: 'none' | 'sm' | 'md' | 'lg' = 'md';
</script>

<div
	class="cw-panel"
	class:cw-panel-solid={variant === 'solid'}
	class:cw-panel-elevated={variant === 'elevated'}
	class:p-0={padding === 'none'}
	class:p-2={padding === 'sm'}
	class:p-4={padding === 'md'}
	class:p-6={padding === 'lg'}
>
	{#if title}
		<div class="cw-panel-header">
			<span class="text-primary font-medium">{title}</span>
		</div>
	{/if}
	<div class="cw-panel-content" class:pt-3={title}>
		<slot />
	</div>
</div>

<style>
	.cw-panel-solid {
		background: var(--cw-panel-solid);
	}
	.cw-panel-elevated {
		background: var(--cw-panel-elevated);
	}
	.cw-panel-content {
		width: 100%;
	}
</style>

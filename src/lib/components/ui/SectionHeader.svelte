<script lang="ts">
	export let icon: string = '';
	export let size: 'sm' | 'md' | 'lg' = 'md';
</script>

<h2
	class="cw-section-header"
	class:text-sm={size === 'sm'}
	class:text-base={size === 'md'}
	class:text-lg={size === 'lg'}
>
	{#if icon}
		<span class="material-icons mr-2" class:text-sm={size === 'sm'}>{icon}</span>
	{/if}
	<slot />
</h2>

<style>
	.cw-section-header {
		display: flex;
		align-items: center;
		color: var(--cw-primary);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding-bottom: 0.5rem;
		margin-bottom: 0.75rem;
		border-bottom: 1px solid var(--cw-border);
	}
</style>

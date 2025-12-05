<script lang="ts">
	export let title: string = 'CHUMMER';
	export let section: string = '';
</script>

<header class="cw-app-header">
	<div class="cw-app-title">
		<span class="text-primary font-bold">{title}</span>
		{#if section}
			<span class="text-text-muted mx-2">::</span>
			<span class="text-text-secondary">{section}</span>
		{/if}
	</div>
	<div class="cw-app-header-actions">
		<slot />
	</div>
</header>

<style>
	.cw-app-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: var(--cw-panel-solid);
		border-bottom: 1px solid var(--cw-border);
	}
	.cw-app-title {
		display: flex;
		align-items: center;
		font-family: var(--cw-font-display);
		font-size: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}
	.cw-app-header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>

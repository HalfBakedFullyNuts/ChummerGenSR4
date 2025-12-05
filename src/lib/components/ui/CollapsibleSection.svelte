<script lang="ts">
	export let title: string;
	export let open: boolean = false;
	export let icon: string = '';
	export let count: number | undefined = undefined;
</script>

<details class="cw-collapsible" bind:open>
	<summary class="cw-collapsible-header">
		<span class="cw-collapsible-icon">
			<span class="material-icons text-sm">{open ? 'expand_more' : 'chevron_right'}</span>
		</span>
		{#if icon}
			<span class="material-icons text-sm mr-2 text-primary">{icon}</span>
		{/if}
		<span class="cw-collapsible-title">{title}</span>
		{#if count !== undefined}
			<span class="cw-collapsible-count">{count}</span>
		{/if}
	</summary>
	<div class="cw-collapsible-content">
		<slot />
	</div>
</details>

<style>
	.cw-collapsible {
		border: 1px solid var(--cw-border);
		background: var(--cw-panel);
	}
	.cw-collapsible-header {
		display: flex;
		align-items: center;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		user-select: none;
		list-style: none;
		color: var(--cw-text-secondary);
		transition: all 0.15s ease;
	}
	.cw-collapsible-header::-webkit-details-marker {
		display: none;
	}
	.cw-collapsible-header:hover {
		background: var(--cw-panel-elevated);
		color: var(--cw-text-primary);
	}
	.cw-collapsible[open] .cw-collapsible-header {
		border-bottom: 1px solid var(--cw-border);
	}
	.cw-collapsible-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		color: var(--cw-text-muted);
	}
	.cw-collapsible-title {
		flex: 1;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.75rem;
	}
	.cw-collapsible-count {
		background: var(--cw-primary-glow);
		color: var(--cw-primary);
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
	}
	.cw-collapsible-content {
		padding: 0.75rem;
	}
</style>

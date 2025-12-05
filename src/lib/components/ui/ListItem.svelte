<script lang="ts">
	export let selected: boolean = false;
	export let disabled: boolean = false;
	export let icon: string = '';
	export let href: string = '';
</script>

{#if href}
	<a
		{href}
		class="cw-list-item"
		class:cw-selected={selected}
		class:opacity-50={disabled}
		class:pointer-events-none={disabled}
		on:click
	>
		{#if icon}
			<span class="material-icons text-sm mr-2">{icon}</span>
		{/if}
		<span class="flex-1 truncate">
			<slot />
		</span>
		{#if $$slots.trailing}
			<span class="cw-list-item-trailing">
				<slot name="trailing" />
			</span>
		{/if}
	</a>
{:else}
	<button
		type="button"
		class="cw-list-item w-full text-left"
		class:cw-selected={selected}
		class:opacity-50={disabled}
		{disabled}
		on:click
	>
		{#if icon}
			<span class="material-icons text-sm mr-2">{icon}</span>
		{/if}
		<span class="flex-1 truncate">
			<slot />
		</span>
		{#if $$slots.trailing}
			<span class="cw-list-item-trailing">
				<slot name="trailing" />
			</span>
		{/if}
	</button>
{/if}

<style>
	.cw-list-item {
		display: flex;
		align-items: center;
		padding: 0.5rem 0.75rem;
		color: var(--cw-text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
		text-decoration: none;
		border: 1px solid transparent;
	}
	.cw-list-item:hover:not(:disabled) {
		background: var(--cw-panel);
		color: var(--cw-text-primary);
	}
	.cw-list-item.cw-selected {
		background: var(--cw-primary-glow);
		color: var(--cw-primary);
		border-color: var(--cw-primary);
	}
	.cw-list-item-trailing {
		margin-left: auto;
		font-size: 0.75rem;
		color: var(--cw-text-muted);
	}
	.cw-list-item.cw-selected .cw-list-item-trailing {
		color: var(--cw-primary);
	}
</style>

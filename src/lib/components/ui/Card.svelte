<script lang="ts">
	export let selected: boolean = false;
	export let disabled: boolean = false;
	export let clickable: boolean = false;
	export let padding: 'none' | 'sm' | 'md' | 'lg' = 'md';
</script>

<div
	class="cw-card"
	class:cw-card-selected={selected}
	class:cw-card-clickable={clickable}
	class:opacity-50={disabled}
	class:cursor-not-allowed={disabled}
	class:p-0={padding === 'none'}
	class:p-2={padding === 'sm'}
	class:p-3={padding === 'md'}
	class:p-4={padding === 'lg'}
	role={clickable ? 'button' : undefined}
	tabindex={clickable && !disabled ? 0 : undefined}
	on:click
	on:keydown={(e) => {
		if (clickable && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			e.currentTarget.click();
		}
	}}
>
	<slot />
</div>

<style>
	.cw-card {
		background: var(--cw-panel);
		border: 1px solid var(--cw-border);
		transition: all 0.15s ease;
	}
	.cw-card-clickable {
		cursor: pointer;
	}
	.cw-card-clickable:hover:not(.opacity-50) {
		border-color: var(--cw-text-muted);
		background: var(--cw-panel-elevated);
	}
	.cw-card-selected {
		background: var(--cw-primary-glow);
		border-color: var(--cw-primary);
	}
	.cw-card-selected:hover {
		background: var(--cw-primary-glow);
		border-color: var(--cw-primary);
	}
</style>

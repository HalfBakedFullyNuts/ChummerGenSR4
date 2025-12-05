<script lang="ts">
	export let label: string;
	export let muted: boolean = false;
</script>

<div class="cw-data-row" class:cw-data-row-muted={muted}>
	<span class="cw-data-label">{label}</span>
	<span class="cw-data-value">
		<slot />
	</span>
</div>

<style>
	.cw-data-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.375rem 0;
		border-bottom: 1px dashed var(--cw-border);
		font-size: 0.875rem;
	}
	.cw-data-row:last-child {
		border-bottom: none;
	}
	.cw-data-row-muted {
		opacity: 0.7;
	}
	.cw-data-label {
		color: var(--cw-text-muted);
	}
	.cw-data-value {
		color: var(--cw-text-primary);
		font-weight: 500;
	}
</style>

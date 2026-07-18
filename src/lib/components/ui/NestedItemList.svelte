<script lang="ts">
	export let items: any[] = [];
	export let type: 'cyberware' | 'bioware' | 'gear' | 'armor' | 'vehicle' | 'weapon' | 'martialart';
	export let depth: number = 0;
</script>

{#each items as item}
	<div class={depth > 0 ? 'ml-4 border-l border-border pl-2 my-1' : ''}>
		{#if type === 'cyberware' || type === 'bioware'}
			<div class="flex justify-between py-1 border-b border-border">
				<span class="text-text-secondary">
					{item.name}
					{#if item.rating > 0}
						<span class="text-text-muted">(R{item.rating})</span>
					{/if}
					{#if item.grade !== 'Standard'}
						<span
							class="{type === 'bioware' ? 'text-success-dark' : 'text-primary-dark'} text-xs ml-1"
							>[{item.grade}]</span
						>
					{/if}
				</span>
				<span class="{type === 'bioware' ? 'text-info-dark' : 'text-error-dark'} text-xs"
					>{item.essence?.toFixed(2) ?? '0.00'} ESS</span
				>
			</div>
		{:else if type === 'gear'}
			<div class="flex justify-between py-1 border-b border-border">
				<span class="text-text-secondary">
					{item.name}
					{#if item.quantity && item.quantity > 1}
						<span class="text-text-muted">×{item.quantity}</span>
					{/if}
					{#if item.rating > 0}
						<span class="text-text-muted">(R{item.rating})</span>
					{/if}
				</span>
			</div>
		{:else if type === 'armor'}
			<div class="p-2 bg-surface-variant rounded flex justify-between items-center mb-1">
				<div>
					<span class="font-medium text-text-primary">{item.name}</span>
					{#if item.equipped}
						<span class="ml-2 text-xs text-success-dark">(Equipped)</span>
					{/if}
				</div>
				<div class="text-xs text-text-muted">
					B: <span class="text-text-secondary">{item.ballistic}</span>
					/ I: <span class="text-text-secondary">{item.impact}</span>
				</div>
			</div>
		{/if}

		{#if item.children && item.children.length > 0}
			<svelte:self items={item.children} {type} depth={depth + 1} />
		{/if}
	</div>
{/each}

<script lang="ts">
	export let item: any;
	export let selectedItemId: string | undefined;
	export let onSelect: (item: any) => void;
	export let type: string;
	export let formatCost: (cost: number) => string;
	export let depth: number = 0;

	function handleClick(e: Event) {
		e.stopPropagation();
		onSelect(item);
	}
</script>

<div class="space-y-1 {depth > 0 ? 'ml-4 border-l border-gray-200 pl-2 mt-1' : ''}">
	<button
		class="w-full flex items-center justify-between p-2 rounded text-sm text-left transition-colors
			{selectedItemId === item.id
			? 'bg-primary-main/20 border border-primary-main/50'
			: 'bg-gray-50 hover:bg-gray-100'}"
		on:click={handleClick}
	>
		<span class="text-gray-800 truncate">
			{item.name}
			{#if item.quantity && item.quantity > 1}
				<span class="text-gray-400">(x{item.quantity})</span>
			{/if}
		</span>
		<span class="text-gray-500 text-xs ml-2">
			{#if type === 'cyberware' || type === 'bioware'}
				ESS: {item.essence?.toFixed(2) ?? '0.00'}
			{:else}
				{formatCost(item.cost * (item.quantity || 1))}
			{/if}
		</span>
	</button>

	{#if item.children && item.children.length > 0}
		{#each item.children as child (child.id)}
			<svelte:self item={child} {selectedItemId} {onSelect} {type} {formatCost} depth={depth + 1} />
		{/each}
	{/if}
</div>

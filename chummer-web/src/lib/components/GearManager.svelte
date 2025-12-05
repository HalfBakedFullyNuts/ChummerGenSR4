<script lang="ts">
	/**
	 * Gear Manager Component
	 * ======================
	 * Manages gear with hierarchical containers and capacity tracking.
	 */

	import { character, addGear, removeGear, moveGearToContainer } from '$stores/character';
	import { gameData, loadGameData } from '$stores/gamedata';
	import { onMount } from 'svelte';
	import type { CharacterGear } from '$lib/types/equipment';

	/** Error message. */
	let error = '';

	/** Search query for adding gear. */
	let searchQuery = '';

	/** Category filter. */
	let categoryFilter = '';

	/** Show add gear panel. */
	let showAddPanel = false;

	/** Currently selected container for adding gear. */
	let targetContainerId: string | null = null;

	/** Gear being moved. */
	let movingGearId: string | null = null;

	onMount(() => {
		loadGameData();
	});

	/** Get unique gear categories. */
	$: gearCategories = $gameData.gearCategories ?? [];

	/** Filter available gear. */
	$: filteredGameGear = ($gameData.gear ?? []).filter((g) => {
		const matchesSearch = !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesCategory = !categoryFilter || g.category === categoryFilter;
		return matchesSearch && matchesCategory;
	});

	/** Character's gear. */
	$: allGear = $character?.equipment.gear ?? [];

	/** Top-level gear (not in containers). */
	$: topLevelGear = allGear.filter((g) => !g.containerId);

	/** Containers (gear with capacity > 0). */
	$: containers = allGear.filter((g) => g.capacity > 0);

	/** Character's nuyen. */
	$: nuyen = $character?.nuyen ?? 0;

	/** Get gear contained in a specific container. */
	function getContainedGear(containerId: string): CharacterGear[] {
		return allGear.filter((g) => g.containerId === containerId);
	}

	/** Handle adding gear. */
	function handleAddGear(gear: typeof $gameData.gear[0]): void {
		error = '';
		if (nuyen < gear.cost) {
			error = `Not enough nuyen. Need ${gear.cost.toLocaleString()}¥`;
			return;
		}

		/* Check container capacity if adding to a container */
		if (targetContainerId) {
			const container = allGear.find((g) => g.id === targetContainerId);
			if (container) {
				const capacityCost = gear.capacityCost ?? 1;
				if (container.capacityUsed + capacityCost > container.capacity) {
					error = `Not enough capacity. Need ${capacityCost}, have ${container.capacity - container.capacityUsed} remaining.`;
					return;
				}
			}
		}

		addGear(gear, 1, targetContainerId);
		showAddPanel = false;
		searchQuery = '';
	}

	/** Handle removing gear. */
	function handleRemoveGear(gearId: string): void {
		removeGear(gearId);
	}

	/** Start moving gear. */
	function startMoveGear(gearId: string): void {
		movingGearId = gearId;
	}

	/** Handle move to container. */
	function handleMoveToContainer(newContainerId: string | null): void {
		if (!movingGearId) return;

		const result = moveGearToContainer(movingGearId, newContainerId);
		if (!result.success) {
			error = result.error || 'Failed to move gear';
		}
		movingGearId = null;
	}

	/** Cancel moving. */
	function cancelMove(): void {
		movingGearId = null;
	}

	/** Format nuyen. */
	function formatNuyen(amount: number): string {
		return amount.toLocaleString() + '¥';
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-medium text-primary-text">Gear & Equipment</h3>
		<button
			class="cw-btn cw-btn-primary text-sm"
			on:click={() => {
				showAddPanel = !showAddPanel;
				targetContainerId = null;
			}}
		>
			{showAddPanel ? 'Cancel' : '+ Add Gear'}
		</button>
	</div>

	{#if error}
		<div class="text-accent-danger text-sm">{error}</div>
	{/if}

	<!-- Moving Indicator -->
	{#if movingGearId}
		{@const movingGear = allGear.find((g) => g.id === movingGearId)}
		<div class="cw-panel p-3 bg-accent-warning/10 border-accent-warning/50">
			<div class="flex items-center justify-between">
				<span class="text-sm text-secondary-text">
					Moving: <span class="text-primary-text font-medium">{movingGear?.name}</span>
				</span>
				<button class="text-xs text-muted-text hover:text-secondary-text" on:click={cancelMove}>
					Cancel
				</button>
			</div>
			<div class="flex flex-wrap gap-2 mt-2">
				<button
					class="text-xs px-2 py-1 rounded bg-surface hover:bg-surface-light transition-colors"
					on:click={() => handleMoveToContainer(null)}
				>
					Move to Top Level
				</button>
				{#each containers.filter((c) => c.id !== movingGearId) as container}
					<button
						class="text-xs px-2 py-1 rounded bg-surface hover:bg-surface-light transition-colors"
						on:click={() => handleMoveToContainer(container.id)}
						disabled={container.capacityUsed >= container.capacity}
					>
						{container.name} ({container.capacity - container.capacityUsed} free)
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Add Gear Panel -->
	{#if showAddPanel}
		<div class="cw-panel p-4 space-y-3">
			<div class="flex items-center justify-between">
				<h4 class="text-sm font-medium text-secondary-text">Add Gear</h4>
				{#if targetContainerId}
					{@const container = allGear.find((g) => g.id === targetContainerId)}
					<span class="text-xs text-accent-cyan">
						Adding to: {container?.name}
					</span>
				{/if}
			</div>

			<div class="flex gap-2">
				<input
					type="text"
					class="cw-input flex-1 text-sm"
					placeholder="Search gear..."
					bind:value={searchQuery}
				/>
				<select class="cw-input text-sm" bind:value={categoryFilter}>
					<option value="">All Categories</option>
					{#each gearCategories as cat}
						<option value={cat}>{cat}</option>
					{/each}
				</select>
			</div>

			<!-- Container target selection -->
			{#if containers.length > 0}
				<div class="flex items-center gap-2 text-xs">
					<span class="text-muted-text">Add to:</span>
					<button
						class="px-2 py-1 rounded transition-colors
							{targetContainerId === null
								? 'bg-accent-primary/20 text-accent-primary'
								: 'bg-surface-light text-secondary-text hover:bg-surface-lighter'}"
						on:click={() => (targetContainerId = null)}
					>
						Inventory
					</button>
					{#each containers as container}
						<button
							class="px-2 py-1 rounded transition-colors
								{targetContainerId === container.id
									? 'bg-accent-primary/20 text-accent-primary'
									: 'bg-surface-light text-secondary-text hover:bg-surface-lighter'}"
							on:click={() => (targetContainerId = container.id)}
						>
							{container.name} ({container.capacity - container.capacityUsed})
						</button>
					{/each}
				</div>
			{/if}

			<div class="max-h-64 overflow-y-auto space-y-1">
				{#each filteredGameGear.slice(0, 50) as gear}
					<button
						class="w-full text-left p-2 rounded bg-surface hover:bg-surface-light transition-colors"
						on:click={() => handleAddGear(gear)}
						disabled={nuyen < gear.cost}
					>
						<div class="flex justify-between items-start">
							<div class="flex items-center gap-2">
								<span class="text-primary-text text-sm">{gear.name}</span>
								{#if gear.capacity && gear.capacity > 0}
									<span class="text-xs px-1.5 py-0.5 bg-accent-cyan/20 text-accent-cyan rounded">
										Container ({gear.capacity})
									</span>
								{/if}
							</div>
							<span class="text-accent-cyan text-sm font-mono">{formatNuyen(gear.cost)}</span>
						</div>
						<div class="flex gap-3 text-xs text-muted-text mt-1">
							<span>{gear.category}</span>
							{#if gear.rating > 0}
								<span>Rating {gear.rating}</span>
							{/if}
							{#if gear.capacityCost}
								<span>Capacity: {gear.capacityCost}</span>
							{/if}
						</div>
					</button>
				{/each}
				{#if filteredGameGear.length > 50}
					<p class="text-xs text-muted-text text-center py-2">
						Showing 50 of {filteredGameGear.length}. Use search to narrow results.
					</p>
				{/if}
				{#if filteredGameGear.length === 0}
					<p class="text-muted-text text-sm text-center py-4">No gear found.</p>
				{/if}
			</div>

			<div class="text-xs text-muted-text">
				Available: <span class="text-accent-cyan font-mono">{formatNuyen(nuyen)}</span>
			</div>
		</div>
	{/if}

	<!-- Gear List -->
	{#if allGear.length > 0}
		<div class="space-y-2">
			<!-- Top-level gear -->
			{#each topLevelGear as gear}
				<div class="cw-panel p-3">
					<div class="flex justify-between items-start">
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<span class="font-medium text-primary-text">{gear.name}</span>
								{#if gear.quantity > 1}
									<span class="text-xs text-muted-text">x{gear.quantity}</span>
								{/if}
								{#if gear.capacity > 0}
									<span class="text-xs px-1.5 py-0.5 bg-accent-cyan/20 text-accent-cyan rounded">
										{gear.capacityUsed}/{gear.capacity}
									</span>
								{/if}
							</div>
							<div class="flex gap-3 text-xs text-muted-text mt-1">
								<span>{gear.category}</span>
								{#if gear.rating > 0}
									<span>Rating {gear.rating}</span>
								{/if}
							</div>
						</div>
						<div class="flex items-center gap-2">
							{#if !movingGearId}
								<button
									class="text-xs text-accent-cyan hover:underline"
									on:click={() => startMoveGear(gear.id)}
								>
									Move
								</button>
							{/if}
							<button
								class="text-xs text-accent-danger hover:underline"
								on:click={() => handleRemoveGear(gear.id)}
							>
								Remove
							</button>
						</div>
					</div>

					<!-- Contained items -->
					{#if gear.capacity > 0}
						{@const contained = getContainedGear(gear.id)}
						{#if contained.length > 0}
							<div class="mt-2 ml-4 pl-3 border-l border-border space-y-1">
								{#each contained as item}
									<div class="flex justify-between items-center py-1">
										<div class="flex items-center gap-2">
											<span class="text-sm text-secondary-text">{item.name}</span>
											{#if item.quantity > 1}
												<span class="text-xs text-muted-text">x{item.quantity}</span>
											{/if}
											{#if item.capacityCost > 0}
												<span class="text-xs text-muted-text">[{item.capacityCost}]</span>
											{/if}
										</div>
										<div class="flex items-center gap-2">
											{#if !movingGearId}
												<button
													class="text-xs text-accent-cyan hover:underline"
													on:click={() => startMoveGear(item.id)}
												>
													Move
												</button>
											{/if}
											<button
												class="text-xs text-accent-danger hover:underline"
												on:click={() => handleRemoveGear(item.id)}
											>
												Remove
											</button>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="mt-2 ml-4 pl-3 border-l border-border">
								<span class="text-xs text-muted-text italic">Empty</span>
							</div>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<div class="cw-panel p-6 text-center">
			<p class="text-muted-text">No gear in inventory.</p>
			<p class="text-xs text-muted-text mt-1">Click "Add Gear" to purchase equipment.</p>
		</div>
	{/if}
</div>

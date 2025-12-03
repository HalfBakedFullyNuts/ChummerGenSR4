<script lang="ts">
	/**
	 * Vehicle Manager Component
	 * =========================
	 * Manages character vehicles and drones with modifications.
	 */

	import { character, addVehicle, removeVehicle } from '$stores/character';
	import { gameData, loadGameData } from '$stores/gamedata';
	import { onMount } from 'svelte';

	/** Error message. */
	let error = '';

	/** Search query for adding vehicles. */
	let searchQuery = '';

	/** Category filter. */
	let categoryFilter = '';

	/** Show add vehicle panel. */
	let showAddPanel = false;

	onMount(() => {
		loadGameData();
	});

	/** Get unique vehicle categories. */
	$: vehicleCategories = $gameData.vehicles
		? [...new Set($gameData.vehicles.map((v) => v.category))].sort()
		: [];

	/** Filter available vehicles. */
	$: filteredVehicles = ($gameData.vehicles ?? []).filter((v) => {
		const matchesSearch = !searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesCategory = !categoryFilter || v.category === categoryFilter;
		return matchesSearch && matchesCategory;
	});

	/** Character's vehicles. */
	$: vehicles = $character?.equipment.vehicles ?? [];

	/** Character's nuyen. */
	$: nuyen = $character?.nuyen ?? 0;

	/** Handle adding a vehicle. */
	function handleAddVehicle(vehicle: typeof $gameData.vehicles[0]): void {
		error = '';
		if (nuyen < vehicle.cost) {
			error = `Not enough nuyen. Need ${vehicle.cost.toLocaleString()}¥, have ${nuyen.toLocaleString()}¥`;
			return;
		}
		addVehicle(vehicle);
		showAddPanel = false;
		searchQuery = '';
	}

	/** Handle removing a vehicle. */
	function handleRemoveVehicle(vehicleId: string): void {
		if (confirm('Remove this vehicle? This cannot be undone.')) {
			removeVehicle(vehicleId);
		}
	}

	/** Format nuyen. */
	function formatNuyen(amount: number): string {
		return amount.toLocaleString() + '¥';
	}

	/** Check if it's a drone. */
	function isDrone(category: string): boolean {
		return category.toLowerCase().includes('drone');
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-medium text-primary-text">Vehicles & Drones</h3>
		<button
			class="cw-btn cw-btn-primary text-sm"
			on:click={() => (showAddPanel = !showAddPanel)}
		>
			{showAddPanel ? 'Cancel' : '+ Add Vehicle'}
		</button>
	</div>

	{#if error}
		<div class="text-accent-danger text-sm">{error}</div>
	{/if}

	<!-- Add Vehicle Panel -->
	{#if showAddPanel}
		<div class="cw-panel p-4 space-y-3">
			<h4 class="text-sm font-medium text-secondary-text">Add Vehicle</h4>

			<div class="flex gap-2">
				<input
					type="text"
					class="cw-input flex-1 text-sm"
					placeholder="Search vehicles..."
					bind:value={searchQuery}
				/>
				<select class="cw-input text-sm" bind:value={categoryFilter}>
					<option value="">All Categories</option>
					{#each vehicleCategories as cat}
						<option value={cat}>{cat}</option>
					{/each}
				</select>
			</div>

			<div class="max-h-64 overflow-y-auto space-y-1">
				{#each filteredVehicles.slice(0, 50) as vehicle}
					<button
						class="w-full text-left p-2 rounded bg-surface hover:bg-surface-light transition-colors"
						on:click={() => handleAddVehicle(vehicle)}
						disabled={nuyen < vehicle.cost}
					>
						<div class="flex justify-between items-start">
							<div>
								<span class="text-primary-text text-sm">{vehicle.name}</span>
								<span class="text-xs text-muted-text ml-2">({vehicle.category})</span>
							</div>
							<span class="text-accent-cyan text-sm font-mono">{formatNuyen(vehicle.cost)}</span>
						</div>
						<div class="grid grid-cols-4 gap-2 text-xs text-muted-text mt-1">
							<span>Hand: {vehicle.handling}</span>
							<span>Speed: {vehicle.speed}</span>
							<span>Pilot: {vehicle.pilot}</span>
							<span>Body: {vehicle.body}</span>
						</div>
					</button>
				{/each}
				{#if filteredVehicles.length > 50}
					<p class="text-xs text-muted-text text-center py-2">
						Showing 50 of {filteredVehicles.length}. Use search to narrow results.
					</p>
				{/if}
				{#if filteredVehicles.length === 0}
					<p class="text-muted-text text-sm text-center py-4">No vehicles found.</p>
				{/if}
			</div>

			<div class="text-xs text-muted-text">
				Available: <span class="text-accent-cyan font-mono">{formatNuyen(nuyen)}</span>
			</div>
		</div>
	{/if}

	<!-- Vehicle List -->
	{#if vehicles.length > 0}
		<div class="space-y-3">
			{#each vehicles as vehicle}
				<div class="cw-panel p-4">
					<div class="flex justify-between items-start mb-3">
						<div>
							<h4 class="font-medium text-primary-text flex items-center gap-2">
								{vehicle.name}
								{#if isDrone(vehicle.category)}
									<span class="text-xs px-2 py-0.5 bg-accent-cyan/20 text-accent-cyan rounded">Drone</span>
								{/if}
							</h4>
							<p class="text-xs text-muted-text">{vehicle.category}</p>
						</div>
						<button
							class="text-accent-danger text-xs hover:underline"
							on:click={() => handleRemoveVehicle(vehicle.id)}
						>
							Remove
						</button>
					</div>

					<!-- Vehicle Stats -->
					<div class="grid grid-cols-4 md:grid-cols-7 gap-3 p-2 bg-surface-light rounded text-center text-sm">
						<div>
							<div class="text-xs text-muted-text">Handling</div>
							<div class="font-mono text-primary-text">{vehicle.handling}</div>
						</div>
						<div>
							<div class="text-xs text-muted-text">Accel</div>
							<div class="font-mono text-primary-text">{vehicle.accel}</div>
						</div>
						<div>
							<div class="text-xs text-muted-text">Speed</div>
							<div class="font-mono text-primary-text">{vehicle.speed}</div>
						</div>
						<div>
							<div class="text-xs text-muted-text">Pilot</div>
							<div class="font-mono text-accent-cyan">{vehicle.pilot}</div>
						</div>
						<div>
							<div class="text-xs text-muted-text">Body</div>
							<div class="font-mono text-primary-text">{vehicle.body}</div>
						</div>
						<div>
							<div class="text-xs text-muted-text">Armor</div>
							<div class="font-mono text-accent-success">{vehicle.armor}</div>
						</div>
						<div>
							<div class="text-xs text-muted-text">Sensor</div>
							<div class="font-mono text-primary-text">{vehicle.sensor}</div>
						</div>
					</div>

					<!-- Modifications -->
					{#if vehicle.mods && vehicle.mods.length > 0}
						<div class="mt-3">
							<h5 class="text-xs text-muted-text uppercase tracking-wide mb-2">Modifications</h5>
							<div class="flex flex-wrap gap-1">
								{#each vehicle.mods as mod}
									<span class="text-xs px-2 py-1 bg-accent-primary/20 text-accent-primary rounded">
										{mod.name}
										{#if mod.rating > 1}R{mod.rating}{/if}
									</span>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Notes -->
					{#if vehicle.notes}
						<div class="mt-3 text-xs text-muted-text">
							<span class="text-secondary-text">Notes:</span> {vehicle.notes}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<div class="cw-panel p-6 text-center">
			<p class="text-muted-text">No vehicles or drones owned.</p>
			<p class="text-xs text-muted-text mt-1">Click "Add Vehicle" to purchase one.</p>
		</div>
	{/if}
</div>

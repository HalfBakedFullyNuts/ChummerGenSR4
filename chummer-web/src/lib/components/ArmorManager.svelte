<script lang="ts">
	/**
	 * Armor Manager Component
	 * =======================
	 * Manages character armor with SR4 stacking rules, encumbrance, and modifications.
	 */

	import { character, addArmor, removeArmor, toggleArmorEquipped, addArmorModification, removeArmorModification, calculateTotalArmor } from '$stores/character';
	import { gameData, loadGameData } from '$stores/gamedata';
	import { onMount } from 'svelte';

	/** Error message. */
	let error = '';

	/** Search query for adding armor. */
	let searchQuery = '';

	/** Category filter. */
	let categoryFilter = '';

	/** Show add armor panel. */
	let showAddPanel = false;

	/** Armor being configured. */
	let selectedArmorId: string | null = null;

	/** Show modification panel. */
	let showModPanel = false;

	/** Mod search. */
	let modSearch = '';

	onMount(() => {
		loadGameData();
	});

	/** Get unique armor categories. */
	$: armorCategories = $gameData.armor
		? [...new Set($gameData.armor.map((a) => a.category))].sort()
		: [];

	/** Filter available armor. */
	$: filteredArmor = ($gameData.armor ?? []).filter((a) => {
		const matchesSearch = !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesCategory = !categoryFilter || a.category === categoryFilter;
		return matchesSearch && matchesCategory;
	});

	/** Character's armor. */
	$: armor = $character?.equipment.armor ?? [];

	/** Character's nuyen. */
	$: nuyen = $character?.nuyen ?? 0;

	/** Character's body attribute. */
	$: body = $character?.attributes.bod ?? 3;

	/** Calculate total armor values. */
	$: armorTotals = calculateTotalArmor();

	/** Selected armor. */
	$: selectedArmor = selectedArmorId ? armor.find((a) => a.id === selectedArmorId) : null;

	/** Available armor modifications (common SR4 mods). */
	const armorModifications = [
		{ name: 'Chemical Protection', rating: 1, capacityCost: 1, cost: 250 },
		{ name: 'Chemical Protection', rating: 2, capacityCost: 2, cost: 500 },
		{ name: 'Chemical Protection', rating: 3, capacityCost: 3, cost: 750 },
		{ name: 'Fire Resistance', rating: 1, capacityCost: 1, cost: 100 },
		{ name: 'Fire Resistance', rating: 2, capacityCost: 2, cost: 200 },
		{ name: 'Fire Resistance', rating: 3, capacityCost: 3, cost: 300 },
		{ name: 'Insulation', rating: 1, capacityCost: 1, cost: 100 },
		{ name: 'Insulation', rating: 2, capacityCost: 2, cost: 200 },
		{ name: 'Insulation', rating: 3, capacityCost: 3, cost: 300 },
		{ name: 'Nonconductivity', rating: 1, capacityCost: 1, cost: 250 },
		{ name: 'Nonconductivity', rating: 2, capacityCost: 2, cost: 500 },
		{ name: 'Nonconductivity', rating: 3, capacityCost: 3, cost: 750 },
		{ name: 'Thermal Damping', rating: 1, capacityCost: 1, cost: 500 },
		{ name: 'Thermal Damping', rating: 2, capacityCost: 2, cost: 1000 },
		{ name: 'Thermal Damping', rating: 3, capacityCost: 3, cost: 1500 },
		{ name: 'Biomonitor', rating: 1, capacityCost: 1, cost: 300 },
		{ name: 'Medkit', rating: 3, capacityCost: 3, cost: 600 },
		{ name: 'Medkit', rating: 6, capacityCost: 6, cost: 1200 },
		{ name: 'Gel Packs', rating: 1, capacityCost: 2, cost: 175 },
		{ name: 'Shock Frills', rating: 1, capacityCost: 2, cost: 250 },
		{ name: 'Drag Handle', rating: 1, capacityCost: 0, cost: 10 },
		{ name: 'Holster', rating: 1, capacityCost: 1, cost: 50 },
		{ name: 'Electrochromic Modification', rating: 1, capacityCost: 1, cost: 500 },
		{ name: 'Ruthenium Polymer Coating', rating: 4, capacityCost: 4, cost: 15000 }
	];

	/** Filtered mods. */
	$: filteredMods = armorModifications.filter((m) =>
		!modSearch || m.name.toLowerCase().includes(modSearch.toLowerCase())
	);

	/** Handle adding armor. */
	function handleAddArmor(armorItem: typeof $gameData.armor[0]): void {
		error = '';
		if (nuyen < armorItem.cost) {
			error = `Not enough nuyen. Need ${armorItem.cost.toLocaleString()}¥`;
			return;
		}
		addArmor(armorItem);
		showAddPanel = false;
		searchQuery = '';
	}

	/** Handle removing armor. */
	function handleRemoveArmor(armorId: string): void {
		if (confirm('Remove this armor? This cannot be undone.')) {
			removeArmor(armorId);
			if (selectedArmorId === armorId) {
				selectedArmorId = null;
			}
		}
	}

	/** Handle toggle equipped. */
	function handleToggleEquipped(armorId: string): void {
		toggleArmorEquipped(armorId);
	}

	/** Handle adding modification. */
	function handleAddMod(mod: typeof armorModifications[0]): void {
		if (!selectedArmorId) return;
		error = '';
		const result = addArmorModification(selectedArmorId, mod);
		if (!result.success) {
			error = result.error || 'Failed to add modification';
		}
	}

	/** Handle removing modification. */
	function handleRemoveMod(modId: string): void {
		if (!selectedArmorId) return;
		removeArmorModification(selectedArmorId, modId);
	}

	/** Format nuyen. */
	function formatNuyen(amount: number): string {
		return amount.toLocaleString() + '¥';
	}

	/** Get capacity used. */
	function getCapacityUsed(armorItem: typeof armor[0]): number {
		return armorItem.modifications?.reduce((sum, m) => sum + m.capacityCost, 0) ?? 0;
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-medium text-primary-text">Armor</h3>
		<button
			class="cw-btn cw-btn-primary text-sm"
			on:click={() => (showAddPanel = !showAddPanel)}
		>
			{showAddPanel ? 'Cancel' : '+ Add Armor'}
		</button>
	</div>

	{#if error}
		<div class="text-accent-danger text-sm">{error}</div>
	{/if}

	<!-- Armor Summary -->
	<div class="cw-panel p-4">
		<h4 class="text-xs text-muted-text uppercase tracking-wide mb-3">Armor Rating (SR4 Stacking)</h4>
		<div class="grid grid-cols-3 gap-4 text-center">
			<div>
				<div class="text-xs text-muted-text mb-1">Ballistic</div>
				<div class="text-2xl font-mono text-accent-success">{armorTotals.ballistic}</div>
			</div>
			<div>
				<div class="text-xs text-muted-text mb-1">Impact</div>
				<div class="text-2xl font-mono text-accent-cyan">{armorTotals.impact}</div>
			</div>
			<div>
				<div class="text-xs text-muted-text mb-1">Encumbrance</div>
				<div class="text-2xl font-mono {armorTotals.encumbrance > 0 ? 'text-accent-danger' : 'text-muted-text'}">
					{armorTotals.encumbrance > 0 ? `-${armorTotals.encumbrance}` : '0'}
				</div>
			</div>
		</div>
		{#if armorTotals.encumbrance > 0}
			<div class="mt-2 text-xs text-accent-danger text-center">
				Armor exceeds Body ({body}). -{armorTotals.encumbrance} penalty to Agility and Reaction.
			</div>
		{/if}
		<div class="mt-3 text-xs text-muted-text">
			<p>Primary armor + half of secondary armor (rounded down).</p>
			<p>Encumbrance applies when total Ballistic exceeds Body.</p>
		</div>
	</div>

	<!-- Add Armor Panel -->
	{#if showAddPanel}
		<div class="cw-panel p-4 space-y-3">
			<h4 class="text-sm font-medium text-secondary-text">Add Armor</h4>

			<div class="flex gap-2">
				<input
					type="text"
					class="cw-input flex-1 text-sm"
					placeholder="Search armor..."
					bind:value={searchQuery}
				/>
				<select class="cw-input text-sm" bind:value={categoryFilter}>
					<option value="">All Categories</option>
					{#each armorCategories as cat}
						<option value={cat}>{cat}</option>
					{/each}
				</select>
			</div>

			<div class="max-h-64 overflow-y-auto space-y-1">
				{#each filteredArmor.slice(0, 50) as armorItem}
					<button
						class="w-full text-left p-2 rounded bg-surface hover:bg-surface-light transition-colors"
						on:click={() => handleAddArmor(armorItem)}
						disabled={nuyen < armorItem.cost}
					>
						<div class="flex justify-between items-start">
							<div>
								<span class="text-primary-text text-sm">{armorItem.name}</span>
								<span class="text-xs text-muted-text ml-2">({armorItem.category})</span>
							</div>
							<span class="text-accent-cyan text-sm font-mono">{formatNuyen(armorItem.cost)}</span>
						</div>
						<div class="grid grid-cols-3 gap-2 text-xs text-muted-text mt-1">
							<span>B: {armorItem.ballistic}</span>
							<span>I: {armorItem.impact}</span>
							<span>Cap: {armorItem.capacity}</span>
						</div>
					</button>
				{/each}
				{#if filteredArmor.length > 50}
					<p class="text-xs text-muted-text text-center py-2">
						Showing 50 of {filteredArmor.length}. Use search to narrow results.
					</p>
				{/if}
				{#if filteredArmor.length === 0}
					<p class="text-muted-text text-sm text-center py-4">No armor found.</p>
				{/if}
			</div>

			<div class="text-xs text-muted-text">
				Available: <span class="text-accent-cyan font-mono">{formatNuyen(nuyen)}</span>
			</div>
		</div>
	{/if}

	<!-- Armor List -->
	{#if armor.length > 0}
		<div class="space-y-3">
			{#each armor as armorItem}
				<div class="cw-panel p-4 {armorItem.equipped ? 'border-accent-success/50' : 'opacity-60'}">
					<div class="flex justify-between items-start mb-3">
						<div class="flex items-center gap-3">
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									class="sr-only peer"
									checked={armorItem.equipped}
									on:change={() => handleToggleEquipped(armorItem.id)}
								/>
								<div class="w-9 h-5 bg-surface-light peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-success"></div>
							</label>
							<div>
								<h4 class="font-medium text-primary-text">
									{armorItem.name}
									{#if !armorItem.equipped}
										<span class="text-xs text-muted-text ml-2">(not equipped)</span>
									{/if}
								</h4>
								<p class="text-xs text-muted-text">{armorItem.category}</p>
							</div>
						</div>
						<div class="flex gap-2">
							<button
								class="text-xs text-accent-cyan hover:underline"
								on:click={() => {
									selectedArmorId = selectedArmorId === armorItem.id ? null : armorItem.id;
									showModPanel = false;
								}}
							>
								{selectedArmorId === armorItem.id ? 'Close' : 'Modify'}
							</button>
							<button
								class="text-accent-danger text-xs hover:underline"
								on:click={() => handleRemoveArmor(armorItem.id)}
							>
								Remove
							</button>
						</div>
					</div>

					<!-- Armor Stats -->
					<div class="grid grid-cols-4 gap-3 p-2 bg-surface-light rounded text-center text-sm">
						<div>
							<div class="text-xs text-muted-text">Ballistic</div>
							<div class="font-mono text-accent-success">{armorItem.ballistic}</div>
						</div>
						<div>
							<div class="text-xs text-muted-text">Impact</div>
							<div class="font-mono text-accent-cyan">{armorItem.impact}</div>
						</div>
						<div>
							<div class="text-xs text-muted-text">Capacity</div>
							<div class="font-mono text-primary-text">
								{getCapacityUsed(armorItem)}/{armorItem.capacity}
							</div>
						</div>
						<div>
							<div class="text-xs text-muted-text">Cost</div>
							<div class="font-mono text-accent-cyan">{formatNuyen(armorItem.cost)}</div>
						</div>
					</div>

					<!-- Modifications -->
					{#if armorItem.modifications && armorItem.modifications.length > 0}
						<div class="mt-3">
							<h5 class="text-xs text-muted-text uppercase tracking-wide mb-2">Modifications</h5>
							<div class="flex flex-wrap gap-1">
								{#each armorItem.modifications as mod}
									<span class="text-xs px-2 py-1 bg-accent-primary/20 text-accent-primary rounded flex items-center gap-1">
										{mod.name} {mod.rating > 1 ? `R${mod.rating}` : ''}
										{#if selectedArmorId === armorItem.id}
											<button
												class="text-accent-danger hover:text-accent-danger/80 ml-1"
												on:click={() => handleRemoveMod(mod.id)}
											>
												x
											</button>
										{/if}
									</span>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Modification Panel -->
					{#if selectedArmorId === armorItem.id}
						<div class="mt-3 pt-3 border-t border-border">
							<div class="flex items-center justify-between mb-2">
								<h5 class="text-sm font-medium text-secondary-text">Add Modification</h5>
								<div class="text-xs text-muted-text">
									Capacity: {armorItem.capacity - getCapacityUsed(armorItem)} remaining
								</div>
							</div>

							<button
								class="text-xs text-accent-cyan hover:underline mb-2"
								on:click={() => (showModPanel = !showModPanel)}
							>
								{showModPanel ? 'Hide' : 'Show'} Options
							</button>

							{#if showModPanel}
								<input
									type="text"
									class="cw-input text-sm w-full mb-2"
									placeholder="Search modifications..."
									bind:value={modSearch}
								/>
								<div class="max-h-48 overflow-y-auto space-y-1">
									{#each filteredMods as mod}
										{@const canFit = mod.capacityCost <= armorItem.capacity - getCapacityUsed(armorItem)}
										<button
											class="w-full text-left p-2 rounded bg-surface hover:bg-surface-light transition-colors text-sm"
											on:click={() => handleAddMod(mod)}
											disabled={nuyen < mod.cost || !canFit}
										>
											<div class="flex justify-between">
												<span class="text-primary-text">
													{mod.name}
													{#if mod.rating > 1}
														<span class="text-muted-text">R{mod.rating}</span>
													{/if}
												</span>
												<span class="text-accent-cyan font-mono">{formatNuyen(mod.cost)}</span>
											</div>
											<div class="flex gap-3 text-xs text-muted-text">
												<span class={!canFit ? 'text-accent-danger' : ''}>
													Capacity: {mod.capacityCost}
												</span>
											</div>
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<div class="cw-panel p-6 text-center">
			<p class="text-muted-text">No armor owned.</p>
			<p class="text-xs text-muted-text mt-1">Click "Add Armor" to purchase armor.</p>
		</div>
	{/if}
</div>

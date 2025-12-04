<script lang="ts">
	/**
	 * Weapon Manager Component
	 * ========================
	 * Manages character weapons with accessories, ammunition, and firing modes.
	 */

	import { character, addWeapon, removeWeapon, addWeaponAccessory, removeWeaponAccessory, reloadWeapon, spendAmmo, getMaxAmmo } from '$stores/character';
	import { gameData, loadGameData } from '$stores/gamedata';
	import { onMount } from 'svelte';
	import type { CharacterWeapon } from '$lib/types/equipment';

	/** Error message. */
	let error = '';

	/** Search query for adding weapons. */
	let searchQuery = '';

	/** Category filter. */
	let categoryFilter = '';

	/** Show add weapon panel. */
	let showAddPanel = false;

	/** Weapon being configured. */
	let selectedWeaponId: string | null = null;

	/** Show accessory panel. */
	let showAccessoryPanel = false;

	/** Accessory search. */
	let accessorySearch = '';

	onMount(() => {
		loadGameData();
	});

	/** Get unique weapon categories. */
	$: weaponCategories = $gameData.weapons
		? [...new Set($gameData.weapons.map((w) => w.category))].sort()
		: [];

	/** Filter available weapons. */
	$: filteredWeapons = ($gameData.weapons ?? []).filter((w) => {
		const matchesSearch = !searchQuery || w.name.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesCategory = !categoryFilter || w.category === categoryFilter;
		return matchesSearch && matchesCategory;
	});

	/** Character's weapons. */
	$: weapons = $character?.equipment.weapons ?? [];

	/** Character's nuyen. */
	$: nuyen = $character?.nuyen ?? 0;

	/** Selected weapon. */
	$: selectedWeapon = selectedWeaponId ? weapons.find((w) => w.id === selectedWeaponId) : null;

	/** Available weapon accessories (mock data - would come from game data). */
	const weaponAccessories = [
		{ name: 'Smartgun System (Internal)', mount: 'Internal', cost: 400 },
		{ name: 'Smartgun System (External)', mount: 'Top', cost: 200 },
		{ name: 'Laser Sight', mount: 'Under', cost: 125 },
		{ name: 'Sound Suppressor', mount: 'Barrel', cost: 500 },
		{ name: 'Extended Clip', mount: 'Internal', cost: 75 },
		{ name: 'Shock Pad', mount: 'Stock', cost: 50 },
		{ name: 'Gas-Vent 2', mount: 'Barrel', cost: 400 },
		{ name: 'Gas-Vent 3', mount: 'Barrel', cost: 600 },
		{ name: 'Folding Stock', mount: 'Stock', cost: 75 },
		{ name: 'Hidden Arm Slide', mount: 'Arm', cost: 350 },
		{ name: 'Personalized Grip', mount: 'Grip', cost: 100 },
		{ name: 'Quick-Draw Holster', mount: 'Holster', cost: 175 },
		{ name: 'Concealable Holster', mount: 'Holster', cost: 75 },
		{ name: 'Speed Loader', mount: 'Internal', cost: 25 },
		{ name: 'Imaging Scope', mount: 'Top', cost: 300 },
		{ name: 'Bipod', mount: 'Under', cost: 200 },
		{ name: 'Tripod', mount: 'Under', cost: 500 },
		{ name: 'Gyro Mount', mount: 'Body', cost: 1400 },
		{ name: 'Airburst Link', mount: 'Internal', cost: 500 },
		{ name: 'Sling', mount: 'Body', cost: 15 }
	];

	/** Filtered accessories. */
	$: filteredAccessories = weaponAccessories.filter((a) =>
		!accessorySearch || a.name.toLowerCase().includes(accessorySearch.toLowerCase())
	);

	/** Handle adding a weapon. */
	function handleAddWeapon(weapon: typeof $gameData.weapons[0]): void {
		error = '';
		if (nuyen < weapon.cost) {
			error = `Not enough nuyen. Need ${weapon.cost.toLocaleString()}¥`;
			return;
		}
		addWeapon(weapon);
		showAddPanel = false;
		searchQuery = '';
	}

	/** Handle removing a weapon. */
	function handleRemoveWeapon(weaponId: string): void {
		if (confirm('Remove this weapon? This cannot be undone.')) {
			removeWeapon(weaponId);
			if (selectedWeaponId === weaponId) {
				selectedWeaponId = null;
			}
		}
	}

	/** Handle adding accessory. */
	function handleAddAccessory(accessory: typeof weaponAccessories[0]): void {
		if (!selectedWeaponId) return;
		error = '';
		const result = addWeaponAccessory(selectedWeaponId, accessory);
		if (!result.success) {
			error = result.error || 'Failed to add accessory';
		}
	}

	/** Handle removing accessory. */
	function handleRemoveAccessory(accessoryId: string): void {
		if (!selectedWeaponId) return;
		removeWeaponAccessory(selectedWeaponId, accessoryId);
	}

	/** Handle reload. */
	function handleReload(weaponId: string): void {
		reloadWeapon(weaponId);
	}

	/** Handle fire. */
	function handleFire(weaponId: string, rounds: number): void {
		spendAmmo(weaponId, rounds);
	}

	/** Format nuyen. */
	function formatNuyen(amount: number): string {
		return amount.toLocaleString() + '¥';
	}

	/** Check if weapon has smartlink. */
	function hasSmartlink(weapon: CharacterWeapon): boolean {
		return weapon.accessories.some((a) =>
			a.name.toLowerCase().includes('smartgun')
		);
	}

	/** Get firing mode display. */
	function getFiringModes(mode: string): string[] {
		const modes: string[] = [];
		if (mode.includes('SS')) modes.push('SS');
		if (mode.includes('SA')) modes.push('SA');
		if (mode.includes('BF')) modes.push('BF');
		if (mode.includes('FA')) modes.push('FA');
		return modes;
	}

	/** Get rounds per mode. */
	function getRoundsPerMode(mode: string): number {
		switch (mode) {
			case 'SS':
			case 'SA':
				return 1;
			case 'BF':
				return 3;
			case 'FA':
				return 6;
			default:
				return 1;
		}
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-medium text-primary-text">Weapons</h3>
		<button
			class="cw-btn cw-btn-primary text-sm"
			on:click={() => (showAddPanel = !showAddPanel)}
		>
			{showAddPanel ? 'Cancel' : '+ Add Weapon'}
		</button>
	</div>

	{#if error}
		<div class="text-accent-danger text-sm">{error}</div>
	{/if}

	<!-- Add Weapon Panel -->
	{#if showAddPanel}
		<div class="cw-panel p-4 space-y-3">
			<h4 class="text-sm font-medium text-secondary-text">Add Weapon</h4>

			<div class="flex gap-2">
				<input
					type="text"
					class="cw-input flex-1 text-sm"
					placeholder="Search weapons..."
					bind:value={searchQuery}
				/>
				<select class="cw-input text-sm" bind:value={categoryFilter}>
					<option value="">All Categories</option>
					{#each weaponCategories as cat}
						<option value={cat}>{cat}</option>
					{/each}
				</select>
			</div>

			<div class="max-h-64 overflow-y-auto space-y-1">
				{#each filteredWeapons.slice(0, 50) as weapon}
					<button
						class="w-full text-left p-2 rounded bg-surface hover:bg-surface-light transition-colors"
						on:click={() => handleAddWeapon(weapon)}
						disabled={nuyen < weapon.cost}
					>
						<div class="flex justify-between items-start">
							<div>
								<span class="text-primary-text text-sm">{weapon.name}</span>
								<span class="text-xs text-muted-text ml-2">({weapon.category})</span>
							</div>
							<span class="text-accent-cyan text-sm font-mono">{formatNuyen(weapon.cost)}</span>
						</div>
						<div class="grid grid-cols-4 gap-2 text-xs text-muted-text mt-1">
							<span>DMG: {weapon.damage}</span>
							<span>AP: {weapon.ap}</span>
							<span>Mode: {weapon.mode}</span>
							<span>Ammo: {weapon.ammo}</span>
						</div>
					</button>
				{/each}
				{#if filteredWeapons.length > 50}
					<p class="text-xs text-muted-text text-center py-2">
						Showing 50 of {filteredWeapons.length}. Use search to narrow results.
					</p>
				{/if}
				{#if filteredWeapons.length === 0}
					<p class="text-muted-text text-sm text-center py-4">No weapons found.</p>
				{/if}
			</div>

			<div class="text-xs text-muted-text">
				Available: <span class="text-accent-cyan font-mono">{formatNuyen(nuyen)}</span>
			</div>
		</div>
	{/if}

	<!-- Weapon List -->
	{#if weapons.length > 0}
		<div class="space-y-3">
			{#each weapons as weapon}
				<div class="cw-panel p-4">
					<div class="flex justify-between items-start mb-3">
						<div>
							<h4 class="font-medium text-primary-text flex items-center gap-2">
								{weapon.name}
								{#if hasSmartlink(weapon)}
									<span class="text-xs px-2 py-0.5 bg-accent-success/20 text-accent-success rounded">Smartlink</span>
								{/if}
							</h4>
							<p class="text-xs text-muted-text">{weapon.category}</p>
						</div>
						<div class="flex gap-2">
							<button
								class="text-xs text-accent-cyan hover:underline"
								on:click={() => {
									selectedWeaponId = selectedWeaponId === weapon.id ? null : weapon.id;
									showAccessoryPanel = false;
								}}
							>
								{selectedWeaponId === weapon.id ? 'Close' : 'Configure'}
							</button>
							<button
								class="text-accent-danger text-xs hover:underline"
								on:click={() => handleRemoveWeapon(weapon.id)}
							>
								Remove
							</button>
						</div>
					</div>

					<!-- Weapon Stats -->
					<div class="grid grid-cols-3 md:grid-cols-6 gap-3 p-2 bg-surface-light rounded text-center text-sm">
						<div>
							<div class="text-xs text-muted-text">Damage</div>
							<div class="font-mono text-accent-danger">{weapon.damage}</div>
						</div>
						<div>
							<div class="text-xs text-muted-text">AP</div>
							<div class="font-mono text-primary-text">{weapon.ap}</div>
						</div>
						<div>
							<div class="text-xs text-muted-text">Mode</div>
							<div class="font-mono text-primary-text">{weapon.mode}</div>
						</div>
						<div>
							<div class="text-xs text-muted-text">RC</div>
							<div class="font-mono text-primary-text">{weapon.rc || '-'}</div>
						</div>
						{#if weapon.type === 'Melee'}
							<div>
								<div class="text-xs text-muted-text">Reach</div>
								<div class="font-mono text-primary-text">{weapon.reach}</div>
							</div>
						{:else}
							<div>
								<div class="text-xs text-muted-text">Ammo</div>
								<div class="font-mono text-accent-cyan">
									{weapon.currentAmmo}/{getMaxAmmo(weapon)}
								</div>
							</div>
						{/if}
						<div>
							<div class="text-xs text-muted-text">Conceal</div>
							<div class="font-mono text-primary-text">{weapon.conceal >= 0 ? '+' : ''}{weapon.conceal}</div>
						</div>
					</div>

					<!-- Ammo Controls (Ranged only) -->
					{#if weapon.type === 'Ranged' && getMaxAmmo(weapon) > 0}
						<div class="mt-3 flex items-center gap-2">
							<span class="text-xs text-muted-text">Fire:</span>
							{#each getFiringModes(weapon.mode) as mode}
								<button
									class="text-xs px-2 py-1 rounded bg-surface hover:bg-surface-lighter transition-colors disabled:opacity-50"
									disabled={weapon.currentAmmo < getRoundsPerMode(mode)}
									on:click={() => handleFire(weapon.id, getRoundsPerMode(mode))}
								>
									{mode} ({getRoundsPerMode(mode)})
								</button>
							{/each}
							<button
								class="text-xs px-2 py-1 rounded bg-accent-success/20 text-accent-success hover:bg-accent-success/30 transition-colors ml-auto"
								on:click={() => handleReload(weapon.id)}
							>
								Reload
							</button>
						</div>
					{/if}

					<!-- Accessories -->
					{#if weapon.accessories.length > 0}
						<div class="mt-3">
							<h5 class="text-xs text-muted-text uppercase tracking-wide mb-2">Accessories</h5>
							<div class="flex flex-wrap gap-1">
								{#each weapon.accessories as accessory}
									<span class="text-xs px-2 py-1 bg-accent-primary/20 text-accent-primary rounded flex items-center gap-1">
										{accessory.name}
										{#if selectedWeaponId === weapon.id}
											<button
												class="text-accent-danger hover:text-accent-danger/80 ml-1"
												on:click={() => handleRemoveAccessory(accessory.id)}
											>
												x
											</button>
										{/if}
									</span>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Accessory Panel -->
					{#if selectedWeaponId === weapon.id}
						<div class="mt-3 pt-3 border-t border-border">
							<div class="flex items-center justify-between mb-2">
								<h5 class="text-sm font-medium text-secondary-text">Add Accessory</h5>
								<button
									class="text-xs text-accent-cyan hover:underline"
									on:click={() => (showAccessoryPanel = !showAccessoryPanel)}
								>
									{showAccessoryPanel ? 'Hide' : 'Show'} Options
								</button>
							</div>

							{#if showAccessoryPanel}
								<input
									type="text"
									class="cw-input text-sm w-full mb-2"
									placeholder="Search accessories..."
									bind:value={accessorySearch}
								/>
								<div class="max-h-48 overflow-y-auto space-y-1">
									{#each filteredAccessories as accessory}
										<button
											class="w-full text-left p-2 rounded bg-surface hover:bg-surface-light transition-colors text-sm"
											on:click={() => handleAddAccessory(accessory)}
											disabled={nuyen < accessory.cost}
										>
											<div class="flex justify-between">
												<span class="text-primary-text">{accessory.name}</span>
												<span class="text-accent-cyan font-mono">{formatNuyen(accessory.cost)}</span>
											</div>
											<div class="text-xs text-muted-text">Mount: {accessory.mount}</div>
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
			<p class="text-muted-text">No weapons equipped.</p>
			<p class="text-xs text-muted-text mt-1">Click "Add Weapon" to purchase weapons.</p>
		</div>
	{/if}
</div>

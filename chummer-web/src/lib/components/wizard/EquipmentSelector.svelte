<script lang="ts">
	import {
		character,
		remainingNuyen,
		startingNuyen,
		currentEssence,
		setResourcesBP,
		addWeapon,
		removeWeapon,
		addArmor,
		removeArmor,
		addCyberware,
		removeCyberware,
		addBioware,
		removeBioware,
		addVehicle,
		removeVehicle,
		addMartialArt,
		removeMartialArt,
		addMartialArtTechnique,
		removeMartialArtTechnique,
		MARTIAL_ARTS_COSTS,
		addGear,
		removeGear,
		setLifestyle,
		removeLifestyle
	} from '$stores/character';
	import { gameData } from '$stores/gamedata';
	import { BP_TO_NUYEN_RATES, type CyberwareGrade, type BiowareGrade } from '$types';

	/** Current equipment tab. */
	type EquipmentTab = 'resources' | 'weapons' | 'armor' | 'cyberware' | 'bioware' | 'vehicles' | 'martialarts' | 'gear' | 'lifestyle' | 'owned';
	let currentTab: EquipmentTab = 'resources';

	/** Tab configuration. */
	const equipmentTabs: { id: EquipmentTab; label: string }[] = [
		{ id: 'resources', label: 'Resources' },
		{ id: 'weapons', label: 'Weapons' },
		{ id: 'armor', label: 'Armor' },
		{ id: 'cyberware', label: 'Cyberware' },
		{ id: 'bioware', label: 'Bioware' },
		{ id: 'vehicles', label: 'Vehicles' },
		{ id: 'martialarts', label: 'Martial Arts' },
		{ id: 'gear', label: 'Gear' },
		{ id: 'lifestyle', label: 'Lifestyle' },
		{ id: 'owned', label: 'Owned' }
	];

	/** Category filters. */
	let weaponCategory = '';
	let armorCategory = '';
	let cyberCategory = '';
	let bioCategory = '';
	let vehicleCategory = '';
	let gearCategory = '';

	/** Cyberware grade selection. */
	let selectedGrade: CyberwareGrade = 'Standard';
	let selectedBioGrade: BiowareGrade = 'Standard';

	/** Search filters. */
	let weaponSearch = '';
	let armorSearch = '';
	let cyberSearch = '';
	let bioSearch = '';
	let vehicleSearch = '';
	let martialSearch = '';
	let gearSearch = '';

	/** Grade multipliers for display. */
	const gradeInfo: Record<CyberwareGrade, { ess: string; cost: string; label: string }> = {
		'Standard': { ess: '1.0x', cost: '1x', label: 'Standard' },
		'Alphaware': { ess: '0.8x', cost: '2x', label: 'Alphaware' },
		'Betaware': { ess: '0.7x', cost: '4x', label: 'Betaware' },
		'Deltaware': { ess: '0.5x', cost: '10x', label: 'Deltaware' },
		'Used': { ess: '1.2x', cost: '0.5x', label: 'Used' }
	};

	/** Available grades as array for iteration. */
	const gradeOptions: CyberwareGrade[] = ['Standard', 'Alphaware', 'Betaware', 'Deltaware', 'Used'];
	const bioGradeOptions: BiowareGrade[] = ['Standard', 'Cultured'];

	/** Bioware grade info. */
	const bioGradeInfo: Record<BiowareGrade, { ess: string; cost: string; label: string }> = {
		'Standard': { ess: '1.0x', cost: '1x', label: 'Standard' },
		'Cultured': { ess: '0.75x', cost: '4x', label: 'Cultured' }
	};

	/** Filter weapons by category and search. */
	$: filteredWeapons = $gameData.weapons
		.filter((w) => !weaponCategory || w.category === weaponCategory)
		.filter((w) => !weaponSearch || w.name.toLowerCase().includes(weaponSearch.toLowerCase()))
		.filter((w) => w.cost > 0)
		.slice(0, 50);

	/** Filter armor by category and search. */
	$: filteredArmor = $gameData.armor
		.filter((a) => !armorCategory || a.category === armorCategory)
		.filter((a) => !armorSearch || a.name.toLowerCase().includes(armorSearch.toLowerCase()))
		.filter((a) => a.cost > 0)
		.slice(0, 50);

	/** Filter cyberware by category and search. */
	$: filteredCyberware = $gameData.cyberware
		.filter((c) => !cyberCategory || c.category === cyberCategory)
		.filter((c) => !cyberSearch || c.name.toLowerCase().includes(cyberSearch.toLowerCase()))
		.filter((c) => c.cost > 0)
		.slice(0, 50);

	/** Filter gear by category and search. */
	$: filteredGear = $gameData.gear
		.filter((g) => !gearCategory || g.category === gearCategory)
		.filter((g) => !gearSearch || g.name.toLowerCase().includes(gearSearch.toLowerCase()))
		.filter((g) => g.cost > 0)
		.slice(0, 50);

	/** Filter bioware by category and search. */
	$: filteredBioware = $gameData.bioware
		.filter((b) => !bioCategory || b.category === bioCategory)
		.filter((b) => !bioSearch || b.name.toLowerCase().includes(bioSearch.toLowerCase()))
		.filter((b) => b.cost > 0)
		.slice(0, 50);

	/** Filter vehicles by category and search. */
	$: filteredVehicles = $gameData.vehicles
		.filter((v) => !vehicleCategory || v.category === vehicleCategory)
		.filter((v) => !vehicleSearch || v.name.toLowerCase().includes(vehicleSearch.toLowerCase()))
		.filter((v) => v.cost > 0)
		.slice(0, 50);

	/** Filter martial arts by search. */
	$: filteredMartialArts = $gameData.martialArts
		.filter((m) => !martialSearch || m.name.toLowerCase().includes(martialSearch.toLowerCase()));

	/** Format nuyen amount. */
	function formatNuyen(amount: number): string {
		return amount.toLocaleString() + ' ¥';
	}

	/** Get current resources BP. */
	$: resourcesBP = $character?.buildPointsSpent.resources ?? 0;

	/** Owned equipment counts. */
	$: ownedWeapons = $character?.equipment.weapons ?? [];
	$: ownedArmor = $character?.equipment.armor ?? [];
	$: ownedCyberware = $character?.equipment.cyberware ?? [];
	$: ownedBioware = $character?.equipment.bioware ?? [];
	$: ownedVehicles = $character?.equipment.vehicles ?? [];
	$: ownedMartialArts = $character?.equipment.martialArts ?? [];
	$: ownedGear = $character?.equipment.gear ?? [];
	$: ownedLifestyle = $character?.equipment.lifestyle;

	/** Total owned items. */
	$: totalOwned = ownedWeapons.length + ownedArmor.length + ownedCyberware.length + ownedBioware.length + ownedVehicles.length + ownedMartialArts.length + ownedGear.length + (ownedLifestyle ? 1 : 0);
</script>

<div class="space-y-6">
	<!-- Nuyen & Essence Summary -->
	<div class="cw-panel p-4">
		<div class="grid grid-cols-3 gap-4 text-center">
			<div>
				<span class="text-muted-text text-xs block">Starting Nuyen</span>
				<span class="text-accent-primary font-mono text-lg">{formatNuyen($startingNuyen)}</span>
			</div>
			<div>
				<span class="text-muted-text text-xs block">Remaining</span>
				<span class="text-accent-cyan font-mono text-lg">{formatNuyen($remainingNuyen)}</span>
			</div>
			<div>
				<span class="text-muted-text text-xs block">Essence</span>
				<span class="text-accent-purple font-mono text-lg">{$currentEssence.toFixed(2)}</span>
			</div>
		</div>
	</div>

	<!-- Tab Navigation -->
	<nav class="flex gap-1 overflow-x-auto pb-2">
		{#each equipmentTabs as tab}
			<button
				class="px-3 py-2 rounded text-sm whitespace-nowrap transition-colors
					{currentTab === tab.id
						? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
						: 'bg-surface text-secondary-text hover:bg-surface-light'}"
				on:click={() => (currentTab = tab.id)}
			>
				{tab.id === 'owned' ? `Owned (${totalOwned})` : tab.label}
			</button>
		{/each}
	</nav>

	<!-- Tab Content -->
	<section class="min-h-[300px]">
		{#if currentTab === 'resources'}
			<!-- Resources / BP to Nuyen -->
			<div class="cw-card">
				<h3 class="cw-card-header mb-4">Resources (BP to Nuyen)</h3>
				<p class="text-secondary-text text-sm mb-4">
					Spend Build Points to gain starting nuyen for equipment purchases.
				</p>

				<div class="space-y-3">
					{#each BP_TO_NUYEN_RATES as rate}
						<button
							class="w-full flex items-center justify-between p-3 rounded transition-colors
								{resourcesBP === rate.bp
									? 'bg-accent-primary/20 border border-accent-primary/50'
									: 'bg-surface hover:bg-surface-light'}"
							on:click={() => setResourcesBP(rate.bp)}
						>
							<span class="text-primary-text">
								{rate.bp} BP
							</span>
							<span class="font-mono text-accent-cyan">
								{formatNuyen(rate.nuyen)}
							</span>
						</button>
					{/each}
				</div>
			</div>

		{:else if currentTab === 'weapons'}
			<!-- Weapons Browser -->
			<div class="cw-card">
				<h3 class="cw-card-header mb-4">Weapons</h3>

				<!-- Filters -->
				<div class="flex gap-2 mb-4">
					<select
						class="cw-input flex-1"
						bind:value={weaponCategory}
					>
						<option value="">All Categories</option>
						{#each $gameData.weaponCategories as cat}
							<option value={cat}>{cat}</option>
						{/each}
					</select>
					<input
						type="text"
						class="cw-input flex-1"
						placeholder="Search..."
						bind:value={weaponSearch}
					/>
				</div>

				<!-- Weapons List -->
				<div class="space-y-2 max-h-[400px] overflow-y-auto">
					{#each filteredWeapons as weapon}
						<div class="flex items-center justify-between p-2 bg-surface rounded text-sm">
							<div class="flex-1 min-w-0">
								<span class="text-primary-text block truncate">{weapon.name}</span>
								<span class="text-muted-text text-xs">
									{weapon.category} | DMG: {weapon.damage} | AP: {weapon.ap}
								</span>
							</div>
							<div class="flex items-center gap-2 ml-2">
								<span class="font-mono text-accent-cyan text-xs whitespace-nowrap">
									{formatNuyen(weapon.cost)}
								</span>
								<button
									class="cw-btn cw-btn-primary text-xs py-1 px-2"
									disabled={$remainingNuyen < weapon.cost}
									on:click={() => addWeapon(weapon)}
								>
									Buy
								</button>
							</div>
						</div>
					{/each}
					{#if filteredWeapons.length === 0}
						<p class="text-muted-text text-center py-4">No weapons found</p>
					{/if}
				</div>
			</div>

		{:else if currentTab === 'armor'}
			<!-- Armor Browser -->
			<div class="cw-card">
				<h3 class="cw-card-header mb-4">Armor</h3>

				<div class="flex gap-2 mb-4">
					<select
						class="cw-input flex-1"
						bind:value={armorCategory}
					>
						<option value="">All Categories</option>
						{#each $gameData.armorCategories as cat}
							<option value={cat}>{cat}</option>
						{/each}
					</select>
					<input
						type="text"
						class="cw-input flex-1"
						placeholder="Search..."
						bind:value={armorSearch}
					/>
				</div>

				<div class="space-y-2 max-h-[400px] overflow-y-auto">
					{#each filteredArmor as armor}
						<div class="flex items-center justify-between p-2 bg-surface rounded text-sm">
							<div class="flex-1 min-w-0">
								<span class="text-primary-text block truncate">{armor.name}</span>
								<span class="text-muted-text text-xs">
									B/I: {armor.ballistic}/{armor.impact} | {armor.category}
								</span>
							</div>
							<div class="flex items-center gap-2 ml-2">
								<span class="font-mono text-accent-cyan text-xs whitespace-nowrap">
									{formatNuyen(armor.cost)}
								</span>
								<button
									class="cw-btn cw-btn-primary text-xs py-1 px-2"
									disabled={$remainingNuyen < armor.cost}
									on:click={() => addArmor(armor)}
								>
									Buy
								</button>
							</div>
						</div>
					{/each}
					{#if filteredArmor.length === 0}
						<p class="text-muted-text text-center py-4">No armor found</p>
					{/if}
				</div>
			</div>

		{:else if currentTab === 'cyberware'}
			<!-- Cyberware Browser -->
			<div class="cw-card">
				<h3 class="cw-card-header mb-4">Cyberware</h3>

				<!-- Grade Selection -->
				<div class="cw-panel p-3 mb-4">
					<span class="text-secondary-text text-sm block mb-2">Select Grade:</span>
					<div class="flex gap-2 flex-wrap">
						{#each gradeOptions as grade}
							{@const info = gradeInfo[grade]}
							<button
								class="px-3 py-1 rounded text-xs transition-colors
									{selectedGrade === grade
										? 'bg-accent-primary text-background'
										: 'bg-surface text-secondary-text hover:bg-surface-light'}"
								on:click={() => (selectedGrade = grade)}
							>
								{info.label}
								<span class="text-muted-text ml-1">({info.ess} ESS, {info.cost})</span>
							</button>
						{/each}
					</div>
				</div>

				<div class="flex gap-2 mb-4">
					<select
						class="cw-input flex-1"
						bind:value={cyberCategory}
					>
						<option value="">All Categories</option>
						{#each $gameData.cyberwareCategories as cat}
							<option value={cat}>{cat}</option>
						{/each}
					</select>
					<input
						type="text"
						class="cw-input flex-1"
						placeholder="Search..."
						bind:value={cyberSearch}
					/>
				</div>

				<div class="space-y-2 max-h-[350px] overflow-y-auto">
					{#each filteredCyberware as cyber}
						{@const gradeMultiplier = selectedGrade === 'Standard' ? 1 : selectedGrade === 'Alphaware' ? 2 : selectedGrade === 'Betaware' ? 4 : selectedGrade === 'Deltaware' ? 10 : 0.5}
						{@const essMultiplier = selectedGrade === 'Standard' ? 1 : selectedGrade === 'Alphaware' ? 0.8 : selectedGrade === 'Betaware' ? 0.7 : selectedGrade === 'Deltaware' ? 0.5 : 1.2}
						{@const adjustedCost = Math.floor(cyber.cost * gradeMultiplier)}
						{@const adjustedEss = cyber.ess * essMultiplier}
						<div class="flex items-center justify-between p-2 bg-surface rounded text-sm">
							<div class="flex-1 min-w-0">
								<span class="text-primary-text block truncate">{cyber.name}</span>
								<span class="text-muted-text text-xs">
									{cyber.category} | ESS: {adjustedEss.toFixed(2)}
								</span>
							</div>
							<div class="flex items-center gap-2 ml-2">
								<span class="font-mono text-accent-cyan text-xs whitespace-nowrap">
									{formatNuyen(adjustedCost)}
								</span>
								<button
									class="cw-btn cw-btn-primary text-xs py-1 px-2"
									disabled={$remainingNuyen < adjustedCost || $currentEssence < adjustedEss}
									on:click={() => addCyberware(cyber, selectedGrade)}
								>
									Install
								</button>
							</div>
						</div>
					{/each}
					{#if filteredCyberware.length === 0}
						<p class="text-muted-text text-center py-4">No cyberware found</p>
					{/if}
				</div>
			</div>

		{:else if currentTab === 'bioware'}
			<!-- Bioware Browser -->
			<div class="cw-card">
				<h3 class="cw-card-header mb-4">Bioware</h3>

				<!-- Grade Selection -->
				<div class="cw-panel p-3 mb-4">
					<span class="text-secondary-text text-sm block mb-2">Select Grade:</span>
					<div class="flex gap-2 flex-wrap">
						{#each bioGradeOptions as grade}
							{@const info = bioGradeInfo[grade]}
							<button
								class="px-3 py-1 rounded text-xs transition-colors
									{selectedBioGrade === grade
										? 'bg-accent-primary text-background'
										: 'bg-surface text-secondary-text hover:bg-surface-light'}"
								on:click={() => (selectedBioGrade = grade)}
							>
								{info.label}
								<span class="text-muted-text ml-1">({info.ess} ESS, {info.cost})</span>
							</button>
						{/each}
					</div>
				</div>

				<div class="flex gap-2 mb-4">
					<select
						class="cw-input flex-1"
						bind:value={bioCategory}
					>
						<option value="">All Categories</option>
						{#each $gameData.biowareCategories as cat}
							<option value={cat}>{cat}</option>
						{/each}
					</select>
					<input
						type="text"
						class="cw-input flex-1"
						placeholder="Search..."
						bind:value={bioSearch}
					/>
				</div>

				<div class="space-y-2 max-h-[350px] overflow-y-auto">
					{#each filteredBioware as bio}
						{@const gradeMultiplier = selectedBioGrade === 'Standard' ? 1 : 4}
						{@const essMultiplier = selectedBioGrade === 'Standard' ? 1 : 0.75}
						{@const adjustedCost = Math.floor(bio.cost * gradeMultiplier)}
						{@const adjustedEss = bio.ess * essMultiplier}
						<div class="flex items-center justify-between p-2 bg-surface rounded text-sm">
							<div class="flex-1 min-w-0">
								<span class="text-primary-text block truncate">{bio.name}</span>
								<span class="text-muted-text text-xs">
									{bio.category} | ESS: {adjustedEss.toFixed(2)}
								</span>
							</div>
							<div class="flex items-center gap-2 ml-2">
								<span class="font-mono text-accent-cyan text-xs whitespace-nowrap">
									{formatNuyen(adjustedCost)}
								</span>
								<button
									class="cw-btn cw-btn-primary text-xs py-1 px-2"
									disabled={$remainingNuyen < adjustedCost || $currentEssence < adjustedEss}
									on:click={() => addBioware(bio, selectedBioGrade)}
								>
									Install
								</button>
							</div>
						</div>
					{/each}
					{#if filteredBioware.length === 0}
						<p class="text-muted-text text-center py-4">No bioware found</p>
					{/if}
				</div>
			</div>

		{:else if currentTab === 'vehicles'}
			<!-- Vehicles Browser -->
			<div class="cw-card">
				<h3 class="cw-card-header mb-4">Vehicles & Drones</h3>

				<div class="flex gap-2 mb-4">
					<select
						class="cw-input flex-1"
						bind:value={vehicleCategory}
					>
						<option value="">All Categories</option>
						{#each $gameData.vehicleCategories as cat}
							<option value={cat}>{cat}</option>
						{/each}
					</select>
					<input
						type="text"
						class="cw-input flex-1"
						placeholder="Search..."
						bind:value={vehicleSearch}
					/>
				</div>

				<div class="space-y-2 max-h-[400px] overflow-y-auto">
					{#each filteredVehicles as vehicle}
						<div class="flex items-center justify-between p-2 bg-surface rounded text-sm">
							<div class="flex-1 min-w-0">
								<span class="text-primary-text block truncate">{vehicle.name}</span>
								<span class="text-muted-text text-xs">
									{vehicle.category} | Handling: {vehicle.handling} | Speed: {vehicle.speed}
								</span>
							</div>
							<div class="flex items-center gap-2 ml-2">
								<span class="font-mono text-accent-cyan text-xs whitespace-nowrap">
									{formatNuyen(vehicle.cost)}
								</span>
								<button
									class="cw-btn cw-btn-primary text-xs py-1 px-2"
									disabled={$remainingNuyen < vehicle.cost}
									on:click={() => addVehicle(vehicle)}
								>
									Buy
								</button>
							</div>
						</div>
					{/each}
					{#if filteredVehicles.length === 0}
						<p class="text-muted-text text-center py-4">No vehicles found</p>
					{/if}
				</div>
			</div>

		{:else if currentTab === 'martialarts'}
			<!-- Martial Arts Browser -->
			<div class="cw-card">
				<h3 class="cw-card-header mb-4">Martial Arts</h3>
				<p class="text-secondary-text text-sm mb-4">
					Martial Arts cost BP, not nuyen. Each style costs {MARTIAL_ARTS_COSTS.STYLE} BP.
				</p>

				<div class="flex gap-2 mb-4">
					<input
						type="text"
						class="cw-input flex-1"
						placeholder="Search styles..."
						bind:value={martialSearch}
					/>
				</div>

				<div class="space-y-2 max-h-[400px] overflow-y-auto">
					{#each filteredMartialArts as style}
						{@const alreadyKnown = ownedMartialArts.some((m) => m.name === style.name)}
						<div class="flex items-center justify-between p-2 bg-surface rounded text-sm">
							<div class="flex-1 min-w-0">
								<span class="text-primary-text block truncate">{style.name}</span>
								<span class="text-muted-text text-xs">
									Source: {style.source} p.{style.page}
								</span>
							</div>
							<div class="flex items-center gap-2 ml-2">
								<span class="font-mono text-accent-purple text-xs whitespace-nowrap">
									{MARTIAL_ARTS_COSTS.STYLE} BP
								</span>
								<button
									class="cw-btn cw-btn-primary text-xs py-1 px-2"
									disabled={alreadyKnown}
									on:click={() => addMartialArt(style)}
								>
									{alreadyKnown ? 'Known' : 'Learn'}
								</button>
							</div>
						</div>
					{/each}
					{#if filteredMartialArts.length === 0}
						<p class="text-muted-text text-center py-4">No martial arts found</p>
					{/if}
				</div>
			</div>

		{:else if currentTab === 'gear'}
			<!-- Gear Browser -->
			<div class="cw-card">
				<h3 class="cw-card-header mb-4">Gear & Equipment</h3>

				<div class="flex gap-2 mb-4">
					<select
						class="cw-input flex-1"
						bind:value={gearCategory}
					>
						<option value="">All Categories</option>
						{#each $gameData.gearCategories as cat}
							<option value={cat}>{cat}</option>
						{/each}
					</select>
					<input
						type="text"
						class="cw-input flex-1"
						placeholder="Search..."
						bind:value={gearSearch}
					/>
				</div>

				<div class="space-y-2 max-h-[400px] overflow-y-auto">
					{#each filteredGear as gear}
						<div class="flex items-center justify-between p-2 bg-surface rounded text-sm">
							<div class="flex-1 min-w-0">
								<span class="text-primary-text block truncate">{gear.name}</span>
								<span class="text-muted-text text-xs">
									{gear.category}
									{#if gear.rating > 0}
										| Rating: {gear.rating}
									{/if}
								</span>
							</div>
							<div class="flex items-center gap-2 ml-2">
								<span class="font-mono text-accent-cyan text-xs whitespace-nowrap">
									{formatNuyen(gear.cost)}
								</span>
								<button
									class="cw-btn cw-btn-primary text-xs py-1 px-2"
									disabled={$remainingNuyen < gear.cost}
									on:click={() => addGear(gear)}
								>
									Buy
								</button>
							</div>
						</div>
					{/each}
					{#if filteredGear.length === 0}
						<p class="text-muted-text text-center py-4">No gear found</p>
					{/if}
				</div>
			</div>

		{:else if currentTab === 'lifestyle'}
			<!-- Lifestyle Selection -->
			<div class="cw-card">
				<h3 class="cw-card-header mb-4">Lifestyle</h3>
				<p class="text-secondary-text text-sm mb-4">
					Choose a lifestyle to determine your living conditions. Cost is per month.
				</p>

				{#if ownedLifestyle}
					<div class="cw-panel p-3 mb-4 border-accent-primary/50">
						<div class="flex items-center justify-between">
							<div>
								<span class="text-accent-primary font-medium">{ownedLifestyle.name}</span>
								<span class="text-muted-text text-xs block">
									{formatNuyen(ownedLifestyle.monthlyCost)}/month x {ownedLifestyle.monthsPrepaid}
								</span>
							</div>
							<button
								class="cw-btn cw-btn-danger text-xs"
								on:click={removeLifestyle}
							>
								Remove
							</button>
						</div>
					</div>
				{/if}

				<div class="space-y-2">
					{#each $gameData.lifestyles as lifestyle}
						<button
							class="w-full flex items-center justify-between p-3 bg-surface rounded text-sm
								hover:bg-surface-light transition-colors"
							disabled={$remainingNuyen < lifestyle.cost}
							on:click={() => setLifestyle(lifestyle.name, lifestyle.name, lifestyle.cost, 1)}
						>
							<div class="text-left">
								<span class="text-primary-text block">{lifestyle.name}</span>
								<span class="text-muted-text text-xs">
									Standard lifestyle tier
								</span>
							</div>
							<span class="font-mono text-accent-cyan">
								{formatNuyen(lifestyle.cost)}/mo
							</span>
						</button>
					{/each}
				</div>
			</div>

		{:else if currentTab === 'owned'}
			<!-- Owned Equipment -->
			<div class="space-y-4">
				<!-- Weapons -->
				{#if ownedWeapons.length > 0}
					<div class="cw-card">
						<h3 class="cw-card-header mb-3">Weapons ({ownedWeapons.length})</h3>
						<div class="space-y-2">
							{#each ownedWeapons as weapon}
								<div class="flex items-center justify-between p-2 bg-surface rounded text-sm">
									<div class="flex-1 min-w-0">
										<span class="text-primary-text block truncate">{weapon.name}</span>
										<span class="text-muted-text text-xs">
											DMG: {weapon.damage} | AP: {weapon.ap}
										</span>
									</div>
									<div class="flex items-center gap-2">
										<span class="text-muted-text text-xs">{formatNuyen(weapon.cost)}</span>
										<button
											class="text-accent-danger hover:text-red-400 text-xs"
											on:click={() => removeWeapon(weapon.id)}
										>
											Sell
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Armor -->
				{#if ownedArmor.length > 0}
					<div class="cw-card">
						<h3 class="cw-card-header mb-3">Armor ({ownedArmor.length})</h3>
						<div class="space-y-2">
							{#each ownedArmor as armor}
								<div class="flex items-center justify-between p-2 bg-surface rounded text-sm">
									<div class="flex-1 min-w-0">
										<span class="text-primary-text block truncate">{armor.name}</span>
										<span class="text-muted-text text-xs">
											B/I: {armor.ballistic}/{armor.impact}
										</span>
									</div>
									<div class="flex items-center gap-2">
										<span class="text-muted-text text-xs">{formatNuyen(armor.cost)}</span>
										<button
											class="text-accent-danger hover:text-red-400 text-xs"
											on:click={() => removeArmor(armor.id)}
										>
											Sell
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Cyberware -->
				{#if ownedCyberware.length > 0}
					<div class="cw-card">
						<h3 class="cw-card-header mb-3">Cyberware ({ownedCyberware.length})</h3>
						<div class="space-y-2">
							{#each ownedCyberware as cyber}
								<div class="flex items-center justify-between p-2 bg-surface rounded text-sm">
									<div class="flex-1 min-w-0">
										<span class="text-primary-text block truncate">{cyber.name}</span>
										<span class="text-muted-text text-xs">
											{cyber.grade} | ESS: {cyber.essence.toFixed(2)}
										</span>
									</div>
									<div class="flex items-center gap-2">
										<span class="text-muted-text text-xs">{formatNuyen(cyber.cost)}</span>
										<button
											class="text-accent-danger hover:text-red-400 text-xs"
											on:click={() => removeCyberware(cyber.id)}
										>
											Remove
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Bioware -->
				{#if ownedBioware.length > 0}
					<div class="cw-card">
						<h3 class="cw-card-header mb-3">Bioware ({ownedBioware.length})</h3>
						<div class="space-y-2">
							{#each ownedBioware as bio}
								<div class="flex items-center justify-between p-2 bg-surface rounded text-sm">
									<div class="flex-1 min-w-0">
										<span class="text-primary-text block truncate">{bio.name}</span>
										<span class="text-muted-text text-xs">
											{bio.grade} | ESS: {bio.essence.toFixed(2)}
										</span>
									</div>
									<div class="flex items-center gap-2">
										<span class="text-muted-text text-xs">{formatNuyen(bio.cost)}</span>
										<button
											class="text-accent-danger hover:text-red-400 text-xs"
											on:click={() => removeBioware(bio.id)}
										>
											Remove
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Vehicles -->
				{#if ownedVehicles.length > 0}
					<div class="cw-card">
						<h3 class="cw-card-header mb-3">Vehicles ({ownedVehicles.length})</h3>
						<div class="space-y-2">
							{#each ownedVehicles as vehicle}
								<div class="flex items-center justify-between p-2 bg-surface rounded text-sm">
									<div class="flex-1 min-w-0">
										<span class="text-primary-text block truncate">{vehicle.name}</span>
										<span class="text-muted-text text-xs">
											{vehicle.category} | Handling: {vehicle.handling}
										</span>
									</div>
									<div class="flex items-center gap-2">
										<span class="text-muted-text text-xs">{formatNuyen(vehicle.cost)}</span>
										<button
											class="text-accent-danger hover:text-red-400 text-xs"
											on:click={() => removeVehicle(vehicle.id)}
										>
											Sell
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Martial Arts -->
				{#if ownedMartialArts.length > 0}
					<div class="cw-card">
						<h3 class="cw-card-header mb-3">Martial Arts ({ownedMartialArts.length})</h3>
						<div class="space-y-2">
							{#each ownedMartialArts as art}
								<div class="flex items-center justify-between p-2 bg-surface rounded text-sm">
									<div class="flex-1 min-w-0">
										<span class="text-primary-text block truncate">{art.name}</span>
										<span class="text-muted-text text-xs">
											{art.techniques.length} technique{art.techniques.length !== 1 ? 's' : ''}
										</span>
									</div>
									<div class="flex items-center gap-2">
										<span class="text-muted-text text-xs">{MARTIAL_ARTS_COSTS.STYLE} BP</span>
										<button
											class="text-accent-danger hover:text-red-400 text-xs"
											on:click={() => removeMartialArt(art.id)}
										>
											Remove
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Gear -->
				{#if ownedGear.length > 0}
					<div class="cw-card">
						<h3 class="cw-card-header mb-3">Gear ({ownedGear.length})</h3>
						<div class="space-y-2">
							{#each ownedGear as gear}
								<div class="flex items-center justify-between p-2 bg-surface rounded text-sm">
									<div class="flex-1 min-w-0">
										<span class="text-primary-text block truncate">
											{gear.name}
											{#if gear.quantity > 1}
												<span class="text-muted-text">(x{gear.quantity})</span>
											{/if}
										</span>
										<span class="text-muted-text text-xs">{gear.category}</span>
									</div>
									<div class="flex items-center gap-2">
										<span class="text-muted-text text-xs">{formatNuyen(gear.cost * gear.quantity)}</span>
										<button
											class="text-accent-danger hover:text-red-400 text-xs"
											on:click={() => removeGear(gear.id)}
										>
											Sell
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Lifestyle -->
				{#if ownedLifestyle}
					<div class="cw-card">
						<h3 class="cw-card-header mb-3">Lifestyle</h3>
						<div class="flex items-center justify-between p-2 bg-surface rounded text-sm">
							<div>
								<span class="text-primary-text">{ownedLifestyle.name}</span>
								<span class="text-muted-text text-xs block">
									{ownedLifestyle.monthsPrepaid} month(s) prepaid
								</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-muted-text text-xs">
									{formatNuyen(ownedLifestyle.monthlyCost * ownedLifestyle.monthsPrepaid)}
								</span>
								<button
									class="text-accent-danger hover:text-red-400 text-xs"
									on:click={removeLifestyle}
								>
									Remove
								</button>
							</div>
						</div>
					</div>
				{/if}

				{#if totalOwned === 0}
					<div class="cw-panel p-8 text-center">
						<p class="text-muted-text">No equipment purchased yet.</p>
						<p class="text-secondary-text text-sm mt-2">
							Start by allocating Resources BP, then browse the equipment tabs.
						</p>
					</div>
				{/if}
			</div>
		{/if}
	</section>

	<!-- Help Text -->
	<div class="cw-panel p-4 text-sm">
		<h4 class="text-accent-primary mb-2">Equipment Tips</h4>
		<ul class="text-secondary-text space-y-1 list-disc list-inside">
			<li>Allocate Resources BP first to get starting nuyen</li>
			<li>Cyberware reduces your Essence - don't go below 0</li>
			<li>Higher grade cyberware costs more but uses less Essence</li>
			<li>You need at least a Low lifestyle to avoid complications</li>
		</ul>
	</div>
</div>

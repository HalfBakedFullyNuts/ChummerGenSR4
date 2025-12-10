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
		MARTIAL_ARTS_COSTS,
		addGear,
		removeGear,
		setLifestyle,
		removeLifestyle,
		KARMA_BUILD_COSTS
	} from '$stores/character';
	import { gameData } from '$stores/gamedata';
	import { BP_TO_NUYEN_RATES, type CyberwareGrade, type BiowareGrade } from '$types';
	import type { CharacterWeapon, CharacterArmor, CharacterCyberware, CharacterBioware, CharacterVehicle, CharacterMartialArt, CharacterGear, CharacterLifestyle } from '$types';

	/** Modal state. */
	type ModalType = 'weapon' | 'armor' | 'cyberware' | 'bioware' | 'vehicle' | 'martialart' | 'gear' | 'lifestyle' | null;
	let activeModal: ModalType = null;

	/** Selected item for details panel. */
	type SelectedItem =
		| { type: 'weapon'; item: CharacterWeapon }
		| { type: 'armor'; item: CharacterArmor }
		| { type: 'cyberware'; item: CharacterCyberware }
		| { type: 'bioware'; item: CharacterBioware }
		| { type: 'vehicle'; item: CharacterVehicle }
		| { type: 'martialart'; item: CharacterMartialArt }
		| { type: 'gear'; item: CharacterGear }
		| { type: 'lifestyle'; item: CharacterLifestyle }
		| null;
	let selectedItem: SelectedItem = null;

	/** Modal filters. */
	let modalCategory = '';
	let modalSearch = '';
	let selectedGrade: CyberwareGrade = 'Standard';
	let selectedBioGrade: BiowareGrade = 'Standard';

	/** Grade multipliers. */
	const gradeInfo: Record<CyberwareGrade, { ess: number; cost: number; label: string }> = {
		'Standard': { ess: 1.0, cost: 1, label: 'Standard' },
		'Alphaware': { ess: 0.8, cost: 2, label: 'Alphaware' },
		'Betaware': { ess: 0.7, cost: 4, label: 'Betaware' },
		'Deltaware': { ess: 0.5, cost: 10, label: 'Deltaware' },
		'Used': { ess: 1.2, cost: 0.5, label: 'Used' }
	};
	const gradeOptions: CyberwareGrade[] = ['Standard', 'Alphaware', 'Betaware', 'Deltaware', 'Used'];
	const bioGradeOptions: BiowareGrade[] = ['Standard', 'Cultured'];
	const bioGradeInfo: Record<BiowareGrade, { ess: number; cost: number; label: string }> = {
		'Standard': { ess: 1.0, cost: 1, label: 'Standard' },
		'Cultured': { ess: 0.75, cost: 4, label: 'Cultured' }
	};

	/** Get current resources BP/Karma. */
	$: resourcesBP = $character?.buildPointsSpent.resources ?? 0;
	$: isKarmaBuild = $character?.buildMethod === 'karma';

	/** Owned equipment. */
	$: ownedWeapons = $character?.equipment.weapons ?? [];
	$: ownedArmor = $character?.equipment.armor ?? [];
	$: ownedCyberware = $character?.equipment.cyberware ?? [];
	$: ownedBioware = $character?.equipment.bioware ?? [];
	$: ownedVehicles = $character?.equipment.vehicles ?? [];
	$: ownedMartialArts = $character?.equipment.martialArts ?? [];
	$: ownedGear = $character?.equipment.gear ?? [];
	$: ownedLifestyle = $character?.equipment.lifestyle;

	/** Total counts. */
	$: totalOwned = ownedWeapons.length + ownedArmor.length + ownedCyberware.length +
		ownedBioware.length + ownedVehicles.length + ownedMartialArts.length +
		ownedGear.length + (ownedLifestyle ? 1 : 0);

	/** Format nuyen. */
	function formatNuyen(amount: number): string {
		return amount.toLocaleString() + '¥';
	}

	/** Increment resources. */
	function incrementResources(): void {
		if (isKarmaBuild) {
			// Karma build: increment by 1 karma = 2,500¥
			setResourcesBP(resourcesBP + 1);
		} else {
			// BP build: go to next tier
			const currentIndex = BP_TO_NUYEN_RATES.findIndex(r => r.bp === resourcesBP);
			if (currentIndex < BP_TO_NUYEN_RATES.length - 1) {
				const nextRate = BP_TO_NUYEN_RATES[currentIndex + 1];
				if (nextRate) setResourcesBP(nextRate.bp);
			}
		}
	}

	/** Decrement resources. */
	function decrementResources(): void {
		if (isKarmaBuild) {
			// Karma build: decrement by 1 karma
			if (resourcesBP > 0) setResourcesBP(resourcesBP - 1);
		} else {
			// BP build: go to previous tier
			const currentIndex = BP_TO_NUYEN_RATES.findIndex(r => r.bp === resourcesBP);
			if (currentIndex > 0) {
				const prevRate = BP_TO_NUYEN_RATES[currentIndex - 1];
				if (prevRate) setResourcesBP(prevRate.bp);
			}
		}
	}

	/** Check if can increment. */
	$: canIncrement = isKarmaBuild ? resourcesBP < 100 : resourcesBP < 50;
	$: canDecrement = resourcesBP > 0;

	/** Open modal. */
	function openModal(type: ModalType): void {
		activeModal = type;
		modalCategory = '';
		modalSearch = '';
	}

	/** Close modal. */
	function closeModal(): void {
		activeModal = null;
		modalCategory = '';
		modalSearch = '';
	}

	/** Handle escape key. */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && activeModal) {
			closeModal();
		}
	}

	/** Select item for details. */
	function selectWeapon(item: CharacterWeapon): void {
		selectedItem = { type: 'weapon', item };
	}
	function selectArmor(item: CharacterArmor): void {
		selectedItem = { type: 'armor', item };
	}
	function selectCyberware(item: CharacterCyberware): void {
		selectedItem = { type: 'cyberware', item };
	}
	function selectBioware(item: CharacterBioware): void {
		selectedItem = { type: 'bioware', item };
	}
	function selectVehicle(item: CharacterVehicle): void {
		selectedItem = { type: 'vehicle', item };
	}
	function selectMartialArt(item: CharacterMartialArt): void {
		selectedItem = { type: 'martialart', item };
	}
	function selectGear(item: CharacterGear): void {
		selectedItem = { type: 'gear', item };
	}
	function selectLifestyle(item: CharacterLifestyle): void {
		selectedItem = { type: 'lifestyle', item };
	}

	/** Clear selection when item is removed. */
	function removeAndClear(removeFunc: () => void): void {
		removeFunc();
		selectedItem = null;
	}

	/** Filtered modal items. */
	$: filteredWeapons = $gameData.weapons
		.filter(w => !modalCategory || w.category === modalCategory)
		.filter(w => !modalSearch || w.name.toLowerCase().includes(modalSearch.toLowerCase()))
		.filter(w => w.cost > 0)
		.slice(0, 100);

	$: filteredArmor = $gameData.armor
		.filter(a => !modalCategory || a.category === modalCategory)
		.filter(a => !modalSearch || a.name.toLowerCase().includes(modalSearch.toLowerCase()))
		.filter(a => a.cost > 0)
		.slice(0, 100);

	$: filteredCyberware = $gameData.cyberware
		.filter(c => !modalCategory || c.category === modalCategory)
		.filter(c => !modalSearch || c.name.toLowerCase().includes(modalSearch.toLowerCase()))
		.filter(c => c.cost > 0)
		.slice(0, 100);

	$: filteredBioware = $gameData.bioware
		.filter(b => !modalCategory || b.category === modalCategory)
		.filter(b => !modalSearch || b.name.toLowerCase().includes(modalSearch.toLowerCase()))
		.filter(b => b.cost > 0)
		.slice(0, 100);

	$: filteredVehicles = $gameData.vehicles
		.filter(v => !modalCategory || v.category === modalCategory)
		.filter(v => !modalSearch || v.name.toLowerCase().includes(modalSearch.toLowerCase()))
		.filter(v => v.cost > 0)
		.slice(0, 100);

	$: filteredMartialArts = $gameData.martialArts
		.filter(m => !modalSearch || m.name.toLowerCase().includes(modalSearch.toLowerCase()));

	$: filteredGear = $gameData.gear
		.filter(g => !modalCategory || g.category === modalCategory)
		.filter(g => !modalSearch || g.name.toLowerCase().includes(modalSearch.toLowerCase()))
		.filter(g => g.cost > 0)
		.slice(0, 100);

	$: filteredLifestyles = $gameData.lifestyles;
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="space-y-4">
	<!-- Resources Counter -->
	<div class="flex justify-center">
		<div class="bg-white border border-gray-200 rounded-lg shadow-md p-4 inline-block min-w-[500px]">
			<div class="flex items-center justify-center gap-6">
				<!-- Resources Control -->
				<div class="flex items-center gap-3">
					<span class="text-sm text-gray-600">Resources:</span>
					<button
						class="cw-btn-inc-dec"
						on:click={decrementResources}
						disabled={!canDecrement}
					>
						<span class="material-icons text-xs">remove</span>
					</button>
					<span class="w-16 text-center font-mono text-lg text-primary-dark font-bold">
						{resourcesBP} {isKarmaBuild ? 'K' : 'BP'}
					</span>
					<button
						class="cw-btn-inc-dec"
						on:click={incrementResources}
						disabled={!canIncrement}
					>
						<span class="material-icons text-xs">add</span>
					</button>
				</div>

				<div class="h-8 w-px bg-gray-300"></div>

				<!-- Nuyen Display -->
				<div class="text-center">
					<span class="text-sm text-gray-600">Starting:</span>
					<span class="font-mono text-lg text-primary-dark ml-2">{formatNuyen($startingNuyen)}</span>
				</div>

				<div class="h-8 w-px bg-gray-300"></div>

				<!-- Remaining -->
				<div class="text-center">
					<span class="text-sm text-gray-600">Remaining:</span>
					<span class="font-mono text-lg {$remainingNuyen < 0 ? 'text-red-600' : 'text-green-600'} ml-2">
						{formatNuyen($remainingNuyen)}
					</span>
				</div>

				<div class="h-8 w-px bg-gray-300"></div>

				<!-- Essence -->
				<div class="text-center">
					<span class="text-sm text-gray-600">Essence:</span>
					<span class="font-mono text-lg text-info-dark ml-2">{$currentEssence.toFixed(2)}</span>
				</div>
			</div>
			{#if $remainingNuyen < 0}
				<p class="text-red-600 text-sm mt-2 text-center border-t border-red-200 pt-2 font-medium">
					<span class="material-icons text-sm align-text-bottom mr-1">warning</span>
					Over budget! Sell equipment or increase resources to proceed.
				</p>
			{:else}
				<p class="text-gray-500 text-xs mt-2 text-center border-t border-gray-100 pt-2">
					{#if isKarmaBuild}
						1 Karma = {KARMA_BUILD_COSTS.NUYEN_PER_KARMA.toLocaleString()}¥
					{:else}
						BP tiers: 5 BP = 20,000¥ | 10 BP = 50,000¥ | 20 BP = 90,000¥ | 50 BP = 275,000¥
					{/if}
				</p>
			{/if}
		</div>
	</div>

	<!-- Two-Panel Layout -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
		<!-- Left Panel: Owned Equipment -->
		<div class="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
			<div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-semibold text-gray-800 uppercase tracking-wide">
						Owned Equipment ({totalOwned})
					</h3>
					<div class="flex flex-wrap gap-2">
						<button class="cw-btn text-xs py-1 px-2" on:click={() => openModal('weapon')}>
							<span class="material-icons text-xs mr-1">add</span>Weapon
						</button>
						<button class="cw-btn text-xs py-1 px-2" on:click={() => openModal('armor')}>
							<span class="material-icons text-xs mr-1">add</span>Armor
						</button>
						<button class="cw-btn text-xs py-1 px-2" on:click={() => openModal('cyberware')}>
							<span class="material-icons text-xs mr-1">add</span>Cyberware
						</button>
						<button class="cw-btn text-xs py-1 px-2" on:click={() => openModal('bioware')}>
							<span class="material-icons text-xs mr-1">add</span>Bioware
						</button>
						<button class="cw-btn text-xs py-1 px-2" on:click={() => openModal('vehicle')}>
							<span class="material-icons text-xs mr-1">add</span>Vehicle
						</button>
						<button class="cw-btn text-xs py-1 px-2" on:click={() => openModal('gear')}>
							<span class="material-icons text-xs mr-1">add</span>Gear
						</button>
						<button class="cw-btn text-xs py-1 px-2" on:click={() => openModal('lifestyle')}>
							<span class="material-icons text-xs mr-1">add</span>Lifestyle
						</button>
						<button class="cw-btn text-xs py-1 px-2" on:click={() => openModal('martialart')}>
							<span class="material-icons text-xs mr-1">add</span>Martial Art
						</button>
					</div>
				</div>
			</div>

			<div class="p-4 max-h-[500px] overflow-y-auto space-y-4">
				{#if totalOwned === 0}
					<div class="text-center py-8 text-gray-400">
						<span class="material-icons text-4xl mb-2">inventory_2</span>
						<p>No equipment purchased yet.</p>
						<p class="text-sm mt-1">Use the buttons above to add equipment.</p>
					</div>
				{:else}
					<!-- Weapons -->
					{#if ownedWeapons.length > 0}
						<div>
							<h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Weapons ({ownedWeapons.length})</h4>
							<div class="space-y-1">
								{#each ownedWeapons as weapon (weapon.id)}
									<button
										class="w-full flex items-center justify-between p-2 rounded text-sm text-left transition-colors
											{selectedItem?.type === 'weapon' && selectedItem.item.id === weapon.id
												? 'bg-primary-main/20 border border-primary-main/50'
												: 'bg-gray-50 hover:bg-gray-100'}"
										on:click={() => selectWeapon(weapon)}
									>
										<span class="text-gray-800 truncate">{weapon.name}</span>
										<span class="text-gray-500 text-xs ml-2">{formatNuyen(weapon.cost)}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Armor -->
					{#if ownedArmor.length > 0}
						<div>
							<h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Armor ({ownedArmor.length})</h4>
							<div class="space-y-1">
								{#each ownedArmor as armor (armor.id)}
									<button
										class="w-full flex items-center justify-between p-2 rounded text-sm text-left transition-colors
											{selectedItem?.type === 'armor' && selectedItem.item.id === armor.id
												? 'bg-primary-main/20 border border-primary-main/50'
												: 'bg-gray-50 hover:bg-gray-100'}"
										on:click={() => selectArmor(armor)}
									>
										<span class="text-gray-800 truncate">{armor.name}</span>
										<span class="text-gray-500 text-xs ml-2">{formatNuyen(armor.cost)}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Cyberware -->
					{#if ownedCyberware.length > 0}
						<div>
							<h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Cyberware ({ownedCyberware.length})</h4>
							<div class="space-y-1">
								{#each ownedCyberware as cyber (cyber.id)}
									<button
										class="w-full flex items-center justify-between p-2 rounded text-sm text-left transition-colors
											{selectedItem?.type === 'cyberware' && selectedItem.item.id === cyber.id
												? 'bg-primary-main/20 border border-primary-main/50'
												: 'bg-gray-50 hover:bg-gray-100'}"
										on:click={() => selectCyberware(cyber)}
									>
										<span class="text-gray-800 truncate">{cyber.name}</span>
										<span class="text-gray-500 text-xs ml-2">ESS: {cyber.essence.toFixed(2)}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Bioware -->
					{#if ownedBioware.length > 0}
						<div>
							<h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Bioware ({ownedBioware.length})</h4>
							<div class="space-y-1">
								{#each ownedBioware as bio (bio.id)}
									<button
										class="w-full flex items-center justify-between p-2 rounded text-sm text-left transition-colors
											{selectedItem?.type === 'bioware' && selectedItem.item.id === bio.id
												? 'bg-primary-main/20 border border-primary-main/50'
												: 'bg-gray-50 hover:bg-gray-100'}"
										on:click={() => selectBioware(bio)}
									>
										<span class="text-gray-800 truncate">{bio.name}</span>
										<span class="text-gray-500 text-xs ml-2">ESS: {bio.essence.toFixed(2)}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Vehicles -->
					{#if ownedVehicles.length > 0}
						<div>
							<h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Vehicles ({ownedVehicles.length})</h4>
							<div class="space-y-1">
								{#each ownedVehicles as vehicle (vehicle.id)}
									<button
										class="w-full flex items-center justify-between p-2 rounded text-sm text-left transition-colors
											{selectedItem?.type === 'vehicle' && selectedItem.item.id === vehicle.id
												? 'bg-primary-main/20 border border-primary-main/50'
												: 'bg-gray-50 hover:bg-gray-100'}"
										on:click={() => selectVehicle(vehicle)}
									>
										<span class="text-gray-800 truncate">{vehicle.name}</span>
										<span class="text-gray-500 text-xs ml-2">{formatNuyen(vehicle.cost)}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Gear -->
					{#if ownedGear.length > 0}
						<div>
							<h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Gear ({ownedGear.length})</h4>
							<div class="space-y-1">
								{#each ownedGear as gear (gear.id)}
									<button
										class="w-full flex items-center justify-between p-2 rounded text-sm text-left transition-colors
											{selectedItem?.type === 'gear' && selectedItem.item.id === gear.id
												? 'bg-primary-main/20 border border-primary-main/50'
												: 'bg-gray-50 hover:bg-gray-100'}"
										on:click={() => selectGear(gear)}
									>
										<span class="text-gray-800 truncate">
											{gear.name}
											{#if gear.quantity > 1}<span class="text-gray-400">(x{gear.quantity})</span>{/if}
										</span>
										<span class="text-gray-500 text-xs ml-2">{formatNuyen(gear.cost * gear.quantity)}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Martial Arts -->
					{#if ownedMartialArts.length > 0}
						<div>
							<h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Martial Arts ({ownedMartialArts.length})</h4>
							<div class="space-y-1">
								{#each ownedMartialArts as art (art.id)}
									<button
										class="w-full flex items-center justify-between p-2 rounded text-sm text-left transition-colors
											{selectedItem?.type === 'martialart' && selectedItem.item.id === art.id
												? 'bg-primary-main/20 border border-primary-main/50'
												: 'bg-gray-50 hover:bg-gray-100'}"
										on:click={() => selectMartialArt(art)}
									>
										<span class="text-gray-800 truncate">{art.name}</span>
										<span class="text-gray-500 text-xs ml-2">{MARTIAL_ARTS_COSTS.STYLE} BP</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Lifestyle -->
					{#if ownedLifestyle}
						<div>
							<h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Lifestyle</h4>
							<button
								class="w-full flex items-center justify-between p-2 rounded text-sm text-left transition-colors
									{selectedItem?.type === 'lifestyle'
										? 'bg-primary-main/20 border border-primary-main/50'
										: 'bg-gray-50 hover:bg-gray-100'}"
								on:click={() => selectLifestyle(ownedLifestyle)}
							>
								<span class="text-gray-800 truncate">{ownedLifestyle.name}</span>
								<span class="text-gray-500 text-xs ml-2">{formatNuyen(ownedLifestyle.monthlyCost)}/mo</span>
							</button>
						</div>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Right Panel: Item Details -->
		<div class="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
			<div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
				<h3 class="text-sm font-semibold text-gray-800 uppercase tracking-wide">
					Item Details
				</h3>
			</div>

			<div class="p-4">
				{#if !selectedItem}
					<div class="text-center py-8 text-gray-400">
						<span class="material-icons text-4xl mb-2">info</span>
						<p>Select an item to view details</p>
					</div>
				{:else if selectedItem.type === 'weapon'}
					{@const weapon = selectedItem.item}
					<div class="space-y-3">
						<h4 class="font-semibold text-gray-800">{weapon.name}</h4>
						<div class="grid grid-cols-2 gap-2 text-sm">
							<div><span class="text-gray-500">Category:</span> <span class="text-gray-800">{weapon.category}</span></div>
							<div><span class="text-gray-500">Damage:</span> <span class="text-gray-800">{weapon.damage}</span></div>
							<div><span class="text-gray-500">AP:</span> <span class="text-gray-800">{weapon.ap}</span></div>
							<div><span class="text-gray-500">Mode:</span> <span class="text-gray-800">{weapon.mode}</span></div>
							<div><span class="text-gray-500">RC:</span> <span class="text-gray-800">{weapon.rc}</span></div>
							<div><span class="text-gray-500">Ammo:</span> <span class="text-gray-800">{weapon.ammo}</span></div>
							<div class="col-span-2"><span class="text-gray-500">Cost:</span> <span class="text-primary-dark font-mono">{formatNuyen(weapon.cost)}</span></div>
						</div>
						<button
							class="w-full cw-btn bg-red-500 hover:bg-red-600 text-white mt-4"
							on:click={() => removeAndClear(() => removeWeapon(weapon.id))}
						>
							<span class="material-icons text-sm mr-1">delete</span>
							Sell Weapon
						</button>
					</div>
				{:else if selectedItem.type === 'armor'}
					{@const armor = selectedItem.item}
					<div class="space-y-3">
						<h4 class="font-semibold text-gray-800">{armor.name}</h4>
						<div class="grid grid-cols-2 gap-2 text-sm">
							<div><span class="text-gray-500">Category:</span> <span class="text-gray-800">{armor.category}</span></div>
							<div><span class="text-gray-500">Ballistic:</span> <span class="text-gray-800">{armor.ballistic}</span></div>
							<div><span class="text-gray-500">Impact:</span> <span class="text-gray-800">{armor.impact}</span></div>
							<div class="col-span-2"><span class="text-gray-500">Cost:</span> <span class="text-primary-dark font-mono">{formatNuyen(armor.cost)}</span></div>
						</div>
						<button
							class="w-full cw-btn bg-red-500 hover:bg-red-600 text-white mt-4"
							on:click={() => removeAndClear(() => removeArmor(armor.id))}
						>
							<span class="material-icons text-sm mr-1">delete</span>
							Sell Armor
						</button>
					</div>
				{:else if selectedItem.type === 'cyberware'}
					{@const cyber = selectedItem.item}
					<div class="space-y-3">
						<h4 class="font-semibold text-gray-800">{cyber.name}</h4>
						<div class="grid grid-cols-2 gap-2 text-sm">
							<div><span class="text-gray-500">Category:</span> <span class="text-gray-800">{cyber.category}</span></div>
							<div><span class="text-gray-500">Grade:</span> <span class="text-gray-800">{cyber.grade}</span></div>
							<div><span class="text-gray-500">Essence:</span> <span class="text-info-dark font-mono">{cyber.essence.toFixed(2)}</span></div>
							<div><span class="text-gray-500">Cost:</span> <span class="text-primary-dark font-mono">{formatNuyen(cyber.cost)}</span></div>
						</div>
						<button
							class="w-full cw-btn bg-red-500 hover:bg-red-600 text-white mt-4"
							on:click={() => removeAndClear(() => removeCyberware(cyber.id))}
						>
							<span class="material-icons text-sm mr-1">delete</span>
							Remove Cyberware
						</button>
					</div>
				{:else if selectedItem.type === 'bioware'}
					{@const bio = selectedItem.item}
					<div class="space-y-3">
						<h4 class="font-semibold text-gray-800">{bio.name}</h4>
						<div class="grid grid-cols-2 gap-2 text-sm">
							<div><span class="text-gray-500">Category:</span> <span class="text-gray-800">{bio.category}</span></div>
							<div><span class="text-gray-500">Grade:</span> <span class="text-gray-800">{bio.grade}</span></div>
							<div><span class="text-gray-500">Essence:</span> <span class="text-info-dark font-mono">{bio.essence.toFixed(2)}</span></div>
							<div><span class="text-gray-500">Cost:</span> <span class="text-primary-dark font-mono">{formatNuyen(bio.cost)}</span></div>
						</div>
						<button
							class="w-full cw-btn bg-red-500 hover:bg-red-600 text-white mt-4"
							on:click={() => removeAndClear(() => removeBioware(bio.id))}
						>
							<span class="material-icons text-sm mr-1">delete</span>
							Remove Bioware
						</button>
					</div>
				{:else if selectedItem.type === 'vehicle'}
					{@const vehicle = selectedItem.item}
					<div class="space-y-3">
						<h4 class="font-semibold text-gray-800">{vehicle.name}</h4>
						<div class="grid grid-cols-2 gap-2 text-sm">
							<div><span class="text-gray-500">Category:</span> <span class="text-gray-800">{vehicle.category}</span></div>
							<div><span class="text-gray-500">Handling:</span> <span class="text-gray-800">{vehicle.handling}</span></div>
							<div><span class="text-gray-500">Accel:</span> <span class="text-gray-800">{vehicle.accel}</span></div>
							<div><span class="text-gray-500">Speed:</span> <span class="text-gray-800">{vehicle.speed}</span></div>
							<div><span class="text-gray-500">Pilot:</span> <span class="text-gray-800">{vehicle.pilot}</span></div>
							<div><span class="text-gray-500">Body:</span> <span class="text-gray-800">{vehicle.body}</span></div>
							<div><span class="text-gray-500">Armor:</span> <span class="text-gray-800">{vehicle.armor}</span></div>
							<div><span class="text-gray-500">Sensor:</span> <span class="text-gray-800">{vehicle.sensor}</span></div>
							<div class="col-span-2"><span class="text-gray-500">Cost:</span> <span class="text-primary-dark font-mono">{formatNuyen(vehicle.cost)}</span></div>
						</div>
						<button
							class="w-full cw-btn bg-red-500 hover:bg-red-600 text-white mt-4"
							on:click={() => removeAndClear(() => removeVehicle(vehicle.id))}
						>
							<span class="material-icons text-sm mr-1">delete</span>
							Sell Vehicle
						</button>
					</div>
				{:else if selectedItem.type === 'gear'}
					{@const gear = selectedItem.item}
					<div class="space-y-3">
						<h4 class="font-semibold text-gray-800">{gear.name}</h4>
						<div class="grid grid-cols-2 gap-2 text-sm">
							<div><span class="text-gray-500">Category:</span> <span class="text-gray-800">{gear.category}</span></div>
							{#if gear.rating > 0}
								<div><span class="text-gray-500">Rating:</span> <span class="text-gray-800">{gear.rating}</span></div>
							{/if}
							<div><span class="text-gray-500">Quantity:</span> <span class="text-gray-800">{gear.quantity}</span></div>
							<div><span class="text-gray-500">Cost:</span> <span class="text-primary-dark font-mono">{formatNuyen(gear.cost * gear.quantity)}</span></div>
						</div>
						<button
							class="w-full cw-btn bg-red-500 hover:bg-red-600 text-white mt-4"
							on:click={() => removeAndClear(() => removeGear(gear.id))}
						>
							<span class="material-icons text-sm mr-1">delete</span>
							Sell Gear
						</button>
					</div>
				{:else if selectedItem.type === 'martialart'}
					{@const art = selectedItem.item}
					<div class="space-y-3">
						<h4 class="font-semibold text-gray-800">{art.name}</h4>
						<div class="text-sm">
							<div><span class="text-gray-500">Cost:</span> <span class="text-info-dark font-mono">{MARTIAL_ARTS_COSTS.STYLE} BP</span></div>
							<div class="mt-2">
								<span class="text-gray-500">Techniques ({art.techniques.length}):</span>
								{#if art.techniques.length > 0}
									<ul class="mt-1 space-y-1">
										{#each art.techniques as tech}
											<li class="text-gray-800">- {tech}</li>
										{/each}
									</ul>
								{:else}
									<p class="text-gray-400 italic">No techniques learned</p>
								{/if}
							</div>
						</div>
						<button
							class="w-full cw-btn bg-red-500 hover:bg-red-600 text-white mt-4"
							on:click={() => removeAndClear(() => removeMartialArt(art.id))}
						>
							<span class="material-icons text-sm mr-1">delete</span>
							Remove Style
						</button>
					</div>
				{:else if selectedItem.type === 'lifestyle'}
					{@const lifestyle = selectedItem.item}
					<div class="space-y-3">
						<h4 class="font-semibold text-gray-800">{lifestyle.name}</h4>
						<div class="grid grid-cols-2 gap-2 text-sm">
							<div><span class="text-gray-500">Monthly Cost:</span> <span class="text-primary-dark font-mono">{formatNuyen(lifestyle.monthlyCost)}</span></div>
							<div><span class="text-gray-500">Months Prepaid:</span> <span class="text-gray-800">{lifestyle.monthsPrepaid}</span></div>
							<div class="col-span-2"><span class="text-gray-500">Total:</span> <span class="text-primary-dark font-mono">{formatNuyen(lifestyle.monthlyCost * lifestyle.monthsPrepaid)}</span></div>
						</div>
						<button
							class="w-full cw-btn bg-red-500 hover:bg-red-600 text-white mt-4"
							on:click={() => removeAndClear(() => removeLifestyle())}
						>
							<span class="material-icons text-sm mr-1">delete</span>
							Remove Lifestyle
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Modal Overlay -->
{#if activeModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" on:click={closeModal} role="dialog">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col" on:click|stopPropagation role="document">
			<!-- Modal Header -->
			<div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-gray-800">
					{#if activeModal === 'weapon'}Add Weapon
					{:else if activeModal === 'armor'}Add Armor
					{:else if activeModal === 'cyberware'}Add Cyberware
					{:else if activeModal === 'bioware'}Add Bioware
					{:else if activeModal === 'vehicle'}Add Vehicle
					{:else if activeModal === 'martialart'}Add Martial Art
					{:else if activeModal === 'gear'}Add Gear
					{:else if activeModal === 'lifestyle'}Choose Lifestyle
					{/if}
				</h3>
				<button class="text-gray-400 hover:text-gray-600" on:click={closeModal}>
					<span class="material-icons">close</span>
				</button>
			</div>

			<!-- Modal Filters -->
			<div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
				<div class="flex gap-2 flex-wrap">
					{#if activeModal === 'weapon'}
						<select class="cw-input text-sm flex-1 min-w-[150px]" bind:value={modalCategory}>
							<option value="">All Categories</option>
							{#each $gameData.weaponCategories as cat}
								<option value={cat}>{cat}</option>
							{/each}
						</select>
					{:else if activeModal === 'armor'}
						<select class="cw-input text-sm flex-1 min-w-[150px]" bind:value={modalCategory}>
							<option value="">All Categories</option>
							{#each $gameData.armorCategories as cat}
								<option value={cat}>{cat}</option>
							{/each}
						</select>
					{:else if activeModal === 'cyberware'}
						<select class="cw-input text-sm flex-1 min-w-[150px]" bind:value={modalCategory}>
							<option value="">All Categories</option>
							{#each $gameData.cyberwareCategories as cat}
								<option value={cat}>{cat}</option>
							{/each}
						</select>
						<div class="flex gap-1">
							{#each gradeOptions as grade}
								<button
									class="px-2 py-1 rounded text-xs transition-colors
										{selectedGrade === grade ? 'bg-primary-main text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'}"
									on:click={() => selectedGrade = grade}
								>
									{gradeInfo[grade].label}
								</button>
							{/each}
						</div>
					{:else if activeModal === 'bioware'}
						<select class="cw-input text-sm flex-1 min-w-[150px]" bind:value={modalCategory}>
							<option value="">All Categories</option>
							{#each $gameData.biowareCategories as cat}
								<option value={cat}>{cat}</option>
							{/each}
						</select>
						<div class="flex gap-1">
							{#each bioGradeOptions as grade}
								<button
									class="px-2 py-1 rounded text-xs transition-colors
										{selectedBioGrade === grade ? 'bg-primary-main text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'}"
									on:click={() => selectedBioGrade = grade}
								>
									{bioGradeInfo[grade].label}
								</button>
							{/each}
						</div>
					{:else if activeModal === 'vehicle'}
						<select class="cw-input text-sm flex-1 min-w-[150px]" bind:value={modalCategory}>
							<option value="">All Categories</option>
							{#each $gameData.vehicleCategories as cat}
								<option value={cat}>{cat}</option>
							{/each}
						</select>
					{:else if activeModal === 'gear'}
						<select class="cw-input text-sm flex-1 min-w-[150px]" bind:value={modalCategory}>
							<option value="">All Categories</option>
							{#each $gameData.gearCategories as cat}
								<option value={cat}>{cat}</option>
							{/each}
						</select>
					{/if}

					{#if activeModal !== 'lifestyle'}
						<input
							type="text"
							class="cw-input text-sm flex-1 min-w-[200px]"
							placeholder="Search..."
							bind:value={modalSearch}
						/>
					{/if}
				</div>
			</div>

			<!-- Modal Content -->
			<div class="flex-1 overflow-y-auto p-4">
				{#if activeModal === 'weapon'}
					<div class="space-y-2">
						{#each filteredWeapons as weapon}
							<div class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm hover:bg-gray-100">
								<div class="flex-1 min-w-0">
									<span class="text-gray-800 block truncate">{weapon.name}</span>
									<span class="text-gray-500 text-xs">{weapon.category} | DMG: {weapon.damage} | AP: {weapon.ap}</span>
								</div>
								<div class="flex items-center gap-2 ml-2">
									<span class="font-mono text-primary-dark text-xs">{formatNuyen(weapon.cost)}</span>
									<button
										class="cw-btn cw-btn-primary text-xs py-1 px-3"
										on:click={() => { addWeapon(weapon); closeModal(); }}
									>
										Buy
									</button>
								</div>
							</div>
						{/each}
						{#if filteredWeapons.length === 0}
							<p class="text-gray-400 text-center py-8">No weapons found</p>
						{/if}
					</div>
				{:else if activeModal === 'armor'}
					<div class="space-y-2">
						{#each filteredArmor as armor}
							<div class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm hover:bg-gray-100">
								<div class="flex-1 min-w-0">
									<span class="text-gray-800 block truncate">{armor.name}</span>
									<span class="text-gray-500 text-xs">{armor.category} | B/I: {armor.ballistic}/{armor.impact}</span>
								</div>
								<div class="flex items-center gap-2 ml-2">
									<span class="font-mono text-primary-dark text-xs">{formatNuyen(armor.cost)}</span>
									<button
										class="cw-btn cw-btn-primary text-xs py-1 px-3"
										on:click={() => { addArmor(armor); closeModal(); }}
									>
										Buy
									</button>
								</div>
							</div>
						{/each}
						{#if filteredArmor.length === 0}
							<p class="text-gray-400 text-center py-8">No armor found</p>
						{/if}
					</div>
				{:else if activeModal === 'cyberware'}
					<div class="space-y-2">
						{#each filteredCyberware as cyber}
							{@const costMult = gradeInfo[selectedGrade].cost}
							{@const essMult = gradeInfo[selectedGrade].ess}
							{@const adjustedCost = Math.floor(cyber.cost * costMult)}
							{@const adjustedEss = cyber.ess * essMult}
							<div class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm hover:bg-gray-100">
								<div class="flex-1 min-w-0">
									<span class="text-gray-800 block truncate">{cyber.name}</span>
									<span class="text-gray-500 text-xs">{cyber.category} | ESS: {adjustedEss.toFixed(2)}</span>
								</div>
								<div class="flex items-center gap-2 ml-2">
									<span class="font-mono text-primary-dark text-xs">{formatNuyen(adjustedCost)}</span>
									<button
										class="cw-btn cw-btn-primary text-xs py-1 px-3"
										disabled={$currentEssence < adjustedEss}
										on:click={() => { addCyberware(cyber, selectedGrade); closeModal(); }}
									>
										Install
									</button>
								</div>
							</div>
						{/each}
						{#if filteredCyberware.length === 0}
							<p class="text-gray-400 text-center py-8">No cyberware found</p>
						{/if}
					</div>
				{:else if activeModal === 'bioware'}
					<div class="space-y-2">
						{#each filteredBioware as bio}
							{@const costMult = bioGradeInfo[selectedBioGrade].cost}
							{@const essMult = bioGradeInfo[selectedBioGrade].ess}
							{@const adjustedCost = Math.floor(bio.cost * costMult)}
							{@const adjustedEss = bio.ess * essMult}
							<div class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm hover:bg-gray-100">
								<div class="flex-1 min-w-0">
									<span class="text-gray-800 block truncate">{bio.name}</span>
									<span class="text-gray-500 text-xs">{bio.category} | ESS: {adjustedEss.toFixed(2)}</span>
								</div>
								<div class="flex items-center gap-2 ml-2">
									<span class="font-mono text-primary-dark text-xs">{formatNuyen(adjustedCost)}</span>
									<button
										class="cw-btn cw-btn-primary text-xs py-1 px-3"
										disabled={$currentEssence < adjustedEss}
										on:click={() => { addBioware(bio, selectedBioGrade); closeModal(); }}
									>
										Install
									</button>
								</div>
							</div>
						{/each}
						{#if filteredBioware.length === 0}
							<p class="text-gray-400 text-center py-8">No bioware found</p>
						{/if}
					</div>
				{:else if activeModal === 'vehicle'}
					<div class="space-y-2">
						{#each filteredVehicles as vehicle}
							<div class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm hover:bg-gray-100">
								<div class="flex-1 min-w-0">
									<span class="text-gray-800 block truncate">{vehicle.name}</span>
									<span class="text-gray-500 text-xs">{vehicle.category} | Handling: {vehicle.handling} | Speed: {vehicle.speed}</span>
								</div>
								<div class="flex items-center gap-2 ml-2">
									<span class="font-mono text-primary-dark text-xs">{formatNuyen(vehicle.cost)}</span>
									<button
										class="cw-btn cw-btn-primary text-xs py-1 px-3"
										on:click={() => { addVehicle(vehicle); closeModal(); }}
									>
										Buy
									</button>
								</div>
							</div>
						{/each}
						{#if filteredVehicles.length === 0}
							<p class="text-gray-400 text-center py-8">No vehicles found</p>
						{/if}
					</div>
				{:else if activeModal === 'martialart'}
					<div class="space-y-2">
						{#each filteredMartialArts as style}
							{@const alreadyKnown = ownedMartialArts.some(m => m.name === style.name)}
							<div class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm hover:bg-gray-100">
								<div class="flex-1 min-w-0">
									<span class="text-gray-800 block truncate">{style.name}</span>
									<span class="text-gray-500 text-xs">Source: {style.source} p.{style.page}</span>
								</div>
								<div class="flex items-center gap-2 ml-2">
									<span class="font-mono text-info-dark text-xs">{MARTIAL_ARTS_COSTS.STYLE} BP</span>
									<button
										class="cw-btn cw-btn-primary text-xs py-1 px-3"
										disabled={alreadyKnown}
										on:click={() => { addMartialArt(style); closeModal(); }}
									>
										{alreadyKnown ? 'Known' : 'Learn'}
									</button>
								</div>
							</div>
						{/each}
						{#if filteredMartialArts.length === 0}
							<p class="text-gray-400 text-center py-8">No martial arts found</p>
						{/if}
					</div>
				{:else if activeModal === 'gear'}
					<div class="space-y-2">
						{#each filteredGear as gear}
							<div class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm hover:bg-gray-100">
								<div class="flex-1 min-w-0">
									<span class="text-gray-800 block truncate">{gear.name}</span>
									<span class="text-gray-500 text-xs">{gear.category}{gear.rating > 0 ? ` | Rating: ${gear.rating}` : ''}</span>
								</div>
								<div class="flex items-center gap-2 ml-2">
									<span class="font-mono text-primary-dark text-xs">{formatNuyen(gear.cost)}</span>
									<button
										class="cw-btn cw-btn-primary text-xs py-1 px-3"
										on:click={() => { addGear(gear); closeModal(); }}
									>
										Buy
									</button>
								</div>
							</div>
						{/each}
						{#if filteredGear.length === 0}
							<p class="text-gray-400 text-center py-8">No gear found</p>
						{/if}
					</div>
				{:else if activeModal === 'lifestyle'}
					<div class="space-y-2">
						{#each filteredLifestyles as lifestyle}
							<div class="flex items-center justify-between p-3 bg-gray-50 rounded text-sm hover:bg-gray-100">
								<div class="flex-1 min-w-0">
									<span class="text-gray-800 block">{lifestyle.name}</span>
									<span class="text-gray-500 text-xs">Standard lifestyle tier</span>
								</div>
								<div class="flex items-center gap-2 ml-2">
									<span class="font-mono text-primary-dark text-xs">{formatNuyen(lifestyle.cost)}/mo</span>
									<button
										class="cw-btn cw-btn-primary text-xs py-1 px-3"
										on:click={() => { setLifestyle(lifestyle.name, lifestyle.name, lifestyle.cost, 1); closeModal(); }}
									>
										Choose
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		VEHICLE_TESTS,
		VEHICLE_SPEED_MODIFIERS,
		VEHICLE_TERRAIN_MODIFIERS,
		calculateVehicleControlPool,
		calculateGunneryPool,
		calculateRammingDamage,
		calculateCrashDamage,
		calculateVehicleModifiers,
		getVCRBonus,
		calculateSensorTargetingPool,
		type VehicleStats,
		type VehicleTestType,
		type VehicleTest
	} from '$lib/utils/dice';

	/** Character's relevant skill ratings. */
	export let pilotSkill = 0;
	export let gunnerySkill = 0;

	/** Character's attributes. */
	export let reaction = 3;
	export let agility = 3;

	/** VCR rating (0 if no VCR). */
	export let vcrRating = 0;

	/** Current vehicle stats. */
	export let vehicle: VehicleStats = {
		handling: 0,
		acceleration: 10,
		speed: 100,
		pilot: 2,
		body: 10,
		armor: 6,
		sensor: 2
	};

	/** Dispatch events. */
	const dispatch = createEventDispatcher<{
		rollVehicle: {
			test: VehicleTest;
			pool: number;
			modifiers: number;
			opposed: boolean;
			opposedBy?: string;
		};
		rollGunnery: { pool: number; targetingBonus: number };
		rollRam: { pool: number; damage: number };
	}>();

	/** Selected speed category. */
	let selectedSpeed = 'cruising';

	/** Selected terrain modifiers. */
	let selectedTerrain: string[] = [];

	/** Using sensor targeting. */
	let useSensorTargeting = false;

	/** Calculate base vehicle control pool. */
	$: baseControlPool = calculateVehicleControlPool(pilotSkill, reaction, vehicle.handling);

	/** Calculate VCR bonus. */
	$: vcrBonus = getVCRBonus(vcrRating);

	/** Calculate total modifiers. */
	$: totalModifiers = calculateVehicleModifiers([selectedSpeed], selectedTerrain);

	/** Calculate final control pool. */
	$: finalControlPool = Math.max(0, baseControlPool + vcrBonus + totalModifiers);

	/** Calculate gunnery pool. */
	$: baseGunneryPool = useSensorTargeting
		? calculateSensorTargetingPool(vehicle.sensor, 0)
		: calculateGunneryPool(gunnerySkill, agility, 0);

	/** Get current speed percentage. */
	function getSpeedPercentage(): number {
		const speedMap: Record<string, number> = {
			idle: 5,
			slow: 20,
			cruising: 40,
			fast: 65,
			very_fast: 85,
			exceeding: 110
		};
		return speedMap[selectedSpeed] || 40;
	}

	/** Calculate current ramming damage. */
	$: rammingDamage = calculateRammingDamage(getSpeedPercentage(), vehicle.body);

	/** Calculate crash damage. */
	$: crashDamage = calculateCrashDamage(vehicle.body, selectedSpeed);

	/** Toggle terrain modifier. */
	function toggleTerrain(key: string): void {
		if (selectedTerrain.includes(key)) {
			selectedTerrain = selectedTerrain.filter(t => t !== key);
		} else {
			selectedTerrain = [...selectedTerrain, key];
		}
	}

	/** Handle vehicle test click. */
	function handleTestClick(testKey: string): void {
		const test = VEHICLE_TESTS[testKey as VehicleTestType];
		dispatch('rollVehicle', {
			test,
			pool: finalControlPool,
			modifiers: totalModifiers,
			opposed: test.opposed,
			...(test.opposedBy && { opposedBy: test.opposedBy })
		});
	}

	/** Handle gunnery roll. */
	function handleGunneryRoll(): void {
		dispatch('rollGunnery', {
			pool: baseGunneryPool + vcrBonus,
			targetingBonus: useSensorTargeting ? vehicle.sensor : 0
		});
	}

	/** Handle ram attack. */
	function handleRamRoll(): void {
		dispatch('rollRam', {
			pool: finalControlPool,
			damage: rammingDamage
		});
	}
</script>

<div class="cw-card p-4">
	<div class="flex items-center justify-between mb-3">
		<h3 class="text-text-primary font-medium">Vehicle Combat</h3>
		{#if vcrRating > 0}
			<span class="text-xs text-secondary-dark py-1 px-2 bg-secondary-main/10 rounded">
				VCR {vcrRating} (+{vcrBonus})
			</span>
		{/if}
	</div>

	<!-- Vehicle Stats -->
	<div class="grid grid-cols-4 gap-2 mb-4 p-2 bg-surface-variant rounded text-center">
		<div>
			<div class="text-xs text-text-muted">Handling</div>
			<div class="font-mono {vehicle.handling >= 0 ? 'text-success-main' : 'text-error-main'}">
				{vehicle.handling >= 0 ? '+' : ''}{vehicle.handling}
			</div>
		</div>
		<div>
			<div class="text-xs text-text-muted">Speed</div>
			<div class="font-mono text-text-primary">{vehicle.speed}</div>
		</div>
		<div>
			<div class="text-xs text-text-muted">Body</div>
			<div class="font-mono text-text-primary">{vehicle.body}</div>
		</div>
		<div>
			<div class="text-xs text-text-muted">Armor</div>
			<div class="font-mono text-success-main">{vehicle.armor}</div>
		</div>
	</div>

	<!-- Speed Selection -->
	<div class="mb-4">
		<h4 class="text-xs text-text-muted uppercase tracking-wide mb-2">Current Speed</h4>
		<div class="flex flex-wrap gap-2">
			{#each Object.entries(VEHICLE_SPEED_MODIFIERS) as [key, speed]}
				<button
					type="button"
					class="text-xs py-1 px-2 rounded transition-colors
						{selectedSpeed === key
							? 'bg-primary-main/20 text-primary-dark border border-primary-main/50'
							: 'bg-surface-variant text-text-secondary hover:bg-surface'}"
					on:click={() => selectedSpeed = key}
					title={speed.description}
				>
					{speed.name}
					{#if speed.modifier !== 0}
						<span class="font-mono text-error-main ml-1">{speed.modifier}</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Terrain Modifiers -->
	<div class="mb-4">
		<h4 class="text-xs text-text-muted uppercase tracking-wide mb-2">Terrain</h4>
		<div class="flex flex-wrap gap-2">
			{#each Object.entries(VEHICLE_TERRAIN_MODIFIERS) as [key, terrain]}
				<button
					type="button"
					class="text-xs py-1 px-2 rounded transition-colors
						{selectedTerrain.includes(key)
							? 'bg-warning-main/20 text-warning-main border border-warning-main/50'
							: 'bg-surface-variant text-text-secondary hover:bg-surface'}"
					on:click={() => toggleTerrain(key)}
				>
					{terrain.name}
					<span class="font-mono text-error-main ml-1">{terrain.modifier}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Control Pool Display -->
	<div class="flex items-center justify-between p-2 bg-surface-variant rounded mb-4">
		<span class="text-text-secondary">Vehicle Control Pool</span>
		<div class="text-right">
			<span class="font-mono text-lg text-secondary-dark">{finalControlPool}d6</span>
			{#if totalModifiers !== 0}
				<span class="text-xs text-text-muted block">
					(base {baseControlPool}
					{#if vcrBonus > 0}+{vcrBonus} VCR{/if}
					{#if totalModifiers !== 0}{totalModifiers >= 0 ? '+' : ''}{totalModifiers} mods{/if})
				</span>
			{/if}
		</div>
	</div>

	<!-- Vehicle Tests -->
	<div class="mb-4">
		<h4 class="text-xs text-text-muted uppercase tracking-wide mb-2">Vehicle Tests</h4>
		<div class="grid grid-cols-2 md:grid-cols-3 gap-2">
			{#each Object.entries(VEHICLE_TESTS) as [key, test]}
				<button
					type="button"
					class="text-left p-2 rounded transition-colors bg-surface-variant hover:bg-surface"
					on:click={() => handleTestClick(key)}
				>
					<div class="text-sm text-text-secondary">{test.name}</div>
					<div class="flex items-center gap-2 mt-1">
						{#if test.opposed}
							<span class="text-xs text-warning-main">Opposed</span>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- Combat Actions -->
	<div class="border-t border-border pt-3">
		<h4 class="text-xs text-text-muted uppercase tracking-wide mb-2">Combat Actions</h4>

		<div class="grid grid-cols-2 gap-3">
			<!-- Gunnery -->
			<div class="p-2 bg-surface-variant rounded">
				<div class="flex items-center justify-between mb-2">
					<span class="text-sm text-text-secondary">Gunnery</span>
					<span class="font-mono text-error-main">{baseGunneryPool + vcrBonus}d6</span>
				</div>
				<label class="flex items-center gap-2 cursor-pointer text-xs mb-2">
					<input
						type="checkbox"
						class="w-3 h-3 accent-secondary-main"
						bind:checked={useSensorTargeting}
					/>
					<span class="text-text-muted">Sensor Targeting</span>
				</label>
				<button
					type="button"
					class="cw-btn text-xs w-full"
					on:click={handleGunneryRoll}
				>
					Fire Weapon
				</button>
			</div>

			<!-- Ramming -->
			<div class="p-2 bg-surface-variant rounded">
				<div class="flex items-center justify-between mb-2">
					<span class="text-sm text-text-secondary">Ram</span>
					<span class="font-mono text-error-main">{rammingDamage}P</span>
				</div>
				<div class="text-xs text-text-muted mb-2">
					Both vehicles take damage
				</div>
				<button
					type="button"
					class="cw-btn text-xs w-full"
					on:click={handleRamRoll}
				>
					Ram Target
				</button>
			</div>
		</div>

		<!-- Crash Info -->
		<div class="mt-3 p-2 bg-error-main/10 rounded text-sm">
			<span class="text-error-main">Crash Damage at {VEHICLE_SPEED_MODIFIERS[selectedSpeed]?.name || 'current'} speed:</span>
			<span class="font-mono ml-2">{crashDamage}P</span>
		</div>
	</div>
</div>

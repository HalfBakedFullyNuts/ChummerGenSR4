<script lang="ts">
	/**
	 * Combat Stats Calculator Component
	 * ==================================
	 * Displays combat-relevant stats using the calculations engine.
	 * Adds interactive damage tracking for condition monitors.
	 */

	import { character, calculateTotalArmor } from '$stores/character';
	import {
		calculatePhysicalCM,
		calculateStunCM,
		calculateOverflow,
		calculateInitiative,
		calculateInitiativeDice,
		calculateInitiativeBonus,
		calculateWalkSpeed,
		calculateRunSpeed,
		calculateDefense,
		calculateComposure,
		calculateJudgeIntentions,
		calculateMemory,
		calculateLiftCarry,
		getAttributeTotal
	} from '$lib/engine/calculations';

	/** Physical damage taken (local state for tracking). */
	export let physicalDamage = 0;

	/** Stun damage taken (local state for tracking). */
	export let stunDamage = 0;

	/** Condition monitors - use engine calculations when character exists. */
	$: physicalConditionMonitor = $character ? calculatePhysicalCM($character) : 9;
	$: stunConditionMonitor = $character ? calculateStunCM($character) : 9;
	$: overflowBoxes = $character ? calculateOverflow($character) : 3;

	/** Initiative values from engine. */
	$: initiative = $character ? calculateInitiative($character) + calculateInitiativeBonus($character) : 6;
	$: initiativePasses = $character ? calculateInitiativeDice($character) : 1;

	/** Movement from engine. */
	$: walkingRate = $character ? calculateWalkSpeed($character) : 6;
	$: runningRate = $character ? calculateRunSpeed($character) : 12;
	$: sprintingRate = runningRate; /* +2m per hit on Running test */

	/** Swimming/climbing (not in engine, calculate here). */
	$: swimmingRate = $character
		? Math.ceil((getAttributeTotal($character, 'agi') + getAttributeTotal($character, 'str')) / 2)
		: 3;
	$: climbingRate = $character
		? Math.ceil(getAttributeTotal($character, 'agi') / 2)
		: 2;

	/** Defense from engine. */
	$: defensePool = $character ? calculateDefense($character) : 6;
	$: dodgeEstimate = $character ? getAttributeTotal($character, 'rea') : 3;

	/** Derived stats from engine. */
	$: composure = $character ? calculateComposure($character) : 6;
	$: judgeIntentions = $character ? calculateJudgeIntentions($character) : 6;
	$: liftCarry = $character ? calculateLiftCarry($character) : 6;
	$: memory = $character ? calculateMemory($character) : 6;

	/** Armor from character store (includes encumbrance not in engine). */
	$: armorTotals = calculateTotalArmor();

	/** Wound modifier calculation (local, based on tracked damage). */
	function getWoundModifier(damage: number): number {
		if (damage <= 0) return 0;
		return -Math.floor(damage / 3);
	}

	$: physicalWoundModifier = getWoundModifier(physicalDamage);
	$: stunWoundModifier = getWoundModifier(stunDamage);
	$: totalWoundModifier = physicalWoundModifier + stunWoundModifier;

	/** Update damage. */
	function addDamage(type: 'physical' | 'stun', amount: number): void {
		if (type === 'physical') {
			physicalDamage = Math.min(physicalConditionMonitor + overflowBoxes, Math.max(0, physicalDamage + amount));
		} else {
			const newStun = stunDamage + amount;
			if (newStun > stunConditionMonitor) {
				const overflow = newStun - stunConditionMonitor;
				stunDamage = stunConditionMonitor;
				physicalDamage = Math.min(physicalConditionMonitor + overflowBoxes, physicalDamage + overflow);
			} else {
				stunDamage = Math.max(0, newStun);
			}
		}
	}

	function resetDamage(): void {
		physicalDamage = 0;
		stunDamage = 0;
	}

	function getStatus(): { label: string; color: string } {
		if (physicalDamage >= physicalConditionMonitor + overflowBoxes) {
			return { label: 'Dead', color: 'text-gray-500' };
		}
		if (physicalDamage >= physicalConditionMonitor) {
			return { label: 'Dying', color: 'text-accent-danger' };
		}
		if (stunDamage >= stunConditionMonitor) {
			return { label: 'Unconscious', color: 'text-accent-warning' };
		}
		if (totalWoundModifier <= -3) {
			return { label: 'Severely Wounded', color: 'text-accent-danger' };
		}
		if (totalWoundModifier < 0) {
			return { label: 'Wounded', color: 'text-accent-warning' };
		}
		return { label: 'Healthy', color: 'text-accent-success' };
	}

	$: status = getStatus();

	function getBoxes(filled: number, total: number, overflow = 0): { filled: boolean; overflow: boolean }[] {
		const boxes: { filled: boolean; overflow: boolean }[] = [];
		for (let i = 0; i < total; i++) {
			boxes.push({ filled: i < filled, overflow: false });
		}
		for (let i = 0; i < overflow; i++) {
			boxes.push({ filled: i < (filled - total), overflow: true });
		}
		return boxes;
	}
</script>

<div class="space-y-4">
	<h3 class="text-lg font-medium text-primary-text">Combat Stats</h3>

	<!-- Status Banner -->
	<div class="cw-panel p-3 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<span class="text-sm text-muted-text">Status:</span>
			<span class="font-medium {status.color}">{status.label}</span>
		</div>
		{#if totalWoundModifier !== 0}
			<span class="text-sm font-mono {totalWoundModifier < 0 ? 'text-accent-danger' : 'text-accent-success'}">
				{totalWoundModifier > 0 ? '+' : ''}{totalWoundModifier} wound modifier
			</span>
		{/if}
	</div>

	<!-- Condition Monitors -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<!-- Physical -->
		<div class="cw-panel p-4">
			<div class="flex items-center justify-between mb-2">
				<h4 class="text-sm font-medium text-secondary-text">Physical</h4>
				<span class="text-xs text-muted-text">
					{physicalDamage}/{physicalConditionMonitor} ({physicalWoundModifier} mod)
				</span>
			</div>
			<div class="flex flex-wrap gap-1 mb-3">
				{#each getBoxes(physicalDamage, physicalConditionMonitor, overflowBoxes) as box, i}
					<div
						class="w-5 h-5 rounded border-2 transition-colors cursor-pointer
							{box.overflow ? 'border-accent-danger/50' : 'border-border'}
							{box.filled ? (box.overflow ? 'bg-accent-danger' : 'bg-accent-danger') : 'bg-surface-light'}"
						on:click={() => {
							if (i < physicalDamage) {
								physicalDamage = i;
							} else {
								physicalDamage = i + 1;
							}
						}}
						on:keypress={(e) => e.key === 'Enter' && (physicalDamage = i < physicalDamage ? i : i + 1)}
						role="button"
						tabindex="0"
						title={box.overflow ? 'Overflow' : `Box ${i + 1}`}
					/>
					{#if (i + 1) % 3 === 0 && i < physicalConditionMonitor + overflowBoxes - 1}
						<span class="text-xs text-muted-text self-center mx-0.5">|</span>
					{/if}
				{/each}
			</div>
			<div class="flex gap-2">
				<button
					class="text-xs px-2 py-1 rounded bg-accent-danger/20 text-accent-danger hover:bg-accent-danger/30"
					on:click={() => addDamage('physical', 1)}
				>
					+1 Damage
				</button>
				<button
					class="text-xs px-2 py-1 rounded bg-accent-success/20 text-accent-success hover:bg-accent-success/30"
					on:click={() => addDamage('physical', -1)}
				>
					-1 Heal
				</button>
			</div>
		</div>

		<!-- Stun -->
		<div class="cw-panel p-4">
			<div class="flex items-center justify-between mb-2">
				<h4 class="text-sm font-medium text-secondary-text">Stun</h4>
				<span class="text-xs text-muted-text">
					{stunDamage}/{stunConditionMonitor} ({stunWoundModifier} mod)
				</span>
			</div>
			<div class="flex flex-wrap gap-1 mb-3">
				{#each getBoxes(stunDamage, stunConditionMonitor) as box, i}
					<div
						class="w-5 h-5 rounded border-2 border-border transition-colors cursor-pointer
							{box.filled ? 'bg-accent-warning' : 'bg-surface-light'}"
						on:click={() => {
							if (i < stunDamage) {
								stunDamage = i;
							} else {
								stunDamage = i + 1;
							}
						}}
						on:keypress={(e) => e.key === 'Enter' && (stunDamage = i < stunDamage ? i : i + 1)}
						role="button"
						tabindex="0"
						title={`Box ${i + 1}`}
					/>
					{#if (i + 1) % 3 === 0 && i < stunConditionMonitor - 1}
						<span class="text-xs text-muted-text self-center mx-0.5">|</span>
					{/if}
				{/each}
			</div>
			<div class="flex gap-2">
				<button
					class="text-xs px-2 py-1 rounded bg-accent-warning/20 text-accent-warning hover:bg-accent-warning/30"
					on:click={() => addDamage('stun', 1)}
				>
					+1 Damage
				</button>
				<button
					class="text-xs px-2 py-1 rounded bg-accent-success/20 text-accent-success hover:bg-accent-success/30"
					on:click={() => addDamage('stun', -1)}
				>
					-1 Heal
				</button>
			</div>
		</div>
	</div>

	<!-- Quick Reset -->
	<button
		class="text-xs text-accent-cyan hover:underline"
		on:click={resetDamage}
	>
		Reset All Damage
	</button>

	<!-- Initiative & Defense -->
	<div class="cw-panel p-4">
		<h4 class="text-xs text-muted-text uppercase tracking-wide mb-3">Initiative & Defense</h4>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
			<div>
				<div class="text-xs text-muted-text">Initiative</div>
				<div class="text-xl font-mono text-accent-primary">
					{Math.max(0, initiative + totalWoundModifier)}
					{#if totalWoundModifier !== 0}
						<span class="text-xs text-muted-text">({initiative})</span>
					{/if}
				</div>
				<div class="text-xs text-muted-text">REA + INT</div>
			</div>
			<div>
				<div class="text-xs text-muted-text">Init Passes</div>
				<div class="text-xl font-mono text-accent-cyan">{initiativePasses}</div>
				<div class="text-xs text-muted-text">Actions/turn</div>
			</div>
			<div>
				<div class="text-xs text-muted-text">Defense</div>
				<div class="text-xl font-mono text-accent-success">{Math.max(0, defensePool + totalWoundModifier)}</div>
				<div class="text-xs text-muted-text">REA + INT</div>
			</div>
			<div>
				<div class="text-xs text-muted-text">Dodge</div>
				<div class="text-xl font-mono text-primary-text">{Math.max(0, dodgeEstimate + totalWoundModifier)}+</div>
				<div class="text-xs text-muted-text">+ Dodge skill</div>
			</div>
		</div>
	</div>

	<!-- Armor -->
	<div class="cw-panel p-4">
		<h4 class="text-xs text-muted-text uppercase tracking-wide mb-3">Armor</h4>
		<div class="grid grid-cols-3 gap-4 text-center">
			<div>
				<div class="text-xs text-muted-text">Ballistic</div>
				<div class="text-xl font-mono text-accent-success">{armorTotals.ballistic}</div>
			</div>
			<div>
				<div class="text-xs text-muted-text">Impact</div>
				<div class="text-xl font-mono text-accent-cyan">{armorTotals.impact}</div>
			</div>
			<div>
				<div class="text-xs text-muted-text">Encumbrance</div>
				<div class="text-xl font-mono {armorTotals.encumbrance > 0 ? 'text-accent-danger' : 'text-muted-text'}">
					{armorTotals.encumbrance > 0 ? `-${armorTotals.encumbrance}` : '-'}
				</div>
			</div>
		</div>
	</div>

	<!-- Movement -->
	<div class="cw-panel p-4">
		<h4 class="text-xs text-muted-text uppercase tracking-wide mb-3">Movement (meters)</h4>
		<div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
			<div>
				<div class="text-xs text-muted-text">Walk</div>
				<div class="text-lg font-mono text-primary-text">{walkingRate}m</div>
				<div class="text-xs text-muted-text">AGI x 2</div>
			</div>
			<div>
				<div class="text-xs text-muted-text">Run</div>
				<div class="text-lg font-mono text-primary-text">{runningRate}m</div>
				<div class="text-xs text-muted-text">AGI x 4</div>
			</div>
			<div>
				<div class="text-xs text-muted-text">Sprint</div>
				<div class="text-lg font-mono text-primary-text">{sprintingRate}m+</div>
				<div class="text-xs text-muted-text">+ 2m/hit</div>
			</div>
			<div>
				<div class="text-xs text-muted-text">Swim</div>
				<div class="text-lg font-mono text-primary-text">{swimmingRate}m</div>
				<div class="text-xs text-muted-text">(AGI+STR)/2</div>
			</div>
			<div>
				<div class="text-xs text-muted-text">Climb</div>
				<div class="text-lg font-mono text-primary-text">{climbingRate}m</div>
				<div class="text-xs text-muted-text">AGI/2</div>
			</div>
		</div>
	</div>

	<!-- Derived Stats -->
	<div class="cw-panel p-4">
		<h4 class="text-xs text-muted-text uppercase tracking-wide mb-3">Other Derived Stats</h4>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
			<div>
				<div class="text-xs text-muted-text">Composure</div>
				<div class="text-lg font-mono text-primary-text">{composure}</div>
				<div class="text-xs text-muted-text">CHA + WIL</div>
			</div>
			<div>
				<div class="text-xs text-muted-text">Judge Intent</div>
				<div class="text-lg font-mono text-primary-text">{judgeIntentions}</div>
				<div class="text-xs text-muted-text">CHA + INT</div>
			</div>
			<div>
				<div class="text-xs text-muted-text">Lift/Carry</div>
				<div class="text-lg font-mono text-primary-text">{liftCarry}</div>
				<div class="text-xs text-muted-text">STR + BOD</div>
			</div>
			<div>
				<div class="text-xs text-muted-text">Memory</div>
				<div class="text-lg font-mono text-primary-text">{memory}</div>
				<div class="text-xs text-muted-text">LOG + WIL</div>
			</div>
		</div>
	</div>
</div>

<script lang="ts">
	/**
	 * Combat Stats Calculator Component
	 * ==================================
	 * Calculates and displays combat-relevant stats including:
	 * - Initiative
	 * - Movement rates
	 * - Wound modifiers
	 * - Condition monitors
	 * - Defense pools
	 */

	import { character, calculateTotalArmor } from '$stores/character';

	/** Physical damage taken. */
	export let physicalDamage = 0;

	/** Stun damage taken. */
	export let stunDamage = 0;

	/** Helper to get attribute total (base + bonus). */
	function getAttr(attr: { base: number; bonus: number } | null | undefined, fallback: number): number {
		if (!attr) return fallback;
		return attr.base + attr.bonus;
	}

	/** Raw attributes from character. */
	$: rawAttrs = $character?.attributes;

	/** Computed attribute values. */
	$: attributes = {
		bod: rawAttrs ? getAttr(rawAttrs.bod, 3) : 3,
		agi: rawAttrs ? getAttr(rawAttrs.agi, 3) : 3,
		rea: rawAttrs ? getAttr(rawAttrs.rea, 3) : 3,
		str: rawAttrs ? getAttr(rawAttrs.str, 3) : 3,
		cha: rawAttrs ? getAttr(rawAttrs.cha, 3) : 3,
		int: rawAttrs ? getAttr(rawAttrs.int, 3) : 3,
		log: rawAttrs ? getAttr(rawAttrs.log, 3) : 3,
		wil: rawAttrs ? getAttr(rawAttrs.wil, 3) : 3,
		edg: rawAttrs ? getAttr(rawAttrs.edg, 2) : 2,
		ess: rawAttrs?.ess ?? 6,
		mag: rawAttrs ? getAttr(rawAttrs.mag, 0) : 0,
		res: rawAttrs ? getAttr(rawAttrs.res, 0) : 0,
		ip: 1 // Initiative passes - augmented by cyberware/magic
	};

	/** Calculate initiative. */
	$: initiative = attributes.rea + attributes.int;

	/** Initiative passes (base is 1, augmented by cyberware/magic). */
	$: initiativePasses = attributes.ip || 1;

	/** Calculate physical condition monitor boxes. */
	$: physicalConditionMonitor = 8 + Math.ceil(attributes.bod / 2);

	/** Calculate stun condition monitor boxes. */
	$: stunConditionMonitor = 8 + Math.ceil(attributes.wil / 2);

	/** Calculate overflow boxes (BOD). */
	$: overflowBoxes = attributes.bod;

	/** Calculate wound modifier based on damage taken. */
	function getWoundModifier(damage: number, boxes: number): number {
		if (damage <= 0) return 0;
		/* Every 3 boxes of damage = -1 modifier */
		return -Math.floor(damage / 3);
	}

	/** Physical wound modifier. */
	$: physicalWoundModifier = getWoundModifier(physicalDamage, physicalConditionMonitor);

	/** Stun wound modifier. */
	$: stunWoundModifier = getWoundModifier(stunDamage, stunConditionMonitor);

	/** Total wound modifier (cumulative). */
	$: totalWoundModifier = physicalWoundModifier + stunWoundModifier;

	/** Movement rates (in meters). */
	$: walkingRate = attributes.agi * 2;
	$: runningRate = attributes.agi * 4;
	$: sprintingRate = attributes.agi * 4; /* +2m per hit on Running test */

	/** Swimming rate. */
	$: swimmingRate = Math.ceil((attributes.agi + attributes.str) / 2);

	/** Climbing rate. */
	$: climbingRate = Math.ceil(attributes.agi / 2);

	/** Armor values. */
	$: armorTotals = calculateTotalArmor();

	/** Defense pool (REA + INT, modified by wounds). */
	$: defensePool = Math.max(0, attributes.rea + attributes.int + totalWoundModifier);

	/** Dodge pool (REA + Dodge skill, but we'll use REA + AGI as estimate without skill). */
	$: dodgeEstimate = Math.max(0, attributes.rea + totalWoundModifier);

	/** Composure (CHA + WIL). */
	$: composure = attributes.cha + attributes.wil;

	/** Judge Intentions (CHA + INT). */
	$: judgeIntentions = attributes.cha + attributes.int;

	/** Lifting/Carrying (STR + BOD). */
	$: liftCarry = attributes.str + attributes.bod;

	/** Memory (LOG + WIL). */
	$: memory = attributes.log + attributes.wil;

	/** Update damage. */
	function addDamage(type: 'physical' | 'stun', amount: number): void {
		if (type === 'physical') {
			physicalDamage = Math.min(physicalConditionMonitor + overflowBoxes, Math.max(0, physicalDamage + amount));
		} else {
			/* Stun overflow converts to physical */
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

	/** Reset damage. */
	function resetDamage(): void {
		physicalDamage = 0;
		stunDamage = 0;
	}

	/** Get status based on damage. */
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

	/** Render condition monitor boxes. */
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
				<div class="text-xl font-mono text-accent-success">{defensePool}</div>
				<div class="text-xs text-muted-text">REA + INT</div>
			</div>
			<div>
				<div class="text-xs text-muted-text">Dodge</div>
				<div class="text-xl font-mono text-primary-text">{dodgeEstimate}+</div>
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

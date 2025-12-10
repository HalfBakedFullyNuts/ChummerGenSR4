<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		ASTRAL_ACTIONS,
		MAGIC_TRADITIONS,
		calculateAstralAttackPool,
		calculateAstralDefensePool,
		calculateAssensingPool,
		calculateSummoningPool,
		calculateSpiritResistance,
		calculateDrainResistancePool,
		calculateCounterspellingPool,
		calculateSpellDefenseDice,
		calculateBanishingPool,
		calculateBindingPool,
		type AstralActionType,
		type AstralAction,
		type SpiritType
	} from '$lib/utils/dice';

	/** Character's Magic attribute. */
	export let magic = 4;

	/** Character's Willpower attribute. */
	export let willpower = 3;

	/** Character's Intuition attribute. */
	export let intuition = 3;

	/** Character's Charisma attribute. */
	export let charisma = 3;

	/** Character's Logic attribute. */
	export let logic = 3;

	/** Character's tradition (hermetic, shamanic, etc). */
	export let tradition = 'hermetic';

	/** Character's relevant skill ratings. */
	export let skills: Record<string, number> = {};

	/** Currently astrally projecting. */
	export let astrallProjecting = false;

	/** Dispatch events. */
	const dispatch = createEventDispatcher<{
		rollAstral: { action: AstralAction; pool: number; opposed: boolean; opposedBy?: string };
		rollSummoning: { pool: number; spiritType: string; force: number; resistPool: number };
		rollBinding: { pool: number; spiritForce: number; resistPool: number };
		rollBanishing: { pool: number; spiritForce: number };
		rollCounterspelling: { pool: number; numProtected: number };
		rollDrain: { pool: number; drainValue: number; isPhysical: boolean };
	}>();

	/** Get skill rating by name. */
	function getSkillRating(skillName: string): number {
		return skills[skillName] || 0;
	}

	/** Get tradition drain attribute. */
	function getDrainAttribute(): number {
		const trad = MAGIC_TRADITIONS[tradition.toLowerCase()];
		if (!trad) return charisma; // Default to Charisma

		switch (trad.drainAttribute) {
			case 'log': return logic;
			case 'cha': return charisma;
			case 'wil': return willpower;
			case 'int': return intuition;
			default: return charisma;
		}
	}

	/** Calculated pools. */
	$: astralAttackPool = calculateAstralAttackPool(willpower, getSkillRating('Astral Combat'));
	$: astralDefensePool = calculateAstralDefensePool(willpower, intuition);
	$: assensingPool = calculateAssensingPool(getSkillRating('Assensing'), intuition);
	$: summoningPool = calculateSummoningPool(getSkillRating('Summoning'), magic);
	$: bindingPool = calculateBindingPool(getSkillRating('Binding'), magic);
	$: banishingPool = calculateBanishingPool(getSkillRating('Banishing'), magic);
	$: counterspellingPool = calculateCounterspellingPool(getSkillRating('Counterspelling'), magic);
	$: drainResistPool = calculateDrainResistancePool(willpower, getDrainAttribute());

	/** Spirit summoning state. */
	let selectedSpiritType: SpiritType = 'Air';
	let spiritForce = 4;
	let numProtected = 1;

	/** Spirit types available. */
	const spiritTypes: SpiritType[] = [
		'Air', 'Beasts', 'Earth', 'Fire', 'Guardian',
		'Guidance', 'Man', 'Plant', 'Task', 'Water'
	];

	/** Handle astral action click. */
	function handleAstralAction(actionKey: string): void {
		const action = ASTRAL_ACTIONS[actionKey as AstralActionType];

		let pool = 0;
		switch (actionKey) {
			case 'astral_attack':
			case 'mana_bolt':
				pool = astralAttackPool;
				break;
			case 'assensing':
			case 'astral_perception':
			case 'astral_tracking':
				pool = assensingPool;
				break;
			case 'summoning':
				pool = summoningPool;
				break;
			case 'binding':
				pool = bindingPool;
				break;
			case 'banishing':
				pool = banishingPool;
				break;
			case 'counterspelling':
			case 'dispelling':
				pool = counterspellingPool;
				break;
			default:
				pool = magic + willpower;
		}

		dispatch('rollAstral', {
			action,
			pool,
			opposed: action.opposed,
			...(action.opposedBy && { opposedBy: action.opposedBy })
		});
	}

	/** Handle summoning. */
	function handleSummoning(): void {
		const resistPool = calculateSpiritResistance(spiritForce);
		dispatch('rollSummoning', {
			pool: summoningPool,
			spiritType: selectedSpiritType,
			force: spiritForce,
			resistPool
		});
	}

	/** Handle binding. */
	function handleBinding(): void {
		const resistPool = calculateSpiritResistance(spiritForce);
		dispatch('rollBinding', {
			pool: bindingPool,
			spiritForce,
			resistPool
		});
	}

	/** Handle banishing. */
	function handleBanishing(): void {
		dispatch('rollBanishing', {
			pool: banishingPool,
			spiritForce
		});
	}

	/** Handle counterspelling. */
	function handleCounterspelling(): void {
		dispatch('rollCounterspelling', {
			pool: counterspellingPool,
			numProtected
		});
	}

	/** Get tradition display name. */
	function getTraditionName(): string {
		const trad = MAGIC_TRADITIONS[tradition.toLowerCase()];
		return trad?.name || tradition;
	}

	/** Get drain attribute name. */
	function getDrainAttrName(): string {
		const trad = MAGIC_TRADITIONS[tradition.toLowerCase()];
		if (!trad) return 'CHA';
		return trad.drainAttribute.toUpperCase();
	}

	/** Get astral action definition. */
	function getAstralAction(key: string): AstralAction {
		return ASTRAL_ACTIONS[key as AstralActionType];
	}

	/** Astral action keys for iteration. */
	const astralActionKeys = ['astral_attack', 'assensing', 'astral_tracking', 'mana_bolt'];
</script>

<div class="cw-card p-4">
	<div class="flex items-center justify-between mb-3">
		<h3 class="text-text-primary font-medium">Magic & Astral</h3>
		<div class="flex items-center gap-3">
			<span class="text-xs text-text-muted">{getTraditionName()}</span>
			<label class="flex items-center gap-2 cursor-pointer">
				<input
					type="checkbox"
					class="w-4 h-4 accent-info-main"
					bind:checked={astrallProjecting}
				/>
				<span class="text-text-secondary text-sm">Projecting</span>
			</label>
		</div>
	</div>

	<!-- Magic Stats -->
	<div class="grid grid-cols-4 gap-2 mb-4 p-2 bg-surface-variant rounded text-center">
		<div>
			<div class="text-xs text-text-muted">Magic</div>
			<div class="font-mono text-info-main">{magic}</div>
		</div>
		<div>
			<div class="text-xs text-text-muted">Drain ({getDrainAttrName()})</div>
			<div class="font-mono text-success-main">{drainResistPool}d6</div>
		</div>
		<div>
			<div class="text-xs text-text-muted">Astral Def</div>
			<div class="font-mono text-secondary-dark">{astralDefensePool}d6</div>
		</div>
		<div>
			<div class="text-xs text-text-muted">Assensing</div>
			<div class="font-mono text-text-primary">{assensingPool}d6</div>
		</div>
	</div>

	<!-- Astral Actions -->
	{#if astrallProjecting}
		<div class="mb-4">
			<h4 class="text-xs text-text-muted uppercase tracking-wide mb-2">Astral Actions</h4>
			<div class="grid grid-cols-2 md:grid-cols-3 gap-2">
				{#each astralActionKeys as actionKey}
					{@const action = getAstralAction(actionKey)}
					<button
						type="button"
						class="text-left p-2 rounded transition-colors bg-surface-variant hover:bg-surface"
						on:click={() => handleAstralAction(actionKey)}
					>
						<div class="text-sm text-text-secondary">{action.name}</div>
						<div class="flex items-center gap-2 mt-1">
							<span class="font-mono text-info-main text-xs">
								{actionKey === 'astral_attack' || actionKey === 'mana_bolt' ? astralAttackPool : assensingPool}d6
							</span>
							{#if action.opposed}
								<span class="text-xs text-warning-main">Opp</span>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Summoning -->
	<div class="mb-4 border-t border-border pt-3">
		<h4 class="text-xs text-text-muted uppercase tracking-wide mb-2">Summoning</h4>
		<div class="grid grid-cols-2 gap-3 mb-3">
			<div>
				<label for="spirit-type" class="text-xs text-text-muted block mb-1">Spirit Type</label>
				<select
					id="spirit-type"
					class="cw-input text-sm w-full"
					bind:value={selectedSpiritType}
				>
					{#each spiritTypes as spiritType}
						<option value={spiritType}>{spiritType}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="spirit-force" class="text-xs text-text-muted block mb-1">Force</label>
				<input
					id="spirit-force"
					type="number"
					class="cw-input text-sm w-full"
					bind:value={spiritForce}
					min="1"
					max="12"
				/>
			</div>
		</div>

		<div class="flex items-center justify-between p-2 bg-surface-variant rounded mb-2">
			<div>
				<span class="text-sm text-text-secondary">Summoning Pool</span>
				<span class="font-mono text-info-main ml-2">{summoningPool}d6</span>
			</div>
			<div>
				<span class="text-xs text-text-muted">vs Spirit</span>
				<span class="font-mono text-warning-main ml-1">{calculateSpiritResistance(spiritForce)}d6</span>
			</div>
		</div>

		<div class="grid grid-cols-3 gap-2">
			<button
				type="button"
				class="cw-btn text-xs"
				on:click={handleSummoning}
			>
				Summon
			</button>
			<button
				type="button"
				class="cw-btn text-xs"
				on:click={handleBinding}
			>
				Bind
			</button>
			<button
				type="button"
				class="cw-btn text-xs"
				on:click={handleBanishing}
			>
				Banish
			</button>
		</div>

		<p class="text-xs text-text-muted mt-2">
			Drain: Spirit's hits (min 2), resist with WIL + {getDrainAttrName()} ({drainResistPool}d6)
			{#if spiritForce > magic}
				<span class="text-error-main">- Physical drain likely!</span>
			{/if}
		</p>
	</div>

	<!-- Counterspelling -->
	<div class="border-t border-border pt-3">
		<h4 class="text-xs text-text-muted uppercase tracking-wide mb-2">Counterspelling</h4>

		<div class="grid grid-cols-2 gap-3 mb-3">
			<div class="flex items-center justify-between p-2 bg-surface-variant rounded">
				<span class="text-sm text-text-secondary">Pool</span>
				<span class="font-mono text-success-main">{counterspellingPool}d6</span>
			</div>
			<div class="flex items-center gap-2 p-2 bg-surface-variant rounded">
				<label for="num-protected" class="text-xs text-text-muted">Protecting:</label>
				<input
					id="num-protected"
					type="number"
					class="cw-input text-xs w-16"
					bind:value={numProtected}
					min="1"
					max="10"
				/>
			</div>
		</div>

		<p class="text-xs text-text-muted mb-2">
			Spell Defense: Each protected person gets +{calculateSpellDefenseDice(counterspellingPool, numProtected)} dice
		</p>

		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				class="cw-btn text-xs"
				on:click={handleCounterspelling}
			>
				Counterspell
			</button>
			<button
				type="button"
				class="cw-btn text-xs"
				on:click={() => handleAstralAction('dispelling')}
			>
				Dispel
			</button>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="border-t border-border pt-3 mt-4">
		<h4 class="text-xs text-text-muted uppercase tracking-wide mb-2">Quick Actions</h4>
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				class="cw-btn cw-btn-secondary text-xs"
				on:click={() => handleAstralAction('astral_perception')}
			>
				Perceive ({assensingPool}d6)
			</button>
			<button
				type="button"
				class="cw-btn cw-btn-secondary text-xs"
				on:click={() => handleAstralAction('assensing')}
			>
				Assense ({assensingPool}d6)
			</button>
			<button
				type="button"
				class="cw-btn cw-btn-secondary text-xs"
				on:click={() => dispatch('rollDrain', { pool: drainResistPool, drainValue: 2, isPhysical: false })}
			>
				Resist Drain ({drainResistPool}d6)
			</button>
		</div>
	</div>
</div>

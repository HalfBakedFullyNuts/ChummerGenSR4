<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Character, SkillDefinition, AttributeCode, CharacterWeapon, CharacterSpell } from '$types';
	import { getWeaponSkill, parseDamage, parseAP, parseFireModes, calculateArmorStacking, calculateInitiativeModifiers, type FiringMode } from '$lib/utils/dice';
	import { positiveQualities, negativeQualities, type GameQuality } from '$stores/gamedata';
	import { formatQualityBonus, type FormattedBonus } from '$lib/utils/qualities';
	import Tooltip from './ui/Tooltip.svelte';

	/** Character to display. */
	export let char: Character;

	/** Optional skill definitions for dice pool calculation. */
	export let skillDefs: SkillDefinition[] = [];

	/** Enable clickable skills for rolling. */
	export let interactive = false;

	/** Dispatch events. */
	const dispatch = createEventDispatcher<{
		rollSkill: { name: string; pool: number; attribute: AttributeCode };
		rollAttribute: { name: string; pool: number };
		rollInitiative: { base: number; dice: number };
		rollWeapon: { weapon: CharacterWeapon; pool: number; skillName: string; firingMode?: FiringMode };
		rollSpell: { spell: CharacterSpell; castPool: number; drainPool: number; drainValue: string };
		rollDefense: { name: string; pool: number };
		rollSoak: { name: string; pool: number; armor: number; ap?: number };
		damageChanged: { type: 'physical' | 'stun'; value: number };
		edgeChanged: { value: number };
		ammoChanged: { weaponId: string; value: number };
		reloadWeapon: { weaponId: string };
	}>();

	/** Get max ammo from ammo string. */
	function getMaxAmmo(ammoString: string): number {
		const match = ammoString.match(/^(\d+)/);
		return match ? parseInt(match[1], 10) : 0;
	}

	/** Handle ammo spend. */
	function handleSpendAmmo(weaponId: string, currentAmmo: number): void {
		if (!interactive) return;
		if (currentAmmo > 0) {
			dispatch('ammoChanged', { weaponId, value: currentAmmo - 1 });
		}
	}

	/** Handle weapon reload. */
	function handleReload(weaponId: string): void {
		if (!interactive) return;
		dispatch('reloadWeapon', { weaponId });
	}

	/** Get skill definition by name. */
	function getSkillDef(name: string): SkillDefinition | undefined {
		return skillDefs.find(s => s.name === name);
	}

	/** Calculate condition monitor boxes. */
	function getPhysicalBoxes(bod: number): number {
		return Math.ceil(bod / 2) + 8;
	}

	function getStunBoxes(wil: number): number {
		return Math.ceil(wil / 2) + 8;
	}

	/** Format nuyen with commas. */
	function formatNuyen(amount: number): string {
		return amount.toLocaleString();
	}

	/** Get total for an attribute. */
	function getAttrTotal(attr: { base: number; bonus: number } | null): number {
		if (!attr) return 0;
		return attr.base + attr.bonus;
	}

	/** Calculate dice pool for a skill including linked attribute. */
	function getSkillPool(skillName: string, rating: number, bonus: number): number {
		const def = getSkillDef(skillName);
		if (!def) return rating + bonus;

		const attrKey = def.attribute.toLowerCase() as keyof typeof char.attributes;
		const attr = char.attributes[attrKey];
		if (!attr || typeof attr === 'number') return rating + bonus;

		return rating + bonus + attr.base + attr.bonus;
	}

	/** Handle skill click - emit roll event. */
	function handleSkillClick(skillName: string, rating: number, bonus: number, specialization: string | null): void {
		if (!interactive) return;

		const def = getSkillDef(skillName);
		const pool = getSkillPool(skillName, rating, bonus);
		const specBonus = specialization ? 2 : 0;

		dispatch('rollSkill', {
			name: specialization ? `${skillName} (${specialization})` : skillName,
			pool: pool + specBonus,
			attribute: def?.attribute || 'AGI'
		});
	}

	/** Handle derived stat roll. */
	function handleDerivedRoll(name: string, pool: number): void {
		if (!interactive) return;
		dispatch('rollAttribute', { name, pool });
	}

	/** Handle initiative roll. */
	function handleInitiativeRoll(): void {
		if (!interactive) return;
		dispatch('rollInitiative', { base: initiative, dice: initiativeDice });
	}

	/** Calculate initiative modifiers from cyberware and adept powers. */
	$: initMods = calculateInitiativeModifiers(
		char.equipment.cyberware.map(c => ({ name: c.name, rating: c.rating })),
		char.magic?.powers?.map(p => ({ name: p.name, rating: p.level })) ?? []
	);

	/** Bonus to initiative score from augmentations. */
	$: initiativeBonus = initMods.initiativeBonus;

	/** Initiative dice (base 1 + augmentation bonuses). */
	$: initiativeDice = 1 + initMods.initiativeDice;

	/** Get weapon attack pool. */
	function getWeaponPool(weapon: CharacterWeapon): { pool: number; skillName: string } {
		const skillName = getWeaponSkill(weapon.category);
		const skill = char.skills.find(s => s.name === skillName);
		const skillRating = skill ? skill.rating + skill.bonus : 0;

		// All combat skills use AGI
		const agi = getAttrTotal(char.attributes.agi);

		// Apply wound modifier
		const woundMod = totalWoundMod;

		return {
			pool: Math.max(0, skillRating + agi - woundMod),
			skillName
		};
	}

	/** Handle weapon click for attack roll. */
	function handleWeaponClick(weapon: CharacterWeapon, firingMode?: FiringMode): void {
		if (!interactive) return;
		const { pool, skillName } = getWeaponPool(weapon);

		// Apply firing mode modifier if specified
		const adjustedPool = firingMode ? Math.max(0, pool + firingMode.poolMod) : pool;

		dispatch('rollWeapon', { weapon, pool: adjustedPool, skillName, firingMode });
	}

	/** Get spellcasting pool. */
	function getSpellcastingPool(): number {
		const mag = getAttrTotal(char.attributes.mag);
		const spellcasting = char.skills.find(s => s.name === 'Spellcasting');
		const skillRating = spellcasting ? spellcasting.rating + spellcasting.bonus : 0;
		return Math.max(0, mag + skillRating - totalWoundMod);
	}

	/** Get drain resistance pool based on tradition. */
	function getDrainResistPool(): number {
		const wil = getAttrTotal(char.attributes.wil);
		const tradition = char.magic?.tradition.toLowerCase() || '';

		// Hermetic uses Logic, Shamanic uses Charisma
		// Default to Charisma for other traditions
		let drainAttr: number;
		if (tradition.includes('hermetic') || tradition.includes('mage')) {
			drainAttr = getAttrTotal(char.attributes.log);
		} else {
			drainAttr = getAttrTotal(char.attributes.cha);
		}

		return Math.max(0, wil + drainAttr - totalWoundMod);
	}

	/** Get quality data from game data including effect and bonus. */
	function getQualityData(qualityName: string): { effect?: string; bonuses: FormattedBonus[] } | undefined {
		const allQualities = [...($positiveQualities ?? []), ...($negativeQualities ?? [])];
		const gameQuality = allQualities.find(q => q.name === qualityName);
		if (!gameQuality) return undefined;
		return {
			effect: gameQuality.effect,
			bonuses: formatQualityBonus(gameQuality.bonus)
		};
	}

	/** Handle spell click for casting. */
	function handleSpellClick(spell: CharacterSpell): void {
		if (!interactive) return;
		dispatch('rollSpell', {
			spell,
			castPool: getSpellcastingPool(),
			drainPool: getDrainResistPool(),
			drainValue: spell.dv
		});
	}

	/** Handle condition box click. */
	function handleConditionClick(type: 'physical' | 'stun', boxIndex: number, maxBoxes: number): void {
		if (!interactive) return;

		const currentValue = type === 'physical' ? char.condition.physicalCurrent : char.condition.stunCurrent;

		// Clicking a marked box clears it and all after, clicking unmarked marks it and all before
		let newValue: number;
		if (boxIndex < currentValue) {
			// Clicking a marked box - set damage to that box (exclusive)
			newValue = boxIndex;
		} else {
			// Clicking an unmarked box - mark it (inclusive)
			newValue = Math.min(boxIndex + 1, maxBoxes);
		}

		dispatch('damageChanged', { type, value: newValue });
	}

	/** Handle Edge point click. */
	function handleEdgeClick(pointIndex: number): void {
		if (!interactive) return;

		const currentEdge = char.condition.edgeCurrent;

		// Clicking a filled point spends it, clicking empty recovers to that point
		let newValue: number;
		if (pointIndex < currentEdge) {
			// Clicking a filled point - spend down to that point
			newValue = pointIndex;
		} else {
			// Clicking an empty point - recover to that point (inclusive)
			newValue = pointIndex + 1;
		}

		dispatch('edgeChanged', { value: newValue });
	}

	/** Refresh all Edge. */
	function handleEdgeRefresh(): void {
		if (!interactive) return;
		dispatch('edgeChanged', { value: maxEdge });
	}

	/** Max Edge points. */
	$: maxEdge = getAttrTotal(char.attributes.edg);

	/** Get initiative (REA + INT + augmentation bonuses). */
	$: initiative = getAttrTotal(char.attributes.rea) + getAttrTotal(char.attributes.int) + initiativeBonus;

	/** Calculate wound modifier (every 3 boxes filled = -1). */
	$: physicalWoundMod = Math.floor(char.condition.physicalCurrent / 3);
	$: stunWoundMod = Math.floor(char.condition.stunCurrent / 3);
	$: totalWoundMod = physicalWoundMod + stunWoundMod;

	/** Get composure. */
	$: composure = getAttrTotal(char.attributes.cha) + getAttrTotal(char.attributes.wil);

	/** Get judge intentions. */
	$: judgeIntentions = getAttrTotal(char.attributes.cha) + getAttrTotal(char.attributes.int);

	/** Get lifting/carrying. */
	$: liftCarry = getAttrTotal(char.attributes.bod) + getAttrTotal(char.attributes.str);

	/** Get memory. */
	$: memory = getAttrTotal(char.attributes.log) + getAttrTotal(char.attributes.wil);

	/** Physical boxes. */
	$: physicalBoxes = getPhysicalBoxes(getAttrTotal(char.attributes.bod));

	/** Stun boxes. */
	$: stunBoxes = getStunBoxes(getAttrTotal(char.attributes.wil));

	/** Get Dodge skill rating if character has it. */
	$: dodgeSkill = char.skills.find(s => s.name === 'Dodge');
	$: dodgeRating = dodgeSkill ? dodgeSkill.rating + (dodgeSkill.bonus || 0) : 0;

	/** Defense pool (REA + Dodge) - apply wound modifier. */
	$: defensePool = Math.max(0, getAttrTotal(char.attributes.rea) + dodgeRating - totalWoundMod);

	/** Body for soak and encumbrance. */
	$: bodyTotal = getAttrTotal(char.attributes.bod);

	/** Calculate stacked armor values (SR4 layering rules). */
	$: armorStack = calculateArmorStacking(char.equipment.armor, bodyTotal);
	$: totalBallistic = armorStack.ballistic;
	$: totalImpact = armorStack.impact;
	$: armorEncumbrance = armorStack.encumbrancePenalty;

	/** Soak pool for ballistic (Body + Ballistic armor). */
	$: soakPoolBallistic = bodyTotal + totalBallistic;

	/** Soak pool for impact (Body + Impact armor). */
	$: soakPoolImpact = bodyTotal + totalImpact;

	/** Handle defense roll. */
	function handleDefenseRoll(): void {
		if (!interactive) return;
		dispatch('rollDefense', {
			name: dodgeSkill ? 'Dodge Defense' : 'Reaction Defense',
			pool: defensePool
		});
	}

	/** Handle soak roll for physical damage. */
	function handleSoakRoll(type: 'ballistic' | 'impact'): void {
		if (!interactive) return;
		const pool = type === 'ballistic' ? soakPoolBallistic : soakPoolImpact;
		const armor = type === 'ballistic' ? totalBallistic : totalImpact;
		dispatch('rollSoak', {
			name: `Soak (${type === 'ballistic' ? 'B' : 'I'})`,
			pool,
			armor
		});
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="cw-card p-4">
		<div class="flex items-start justify-between">
			<div>
				<h1 class="text-2xl font-bold text-text-primary">
					{char.identity.name || 'Unnamed Character'}
				</h1>
				{#if char.identity.alias}
					<p class="text-primary-dark">"{char.identity.alias}"</p>
				{/if}
				<p class="text-text-secondary">
					{char.identity.metatype}
					{#if char.identity.metavariant}
						({char.identity.metavariant})
					{/if}
				</p>
			</div>
			<div class="text-right">
				<div class="text-sm text-text-muted">
					{char.status === 'career' ? 'Career Mode' : 'In Creation'}
				</div>
				{#if char.status === 'career'}
					<div class="text-primary-dark font-bold">Karma: {char.karma}</div>
				{/if}
				<div class="text-primary-dark">Nuyen: {formatNuyen(char.nuyen)}</div>
			</div>
		</div>

		<!-- Edge Tracker -->
		{#if maxEdge > 0}
			<div class="mt-4 pt-4 border-t border-border">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="text-primary-dark font-medium">Edge</span>
						<span class="text-text-secondary text-sm">
							{char.condition.edgeCurrent} / {maxEdge}
						</span>
					</div>
					{#if interactive}
						<button
							type="button"
							class="cw-btn text-xs"
							on:click={handleEdgeRefresh}
							disabled={char.condition.edgeCurrent >= maxEdge}
						>
							Refresh
						</button>
					{/if}
				</div>
				<div class="flex gap-1 mt-2">
					{#each Array(maxEdge) as _, i}
						<button
							type="button"
							class="w-6 h-6 rounded-full border-2 text-center text-xs font-bold transition-colors
								{i < char.condition.edgeCurrent
									? 'bg-primary-main border-primary-dark text-surface'
									: 'border-primary-dark/50 text-primary-dark/50'}
								{interactive ? 'hover:border-primary-dark cursor-pointer' : ''}"
							on:click={() => handleEdgeClick(i)}
							disabled={!interactive}
							title={interactive ? (i < char.condition.edgeCurrent ? 'Spend Edge' : 'Recover Edge') : ''}
						>
							{i < char.condition.edgeCurrent ? '★' : '☆'}
						</button>
					{/each}
				</div>
				{#if interactive}
					<p class="text-text-muted text-xs mt-1">Click to spend/recover Edge</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Main Stats Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		<!-- Attributes -->
		<div class="cw-card">
			<h2 class="cw-card-header">Attributes</h2>
			<div class="grid grid-cols-2 gap-2 text-sm">
				<div class="flex justify-between">
					<span class="text-text-secondary">BOD</span>
					<span class="font-mono text-text-primary">{getAttrTotal(char.attributes.bod)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-text-secondary">AGI</span>
					<span class="font-mono text-text-primary">{getAttrTotal(char.attributes.agi)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-text-secondary">REA</span>
					<span class="font-mono text-text-primary">{getAttrTotal(char.attributes.rea)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-text-secondary">STR</span>
					<span class="font-mono text-text-primary">{getAttrTotal(char.attributes.str)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-text-secondary">CHA</span>
					<span class="font-mono text-text-primary">{getAttrTotal(char.attributes.cha)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-text-secondary">INT</span>
					<span class="font-mono text-text-primary">{getAttrTotal(char.attributes.int)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-text-secondary">LOG</span>
					<span class="font-mono text-text-primary">{getAttrTotal(char.attributes.log)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-text-secondary">WIL</span>
					<span class="font-mono text-text-primary">{getAttrTotal(char.attributes.wil)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-text-secondary">EDG</span>
					<span class="font-mono text-primary-dark">{getAttrTotal(char.attributes.edg)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-text-secondary">ESS</span>
					<span class="font-mono text-primary-dark">{char.attributes.ess.toFixed(2)}</span>
				</div>
				{#if char.attributes.mag}
					<div class="flex justify-between">
						<span class="text-text-secondary">MAG</span>
						<span class="font-mono text-info-dark">{getAttrTotal(char.attributes.mag)}</span>
					</div>
				{/if}
				{#if char.attributes.res}
					<div class="flex justify-between">
						<span class="text-text-secondary">RES</span>
						<span class="font-mono text-info-dark">{getAttrTotal(char.attributes.res)}</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Derived Stats -->
		<div class="cw-card">
			<h2 class="cw-card-header">Derived Stats</h2>
			<div class="space-y-2 text-sm">
				<button
					type="button"
					class="flex justify-between w-full {interactive ? 'hover:bg-surface-variant cursor-pointer rounded px-1 -mx-1' : ''}"
					on:click={handleInitiativeRoll}
					disabled={!interactive}
				>
					<span class="text-text-secondary">Initiative</span>
					<span class="font-mono text-text-primary">{initiative} + {initiativeDice}d6</span>
				</button>
				<button
					type="button"
					class="flex justify-between w-full {interactive ? 'hover:bg-surface-variant cursor-pointer rounded px-1 -mx-1' : ''}"
					on:click={() => handleDerivedRoll('Composure', composure)}
					disabled={!interactive}
				>
					<span class="text-text-secondary">Composure</span>
					<span class="font-mono text-text-primary">{composure}</span>
				</button>
				<button
					type="button"
					class="flex justify-between w-full {interactive ? 'hover:bg-surface-variant cursor-pointer rounded px-1 -mx-1' : ''}"
					on:click={() => handleDerivedRoll('Judge Intentions', judgeIntentions)}
					disabled={!interactive}
				>
					<span class="text-text-secondary">Judge Intentions</span>
					<span class="font-mono text-text-primary">{judgeIntentions}</span>
				</button>
				<button
					type="button"
					class="flex justify-between w-full {interactive ? 'hover:bg-surface-variant cursor-pointer rounded px-1 -mx-1' : ''}"
					on:click={() => handleDerivedRoll('Lift/Carry', liftCarry)}
					disabled={!interactive}
				>
					<span class="text-text-secondary">Lift/Carry</span>
					<span class="font-mono text-text-primary">{liftCarry}</span>
				</button>
				<button
					type="button"
					class="flex justify-between w-full {interactive ? 'hover:bg-surface-variant cursor-pointer rounded px-1 -mx-1' : ''}"
					on:click={() => handleDerivedRoll('Memory', memory)}
					disabled={!interactive}
				>
					<span class="text-text-secondary">Memory</span>
					<span class="font-mono text-text-primary">{memory}</span>
				</button>
			</div>
		</div>

		<!-- Condition Monitor -->
		<div class="cw-card">
			<h2 class="cw-card-header">Condition Monitor</h2>
			{#if interactive}
				<p class="text-text-muted text-xs mb-2">Click boxes to track damage</p>
			{/if}
			<div class="space-y-3">
				<div>
					<div class="flex justify-between text-sm mb-1">
						<span class="text-text-secondary">Physical</span>
						<span class="text-text-primary">{char.condition.physicalCurrent} / {physicalBoxes}</span>
					</div>
					<div class="flex flex-wrap gap-1">
						{#each Array(physicalBoxes) as _, i}
							<button
								type="button"
								class="w-5 h-5 border rounded text-center text-xs leading-5 transition-colors
									{i < char.condition.physicalCurrent
										? 'bg-error-main border-error-dark text-surface'
										: 'border-border text-text-muted'}
									{interactive ? 'hover:border-error-dark cursor-pointer' : ''}"
								on:click={() => handleConditionClick('physical', i, physicalBoxes)}
								disabled={!interactive}
								title={interactive ? (i < char.condition.physicalCurrent ? 'Click to heal' : 'Click to mark damage') : ''}
							>
								{i < char.condition.physicalCurrent ? 'X' : ''}
							</button>
						{/each}
					</div>
				</div>
				<div>
					<div class="flex justify-between text-sm mb-1">
						<span class="text-text-secondary">Stun</span>
						<span class="text-text-primary">{char.condition.stunCurrent} / {stunBoxes}</span>
					</div>
					<div class="flex flex-wrap gap-1">
						{#each Array(stunBoxes) as _, i}
							<button
								type="button"
								class="w-5 h-5 border rounded text-center text-xs leading-5 transition-colors
									{i < char.condition.stunCurrent
										? 'bg-warning-main border-warning-dark text-surface'
										: 'border-border text-text-muted'}
									{interactive ? 'hover:border-warning-dark cursor-pointer' : ''}"
								on:click={() => handleConditionClick('stun', i, stunBoxes)}
								disabled={!interactive}
								title={interactive ? (i < char.condition.stunCurrent ? 'Click to heal' : 'Click to mark damage') : ''}
							>
								{i < char.condition.stunCurrent ? 'X' : ''}
							</button>
						{/each}
					</div>
				</div>

				<!-- Wound Modifier -->
				{#if totalWoundMod > 0}
					<div class="mt-3 pt-3 border-t border-border">
						<div class="flex items-center justify-between">
							<span class="text-text-secondary text-sm">Wound Modifier</span>
							<span class="font-mono font-bold text-error-dark">-{totalWoundMod}</span>
						</div>
						<p class="text-text-muted text-xs mt-1">
							Applied to all tests ({physicalWoundMod > 0 ? `Physical: -${physicalWoundMod}` : ''}
							{physicalWoundMod > 0 && stunWoundMod > 0 ? ', ' : ''}
							{stunWoundMod > 0 ? `Stun: -${stunWoundMod}` : ''})
						</p>
					</div>
				{/if}

				<!-- Defense & Soak Actions -->
				{#if interactive}
					<div class="mt-3 pt-3 border-t border-border">
						<h3 class="text-sm text-text-secondary mb-2">Combat Defense</h3>
						<div class="flex flex-wrap gap-2">
							<button
								type="button"
								class="cw-btn cw-btn-secondary text-xs"
								on:click={handleDefenseRoll}
								title="Roll defense (REA + Dodge{totalWoundMod > 0 ? ` - ${totalWoundMod} wounds` : ''})"
							>
								Defense ({defensePool}d6)
							</button>
							<button
								type="button"
								class="cw-btn cw-btn-secondary text-xs"
								on:click={() => handleSoakRoll('ballistic')}
								title="Soak ballistic damage (Body + Ballistic Armor)"
							>
								Soak B ({soakPoolBallistic}d6)
							</button>
							<button
								type="button"
								class="cw-btn cw-btn-secondary text-xs"
								on:click={() => handleSoakRoll('impact')}
								title="Soak impact damage (Body + Impact Armor)"
							>
								Soak I ({soakPoolImpact}d6)
							</button>
						</div>
						<p class="text-text-muted text-xs mt-1">
							Armor: B{totalBallistic}/I{totalImpact} | Body: {bodyTotal}
							{#if char.equipment.armor.filter(a => a.equipped).length > 1}
								<span class="text-primary-dark">(stacked)</span>
							{/if}
						</p>
						{#if armorEncumbrance < 0}
							<p class="text-warning-dark text-xs mt-1">
								Encumbrance: {armorEncumbrance} to AGI/REA tests
							</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Skills -->
	<div class="cw-card">
		<h2 class="cw-card-header">Active Skills</h2>
		{#if interactive}
			<p class="text-text-muted text-xs mb-2">Click a skill to roll</p>
		{/if}
		{#if char.skills.length === 0}
			<p class="text-text-muted text-sm">No skills.</p>
		{:else}
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
				{#each char.skills.sort((a, b) => a.name.localeCompare(b.name)) as skill}
					<button
						type="button"
						class="flex justify-between py-1 border-b border-border text-left w-full
							{interactive ? 'hover:bg-surface-variant cursor-pointer rounded px-1 -mx-1' : ''}"
						on:click={() => handleSkillClick(skill.name, skill.rating, skill.bonus, skill.specialization)}
						disabled={!interactive}
					>
						<span class="text-text-secondary truncate" title={skill.name}>
							{skill.name}
							{#if skill.specialization}
								<span class="text-text-muted">({skill.specialization})</span>
							{/if}
						</span>
						<span class="font-mono text-text-primary ml-2">
							{#if interactive && skillDefs.length > 0}
								{getSkillPool(skill.name, skill.rating, skill.bonus)}{skill.specialization ? '+2' : ''}
							{:else}
								{skill.rating + skill.bonus}
								{#if skill.specialization}
									<span class="text-primary-dark">(+2)</span>
								{/if}
							{/if}
						</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Knowledge Skills -->
	{#if char.knowledgeSkills.length > 0}
		<div class="cw-card">
			<h2 class="cw-card-header">Knowledge Skills</h2>
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
				{#each char.knowledgeSkills.sort((a, b) => a.name.localeCompare(b.name)) as skill}
					<div class="flex justify-between py-1 border-b border-border">
						<span class="text-text-secondary truncate" title={skill.name}>
							{skill.name}
							<span class="text-text-muted text-xs">({skill.category})</span>
						</span>
						<span class="font-mono text-text-primary ml-2">{skill.rating}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Qualities -->
	{#if char.qualities.length > 0}
		<div class="cw-card">
			<h2 class="cw-card-header">Qualities</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
				{#each char.qualities as quality}
					{@const qualityData = getQualityData(quality.name)}
					{@const hasTooltip = qualityData?.effect || (qualityData?.bonuses?.length ?? 0) > 0}
					<div class="flex justify-between py-1 border-b border-border group relative">
						<span class:text-success-dark={quality.category === 'Positive'}
							  class:text-error-dark={quality.category === 'Negative'}
							  class:cursor-help={hasTooltip}>
							{quality.name}
						</span>
						<span class="text-text-muted">{quality.bp} BP</span>
						<Tooltip show={hasTooltip} maxWidth="20rem">
							<div slot="content" class="text-left">
								{#if qualityData?.effect}
									<div class="mb-1">{qualityData.effect}</div>
								{/if}
								{#if qualityData?.bonuses && qualityData.bonuses.length > 0}
									<div class="border-t border-gray-700 pt-1 mt-1 space-y-0.5">
										{#each qualityData.bonuses as bonus}
											<div class:text-green-400={bonus.positive}
												 class:text-red-400={!bonus.positive}>
												{bonus.text}
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</Tooltip>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Equipment Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<!-- Weapons -->
		{#if char.equipment.weapons.length > 0}
			<div class="cw-card">
				<h2 class="cw-card-header">Weapons</h2>
				{#if interactive}
					<p class="text-text-muted text-xs mb-2">Click a weapon to roll attack</p>
				{/if}
				<div class="space-y-2 text-sm">
					{#each char.equipment.weapons as weapon}
						{@const weaponPool = getWeaponPool(weapon)}
						{@const maxAmmo = getMaxAmmo(weapon.ammo)}
						{@const firingModes = parseFireModes(weapon.mode)}
						<div class="p-2 bg-surface-variant rounded">
							<div class="flex justify-between items-start">
								<div class="font-medium text-text-primary">{weapon.name}</div>
								{#if interactive}
									<div class="text-xs text-primary-dark ml-2">
										Pool: {weaponPool.pool}
									</div>
								{/if}
							</div>
							<div class="flex flex-wrap gap-3 text-xs text-text-muted mt-1">
								<span>DMG: <span class="text-text-secondary">{weapon.damage}</span></span>
								<span>AP: <span class="text-text-secondary">{weapon.ap}</span></span>
								{#if interactive}
									<span class="text-primary-dark">({weaponPool.skillName})</span>
								{/if}
							</div>

							<!-- Firing Mode Buttons (for ranged weapons) -->
							{#if interactive && weapon.type === 'Ranged' && firingModes.length > 0}
								<div class="mt-2 pt-2 border-t border-border/50">
									<div class="flex flex-wrap gap-1">
										{#each firingModes as mode}
											<button
												type="button"
												class="cw-btn text-xs px-2 py-1 {mode.ammoPerShot > weapon.currentAmmo ? 'opacity-50' : ''}"
												on:click|stopPropagation={() => handleWeaponClick(weapon, mode)}
												disabled={mode.ammoPerShot > weapon.currentAmmo}
												title="{mode.name}: {mode.ammoPerShot} ammo, {mode.poolMod !== 0 ? (mode.poolMod > 0 ? '+' : '') + mode.poolMod + ' pool' : ''}{mode.damageMod !== 0 ? ', +' + mode.damageMod + ' DV' : ''}"
											>
												{mode.code}
												{#if mode.damageMod > 0}
													<span class="text-success-dark">+{mode.damageMod}</span>
												{/if}
											</button>
										{/each}
									</div>
								</div>
							{:else if interactive && weapon.type === 'Melee'}
								<!-- Melee weapon attack button -->
								<button
									type="button"
									class="cw-btn text-xs mt-2"
									on:click|stopPropagation={() => handleWeaponClick(weapon)}
								>
									Attack
								</button>
							{/if}

							<!-- Ammo Tracker -->
							{#if maxAmmo > 0}
								<div class="mt-2 pt-2 border-t border-border/50">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											<span class="text-text-muted text-xs">Ammo:</span>
											<span class="font-mono text-sm {weapon.currentAmmo === 0 ? 'text-error-dark' : 'text-text-secondary'}">
												{weapon.currentAmmo} / {maxAmmo}
											</span>
										</div>
										{#if interactive}
											<div class="flex gap-1">
												<button
													type="button"
													class="cw-btn text-xs px-2 py-0.5"
													on:click|stopPropagation={() => handleSpendAmmo(weapon.id, weapon.currentAmmo)}
													disabled={weapon.currentAmmo === 0}
													title="Spend 1 ammo"
												>
													-1
												</button>
												<button
													type="button"
													class="cw-btn text-xs px-2 py-0.5"
													on:click|stopPropagation={() => handleReload(weapon.id)}
													disabled={weapon.currentAmmo >= maxAmmo}
													title="Reload weapon"
												>
													Reload
												</button>
											</div>
										{/if}
									</div>
									{#if weapon.currentAmmo === 0}
										<p class="text-error-dark text-xs mt-1">Weapon empty!</p>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Armor -->
		{#if char.equipment.armor.length > 0}
			<div class="cw-card">
				<h2 class="cw-card-header">Armor</h2>
				<div class="space-y-2 text-sm">
					{#each char.equipment.armor as armor}
						<div class="p-2 bg-surface-variant rounded flex justify-between items-center">
							<div>
								<span class="font-medium text-text-primary">{armor.name}</span>
								{#if armor.equipped}
									<span class="ml-2 text-xs text-success-dark">(Equipped)</span>
								{/if}
							</div>
							<div class="text-xs text-text-muted">
								B: <span class="text-text-secondary">{armor.ballistic}</span>
								/ I: <span class="text-text-secondary">{armor.impact}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Cyberware -->
	{#if char.equipment.cyberware.length > 0}
		<div class="cw-card">
			<h2 class="cw-card-header">Cyberware</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
				{#each char.equipment.cyberware as cyber}
					<div class="flex justify-between py-1 border-b border-border">
						<span class="text-text-secondary">
							{cyber.name}
							{#if cyber.rating > 0}
								<span class="text-text-muted">(R{cyber.rating})</span>
							{/if}
							{#if cyber.grade !== 'Standard'}
								<span class="text-primary-dark text-xs ml-1">[{cyber.grade}]</span>
							{/if}
						</span>
						<span class="text-error-dark text-xs">{cyber.essence.toFixed(2)} ESS</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Bioware -->
	{#if char.equipment.bioware && char.equipment.bioware.length > 0}
		<div class="cw-card">
			<h2 class="cw-card-header">Bioware</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
				{#each char.equipment.bioware as bio}
					<div class="flex justify-between py-1 border-b border-border">
						<span class="text-text-secondary">
							{bio.name}
							{#if bio.rating > 0}
								<span class="text-text-muted">(R{bio.rating})</span>
							{/if}
							{#if bio.grade !== 'Standard'}
								<span class="text-success-dark text-xs ml-1">[{bio.grade}]</span>
							{/if}
						</span>
						<span class="text-info-dark text-xs">{bio.essence.toFixed(2)} ESS</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Vehicles -->
	{#if char.equipment.vehicles && char.equipment.vehicles.length > 0}
		<div class="cw-card">
			<h2 class="cw-card-header">Vehicles</h2>
			<div class="space-y-2 text-sm">
				{#each char.equipment.vehicles as vehicle}
					<div class="p-2 bg-surface-variant rounded">
						<div class="font-medium text-text-primary">{vehicle.name}</div>
						<div class="grid grid-cols-4 gap-2 text-xs text-text-muted mt-1">
							<span>Hand: <span class="text-text-secondary">{vehicle.handling}</span></span>
							<span>Speed: <span class="text-text-secondary">{vehicle.speed}</span></span>
							<span>Pilot: <span class="text-text-secondary">{vehicle.pilot}</span></span>
							<span>Body: <span class="text-text-secondary">{vehicle.body}</span></span>
							<span>Armor: <span class="text-text-secondary">{vehicle.armor}</span></span>
							<span>Sensor: <span class="text-text-secondary">{vehicle.sensor}</span></span>
						</div>
						{#if vehicle.mods && vehicle.mods.length > 0}
							<div class="text-xs text-text-muted mt-1">
								Mods: {vehicle.mods.map(m => m.name).join(', ')}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Martial Arts -->
	{#if char.equipment.martialArts && char.equipment.martialArts.length > 0}
		<div class="cw-card">
			<h2 class="cw-card-header">Martial Arts</h2>
			<div class="space-y-3 text-sm">
				{#each char.equipment.martialArts as art}
					<div class="p-2 bg-surface-variant rounded">
						<div class="font-medium text-text-primary">{art.name}</div>
						{#if art.techniques.length > 0}
							<div class="flex flex-wrap gap-1 mt-2">
								{#each art.techniques as technique}
									<span class="px-2 py-0.5 bg-primary-main/20 text-primary-dark text-xs rounded">
										{technique}
									</span>
								{/each}
							</div>
						{:else}
							<p class="text-text-muted text-xs mt-1">No techniques learned yet</p>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Magic -->
	{#if char.magic}
		<div class="cw-card">
			<h2 class="cw-card-header">Magic</h2>
			<div class="space-y-4">
				<div class="flex flex-wrap gap-4 text-sm">
					<span class="text-text-secondary">Tradition: <span class="text-text-primary">{char.magic.tradition}</span></span>
					{#if char.magic.mentor}
						<span class="text-text-secondary">Mentor: <span class="text-info-dark">{char.magic.mentor}</span></span>
					{/if}
					{#if char.magic.initiateGrade > 0}
						<span class="text-text-secondary">Initiate Grade: <span class="text-info-dark">{char.magic.initiateGrade}</span></span>
					{/if}
				</div>

				{#if char.magic.spells.length > 0}
					<div>
						<h3 class="text-sm font-medium text-text-secondary mb-2">Spells</h3>
						{#if interactive}
							<p class="text-text-muted text-xs mb-2">Click a spell to cast (Pool: {getSpellcastingPool()})</p>
						{/if}
						<div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
							{#each char.magic.spells as spell}
								<button
									type="button"
									class="p-2 bg-surface-variant rounded text-left w-full transition-colors
										{interactive ? 'hover:bg-surface cursor-pointer' : ''}"
									on:click={() => handleSpellClick(spell)}
									disabled={!interactive}
								>
									<div class="font-medium text-text-primary">{spell.name}</div>
									<div class="text-xs text-text-muted">
										{spell.category} • {spell.type} • DV {spell.dv}
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#if char.magic.powers.length > 0}
					<div>
						<h3 class="text-sm font-medium text-text-secondary mb-2">Adept Powers</h3>
						<div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
							{#each char.magic.powers as power}
								<div class="flex justify-between py-1 border-b border-border">
									<span class="text-text-secondary">{power.name}</span>
									<span class="text-info-dark">{power.points * power.level} PP</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Resonance (Technomancer) -->
	{#if char.resonance}
		<div class="cw-card">
			<h2 class="cw-card-header">Resonance</h2>
			<div class="space-y-4">
				<div class="flex flex-wrap gap-4 text-sm">
					<span class="text-text-secondary">Stream: <span class="text-primary-dark">{char.resonance.stream}</span></span>
					{#if char.resonance.submersionGrade > 0}
						<span class="text-text-secondary">Submersion Grade: <span class="text-primary-dark">{char.resonance.submersionGrade}</span></span>
					{/if}
				</div>

				{#if char.resonance.complexForms.length > 0}
					<div>
						<h3 class="text-sm font-medium text-text-secondary mb-2">Complex Forms</h3>
						<div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
							{#each char.resonance.complexForms as form}
								<div class="p-2 bg-surface-variant rounded">
									<div class="font-medium text-text-primary">{form.name}</div>
									<div class="text-xs text-text-muted">
										{form.target} • {form.duration}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if char.resonance.echoes && char.resonance.echoes.length > 0}
					<div>
						<h3 class="text-sm font-medium text-text-secondary mb-2">Echoes</h3>
						<div class="flex flex-wrap gap-2">
							{#each char.resonance.echoes as echo}
								<span class="px-2 py-1 bg-primary-main/20 text-primary-dark text-sm rounded">
									{echo.name}
								</span>
							{/each}
						</div>
					</div>
				{/if}

				{#if char.resonance.sprites && char.resonance.sprites.length > 0}
					<div>
						<h3 class="text-sm font-medium text-text-secondary mb-2">Registered Sprites</h3>
						<div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
							{#each char.resonance.sprites as sprite}
								<div class="p-2 bg-surface-variant rounded">
									<div class="font-medium text-text-primary">{sprite.type}</div>
									<div class="text-xs text-text-muted">
										Rating {sprite.rating} • {sprite.tasks} task{sprite.tasks !== 1 ? 's' : ''} remaining
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Contacts -->
	{#if char.contacts.length > 0}
		<div class="cw-card">
			<h2 class="cw-card-header">Contacts</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
				{#each char.contacts as contact}
					<div class="p-2 bg-surface-variant rounded">
						<div class="font-medium text-text-primary">{contact.name}</div>
						<div class="flex justify-between text-xs">
							<span class="text-text-muted">{contact.type}</span>
							<span class="text-text-secondary">
								L: {contact.loyalty} / C: {contact.connection}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Gear -->
	{#if char.equipment.gear && char.equipment.gear.length > 0}
		<div class="cw-card">
			<h2 class="cw-card-header">Gear</h2>
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
				{#each char.equipment.gear as item}
					<div class="flex justify-between py-1 border-b border-border">
						<span class="text-text-secondary">
							{item.name}
							{#if item.quantity > 1}
								<span class="text-text-muted">×{item.quantity}</span>
							{/if}
							{#if item.rating > 0}
								<span class="text-text-muted">(R{item.rating})</span>
							{/if}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Lifestyle -->
	{#if char.equipment.lifestyle}
		<div class="cw-card">
			<h2 class="cw-card-header">Lifestyle</h2>
			<div class="p-3 bg-surface-variant rounded">
				<div class="flex justify-between items-center">
					<div>
						<span class="font-medium text-text-primary">{char.equipment.lifestyle.name}</span>
						{#if char.equipment.lifestyle.location}
							<span class="text-text-muted text-sm ml-2">({char.equipment.lifestyle.location})</span>
						{/if}
					</div>
					<div class="text-right">
						<span class="text-primary-dark font-mono">{formatNuyen(char.equipment.lifestyle.monthlyCost)}</span>
						<span class="text-text-muted text-xs">/month</span>
					</div>
				</div>
				{#if char.equipment.lifestyle.monthsPrepaid > 0}
					<div class="text-xs text-text-secondary mt-1">
						{char.equipment.lifestyle.monthsPrepaid} month{char.equipment.lifestyle.monthsPrepaid !== 1 ? 's' : ''} prepaid
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Identity Details -->
	<div class="cw-card">
		<h2 class="cw-card-header">Identity</h2>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
			{#if char.identity.sex}
				<div>
					<span class="text-text-muted">Sex:</span>
					<span class="text-text-secondary ml-1">{char.identity.sex}</span>
				</div>
			{/if}
			{#if char.identity.age}
				<div>
					<span class="text-text-muted">Age:</span>
					<span class="text-text-secondary ml-1">{char.identity.age}</span>
				</div>
			{/if}
			{#if char.identity.height}
				<div>
					<span class="text-text-muted">Height:</span>
					<span class="text-text-secondary ml-1">{char.identity.height}</span>
				</div>
			{/if}
			{#if char.identity.weight}
				<div>
					<span class="text-text-muted">Weight:</span>
					<span class="text-text-secondary ml-1">{char.identity.weight}</span>
				</div>
			{/if}
		</div>
		{#if char.background.description}
			<div class="mt-4 pt-4 border-t border-border">
				<h3 class="text-sm font-medium text-text-secondary mb-2">Description</h3>
				<p class="text-text-secondary text-sm whitespace-pre-wrap">{char.background.description}</p>
			</div>
		{/if}
	</div>
</div>

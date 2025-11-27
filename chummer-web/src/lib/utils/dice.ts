/**
 * Dice rolling utilities for Shadowrun 4th Edition.
 *
 * SR4 uses a dice pool system where you roll a number of d6s,
 * counting successes (5 or 6) and checking for glitches (more than half 1s).
 */

/** Result of a dice roll. */
export interface RollResult {
	/** Individual die results. */
	dice: number[];
	/** Number of hits (5s and 6s by default). */
	hits: number;
	/** Number of 1s rolled. */
	ones: number;
	/** True if more than half of dice are 1s. */
	isGlitch: boolean;
	/** True if glitch with 0 hits. */
	isCriticalGlitch: boolean;
	/** Whether Edge was used (exploding 6s). */
	edgeUsed: boolean;
	/** Original pool size. */
	pool: number;
}

/** Options for rolling dice. */
export interface RollOptions {
	/** Number of dice in the pool. */
	pool: number;
	/** Use Edge (exploding 6s). */
	edge?: boolean;
	/** Threshold for a hit (default 5). */
	threshold?: number;
	/** Custom RNG function for testing. */
	rng?: () => number;
}

/**
 * Roll a single d6.
 * @param rng - Optional RNG function for testing.
 * @returns A number between 1 and 6.
 */
export function rollD6(rng?: () => number): number {
	const random = rng ? rng() : Math.random();
	return Math.floor(random * 6) + 1;
}

/**
 * Roll a dice pool and calculate results.
 * @param options - Roll options.
 * @returns The roll result.
 */
export function rollDicePool(options: RollOptions): RollResult {
	const { pool, edge = false, threshold = 5, rng } = options;

	const dice: number[] = [];
	let extraDice = 0;

	// Roll initial pool
	for (let i = 0; i < pool; i++) {
		const result = rollD6(rng);
		dice.push(result);

		// Edge: 6s explode (roll again)
		if (edge && result === 6) {
			extraDice++;
		}
	}

	// Roll exploding dice (with safety limit to prevent infinite loops)
	let explosions = 0;
	const maxExplosions = 100;
	while (extraDice > 0 && explosions < maxExplosions) {
		const result = rollD6(rng);
		dice.push(result);
		extraDice--;
		explosions++;

		if (edge && result === 6) {
			extraDice++;
		}
	}

	// Count results
	const hits = dice.filter(d => d >= threshold).length;
	const ones = dice.filter(d => d === 1).length;

	// Glitch: more than half are 1s
	const isGlitch = ones > dice.length / 2;
	const isCriticalGlitch = isGlitch && hits === 0;

	return {
		dice,
		hits,
		ones,
		isGlitch,
		isCriticalGlitch,
		edgeUsed: edge,
		pool
	};
}

/**
 * Calculate the probability of getting at least N hits.
 * @param pool - Dice pool size.
 * @param targetHits - Minimum hits needed.
 * @param threshold - Hit threshold (default 5).
 * @returns Probability as a decimal (0-1).
 */
export function calculateHitProbability(pool: number, targetHits: number, threshold = 5): number {
	// Probability of a single die being a hit
	const hitProb = (7 - threshold) / 6;
	const missProb = 1 - hitProb;

	// Use binomial distribution
	let probability = 0;
	for (let k = targetHits; k <= pool; k++) {
		probability += binomial(pool, k) * Math.pow(hitProb, k) * Math.pow(missProb, pool - k);
	}

	return probability;
}

/**
 * Calculate binomial coefficient (n choose k).
 */
function binomial(n: number, k: number): number {
	if (k < 0 || k > n) return 0;
	if (k === 0 || k === n) return 1;

	let result = 1;
	for (let i = 1; i <= k; i++) {
		result = result * (n - k + i) / i;
	}
	return result;
}

/**
 * Calculate expected hits for a pool.
 * @param pool - Dice pool size.
 * @param threshold - Hit threshold (default 5).
 * @returns Expected number of hits.
 */
export function expectedHits(pool: number, threshold = 5): number {
	const hitProb = (7 - threshold) / 6;
	return pool * hitProb;
}

/**
 * Calculate glitch probability for a pool.
 * @param pool - Dice pool size.
 * @returns Probability of a glitch as a decimal (0-1).
 */
export function glitchProbability(pool: number): number {
	const oneProb = 1 / 6;
	const notOneProb = 5 / 6;
	const halfPool = Math.floor(pool / 2) + 1;

	// Sum probability of getting more than half 1s
	let probability = 0;
	for (let k = halfPool; k <= pool; k++) {
		probability += binomial(pool, k) * Math.pow(oneProb, k) * Math.pow(notOneProb, pool - k);
	}

	return probability;
}

/** Result of an initiative roll. */
export interface InitiativeResult {
	/** Base initiative (REA + INT). */
	base: number;
	/** Dice rolled for initiative. */
	dice: number[];
	/** Total initiative score. */
	total: number;
	/** Number of initiative passes this combat turn. */
	passes: number;
}

/** Options for rolling initiative. */
export interface InitiativeOptions {
	/** Base initiative (REA + INT). */
	base: number;
	/** Number of initiative dice (default 1, increased by certain abilities). */
	dice?: number;
	/** Custom RNG function for testing. */
	rng?: () => number;
}

/**
 * Roll initiative for SR4.
 * Initiative = REA + INT + Xd6 (typically 1d6 for mundanes).
 * @param options - Initiative roll options.
 * @returns The initiative result.
 */
export function rollInitiative(options: InitiativeOptions): InitiativeResult {
	const { base, dice = 1, rng } = options;

	const diceResults: number[] = [];
	let diceTotal = 0;

	for (let i = 0; i < dice; i++) {
		const result = rollD6(rng);
		diceResults.push(result);
		diceTotal += result;
	}

	const total = base + diceTotal;

	// Calculate initiative passes
	// Pass 1: everyone with Init >= 1
	// Pass 2: everyone with Init >= 11
	// Pass 3: everyone with Init >= 21
	// Pass 4: everyone with Init >= 31
	const passes = Math.min(4, Math.max(1, Math.ceil(total / 10)));

	return {
		base,
		dice: diceResults,
		total,
		passes
	};
}

/**
 * Calculate remaining initiative for subsequent passes.
 * Each pass reduces initiative by 10.
 * @param total - Current initiative total.
 * @param passNumber - Which pass (1-4).
 * @returns Initiative score for this pass, or 0 if no action.
 */
export function getInitiativeForPass(total: number, passNumber: number): number {
	const reduction = (passNumber - 1) * 10;
	return Math.max(0, total - reduction);
}

/** Map weapon categories to their associated combat skills. */
export const WEAPON_SKILL_MAP: Record<string, string> = {
	// Melee weapons
	'Blades': 'Blades',
	'Clubs': 'Clubs',
	'Unarmed': 'Unarmed Combat',
	'Exotic Melee Weapons': 'Exotic Melee Weapon',

	// Ranged - Pistols
	'Holdouts': 'Pistols',
	'Light Pistols': 'Pistols',
	'Heavy Pistols': 'Pistols',
	'Machine Pistols': 'Pistols',
	'Tasers': 'Pistols',

	// Ranged - Automatics
	'Submachine Guns': 'Automatics',
	'Assault Rifles': 'Automatics',
	'Battle Rifles': 'Automatics',

	// Ranged - Longarms
	'Sports Rifles': 'Longarms',
	'Sniper Rifles': 'Longarms',
	'Shotguns': 'Longarms',

	// Ranged - Heavy Weapons
	'Light Machine Guns': 'Heavy Weapons',
	'Medium Machine Guns': 'Heavy Weapons',
	'Heavy Machine Guns': 'Heavy Weapons',
	'Assault Cannons': 'Heavy Weapons',
	'Grenade Launchers': 'Heavy Weapons',
	'Mortar Launchers': 'Heavy Weapons',
	'Missile Launchers': 'Heavy Weapons',
	'Flamethrowers': 'Heavy Weapons',
	'Laser Weapons': 'Heavy Weapons',

	// Ranged - Archery
	'Bows': 'Archery',
	'Crossbows': 'Archery',

	// Other
	'Throwing Weapons': 'Throwing Weapons',
	'Exotic Ranged Weapons': 'Exotic Ranged Weapon',
	'Special Weapons': 'Automatics', // Default for special cases
	'Vehicle Weapons': 'Gunnery'
};

/**
 * Get the skill name for a weapon category.
 * @param category - The weapon category.
 * @returns The skill name, or the category if not mapped.
 */
export function getWeaponSkill(category: string): string {
	return WEAPON_SKILL_MAP[category] ?? category;
}

/** Result of a damage roll. */
export interface DamageRollResult {
	/** Base damage value. */
	baseDamage: number;
	/** Damage type (P for Physical, S for Stun). */
	damageType: 'P' | 'S';
	/** Net hits from attack roll to add to damage. */
	netHits: number;
	/** Total damage value. */
	totalDamage: number;
	/** Armor penetration value. */
	ap: number;
}

/**
 * Parse a damage string like "6P" or "5S(e)" into components.
 * @param damage - The damage string from weapon stats.
 * @returns Parsed damage value and type.
 */
export function parseDamage(damage: string): { value: number; type: 'P' | 'S'; special: string } {
	// Extract the numeric value
	const numMatch = damage.match(/(\d+)/);
	const value = numMatch ? parseInt(numMatch[1], 10) : 0;

	// Determine damage type (P or S) - look for standalone P or S followed by end, space, or (
	// This avoids matching 'S' in 'STR'
	const typeMatch = damage.match(/(?<![A-Z])([PS])(?:\(|$)/i);
	const type = (typeMatch ? typeMatch[1].toUpperCase() : 'P') as 'P' | 'S';

	// Extract special modifiers like (f) for fire, (e) for electric
	const specialMatch = damage.match(/\([^)]+\)/g);
	const special = specialMatch ? specialMatch.join('') : '';

	// Also check for strength-based prefixes
	const strMatch = damage.match(/^\(STR[^)]*\)/i);
	const strMod = strMatch ? strMatch[0] : '';

	return {
		value,
		type,
		special: strMod + special
	};
}

/**
 * Parse an AP string like "-2" or "-half" into a number.
 * @param ap - The AP string from weapon stats.
 * @returns The AP value as a number.
 */
export function parseAP(ap: string): number {
	if (!ap || ap === '-' || ap === '—') return 0;
	const num = parseInt(ap, 10);
	return isNaN(num) ? 0 : num;
}

/** Firing mode definition. */
export interface FiringMode {
	/** Mode abbreviation (SS, SA, BF, FA). */
	code: string;
	/** Full name of the mode. */
	name: string;
	/** Ammo consumed per attack. */
	ammoPerShot: number;
	/** Dice pool modifier. */
	poolMod: number;
	/** Damage modifier (0 for SS/SA, +2 for BF, +5 for FA narrow, +9 for FA wide). */
	damageMod: number;
	/** Recoil penalty per shot. */
	recoil: number;
}

/** Standard SR4 firing modes. */
export const FIRING_MODES: Record<string, FiringMode> = {
	SS: { code: 'SS', name: 'Single Shot', ammoPerShot: 1, poolMod: 0, damageMod: 0, recoil: 0 },
	SA: { code: 'SA', name: 'Semi-Automatic', ammoPerShot: 1, poolMod: 0, damageMod: 0, recoil: 1 },
	BF: { code: 'BF', name: 'Burst Fire', ammoPerShot: 3, poolMod: -2, damageMod: 2, recoil: 3 },
	LB: { code: 'LB', name: 'Long Burst', ammoPerShot: 6, poolMod: -5, damageMod: 5, recoil: 6 },
	FA: { code: 'FA', name: 'Full Auto (Narrow)', ammoPerShot: 6, poolMod: -5, damageMod: 5, recoil: 6 },
	FAW: { code: 'FAW', name: 'Full Auto (Wide)', ammoPerShot: 10, poolMod: -9, damageMod: 9, recoil: 10 },
	SF: { code: 'SF', name: 'Suppressive Fire', ammoPerShot: 20, poolMod: 0, damageMod: 0, recoil: 0 }
};

/**
 * Parse available firing modes from a weapon's mode string.
 * @param modeString - The mode string like "SA/BF/FA" or "SA".
 * @returns Array of available firing modes.
 */
export function parseFireModes(modeString: string): FiringMode[] {
	if (!modeString || modeString === '-') return [];

	const modes: FiringMode[] = [];
	const modeCodes = modeString.toUpperCase().split('/');

	for (const code of modeCodes) {
		const mode = FIRING_MODES[code.trim()];
		if (mode) {
			modes.push(mode);
		}
	}

	return modes;
}

/**
 * Calculate recoil compensation needed.
 * @param totalRC - Total recoil compensation (from weapon + accessories + STR/2).
 * @param shotsThisTurn - Number of shots fired this combat turn.
 * @param mode - The firing mode being used.
 * @returns Recoil penalty (negative modifier).
 */
export function calculateRecoilPenalty(totalRC: number, shotsThisTurn: number, mode: FiringMode): number {
	const cumulativeRecoil = shotsThisTurn + mode.recoil;
	const uncompensated = Math.max(0, cumulativeRecoil - totalRC - 1);
	// Avoid returning -0 (use || 0 to convert -0 to 0)
	return -uncompensated || 0;
}

/* ============================================
 * Armor Stacking
 * ============================================ */

/** Result of armor stacking calculation. */
export interface ArmorStackResult {
	/** Total ballistic armor after stacking. */
	ballistic: number;
	/** Total impact armor after stacking. */
	impact: number;
	/** Encumbrance penalty (negative modifier) if armor exceeds Body. */
	encumbrancePenalty: number;
	/** Whether there's any armor equipped. */
	hasArmor: boolean;
}

/** Input armor piece for stacking calculation. */
export interface ArmorPiece {
	name: string;
	ballistic: number;
	impact: number;
	equipped: boolean;
}

/**
 * Calculate stacked armor values according to SR4 rules.
 * - The highest value is primary
 * - Secondary armor adds half its value (rounded down)
 * - Encumbrance penalty if total exceeds Body
 *
 * @param armorPieces - Array of armor pieces
 * @param body - Character's Body attribute
 * @returns Stacked armor values and encumbrance penalty
 */
export function calculateArmorStacking(armorPieces: ArmorPiece[], body: number): ArmorStackResult {
	// Filter to equipped armor only
	const equipped = armorPieces.filter(a => a.equipped);

	if (equipped.length === 0) {
		return { ballistic: 0, impact: 0, encumbrancePenalty: 0, hasArmor: false };
	}

	// Sort by ballistic value descending for stacking
	const sortedByBallistic = [...equipped].sort((a, b) => b.ballistic - a.ballistic);
	const sortedByImpact = [...equipped].sort((a, b) => b.impact - a.impact);

	// Calculate stacked values
	// Primary armor (highest) + half of each secondary (rounded down)
	let totalBallistic = sortedByBallistic[0]?.ballistic ?? 0;
	let totalImpact = sortedByImpact[0]?.impact ?? 0;

	// Add half of secondary armors (SR4 layered armor rules)
	for (let i = 1; i < sortedByBallistic.length; i++) {
		totalBallistic += Math.floor(sortedByBallistic[i].ballistic / 2);
	}
	for (let i = 1; i < sortedByImpact.length; i++) {
		totalImpact += Math.floor(sortedByImpact[i].impact / 2);
	}

	// Calculate encumbrance penalty
	// If total armor exceeds Body, -1 penalty per point over
	const highestArmor = Math.max(totalBallistic, totalImpact);
	const encumbrancePenalty = highestArmor > body ? -(highestArmor - body) : 0;

	return {
		ballistic: totalBallistic,
		impact: totalImpact,
		encumbrancePenalty,
		hasArmor: true
	};
}

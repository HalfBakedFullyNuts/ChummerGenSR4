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

/* ============================================
 * Combat Modifiers
 * ============================================ */

/** Combat situation modifier. */
export interface CombatModifier {
	/** Modifier name. */
	name: string;
	/** Dice pool modifier (positive or negative). */
	modifier: number;
	/** Category for grouping. */
	category: 'visibility' | 'range' | 'cover' | 'position' | 'called_shot' | 'other';
	/** Description of when this applies. */
	description: string;
}

/** Standard SR4 combat modifiers. */
export const COMBAT_MODIFIERS: Record<string, CombatModifier> = {
	// Visibility
	light_rain: { name: 'Light Rain/Smoke', modifier: -1, category: 'visibility', description: 'Light obscurement' },
	moderate_rain: { name: 'Moderate Rain/Smoke', modifier: -3, category: 'visibility', description: 'Moderate obscurement' },
	heavy_rain: { name: 'Heavy Rain/Smoke', modifier: -6, category: 'visibility', description: 'Heavy obscurement' },
	light_glare: { name: 'Light Glare', modifier: -1, category: 'visibility', description: 'Slight glare' },
	moderate_glare: { name: 'Moderate Glare', modifier: -3, category: 'visibility', description: 'Bright glare' },
	blind_fire: { name: 'Blind Fire', modifier: -6, category: 'visibility', description: 'Cannot see target' },
	total_darkness: { name: 'Total Darkness', modifier: -6, category: 'visibility', description: 'No light at all' },

	// Range (for ranged weapons)
	short_range: { name: 'Short Range', modifier: 0, category: 'range', description: 'Within short range' },
	medium_range: { name: 'Medium Range', modifier: -1, category: 'range', description: 'Within medium range' },
	long_range: { name: 'Long Range', modifier: -3, category: 'range', description: 'Within long range' },
	extreme_range: { name: 'Extreme Range', modifier: -6, category: 'range', description: 'At extreme range' },

	// Cover
	partial_cover: { name: 'Partial Cover', modifier: -2, category: 'cover', description: 'Target has partial cover' },
	good_cover: { name: 'Good Cover', modifier: -4, category: 'cover', description: 'Target has good cover' },
	running_target: { name: 'Running Target', modifier: -2, category: 'cover', description: 'Target is running' },
	prone_target: { name: 'Prone Target', modifier: -2, category: 'cover', description: 'Target is prone (ranged)' },
	prone_melee: { name: 'Prone Target (Melee)', modifier: 2, category: 'cover', description: 'Target is prone (melee)' },

	// Position
	attacker_prone: { name: 'Attacker Prone', modifier: -2, category: 'position', description: 'Attacker is prone' },
	attacker_running: { name: 'Attacker Running', modifier: -2, category: 'position', description: 'Attacker is running' },
	off_hand: { name: 'Off-Hand Weapon', modifier: -2, category: 'position', description: 'Using off-hand weapon' },
	two_weapons: { name: 'Two Weapons', modifier: -2, category: 'position', description: 'Attacking with two weapons' },
	touch_attack: { name: 'Touch Attack', modifier: 2, category: 'position', description: 'Only need to touch target' },
	superior_position: { name: 'Superior Position', modifier: 2, category: 'position', description: 'Higher ground or flanking' },
	friend_in_melee: { name: 'Friend in Melee', modifier: -2, category: 'position', description: 'Shooting into melee' },
};

/** Called shot definitions. */
export interface CalledShot {
	/** Called shot name. */
	name: string;
	/** Dice pool modifier (always negative). */
	modifier: number;
	/** Effect description. */
	effect: string;
	/** Requires specific weapon type. */
	requiresRanged?: boolean;
	/** Requires specific weapon type. */
	requiresMelee?: boolean;
}

/** Standard SR4 called shots. */
export const CALLED_SHOTS: Record<string, CalledShot> = {
	vitals: { name: 'Vitals', modifier: -4, effect: '+2 DV if attack hits' },
	head: { name: 'Head', modifier: -4, effect: '+2 DV, target may be knocked unconscious' },
	disarm: { name: 'Disarm', modifier: -4, effect: 'Target drops held item', requiresMelee: true },
	knock_down: { name: 'Knock Down', modifier: -4, effect: 'Target makes Body test or falls prone', requiresMelee: true },
	limb: { name: 'Specific Limb', modifier: -4, effect: 'Damage to specific limb' },
	shooting_hand: { name: 'Shooting Hand', modifier: -4, effect: 'Target cannot use weapon', requiresRanged: true },
	engine_block: { name: 'Engine Block', modifier: -4, effect: 'Disable vehicle', requiresRanged: true },
	tire: { name: 'Tire', modifier: -4, effect: 'Vehicle loses tire', requiresRanged: true },
	weak_point: { name: 'Weak Point', modifier: -6, effect: 'Ignore armor' },
	called_shot_simple: { name: 'Called Shot (Simple)', modifier: -2, effect: 'Hit specific location' },
};

/**
 * Calculate total combat modifier from selected modifiers.
 * @param selectedModifiers - Array of modifier keys from COMBAT_MODIFIERS.
 * @param calledShot - Optional called shot key.
 * @returns Total modifier.
 */
export function calculateCombatModifier(selectedModifiers: string[], calledShot?: string): number {
	let total = 0;

	for (const modKey of selectedModifiers) {
		const mod = COMBAT_MODIFIERS[modKey];
		if (mod) {
			total += mod.modifier;
		}
	}

	if (calledShot) {
		const shot = CALLED_SHOTS[calledShot];
		if (shot) {
			total += shot.modifier;
		}
	}

	return total;
}

/**
 * Check if suppressive fire is available for a weapon.
 * Requires FA or BF mode and at least 20 rounds.
 * @param modes - Weapon's firing modes.
 * @param currentAmmo - Current ammo count.
 * @returns Whether suppressive fire is available.
 */
export function canSuppressiveFire(modes: FiringMode[], currentAmmo: number): boolean {
	const hasAutoMode = modes.some(m => m.code === 'FA' || m.code === 'BF' || m.code === 'LB');
	return hasAutoMode && currentAmmo >= 20;
}

/**
 * Get suppressive fire details.
 * Suppressive fire uses 20 rounds and forces targets to make REA + EDGE test.
 * If they fail, they take the weapon's base damage.
 * @param weaponDamage - Weapon's damage string.
 * @returns Suppressive fire info.
 */
export function getSuppressiveFireInfo(weaponDamage: string): { damage: string; threshold: number; description: string } {
	const parsed = parseDamage(weaponDamage);
	return {
		damage: weaponDamage,
		threshold: 3, // Standard threshold to avoid suppressive fire damage
		description: `Targets in zone must make REA + EDGE (${3}) test or take ${parsed.value}${parsed.type} damage`
	};
}

/* ============================================
 * Matrix / Hacking
 * ============================================ */

/** Matrix action types in SR4. */
export type MatrixActionType =
	| 'analyze'
	| 'browse'
	| 'command'
	| 'crash_program'
	| 'data_search'
	| 'decrypt'
	| 'disarm'
	| 'edit'
	| 'encrypt'
	| 'exploit'
	| 'hack_on_the_fly'
	| 'brute_force'
	| 'intercept_traffic'
	| 'jack_out'
	| 'jam_signals'
	| 'matrix_perception'
	| 'redirect_trace'
	| 'spoof_command'
	| 'trace_user';

/** Matrix action definition. */
export interface MatrixAction {
	/** Action name. */
	name: string;
	/** Primary skill used. */
	skill: string;
	/** Primary attribute used. */
	attribute: 'log' | 'int' | 'cha' | 'res';
	/** Program that assists (if any). */
	program?: string;
	/** Whether program rating adds to pool. */
	addProgram?: boolean;
	/** Description of the action. */
	description: string;
	/** Threshold (if opposed, set to 0). */
	threshold: number;
	/** Whether this is an opposed test. */
	opposed: boolean;
	/** What opposes this test. */
	opposedBy?: string;
}

/** Standard SR4 Matrix actions. */
export const MATRIX_ACTIONS: Record<MatrixActionType, MatrixAction> = {
	analyze: {
		name: 'Analyze',
		skill: 'Computer',
		attribute: 'log',
		program: 'Analyze',
		addProgram: true,
		description: 'Examine icon for information',
		threshold: 0,
		opposed: true,
		opposedBy: 'System + Stealth'
	},
	browse: {
		name: 'Browse',
		skill: 'Data Search',
		attribute: 'log',
		program: 'Browse',
		addProgram: true,
		description: 'Search for information in a node',
		threshold: 1,
		opposed: false
	},
	command: {
		name: 'Command',
		skill: 'Computer',
		attribute: 'log',
		program: 'Command',
		addProgram: true,
		description: 'Issue command to device/agent',
		threshold: 1,
		opposed: false
	},
	crash_program: {
		name: 'Crash Program',
		skill: 'Cybercombat',
		attribute: 'log',
		program: 'Attack',
		addProgram: true,
		description: 'Crash a running program',
		threshold: 0,
		opposed: true,
		opposedBy: 'System + program rating'
	},
	data_search: {
		name: 'Data Search',
		skill: 'Data Search',
		attribute: 'log',
		program: 'Browse',
		addProgram: true,
		description: 'Search the Matrix for data',
		threshold: 1,
		opposed: false
	},
	decrypt: {
		name: 'Decrypt',
		skill: 'Electronic Warfare',
		attribute: 'log',
		program: 'Decrypt',
		addProgram: true,
		description: 'Decrypt encrypted data',
		threshold: 0,
		opposed: true,
		opposedBy: 'Encryption rating x 2'
	},
	disarm: {
		name: 'Disarm',
		skill: 'Hacking',
		attribute: 'log',
		program: 'Disarm',
		addProgram: true,
		description: 'Disarm a data bomb',
		threshold: 0,
		opposed: true,
		opposedBy: 'Data bomb rating x 2'
	},
	edit: {
		name: 'Edit',
		skill: 'Computer',
		attribute: 'log',
		program: 'Edit',
		addProgram: true,
		description: 'Edit file or data',
		threshold: 0,
		opposed: false
	},
	encrypt: {
		name: 'Encrypt',
		skill: 'Electronic Warfare',
		attribute: 'log',
		program: 'Encrypt',
		addProgram: true,
		description: 'Encrypt data or communications',
		threshold: 0,
		opposed: false
	},
	exploit: {
		name: 'Exploit',
		skill: 'Hacking',
		attribute: 'log',
		program: 'Exploit',
		addProgram: true,
		description: 'Exploit vulnerability to gain access',
		threshold: 0,
		opposed: true,
		opposedBy: 'Firewall + Analyze'
	},
	hack_on_the_fly: {
		name: 'Hack on the Fly',
		skill: 'Hacking',
		attribute: 'log',
		program: 'Exploit',
		addProgram: true,
		description: 'Gain access quietly without triggering alert',
		threshold: 0,
		opposed: true,
		opposedBy: 'Firewall + Analyze'
	},
	brute_force: {
		name: 'Brute Force',
		skill: 'Cybercombat',
		attribute: 'log',
		program: 'Attack',
		addProgram: true,
		description: 'Force your way in (triggers alert)',
		threshold: 0,
		opposed: true,
		opposedBy: 'Firewall + Response'
	},
	intercept_traffic: {
		name: 'Intercept Traffic',
		skill: 'Electronic Warfare',
		attribute: 'int',
		program: 'Sniffer',
		addProgram: true,
		description: 'Intercept data traffic',
		threshold: 0,
		opposed: true,
		opposedBy: 'Signal + Encryption'
	},
	jack_out: {
		name: 'Jack Out',
		skill: 'Computer',
		attribute: 'log',
		description: 'Emergency disconnect from VR',
		threshold: 1,
		opposed: false
	},
	jam_signals: {
		name: 'Jam Signals',
		skill: 'Electronic Warfare',
		attribute: 'log',
		program: 'ECCM',
		addProgram: true,
		description: 'Jam wireless signals in area',
		threshold: 0,
		opposed: true,
		opposedBy: 'Signal + ECCM'
	},
	matrix_perception: {
		name: 'Matrix Perception',
		skill: 'Computer',
		attribute: 'int',
		program: 'Analyze',
		addProgram: true,
		description: 'Perceive Matrix environment',
		threshold: 1,
		opposed: false
	},
	redirect_trace: {
		name: 'Redirect Trace',
		skill: 'Hacking',
		attribute: 'log',
		program: 'Stealth',
		addProgram: true,
		description: 'Redirect a trace to another location',
		threshold: 0,
		opposed: true,
		opposedBy: 'Track program rating x 2'
	},
	spoof_command: {
		name: 'Spoof Command',
		skill: 'Hacking',
		attribute: 'log',
		program: 'Spoof',
		addProgram: true,
		description: 'Send fake command to device',
		threshold: 0,
		opposed: true,
		opposedBy: 'Pilot + Firewall'
	},
	trace_user: {
		name: 'Trace User',
		skill: 'Computer',
		attribute: 'log',
		program: 'Track',
		addProgram: true,
		description: 'Trace a user to physical location',
		threshold: 0,
		opposed: true,
		opposedBy: 'Hacking + Stealth'
	}
};

/** Common program types for hacking. */
export type HackingProgram =
	| 'Analyze'
	| 'Attack'
	| 'ECCM'
	| 'Exploit'
	| 'Stealth'
	| 'Armor'
	| 'Biofeedback Filter'
	| 'Black Hammer'
	| 'Blackout'
	| 'Browse'
	| 'Command'
	| 'Decrypt'
	| 'Defuse'
	| 'Disarm'
	| 'Edit'
	| 'Encrypt'
	| 'Medic'
	| 'Scan'
	| 'Sniffer'
	| 'Spoof'
	| 'Track';

/** Commlink attributes. */
export interface CommlinkStats {
	/** Response rating. */
	response: number;
	/** Signal rating. */
	signal: number;
	/** Firewall rating. */
	firewall: number;
	/** System rating. */
	system: number;
}

/** Program loaded on a commlink/nexus. */
export interface LoadedProgram {
	name: string;
	rating: number;
}

/**
 * Calculate Matrix dice pool for an action.
 * @param action - The Matrix action type.
 * @param skillRating - Character's skill rating.
 * @param attributeValue - Character's attribute value.
 * @param programRating - Program rating (if applicable).
 * @returns The dice pool.
 */
export function calculateMatrixPool(
	action: MatrixActionType,
	skillRating: number,
	attributeValue: number,
	programRating?: number
): number {
	const actionDef = MATRIX_ACTIONS[action];
	if (!actionDef) return 0;

	let pool = skillRating + attributeValue;

	if (actionDef.addProgram && programRating) {
		pool += programRating;
	}

	return Math.max(0, pool);
}

/**
 * Calculate Matrix defense pool.
 * @param firewall - System firewall rating.
 * @param defenseProgram - Defense program rating (Analyze, etc.).
 * @param response - Response rating (for some tests).
 * @returns Defense pool.
 */
export function calculateMatrixDefense(
	firewall: number,
	defenseProgram: number = 0,
	response: number = 0
): number {
	// Most Matrix defense is Firewall + program
	return firewall + Math.max(defenseProgram, response);
}

/**
 * Calculate biofeedback damage from Black IC or hostile programs.
 * @param attackHits - Hits from the attack.
 * @param netHits - Net hits after defense.
 * @param isBlackIce - Whether this is Black IC (physical damage) or standard (stun).
 * @returns Damage amount and type.
 */
export function calculateBiofeedbackDamage(
	attackHits: number,
	netHits: number,
	isBlackIce: boolean = false
): { damage: number; type: 'P' | 'S' } {
	return {
		damage: Math.max(0, netHits),
		type: isBlackIce ? 'P' : 'S'
	};
}

/* ============================================
 * Technomancer Actions
 * ============================================ */

/** Technomancer sprite types. */
export type SpriteType =
	| 'Courier'
	| 'Crack'
	| 'Data'
	| 'Fault'
	| 'Machine'
	| 'Paladin'
	| 'Probe';

/** Sprite ability definition. */
export interface SpriteAbility {
	name: string;
	description: string;
}

/** Sprite type definitions with their abilities. */
export const SPRITE_TYPES: Record<SpriteType, { name: string; abilities: SpriteAbility[] }> = {
	Courier: {
		name: 'Courier Sprite',
		abilities: [
			{ name: 'Cookie', description: 'Mark target for tracking' },
			{ name: 'Hash', description: 'Improved encryption' }
		]
	},
	Crack: {
		name: 'Crack Sprite',
		abilities: [
			{ name: 'Suppress Alert', description: 'Prevent alert escalation' },
			{ name: 'Suppress Trace', description: 'Hide from traces' }
		]
	},
	Data: {
		name: 'Data Sprite',
		abilities: [
			{ name: 'Browse', description: 'Enhanced data search' },
			{ name: 'Code Block', description: 'Prevent specific program' }
		]
	},
	Fault: {
		name: 'Fault Sprite',
		abilities: [
			{ name: 'Crash', description: 'Crash programs' },
			{ name: 'Spoof', description: 'Fake commands' }
		]
	},
	Machine: {
		name: 'Machine Sprite',
		abilities: [
			{ name: 'Diagnostics', description: 'Repair/diagnose devices' },
			{ name: 'Gremlins', description: 'Cause malfunctions' }
		]
	},
	Paladin: {
		name: 'Paladin Sprite',
		abilities: [
			{ name: 'Guard', description: 'Protect from attacks' },
			{ name: 'Shield', description: 'Extra Matrix armor' }
		]
	},
	Probe: {
		name: 'Probe Sprite',
		abilities: [
			{ name: 'Analyze', description: 'Enhanced analysis' },
			{ name: 'Scan', description: 'Detect hidden icons' }
		]
	}
};

/**
 * Calculate threading pool for a technomancer.
 * Threading = Resonance + skill (usually Software or Compiling).
 * @param resonance - Technomancer's Resonance attribute.
 * @param skillRating - Relevant skill rating.
 * @returns Threading dice pool.
 */
export function calculateThreadingPool(resonance: number, skillRating: number): number {
	return Math.max(0, resonance + skillRating);
}

/**
 * Calculate fading damage from threading or sprite compilation.
 * Fading Value = (Rating x 2) - Resonance, minimum 1.
 * @param rating - Rating of complex form or sprite.
 * @param resonance - Technomancer's Resonance attribute.
 * @returns Fading value (number of hits to resist).
 */
export function calculateFadingValue(rating: number, resonance: number): number {
	const fading = (rating * 2) - resonance;
	return Math.max(1, fading);
}

/**
 * Calculate fading resistance pool.
 * Technomancers resist fading with Resonance + Willpower.
 * @param resonance - Technomancer's Resonance attribute.
 * @param willpower - Technomancer's Willpower attribute.
 * @returns Fading resistance pool.
 */
export function calculateFadingResistance(resonance: number, willpower: number): number {
	return Math.max(0, resonance + willpower);
}

/**
 * Check if fading damage is physical or stun.
 * Physical if Fading Value > Resonance.
 * @param fadingValue - The fading value.
 * @param resonance - Technomancer's Resonance attribute.
 * @returns Whether fading is physical.
 */
export function isFadingPhysical(fadingValue: number, resonance: number): boolean {
	return fadingValue > resonance;
}

/**
 * Calculate sprite compilation pool.
 * Compiling = Resonance + Compiling skill.
 * @param resonance - Technomancer's Resonance attribute.
 * @param compilingSkill - Compiling skill rating.
 * @returns Compilation dice pool.
 */
export function calculateCompilingSpritePool(resonance: number, compilingSkill: number): number {
	return Math.max(0, resonance + compilingSkill);
}

/**
 * Calculate sprite's resistance to compilation.
 * Sprite resists with Rating x 2.
 * @param spriteRating - Desired sprite rating.
 * @returns Sprite's resistance pool.
 */
export function calculateSpriteResistance(spriteRating: number): number {
	return spriteRating * 2;
}

/**
 * Calculate number of tasks a compiled sprite will perform.
 * Tasks = Net hits from compilation test.
 * @param compilationHits - Technomancer's hits.
 * @param spriteHits - Sprite's resistance hits.
 * @returns Number of tasks (0 if failed).
 */
export function calculateSpriteTasks(compilationHits: number, spriteHits: number): number {
	return Math.max(0, compilationHits - spriteHits);
}

/**
 * Calculate sprite registration pool.
 * Registering = Resonance + Registering skill.
 * @param resonance - Technomancer's Resonance attribute.
 * @param registeringSkill - Registering skill rating.
 * @returns Registration dice pool.
 */
export function calculateRegisteringSpritePool(resonance: number, registeringSkill: number): number {
	return Math.max(0, resonance + registeringSkill);
}

/* ============================================
 * Vehicle Combat
 * ============================================ */

/** Vehicle attribute stats. */
export interface VehicleStats {
	/** Handling modifier for vehicle tests. */
	handling: number;
	/** Acceleration rating. */
	acceleration: number;
	/** Maximum speed. */
	speed: number;
	/** Autopilot rating. */
	pilot: number;
	/** Body (structure). */
	body: number;
	/** Armor rating. */
	armor: number;
	/** Sensor rating. */
	sensor: number;
}

/** Vehicle test types. */
export type VehicleTestType =
	| 'control_vehicle'
	| 'crash_test'
	| 'catch_up'
	| 'cut_off'
	| 'ram'
	| 'stunt';

/** Vehicle test definition. */
export interface VehicleTest {
	name: string;
	skill: string;
	description: string;
	opposed: boolean;
	opposedBy?: string;
}

/** Standard SR4 vehicle tests. */
export const VEHICLE_TESTS: Record<VehicleTestType, VehicleTest> = {
	control_vehicle: {
		name: 'Control Vehicle',
		skill: 'Pilot',
		description: 'Maintain control of the vehicle',
		opposed: false
	},
	crash_test: {
		name: 'Crash Test',
		skill: 'Pilot',
		description: 'Avoid losing control after damage',
		opposed: false
	},
	catch_up: {
		name: 'Catch Up/Break Away',
		skill: 'Pilot',
		description: 'Gain or lose ground in a chase',
		opposed: true,
		opposedBy: 'Pilot + Reaction'
	},
	cut_off: {
		name: 'Cut Off',
		skill: 'Pilot',
		description: 'Block another vehicle\'s path',
		opposed: true,
		opposedBy: 'Pilot + Reaction'
	},
	ram: {
		name: 'Ram',
		skill: 'Pilot',
		description: 'Intentionally collide with target',
		opposed: true,
		opposedBy: 'Pilot + Reaction'
	},
	stunt: {
		name: 'Stunt',
		skill: 'Pilot',
		description: 'Perform a difficult maneuver',
		opposed: false
	}
};

/** Vehicle speed categories and their modifiers. */
export const VEHICLE_SPEED_MODIFIERS: Record<string, { name: string; modifier: number; description: string }> = {
	idle: { name: 'Idle', modifier: 0, description: '0-10% of Speed' },
	slow: { name: 'Slow', modifier: 0, description: '11-25% of Speed' },
	cruising: { name: 'Cruising', modifier: -1, description: '26-50% of Speed' },
	fast: { name: 'Fast', modifier: -3, description: '51-75% of Speed' },
	very_fast: { name: 'Very Fast', modifier: -6, description: '76-100% of Speed' },
	exceeding: { name: 'Exceeding Speed', modifier: -9, description: 'Over maximum speed (dangerous!)' }
};

/** Terrain modifiers for vehicle tests. */
export const VEHICLE_TERRAIN_MODIFIERS: Record<string, { name: string; modifier: number }> = {
	paved: { name: 'Paved Road', modifier: 0 },
	gravel: { name: 'Gravel/Dirt Road', modifier: -1 },
	light_debris: { name: 'Light Debris', modifier: -2 },
	heavy_debris: { name: 'Heavy Debris', modifier: -4 },
	off_road: { name: 'Off-Road', modifier: -3 },
	water: { name: 'Shallow Water', modifier: -2 },
	ice: { name: 'Ice/Snow', modifier: -4 },
	tight_space: { name: 'Tight Space', modifier: -2 }
};

/**
 * Calculate vehicle control pool.
 * Vehicle Control = Pilot skill + Reaction + Handling.
 * @param pilotSkill - Character's pilot skill.
 * @param reaction - Character's Reaction attribute.
 * @param handling - Vehicle's handling modifier.
 * @returns Vehicle control dice pool.
 */
export function calculateVehicleControlPool(
	pilotSkill: number,
	reaction: number,
	handling: number
): number {
	return Math.max(0, pilotSkill + reaction + handling);
}

/**
 * Calculate mounted weapon attack pool (Gunnery).
 * Gunnery = Gunnery skill + Agility (or Sensor for remotely operated).
 * @param gunnerySkill - Character's Gunnery skill.
 * @param attribute - Agility (manual) or Sensor (remote).
 * @param targetingSystem - Targeting system bonus (if any).
 * @returns Gunnery dice pool.
 */
export function calculateGunneryPool(
	gunnerySkill: number,
	attribute: number,
	targetingSystem: number = 0
): number {
	return Math.max(0, gunnerySkill + attribute + targetingSystem);
}

/**
 * Calculate vehicle ramming damage.
 * Damage = (Speed + Body) / 2 (round down).
 * Both vehicles take damage on a ram.
 * @param speed - Vehicle's current speed (as percentage of max, 1-100).
 * @param body - Vehicle's Body rating.
 * @returns Ramming damage DV.
 */
export function calculateRammingDamage(speed: number, body: number): number {
	// Speed is percentage, body is the attribute
	// Damage scales with speed: at 100%, full speed + body / 2
	const effectiveSpeed = Math.floor(speed / 10);
	return Math.floor((effectiveSpeed + body) / 2);
}

/**
 * Calculate vehicle crash damage.
 * Crash = Body + (Speed modifier).
 * @param body - Vehicle's Body rating.
 * @param speedCategory - Current speed category.
 * @returns Crash damage DV.
 */
export function calculateCrashDamage(body: number, speedCategory: string): number {
	const speedMods: Record<string, number> = {
		idle: 0,
		slow: 2,
		cruising: 4,
		fast: 6,
		very_fast: 8,
		exceeding: 12
	};
	const speedMod = speedMods[speedCategory] ?? 0;
	return body + speedMod;
}

/**
 * Calculate vehicle chase modifiers.
 * @param speedModifiers - Array of speed modifier keys.
 * @param terrainModifiers - Array of terrain modifier keys.
 * @returns Total modifier.
 */
export function calculateVehicleModifiers(
	speedModifiers: string[],
	terrainModifiers: string[]
): number {
	let total = 0;

	for (const mod of speedModifiers) {
		const speedMod = VEHICLE_SPEED_MODIFIERS[mod];
		if (speedMod) {
			total += speedMod.modifier;
		}
	}

	for (const mod of terrainModifiers) {
		const terrainMod = VEHICLE_TERRAIN_MODIFIERS[mod];
		if (terrainMod) {
			total += terrainMod.modifier;
		}
	}

	return total;
}

/**
 * Calculate autopilot pool for rigged vehicles.
 * Autopilot = Pilot (rating) + relevant skill autosoft.
 * @param pilotRating - Vehicle's Pilot rating.
 * @param autosoftRating - Relevant autosoft rating.
 * @returns Autopilot dice pool.
 */
export function calculateAutopilotPool(pilotRating: number, autosoftRating: number): number {
	return Math.max(0, pilotRating + autosoftRating);
}

/**
 * Calculate VCR (Vehicle Control Rig) bonus.
 * VCR adds to all vehicle tests.
 * @param vcrRating - VCR rating (1-3).
 * @returns VCR bonus to dice pool.
 */
export function getVCRBonus(vcrRating: number): number {
	return Math.min(3, Math.max(0, vcrRating));
}

/**
 * Calculate sensor targeting pool.
 * For sensor-guided attacks.
 * @param sensorRating - Vehicle's sensor rating.
 * @param targetingAutosoft - Targeting autosoft rating.
 * @returns Sensor targeting pool.
 */
export function calculateSensorTargetingPool(
	sensorRating: number,
	targetingAutosoft: number
): number {
	return Math.max(0, sensorRating + targetingAutosoft);
}

/* ============================================
 * Astral Combat & Magic
 * ============================================ */

/** Spirit types in SR4. */
export type SpiritType =
	| 'Air'
	| 'Beasts'
	| 'Earth'
	| 'Fire'
	| 'Guardian'
	| 'Guidance'
	| 'Man'
	| 'Plant'
	| 'Task'
	| 'Water';

/** Astral combat action types. */
export type AstralActionType =
	| 'astral_perception'
	| 'astral_attack'
	| 'mana_bolt'
	| 'astral_tracking'
	| 'assensing'
	| 'banishing'
	| 'binding'
	| 'summoning'
	| 'counterspelling'
	| 'dispelling';

/** Astral action definition. */
export interface AstralAction {
	name: string;
	skill: string;
	attribute: 'mag' | 'wil' | 'int' | 'cha';
	description: string;
	opposed: boolean;
	opposedBy?: string;
}

/** Standard SR4 astral actions. */
export const ASTRAL_ACTIONS: Record<AstralActionType, AstralAction> = {
	astral_perception: {
		name: 'Astral Perception',
		skill: 'Assensing',
		attribute: 'int',
		description: 'Perceive the astral plane while in physical body',
		opposed: false
	},
	astral_attack: {
		name: 'Astral Attack',
		skill: 'Astral Combat',
		attribute: 'wil',
		description: 'Attack in astral combat',
		opposed: true,
		opposedBy: 'Willpower + Intuition'
	},
	mana_bolt: {
		name: 'Mana Bolt/Spell',
		skill: 'Spellcasting',
		attribute: 'mag',
		description: 'Cast a mana-based combat spell in astral',
		opposed: true,
		opposedBy: 'Willpower'
	},
	astral_tracking: {
		name: 'Astral Tracking',
		skill: 'Assensing',
		attribute: 'int',
		description: 'Track an astral signature',
		opposed: true,
		opposedBy: 'Willpower (of signature)'
	},
	assensing: {
		name: 'Assensing',
		skill: 'Assensing',
		attribute: 'int',
		description: 'Read auras and astral forms',
		opposed: false
	},
	banishing: {
		name: 'Banishing',
		skill: 'Banishing',
		attribute: 'mag',
		description: 'Dismiss a spirit',
		opposed: true,
		opposedBy: 'Spirit Force x 2'
	},
	binding: {
		name: 'Binding',
		skill: 'Binding',
		attribute: 'mag',
		description: 'Bind a summoned spirit',
		opposed: true,
		opposedBy: 'Spirit Force x 2'
	},
	summoning: {
		name: 'Summoning',
		skill: 'Summoning',
		attribute: 'mag',
		description: 'Summon a spirit',
		opposed: true,
		opposedBy: 'Spirit Force x 2'
	},
	counterspelling: {
		name: 'Counterspelling',
		skill: 'Counterspelling',
		attribute: 'mag',
		description: 'Counter or dispel enemy spells',
		opposed: true,
		opposedBy: 'Spellcasting + Magic'
	},
	dispelling: {
		name: 'Dispelling',
		skill: 'Counterspelling',
		attribute: 'mag',
		description: 'Dispel a sustained spell',
		opposed: true,
		opposedBy: 'Force x 2'
	}
};

/** Tradition definitions for drain attribute. */
export const MAGIC_TRADITIONS: Record<string, { name: string; drainAttribute: 'wil' | 'cha' | 'log' | 'int' }> = {
	hermetic: { name: 'Hermetic', drainAttribute: 'log' },
	shamanic: { name: 'Shamanic', drainAttribute: 'cha' },
	buddhist: { name: 'Buddhist', drainAttribute: 'wil' },
	druidic: { name: 'Druidic', drainAttribute: 'cha' },
	norse: { name: 'Norse', drainAttribute: 'wil' },
	wuxia: { name: 'Wuxing', drainAttribute: 'int' },
	zoroastrian: { name: 'Zoroastrian', drainAttribute: 'wil' },
	christian_theurgy: { name: 'Christian Theurgy', drainAttribute: 'cha' },
	black_magic: { name: 'Black Magic', drainAttribute: 'wil' },
	voodoo: { name: 'Voodoo', drainAttribute: 'cha' },
	shinto: { name: 'Shinto', drainAttribute: 'int' },
	islamic: { name: 'Islamic', drainAttribute: 'wil' }
};

/**
 * Calculate astral combat attack pool.
 * Astral Attack = Willpower + Astral Combat.
 * @param willpower - Character's Willpower.
 * @param astralCombat - Astral Combat skill rating.
 * @returns Attack dice pool.
 */
export function calculateAstralAttackPool(willpower: number, astralCombat: number): number {
	return Math.max(0, willpower + astralCombat);
}

/**
 * Calculate astral combat defense pool.
 * Astral Defense = Willpower + Intuition.
 * @param willpower - Character's Willpower.
 * @param intuition - Character's Intuition.
 * @returns Defense dice pool.
 */
export function calculateAstralDefensePool(willpower: number, intuition: number): number {
	return Math.max(0, willpower + intuition);
}

/**
 * Calculate assensing pool.
 * Assensing = Assensing + Intuition.
 * @param assensingSkill - Assensing skill rating.
 * @param intuition - Character's Intuition.
 * @returns Assensing dice pool.
 */
export function calculateAssensingPool(assensingSkill: number, intuition: number): number {
	return Math.max(0, assensingSkill + intuition);
}

/**
 * Calculate summoning pool.
 * Summoning = Summoning + Magic.
 * @param summoningSkill - Summoning skill rating.
 * @param magic - Character's Magic attribute.
 * @returns Summoning dice pool.
 */
export function calculateSummoningPool(summoningSkill: number, magic: number): number {
	return Math.max(0, summoningSkill + magic);
}

/**
 * Calculate spirit's resistance pool.
 * Spirit resists with Force x 2.
 * @param force - Spirit's Force rating.
 * @returns Spirit resistance pool.
 */
export function calculateSpiritResistance(force: number): number {
	return force * 2;
}

/**
 * Calculate services owed by a summoned spirit.
 * Services = Net hits from summoning test.
 * @param summonerHits - Summoner's hits.
 * @param spiritHits - Spirit's resistance hits.
 * @returns Number of services (0 if failed).
 */
export function calculateSpiritServices(summonerHits: number, spiritHits: number): number {
	return Math.max(0, summonerHits - spiritHits);
}

/**
 * Calculate drain value for summoning/binding.
 * Drain = Spirit's Force (hits), resist with Willpower + Charisma/Logic.
 * @param spiritForce - Spirit's Force rating.
 * @param spiritHits - Spirit's hits in the opposed test.
 * @returns Drain value (number of boxes).
 */
export function calculateSummoningDrain(spiritForce: number, spiritHits: number): number {
	// Drain equals the spirit's hits (minimum 2 for summoning)
	return Math.max(2, spiritHits);
}

/**
 * Calculate drain resistance pool.
 * Drain Resist = Willpower + tradition attribute.
 * @param willpower - Character's Willpower.
 * @param traditionAttribute - Charisma (Shaman) or Logic (Hermetic), etc.
 * @returns Drain resistance pool.
 */
export function calculateDrainResistancePool(willpower: number, traditionAttribute: number): number {
	return Math.max(0, willpower + traditionAttribute);
}

/**
 * Check if drain is physical or stun.
 * Physical if Drain Value > Magic rating.
 * @param drainValue - The drain value.
 * @param magic - Character's Magic attribute.
 * @returns Whether drain is physical.
 */
export function isDrainPhysical(drainValue: number, magic: number): boolean {
	return drainValue > magic;
}

/**
 * Calculate counterspelling dice pool.
 * Counterspelling = Counterspelling + Magic.
 * @param counterspellingSkill - Counterspelling skill rating.
 * @param magic - Character's Magic attribute.
 * @returns Counterspelling dice pool.
 */
export function calculateCounterspellingPool(counterspellingSkill: number, magic: number): number {
	return Math.max(0, counterspellingSkill + magic);
}

/**
 * Calculate spell defense dice added to allies.
 * A magician can add their Counterspelling dice to defense tests.
 * @param counterspellingSkill - Counterspelling skill rating.
 * @param numProtected - Number of people being protected (including self).
 * @returns Dice each protected person gets (split pool).
 */
export function calculateSpellDefenseDice(counterspellingSkill: number, numProtected: number): number {
	if (numProtected <= 0) return 0;
	return Math.floor(counterspellingSkill / numProtected);
}

/**
 * Calculate banishing pool.
 * Banishing = Banishing + Magic.
 * @param banishingSkill - Banishing skill rating.
 * @param magic - Character's Magic attribute.
 * @returns Banishing dice pool.
 */
export function calculateBanishingPool(banishingSkill: number, magic: number): number {
	return Math.max(0, banishingSkill + magic);
}

/**
 * Calculate binding pool.
 * Binding = Binding + Magic.
 * @param bindingSkill - Binding skill rating.
 * @param magic - Character's Magic attribute.
 * @returns Binding dice pool.
 */
export function calculateBindingPool(bindingSkill: number, magic: number): number {
	return Math.max(0, bindingSkill + magic);
}

/**
 * Calculate spellcasting pool.
 * Spellcasting = Spellcasting + Magic.
 * @param spellcastingSkill - Spellcasting skill rating.
 * @param magic - Character's Magic attribute.
 * @returns Spellcasting dice pool.
 */
export function calculateSpellcastingPool(spellcastingSkill: number, magic: number): number {
	return Math.max(0, spellcastingSkill + magic);
}

/**
 * Calculate spell resistance pool.
 * Spell Resistance = Willpower (+ Counterspelling if available).
 * @param willpower - Target's Willpower.
 * @param counterspellingDice - Additional dice from counterspelling protection.
 * @returns Spell resistance pool.
 */
export function calculateSpellResistancePool(willpower: number, counterspellingDice: number = 0): number {
	return Math.max(0, willpower + counterspellingDice);
}

/**
 * Calculate the drain value for a spell based on Force.
 * Uses the spell's drain formula (e.g., "(F/2)+2" for a typical combat spell).
 * @param force - Spell Force used.
 * @param drainMod - Drain modifier from spell (e.g., +2, -1).
 * @param divideForce - Whether to divide Force by 2 (most spells).
 * @returns Drain value.
 */
export function calculateSpellDrain(force: number, drainMod: number, divideForce: boolean = true): number {
	const baseValue = divideForce ? Math.floor(force / 2) : force;
	return Math.max(1, baseValue + drainMod);
}

/* ============================================
 * Armor Stacking
 * ============================================ */

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

/* ============================================
 * Initiative Modifiers
 * ============================================ */

/** Cyberware that modifies initiative. */
export interface InitiativeModifier {
	/** Name of the cyberware/power. */
	name: string;
	/** Rating of the cyberware (if applicable). */
	rating: number;
}

/** Result of initiative modifier calculation. */
export interface InitiativeModResult {
	/** Bonus to initiative score (REA + INT). */
	initiativeBonus: number;
	/** Bonus initiative dice. */
	initiativeDice: number;
	/** Sources of the bonuses. */
	sources: string[];
}

/**
 * Cyberware and bioware that provide initiative bonuses.
 * Maps name pattern to function that returns bonuses based on rating.
 */
const INITIATIVE_AUGMENTATIONS: Record<string, (rating: number) => { initBonus: number; diceBonus: number }> = {
	'wired reflexes': (rating) => ({ initBonus: rating, diceBonus: rating }),
	'synaptic booster': (rating) => ({ initBonus: rating, diceBonus: rating }),
	'move-by-wire': (rating) => ({ initBonus: rating * 2, diceBonus: rating }),
	'boosted reflexes': () => ({ initBonus: 0, diceBonus: 1 }),
	'reaction enhancers': (rating) => ({ initBonus: rating, diceBonus: 0 }),
};

/**
 * Adept powers that provide initiative bonuses.
 */
const INITIATIVE_POWERS: Record<string, (level: number) => { initBonus: number; diceBonus: number }> = {
	'improved reflexes': (level) => ({ initBonus: level, diceBonus: level }),
};

/**
 * Calculate initiative modifiers from cyberware and adept powers.
 * @param cyberware - Array of installed cyberware with names and ratings.
 * @param powers - Array of adept powers with names and levels.
 * @returns Initiative bonuses and sources.
 */
export function calculateInitiativeModifiers(
	cyberware: InitiativeModifier[],
	powers: InitiativeModifier[] = []
): InitiativeModResult {
	let initiativeBonus = 0;
	let initiativeDice = 0;
	const sources: string[] = [];

	// Check cyberware
	for (const cyber of cyberware) {
		const lowerName = cyber.name.toLowerCase();
		for (const [pattern, calcFn] of Object.entries(INITIATIVE_AUGMENTATIONS)) {
			if (lowerName.includes(pattern)) {
				const bonuses = calcFn(cyber.rating || 1);
				if (bonuses.initBonus > 0 || bonuses.diceBonus > 0) {
					initiativeBonus += bonuses.initBonus;
					initiativeDice += bonuses.diceBonus;
					sources.push(`${cyber.name}${bonuses.initBonus > 0 ? ` (+${bonuses.initBonus} Init)` : ''}${bonuses.diceBonus > 0 ? ` (+${bonuses.diceBonus}d6)` : ''}`);
				}
				break;
			}
		}
	}

	// Check adept powers
	for (const power of powers) {
		const lowerName = power.name.toLowerCase();
		for (const [pattern, calcFn] of Object.entries(INITIATIVE_POWERS)) {
			if (lowerName.includes(pattern)) {
				const bonuses = calcFn(power.rating || 1);
				if (bonuses.initBonus > 0 || bonuses.diceBonus > 0) {
					initiativeBonus += bonuses.initBonus;
					initiativeDice += bonuses.diceBonus;
					sources.push(`${power.name}${bonuses.initBonus > 0 ? ` (+${bonuses.initBonus} Init)` : ''}${bonuses.diceBonus > 0 ? ` (+${bonuses.diceBonus}d6)` : ''}`);
				}
				break;
			}
		}
	}

	return {
		initiativeBonus,
		initiativeDice,
		sources
	};
}

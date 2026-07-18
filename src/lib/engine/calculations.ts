/**
 * Calculations Engine
 * ===================
 * Computes derived values for SR4 characters including:
 * - Condition monitors (physical/stun)
 * - Limits (physical/mental/social)
 * - Initiative and movement
 * - Dice pools for common tests
 */

import type { Character, CharacterSkill } from '$types';
import { valueOf } from './improvementManager';

/* ============================================
 * Attribute Helpers
 * ============================================ */

/** Attribute keys that carry metatype-defined limits (attributeLimits). */
type LimitedAttributeKey = 'bod' | 'agi' | 'rea' | 'str' | 'cha' | 'int' | 'log' | 'wil' | 'edg' | 'mag' | 'res';

/** Natural maximum including improvements (metatype max + Attribute 'max' modifiers, e.g. Exceptional Attribute). */
export function getAttributeNaturalMax(char: Character, attr: LimitedAttributeKey): number {
	const limits = char.attributeLimits[attr];
	const baseMax = limits ? limits.max : 0;
	return baseMax + valueOf(char.improvements, 'Attribute', attr, 'max');
}

/**
 * Augmented maximum: the metatype-provided cap (attributeLimits[attr].aug),
 * plus 'augMax' improvements. NOT a universal floor(max x 1.5) formula —
 * Edge/Magic/Resonance/Essence have no augmentation multiplier in SR4
 * (their aug equals their natural max), and several metatypes (Naga,
 * Pixie, Free Spirit, some Shapeshifters, A.I.) carry non-standard
 * multipliers on specific attributes. Verified against every metatype in
 * static/data/metatypes.json: only bod/agi/rea/str/cha/int/log/wil follow
 * floor(max*1.5) for most (not all) metatypes, so the shipped per-attribute
 * value is the source of truth, not a derived formula.
 */
export function getAttributeAugmentedMax(char: Character, attr: LimitedAttributeKey): number {
	const limits = char.attributeLimits[attr];
	const baseAugMax = limits ? limits.aug : 0;
	return baseAugMax + valueOf(char.improvements, 'Attribute', attr, 'augMax');
}

/** Get total attribute value (base + bonus), clamped to the augmented maximum. */
export function getAttributeTotal(
	char: Character,
	attr: 'bod' | 'agi' | 'rea' | 'str' | 'cha' | 'int' | 'log' | 'wil' | 'edg'
): number {
	const a = char.attributes[attr];
	const impBonus = valueOf(char.improvements, 'Attribute', attr);
	const total = a.base + a.bonus + impBonus;
	return Math.min(total, getAttributeAugmentedMax(char, attr));
}

/** Get Magic attribute total (0 if mundane), clamped to the augmented maximum. */
export function getMagicTotal(char: Character): number {
	const mag = char.attributes.mag;
	if (!mag) return 0;
	const impBonus = valueOf(char.improvements, 'Attribute', 'mag');
	const total = mag.base + mag.bonus + impBonus;
	return Math.min(total, getAttributeAugmentedMax(char, 'mag'));
}

/** Get Resonance attribute total (0 if not technomancer), clamped to the augmented maximum. */
export function getResonanceTotal(char: Character): number {
	const res = char.attributes.res;
	if (!res) return 0;
	const impBonus = valueOf(char.improvements, 'Attribute', 'res');
	const total = res.base + res.bonus + impBonus;
	return Math.min(total, getAttributeAugmentedMax(char, 'res'));
}

/** Get current Essence. */
export function getEssence(char: Character): number {
	return char.attributes.ess;
}

/* ============================================
 * Condition Monitors
 * ============================================ */

export function calculatePhysicalCM(char: Character): number {
	const bod = getAttributeTotal(char, 'bod');
	const bonus = valueOf(char.improvements, 'PhysicalCM');
	return Math.ceil(bod / 2) + 8 + bonus;
}

export function calculateStunCM(char: Character): number {
	const wil = getAttributeTotal(char, 'wil');
	const bonus = valueOf(char.improvements, 'StunCM');
	return Math.ceil(wil / 2) + 8 + bonus;
}

export function calculateOverflow(char: Character): number {
	const bonus = valueOf(char.improvements, 'PhysicalCM') + valueOf(char.improvements, 'CMOverflow');
	return getAttributeTotal(char, 'bod') + bonus;
}

/** Get wound modifier from damage. */
export function getWoundModifier(char: Character): number {
	// Every 3 boxes of damage = -1 modifier
	const physicalMod = Math.floor(char.condition.physicalCurrent / 3);
	const stunMod = Math.floor(char.condition.stunCurrent / 3);

	return -(physicalMod + stunMod);
}

/* ============================================
 * Initiative
 * ============================================ */

/** Calculate base Initiative score. */
export function calculateInitiative(char: Character): number {
	const rea = getAttributeTotal(char, 'rea');
	const int = getAttributeTotal(char, 'int');
	const impBonus = valueOf(char.improvements, 'Initiative');
	return rea + int + impBonus;
}

/**
 * Calculate number of Initiative Dice (base is 1).
 * Cyberware and adept-power initiative-pass sources (Wired Reflexes, Synaptic
 * Booster, Move-by-Wire, Improved Reflexes) all arrive via the InitiativePass
 * improvement (#62c wires equipment, #63b wires powers) — desktop hardcodes
 * uniqueName "initiativepass" on all of them so they never stack.
 */
export function calculateInitiativeDice(char: Character): number {
	let dice = 1;

	dice += valueOf(char.improvements, 'InitiativePass') || 0;
	dice += valueOf(char.improvements, 'InitiativePassAdd') || 0;

	return dice;
}

/* ============================================
 * Movement
 * ============================================ */

/** Calculate walking speed in meters/turn. */
export function calculateWalkSpeed(char: Character): number {
	const agi = getAttributeTotal(char, 'agi');
	return agi * 2;
}

/** Calculate running speed in meters/turn. */
export function calculateRunSpeed(char: Character): number {
	const agi = getAttributeTotal(char, 'agi');
	return agi * 4;
}

/** Calculate sprinting modifier. */
export function calculateSprintBonus(char: Character): number {
	// Base sprint adds +2m per hit on Running + STR
	// Some metatypes get bonuses
	const metatype = char.identity.metatype.toLowerCase();
	if (metatype.includes('elf')) return 1;
	if (metatype.includes('centaur')) return 2;
	return 0;
}

/* ============================================
 * Limits (SR4A optional rule / SR5 equivalent)
 * ============================================ */

/** Calculate Physical Limit. */
export function calculatePhysicalLimit(char: Character): number {
	const str = getAttributeTotal(char, 'str');
	const bod = getAttributeTotal(char, 'bod');
	const rea = getAttributeTotal(char, 'rea');
	return Math.ceil((str * 2 + bod + rea) / 3);
}

/** Calculate Mental Limit. */
export function calculateMentalLimit(char: Character): number {
	const log = getAttributeTotal(char, 'log');
	const int = getAttributeTotal(char, 'int');
	const wil = getAttributeTotal(char, 'wil');
	return Math.ceil((log * 2 + int + wil) / 3);
}

/** Calculate Social Limit. */
export function calculateSocialLimit(char: Character): number {
	const cha = getAttributeTotal(char, 'cha');
	const wil = getAttributeTotal(char, 'wil');
	const ess = getEssence(char);
	return Math.ceil((cha * 2 + wil + Math.floor(ess)) / 3);
}

/* ============================================
 * Dice Pools
 * ============================================ */

/** Find a skill by name. */
function findSkill(char: Character, skillName: string): CharacterSkill | undefined {
	return char.skills.find((s) => s.name.toLowerCase() === skillName.toLowerCase());
}

/** Calculate dice pool for a skill + attribute test. */
export function calculateDicePool(
	char: Character,
	skillName: string,
	attributeCode: 'bod' | 'agi' | 'rea' | 'str' | 'cha' | 'int' | 'log' | 'wil'
): number {
	const skill = findSkill(char, skillName);
	const attr = getAttributeTotal(char, attributeCode);

	if (!skill) {
		// Defaulting: attribute - 1 (if skill allows defaulting)
		return Math.max(0, attr - 1);
	}

	let pool = skill.rating + attr + skill.bonus;

	// Add wound modifier
	pool += getWoundModifier(char);

	return Math.max(0, pool);
}

export function calculateComposure(char: Character): number {
	return getAttributeTotal(char, 'cha') + getAttributeTotal(char, 'wil') + valueOf(char.improvements, 'Composure');
}

export function calculateJudgeIntentions(char: Character): number {
	return getAttributeTotal(char, 'cha') + getAttributeTotal(char, 'int') + valueOf(char.improvements, 'JudgeIntentions');
}

export function calculateMemory(char: Character): number {
	return getAttributeTotal(char, 'log') + getAttributeTotal(char, 'wil') + valueOf(char.improvements, 'Memory');
}

export function calculateLiftCarry(char: Character): number {
	return getAttributeTotal(char, 'bod') + getAttributeTotal(char, 'str') + valueOf(char.improvements, 'LiftAndCarry');
}

/* ============================================
 * Combat Values
 * ============================================ */

/** Calculate base Defense pool (REA + INT). */
export function calculateDefense(char: Character): number {
	return getAttributeTotal(char, 'rea') + getAttributeTotal(char, 'int');
}

/** Calculate Dodge pool (REA + Dodge skill). */
export function calculateDodge(char: Character): number {
	return calculateDicePool(char, 'Dodge', 'rea');
}

/** Calculate total armor value (ballistic). */
export function calculateArmorBallistic(char: Character): number {
	let total = 0;

	// Get highest equipped armor
	const equippedArmor = char.equipment.armor.filter((a) => a.equipped);
	if (equippedArmor.length > 0) {
		// Take highest ballistic
		total = Math.max(...equippedArmor.map((a) => a.ballistic));

		// Add layering if multiple (with penalties, simplified here)
		if (equippedArmor.length > 1) {
			const sorted = [...equippedArmor].sort((a, b) => b.ballistic - a.ballistic);
			for (let i = 1; i < sorted.length; i++) {
				total += Math.floor(sorted[i]!.ballistic / 2);
			}
		}
	}

	total += valueOf(char.improvements, 'BallisticArmor');

	return total;
}

/** Calculate total armor value (impact). */
export function calculateArmorImpact(char: Character): number {
	let total = 0;

	const equippedArmor = char.equipment.armor.filter((a) => a.equipped);
	if (equippedArmor.length > 0) {
		total = Math.max(...equippedArmor.map((a) => a.impact));

		if (equippedArmor.length > 1) {
			const sorted = [...equippedArmor].sort((a, b) => b.impact - a.impact);
			for (let i = 1; i < sorted.length; i++) {
				total += Math.floor(sorted[i]!.impact / 2);
			}
		}
	}

	total += valueOf(char.improvements, 'ImpactArmor');

	return total;
}

/** SR4 ballistic damage soak: BOD + ballistic armor + DamageResistance improvements (e.g. Toughness). */
export function calculateDamageSoakBallistic(char: Character): number {
	return getAttributeTotal(char, 'bod') + calculateArmorBallistic(char) + valueOf(char.improvements, 'DamageResistance');
}

/** SR4 impact damage soak: BOD + impact armor + DamageResistance improvements (e.g. Toughness). */
export function calculateDamageSoakImpact(char: Character): number {
	return getAttributeTotal(char, 'bod') + calculateArmorImpact(char) + valueOf(char.improvements, 'DamageResistance');
}

/* ============================================
 * Magic Values
 * ============================================ */

/** Calculate Drain Resistance pool. */
export function calculateDrainResist(char: Character): number {
	if (!char.magic) return 0;

	// Drain resistance depends on tradition
	// Most use WIL + CHA or WIL + LOG
	const tradition = char.magic.tradition.toLowerCase();
	const wil = getAttributeTotal(char, 'wil');

	if (tradition.includes('hermetic') || tradition.includes('chaos')) {
		return wil + getAttributeTotal(char, 'log') + valueOf(char.improvements, 'DrainResistance');
	}
	// Default to shamanic (WIL + CHA)
	return wil + getAttributeTotal(char, 'cha') + valueOf(char.improvements, 'DrainResistance');
}

/** Calculate Astral Initiative. */
export function calculateAstralInitiative(char: Character): number {
	const int = getAttributeTotal(char, 'int');
	return int * 2;
}

/** Calculate Astral Initiative Dice. */
export function calculateAstralInitiativeDice(): number {
	return 2; // Always 2 dice in astral
}

/* ============================================
 * Matrix Values (for Technomancers)
 * ============================================ */

/** Calculate Fading Resistance pool. */
export function calculateFadingResist(char: Character): number {
	if (!char.resonance) return 0;

	// Fading resistance is RES + WIL
	const res = getResonanceTotal(char);
	const wil = getAttributeTotal(char, 'wil');
	return res + wil + valueOf(char.improvements, 'FadingResistance');
}

export function calculateMatrixInitiative(char: Character): number {
	const int = getAttributeTotal(char, 'int');
	const res = getResonanceTotal(char);
	return int + res + valueOf(char.improvements, 'MatrixInitiative');
}

export function calculateMatrixInitiativeDice(char: Character): number {
	return 3 + valueOf(char.improvements, 'MatrixInitiativePass') + valueOf(char.improvements, 'MatrixInitiativePassAdd'); // Hot-sim VR implies 3 base in many SR4 contexts, with improvements doing the rest
}

/* ============================================
 * Comprehensive Character Summary
 * ============================================ */

export interface CharacterCalculations {
	// Condition Monitors
	physicalCM: number;
	stunCM: number;
	overflow: number;
	woundModifier: number;

	// Initiative
	initiative: number;
	initiativeDice: number;

	// Movement
	walkSpeed: number;
	runSpeed: number;

	// Limits
	physicalLimit: number;
	mentalLimit: number;
	socialLimit: number;

	// Combat
	defense: number;
	armorBallistic: number;
	armorImpact: number;
	damageSoakBallistic: number;
	damageSoakImpact: number;

	// Special Attributes
	composure: number;
	judgeIntentions: number;
	memory: number;
	liftCarry: number;

	// Magic (if applicable)
	drainResist: number;
	astralInitiative: number;

	// Matrix (if applicable)
	fadingResist: number;
	matrixInitiative: number;
}

/** Calculate all derived values for a character. */
export function calculateAll(char: Character): CharacterCalculations {
	return {
		physicalCM: calculatePhysicalCM(char),
		stunCM: calculateStunCM(char),
		overflow: calculateOverflow(char),
		woundModifier: getWoundModifier(char),

		initiative: calculateInitiative(char),
		initiativeDice: calculateInitiativeDice(char),

		walkSpeed: calculateWalkSpeed(char),
		runSpeed: calculateRunSpeed(char),

		physicalLimit: calculatePhysicalLimit(char),
		mentalLimit: calculateMentalLimit(char),
		socialLimit: calculateSocialLimit(char),

		defense: calculateDefense(char),
		armorBallistic: calculateArmorBallistic(char),
		armorImpact: calculateArmorImpact(char),
		damageSoakBallistic: calculateDamageSoakBallistic(char),
		damageSoakImpact: calculateDamageSoakImpact(char),

		composure: calculateComposure(char),
		judgeIntentions: calculateJudgeIntentions(char),
		memory: calculateMemory(char),
		liftCarry: calculateLiftCarry(char),

		drainResist: calculateDrainResist(char),
		astralInitiative: calculateAstralInitiative(char),

		fadingResist: calculateFadingResist(char),
		matrixInitiative: calculateMatrixInitiative(char)
	};
}

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

/* ============================================
 * Attribute Helpers
 * ============================================ */

/** Get total attribute value (base + bonus). */
export function getAttributeTotal(
	char: Character,
	attr: 'bod' | 'agi' | 'rea' | 'str' | 'cha' | 'int' | 'log' | 'wil' | 'edg'
): number {
	const a = char.attributes[attr];
	return a.base + a.bonus;
}

/** Get Magic attribute total (0 if mundane). */
export function getMagicTotal(char: Character): number {
	const mag = char.attributes.mag;
	if (!mag) return 0;
	return mag.base + mag.bonus;
}

/** Get Resonance attribute total (0 if not technomancer). */
export function getResonanceTotal(char: Character): number {
	const res = char.attributes.res;
	if (!res) return 0;
	return res.base + res.bonus;
}

/** Get current Essence. */
export function getEssence(char: Character): number {
	return char.attributes.ess;
}

/* ============================================
 * Condition Monitors
 * ============================================ */

/** Calculate Physical Condition Monitor boxes. */
export function calculatePhysicalCM(char: Character): number {
	const bod = getAttributeTotal(char, 'bod');
	return Math.ceil(bod / 2) + 8;
}

/** Calculate Stun Condition Monitor boxes. */
export function calculateStunCM(char: Character): number {
	const wil = getAttributeTotal(char, 'wil');
	return Math.ceil(wil / 2) + 8;
}

/** Calculate Overflow boxes (before death). */
export function calculateOverflow(char: Character): number {
	return getAttributeTotal(char, 'bod');
}

/** Get wound modifier from damage. */
export function getWoundModifier(char: Character): number {
	const physicalBoxes = calculatePhysicalCM(char);
	const stunBoxes = calculateStunCM(char);

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
	return rea + int;
}

/** Calculate number of Initiative Dice (base is 1). */
export function calculateInitiativeDice(char: Character): number {
	let dice = 1;

	// Check cyberware for initiative boosters
	for (const cyber of char.equipment.cyberware) {
		const name = cyber.name.toLowerCase();
		const rating = cyber.rating || 1;

		if (name.includes('wired reflexes')) {
			dice = Math.max(dice, rating + 1);
		} else if (name.includes('synaptic booster')) {
			dice = Math.max(dice, rating + 1);
		} else if (name.includes('move-by-wire')) {
			dice = Math.max(dice, rating + 1);
		}
	}

	// Check adept powers
	if (char.magic?.powers) {
		for (const power of char.magic.powers) {
			if (power.name.toLowerCase().includes('improved reflexes')) {
				dice = Math.max(dice, power.level + 1);
			}
		}
	}

	return dice;
}

/** Calculate Initiative bonus from augmentations. */
export function calculateInitiativeBonus(char: Character): number {
	let bonus = 0;

	for (const cyber of char.equipment.cyberware) {
		const name = cyber.name.toLowerCase();
		const rating = cyber.rating || 1;

		if (name.includes('wired reflexes')) {
			bonus = Math.max(bonus, rating);
		} else if (name.includes('synaptic booster')) {
			bonus = Math.max(bonus, rating);
		} else if (name.includes('move-by-wire')) {
			bonus = Math.max(bonus, rating * 2);
		} else if (name.includes('reaction enhancers')) {
			bonus += rating;
		}
	}

	if (char.magic?.powers) {
		for (const power of char.magic.powers) {
			if (power.name.toLowerCase().includes('improved reflexes')) {
				bonus = Math.max(bonus, power.level);
			}
		}
	}

	return bonus;
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
	return char.skills.find(
		(s) => s.name.toLowerCase() === skillName.toLowerCase()
	);
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

/** Calculate Composure test pool (CHA + WIL). */
export function calculateComposure(char: Character): number {
	return getAttributeTotal(char, 'cha') + getAttributeTotal(char, 'wil');
}

/** Calculate Judge Intentions pool (CHA + INT). */
export function calculateJudgeIntentions(char: Character): number {
	return getAttributeTotal(char, 'cha') + getAttributeTotal(char, 'int');
}

/** Calculate Memory test pool (LOG + WIL). */
export function calculateMemory(char: Character): number {
	return getAttributeTotal(char, 'log') + getAttributeTotal(char, 'wil');
}

/** Calculate Lift/Carry pool (BOD + STR). */
export function calculateLiftCarry(char: Character): number {
	return getAttributeTotal(char, 'bod') + getAttributeTotal(char, 'str');
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

	return total;
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
		return wil + getAttributeTotal(char, 'log');
	}
	// Default to shamanic (WIL + CHA)
	return wil + getAttributeTotal(char, 'cha');
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
	return res + wil;
}

/** Calculate Matrix Initiative (hot-sim). */
export function calculateMatrixInitiative(char: Character): number {
	const int = getAttributeTotal(char, 'int');
	const res = getResonanceTotal(char);
	return int + res;
}

/** Calculate Matrix Initiative Dice. */
export function calculateMatrixInitiativeDice(): number {
	return 3; // Hot-sim VR
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
	initiativeBonus: number;
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

		initiative: calculateInitiative(char) + calculateInitiativeBonus(char),
		initiativeBonus: calculateInitiativeBonus(char),
		initiativeDice: calculateInitiativeDice(char),

		walkSpeed: calculateWalkSpeed(char),
		runSpeed: calculateRunSpeed(char),

		physicalLimit: calculatePhysicalLimit(char),
		mentalLimit: calculateMentalLimit(char),
		socialLimit: calculateSocialLimit(char),

		defense: calculateDefense(char),
		armorBallistic: calculateArmorBallistic(char),
		armorImpact: calculateArmorImpact(char),

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

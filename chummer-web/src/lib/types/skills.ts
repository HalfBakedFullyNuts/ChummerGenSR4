/**
 * Skill Types for Shadowrun 4th Edition
 * ======================================
 * Defines active and knowledge skills, skill groups,
 * and specializations.
 */

import type { AttributeCode } from './attributes';

/** Skill category types. */
export type SkillCategoryType = 'active' | 'knowledge';

/** Active skill categories. */
export type ActiveSkillCategory =
	| 'Combat Active'
	| 'Magical Active'
	| 'Physical Active'
	| 'Resonance Active'
	| 'Social Active'
	| 'Technical Active'
	| 'Vehicle Active';

/** Knowledge skill categories. */
export type KnowledgeSkillCategory =
	| 'Academic'
	| 'Interest'
	| 'Language'
	| 'Professional'
	| 'Street';

/** All skill categories. */
export type SkillCategory = ActiveSkillCategory | KnowledgeSkillCategory;

/** Skill group names from SR4. */
export type SkillGroupName =
	| 'Animal Husbandry'
	| 'Athletics'
	| 'Biotech'
	| 'Close Combat'
	| 'Conjuring'
	| 'Cracking'
	| 'Electronics'
	| 'Firearms'
	| 'Influence'
	| 'Mechanic'
	| 'Outdoors'
	| 'Sorcery'
	| 'Stealth'
	| 'Tasking';

/**
 * Skill definition from game data.
 * Describes a skill's properties and defaults.
 */
export interface SkillDefinition {
	readonly name: string;
	readonly attribute: AttributeCode;
	readonly category: SkillCategory;
	readonly default: boolean;
	readonly skillgroup: string;
	readonly specializations: readonly string[];
	readonly source: string;
	readonly page: number;
}

/**
 * Character's skill value.
 * Tracks rating, specialization, and improvements.
 */
export interface CharacterSkill {
	readonly name: string;
	readonly rating: number;
	readonly specialization: string | null;
	readonly bonus: number;
	readonly karmaSpent: number;
}

/**
 * Character's skill group value.
 * Groups can be purchased together at discount.
 */
export interface CharacterSkillGroup {
	readonly name: SkillGroupName;
	readonly rating: number;
	readonly broken: boolean;
}

/**
 * Knowledge skill with custom name and category.
 * Players define their own knowledge skills.
 */
export interface KnowledgeSkill {
	readonly id: string;
	readonly name: string;
	readonly category: KnowledgeSkillCategory;
	readonly rating: number;
	readonly specialization: string | null;
}

/** Maximum skill rating during character creation. */
export const MAX_SKILL_RATING_CREATION = 6;

/** Maximum skill rating during career mode. */
export const MAX_SKILL_RATING_CAREER = 7;

/** Maximum skill group rating. */
export const MAX_SKILL_GROUP_RATING = 4;

/**
 * Calculate skill dice pool.
 * Returns rating + attribute + bonus.
 */
export function calculateSkillPool(
	skillRating: number,
	attributeValue: number,
	bonus: number
): number {
	const pool = skillRating + attributeValue + bonus;
	/* Assert: pool should be non-negative */
	if (pool < 0) {
		return 0;
	}
	return pool;
}

/**
 * Check if skill can default (use without training).
 * Returns attribute - 1 if defaultable, 0 otherwise.
 */
export function calculateDefaultPool(
	canDefault: boolean,
	attributeValue: number
): number {
	if (!canDefault) {
		return 0;
	}
	/* Assert: attribute should be positive for defaulting */
	if (attributeValue < 1) {
		return 0;
	}
	return attributeValue - 1;
}

/**
 * Calculate BP cost for skill rating.
 * Active skills cost 4 BP per rating point.
 */
export function calculateSkillBpCost(rating: number, isActive: boolean): number {
	const costPerPoint = isActive ? 4 : 2;
	/* Assert: rating should be within bounds */
	if (rating < 0 || rating > MAX_SKILL_RATING_CAREER) {
		return 0;
	}
	return rating * costPerPoint;
}

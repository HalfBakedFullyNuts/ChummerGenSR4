/**
 * Attribute Types for Shadowrun 4th Edition
 * ==========================================
 * Defines the core attribute system including base values,
 * limits, and augmented maximums.
 */

/** Attribute codes used throughout the system. */
export type AttributeCode =
	| 'bod' | 'agi' | 'rea' | 'str'
	| 'cha' | 'int' | 'log' | 'wil'
	| 'edg' | 'mag' | 'res' | 'ess' | 'ini';

/** Physical attributes (affected by cyberware/bioware). */
export type PhysicalAttribute = 'bod' | 'agi' | 'rea' | 'str';

/** Mental attributes. */
export type MentalAttribute = 'cha' | 'int' | 'log' | 'wil';

/** Special attributes (Edge, Magic, Resonance). */
export type SpecialAttribute = 'edg' | 'mag' | 'res';

/**
 * Attribute limits from metatype.
 * Defines min/max/augmented boundaries.
 */
export interface AttributeLimits {
	readonly min: number;
	readonly max: number;
	readonly aug: number;
}

/**
 * Single attribute value with base and modifications.
 * Base is the purchased value, bonuses come from improvements.
 */
export interface AttributeValue {
	readonly base: number;
	readonly bonus: number;
	readonly karma: number;
}

/**
 * Complete attribute with limits and calculated totals.
 * Used for display and validation.
 */
export interface Attribute {
	readonly code: AttributeCode;
	readonly name: string;
	readonly value: AttributeValue;
	readonly limits: AttributeLimits;
}

/**
 * Full attribute block for a character.
 * Contains all 12 attributes plus essence.
 */
export interface CharacterAttributes {
	readonly bod: AttributeValue;
	readonly agi: AttributeValue;
	readonly rea: AttributeValue;
	readonly str: AttributeValue;
	readonly cha: AttributeValue;
	readonly int: AttributeValue;
	readonly log: AttributeValue;
	readonly wil: AttributeValue;
	readonly edg: AttributeValue;
	readonly mag: AttributeValue | null;
	readonly res: AttributeValue | null;
	readonly ess: number;
}

/**
 * Metatype attribute limits block.
 * Defines boundaries for all attributes.
 */
export interface MetatypeAttributes {
	readonly bod: AttributeLimits;
	readonly agi: AttributeLimits;
	readonly rea: AttributeLimits;
	readonly str: AttributeLimits;
	readonly cha: AttributeLimits;
	readonly int: AttributeLimits;
	readonly log: AttributeLimits;
	readonly wil: AttributeLimits;
	readonly ini: AttributeLimits;
	readonly edg: AttributeLimits;
	readonly mag: AttributeLimits;
	readonly res: AttributeLimits;
	readonly ess: AttributeLimits;
}

/** Default attribute value (no points allocated). */
export const DEFAULT_ATTRIBUTE_VALUE: AttributeValue = {
	base: 0,
	bonus: 0,
	karma: 0
} as const;

/** Attribute display names for UI. */
export const ATTRIBUTE_NAMES: Record<AttributeCode, string> = {
	bod: 'Body',
	agi: 'Agility',
	rea: 'Reaction',
	str: 'Strength',
	cha: 'Charisma',
	int: 'Intuition',
	log: 'Logic',
	wil: 'Willpower',
	edg: 'Edge',
	mag: 'Magic',
	res: 'Resonance',
	ess: 'Essence',
	ini: 'Initiative'
} as const;

/**
 * Calculate total attribute value.
 * Returns base + bonus + karma.
 */
export function calculateAttributeTotal(value: AttributeValue): number {
	const total = value.base + value.bonus + value.karma;
	/* Assert: total should be non-negative */
	if (total < 0) {
		return 0;
	}
	return total;
}

/**
 * Check if attribute is within metatype limits.
 * Returns true if value is between min and max.
 */
export function isAttributeValid(
	value: AttributeValue,
	limits: AttributeLimits
): boolean {
	const total = calculateAttributeTotal(value);
	/* Assert: limits should have min <= max */
	if (limits.min > limits.max) {
		return false;
	}
	return total >= limits.min && total <= limits.max;
}

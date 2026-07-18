/**
 * Attributes Store Module
 * =======================
 * Attribute allocation, validation, BP calculation,
 * and quality management (add/remove/duplicate).
 *
 * Operates on the shared characterStore from character.ts.
 */

import { get, derived, type Readable } from 'svelte/store';
import { type Character, type AttributeValue } from '$types';
import { characterStore, KARMA_BUILD_COSTS } from './character';
import { getAttributeNaturalMax } from '../engine/calculations';

/* ============================================
 * Attribute Constants and Types
 * ============================================ */

/** Attribute keys that have AttributeValue (not number or null). */
export type AttributeValueKey =
	| 'bod'
	| 'agi'
	| 'rea'
	| 'str'
	| 'cha'
	| 'int'
	| 'log'
	| 'wil'
	| 'edg'
	| 'mag'
	| 'res';

/** All attribute keys for iteration (excludes mag/res which are handled specially). */
const ALL_ATTR_KEYS: readonly AttributeValueKey[] = [
	'bod',
	'agi',
	'rea',
	'str',
	'cha',
	'int',
	'log',
	'wil',
	'edg'
];

/** Special attribute keys that require quality unlock (Magic, Resonance). */
export const AWAKENED_ATTR_KEYS: readonly AttributeValueKey[] = ['mag', 'res'];

/** Non-special attribute keys (excludes Edge for BP limit calculations). */
const NON_SPECIAL_ATTR_KEYS: readonly AttributeValueKey[] = [
	'bod',
	'agi',
	'rea',
	'str',
	'cha',
	'int',
	'log',
	'wil'
];

/** BP cost per attribute point above minimum. */
const BP_PER_ATTRIBUTE_POINT = 10;

/** BP cost to raise attribute to natural maximum. */
const BP_FOR_MAX_ATTRIBUTE = 25;

/* ============================================
 * Attribute Calculation Functions
 * ============================================ */

/**
 * Calculate total attribute BP/Karma cost for a character.
 * For BP build: 10 BP per point, except 25 BP for the final point to reach natural max
 * For Karma build: sum of (rating × 5) for each point above min
 */
export function calculateTotalAttributeCost(char: Character): number {
	let total = 0;
	const isKarma = char.buildMethod === 'karma';

	for (const code of ALL_ATTR_KEYS) {
		const attr = char.attributes[code];
		const limits = char.attributeLimits[code];
		if (!attr || typeof attr === 'number' || !limits) continue;

		if (isKarma) {
			for (let r = limits.min + 1; r <= attr.base; r++) {
				total += r * KARMA_BUILD_COSTS.ATTRIBUTE_MULTIPLIER;
			}
		} else {
			const pointsAboveMin = attr.base - limits.min;
			const isAtMax = attr.base === limits.max;

			if (isAtMax && pointsAboveMin > 0) {
				total += (pointsAboveMin - 1) * BP_PER_ATTRIBUTE_POINT;
				total += BP_FOR_MAX_ATTRIBUTE;
			} else {
				total += pointsAboveMin * BP_PER_ATTRIBUTE_POINT;
			}
		}
	}

	for (const code of AWAKENED_ATTR_KEYS) {
		const attr = char.attributes[code];
		const limits = char.attributeLimits[code];
		if (!attr || typeof attr === 'number' || attr === null || !limits) continue;

		if (isKarma) {
			for (let r = limits.min + 1; r <= attr.base; r++) {
				total += r * KARMA_BUILD_COSTS.ATTRIBUTE_MULTIPLIER;
			}
		} else {
			const pointsAboveMin = attr.base - limits.min;
			const isAtMax = attr.base === limits.max;

			if (isAtMax && pointsAboveMin > 0) {
				total += (pointsAboveMin - 1) * BP_PER_ATTRIBUTE_POINT;
				total += BP_FOR_MAX_ATTRIBUTE;
			} else {
				total += pointsAboveMin * BP_PER_ATTRIBUTE_POINT;
			}
		}
	}

	return total;
}

/**
 * Calculate BP spent on non-special attributes only.
 * Used for the 50% BP limit rule.
 */
export function calculateNonSpecialAttributeBP(char: Character): number {
	if (char.buildMethod === 'karma') return 0;

	let total = 0;
	for (const code of NON_SPECIAL_ATTR_KEYS) {
		const attr = char.attributes[code];
		const limits = char.attributeLimits[code];
		if (!attr || typeof attr === 'number' || !limits) continue;

		const pointsAboveMin = attr.base - limits.min;
		const isAtMax = attr.base === limits.max;

		if (isAtMax && pointsAboveMin > 0) {
			total += (pointsAboveMin - 1) * BP_PER_ATTRIBUTE_POINT;
			total += BP_FOR_MAX_ATTRIBUTE;
		} else {
			total += pointsAboveMin * BP_PER_ATTRIBUTE_POINT;
		}
	}
	return total;
}

/** Check if an attribute is N/A (min and max both 0). */
export function isAttributeNA(limits: { min: number; max: number }): boolean {
	return limits.min === 0 && limits.max === 0;
}

/** Count how many attributes are currently at their natural maximum. */
export function countMaxedAttributes(char: Character): number {
	let count = 0;
	for (const code of NON_SPECIAL_ATTR_KEYS) {
		const attr = char.attributes[code];
		const limits = char.attributeLimits[code];
		if (!attr || typeof attr === 'number' || !limits) continue;
		if (isAttributeNA(limits)) continue;
		if (attr.base === limits.max) {
			count++;
		}
	}
	return count;
}

/** Get the name of the attribute currently at max, if any. */
export function getMaxedAttributeName(char: Character): AttributeValueKey | null {
	for (const code of NON_SPECIAL_ATTR_KEYS) {
		const attr = char.attributes[code];
		const limits = char.attributeLimits[code];
		if (!attr || typeof attr === 'number' || !limits) continue;
		if (isAttributeNA(limits)) continue;
		if (attr.base === limits.max) {
			return code;
		}
	}
	return null;
}

/**
 * Set a single attribute value.
 * Validates against metatype limits and updates BP spent.
 */
export function setAttribute(attrCode: AttributeValueKey, value: number): void {
	const char = get(characterStore);
	if (!char) return;

	const limits = char.attributeLimits[attrCode];
	if (!limits) return;

	const naturalMax = getAttributeNaturalMax(char, attrCode);
	const clampedValue = Math.max(limits.min, Math.min(naturalMax, value));

	const currentAttr = char.attributes[attrCode];
	if (!currentAttr) return;

	const newAttr: AttributeValue = {
		...currentAttr,
		base: clampedValue
	};

	const updatedWithAttr: Character = {
		...char,
		attributes: {
			...char.attributes,
			[attrCode]: newAttr
		},
		updatedAt: new Date().toISOString()
	};

	if (char.buildMethod === 'bp') {
		const isNonSpecial = attrCode !== 'edg' && attrCode !== 'mag' && attrCode !== 'res';
		if (isNonSpecial) {
			const projectedNonSpecialBP = calculateNonSpecialAttributeBP(updatedWithAttr);
			const maxNonSpecialBP = Math.floor(char.buildPoints * 0.5);
			if (projectedNonSpecialBP > maxNonSpecialBP) {
				return;
			}
		}
	}

	const attrCost = calculateTotalAttributeCost(updatedWithAttr);

	const updated: Character = {
		...updatedWithAttr,
		buildPointsSpent: {
			...updatedWithAttr.buildPointsSpent,
			attributes: attrCost
		}
	};

	characterStore.set(updated);
}

/* ============================================
 * Attribute Validation Derived Store
 * ============================================ */

/** Attribute validation state for BP build limits. */
export interface AttributeValidation {
	nonSpecialBP: number;
	maxNonSpecialBP: number;
	maxedAttributeCount: number;
	maxedAttribute: AttributeValueKey | null;
	isValid: boolean;
	isOverBPLimit: boolean;
	isOverMaxLimit: boolean;
}

/** Derived store for attribute allocation validation (BP build only). */
export const attributeValidation: Readable<AttributeValidation> = derived(
	{ subscribe: characterStore.subscribe } as Readable<Character | null>,
	($char): AttributeValidation => {
		if (!$char || $char.buildMethod === 'karma') {
			return {
				nonSpecialBP: 0,
				maxNonSpecialBP: 0,
				maxedAttributeCount: 0,
				maxedAttribute: null,
				isValid: true,
				isOverBPLimit: false,
				isOverMaxLimit: false
			};
		}

		const nonSpecialBP = calculateNonSpecialAttributeBP($char);
		const maxNonSpecialBP = Math.floor($char.buildPoints * 0.5);
		const maxedAttributeCount = countMaxedAttributes($char);
		const maxedAttribute = getMaxedAttributeName($char);
		const isOverBPLimit = nonSpecialBP > maxNonSpecialBP;
		const isOverMaxLimit = maxedAttributeCount > 1;
		const isValid = !isOverBPLimit && !isOverMaxLimit;

		return {
			nonSpecialBP,
			maxNonSpecialBP,
			maxedAttributeCount,
			maxedAttribute,
			isValid,
			isOverBPLimit,
			isOverMaxLimit
		};
	}
);

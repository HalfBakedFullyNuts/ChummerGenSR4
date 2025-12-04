/**
 * Improvement Configuration Data
 * ===============================
 * Data-driven definitions for equipment/quality/power effects.
 * This replaces the 27+ if statements with a declarative configuration.
 */

import type { ImprovementSource, ImprovementTarget } from './improvements';

/* ============================================
 * Effect Configuration Types
 * ============================================ */

/** Effect on a single target. */
export interface EffectDefinition {
	readonly target: ImprovementTarget;
	/** Value multiplier applied to rating. If not provided, uses rating directly. */
	readonly multiplier?: number;
	/** Fixed value (ignores rating). */
	readonly fixedValue?: number;
	/** Conditional text for the effect. */
	readonly conditional?: string;
	/** Suffix for generating unique effect ID. */
	readonly idSuffix: string;
}

/** Item effect configuration. */
export interface ItemEffectConfig {
	/** Pattern to match item name (lowercase). */
	readonly pattern: string | readonly string[];
	/** Source type for the improvement. */
	readonly source: ImprovementSource;
	/** Effects this item provides. */
	readonly effects: readonly EffectDefinition[];
}

/** Special handler for items with complex logic. */
export interface ComplexItemEffect {
	readonly pattern: string | readonly string[];
	readonly source: ImprovementSource;
	/** Function to determine effects based on item name and rating. */
	readonly getEffects: (name: string, rating: number) => readonly EffectDefinition[];
}

/* ============================================
 * Cyberware Effect Definitions
 * ============================================ */

export const CYBERWARE_EFFECTS: readonly ItemEffectConfig[] = [
	{
		pattern: 'wired reflexes',
		source: 'cyberware',
		effects: [
			{ target: 'initiative', idSuffix: 'init', multiplier: 1 },
			{ target: 'initiative_dice', idSuffix: 'init-dice', multiplier: 1 }
		]
	},
	{
		pattern: 'reaction enhancer',
		source: 'cyberware',
		effects: [{ target: 'rea', idSuffix: 'rea', multiplier: 1 }]
	},
	{
		pattern: 'muscle replacement',
		source: 'cyberware',
		effects: [
			{ target: 'str', idSuffix: 'str', multiplier: 1 },
			{ target: 'agi', idSuffix: 'agi', multiplier: 1 }
		]
	},
	{
		pattern: 'dermal plating',
		source: 'cyberware',
		effects: [
			{ target: 'armor_ballistic', idSuffix: 'armor-b', multiplier: 1 },
			{ target: 'armor_impact', idSuffix: 'armor-i', multiplier: 1 }
		]
	},
	{
		pattern: 'move-by-wire',
		source: 'cyberware',
		effects: [
			{ target: 'initiative', idSuffix: 'init', multiplier: 2 },
			{ target: 'initiative_dice', idSuffix: 'init-dice', multiplier: 1 },
			{ target: 'rea', idSuffix: 'rea', multiplier: 1 }
		]
	}
] as const;

/** Bioware effect definitions. */
export const BIOWARE_EFFECTS: readonly ItemEffectConfig[] = [
	{
		pattern: 'synaptic booster',
		source: 'bioware',
		effects: [
			{ target: 'initiative', idSuffix: 'init', multiplier: 1 },
			{ target: 'initiative_dice', idSuffix: 'init-dice', multiplier: 1 }
		]
	},
	{
		pattern: 'muscle toner',
		source: 'bioware',
		effects: [{ target: 'agi', idSuffix: 'agi', multiplier: 1 }]
	},
	{
		pattern: 'muscle augmentation',
		source: 'bioware',
		effects: [{ target: 'str', idSuffix: 'str', multiplier: 1 }]
	},
	{
		pattern: 'cerebral booster',
		source: 'bioware',
		effects: [{ target: 'log', idSuffix: 'log', multiplier: 1 }]
	},
	{
		pattern: 'mnemonic enhancer',
		source: 'bioware',
		effects: [{ target: 'memory', idSuffix: 'memory', multiplier: 1 }]
	},
	{
		pattern: 'orthoskin',
		source: 'bioware',
		effects: [
			{ target: 'armor_ballistic', idSuffix: 'armor-b', multiplier: 1 },
			{ target: 'armor_impact', idSuffix: 'armor-i', multiplier: 1 }
		]
	},
	{
		pattern: 'platelet factories',
		source: 'bioware',
		effects: [{ target: 'damage_resistance', idSuffix: 'dam-res', fixedValue: 1 }]
	},
	{
		pattern: 'pain editor',
		source: 'bioware',
		effects: [
			{
				target: 'damage_resistance',
				idSuffix: 'pain',
				fixedValue: 2,
				conditional: 'Ignores wound modifiers'
			}
		]
	}
] as const;

/** Complex cyberware that needs special handling (e.g., bone lacing variants). */
export const COMPLEX_CYBERWARE_EFFECTS: readonly ComplexItemEffect[] = [
	{
		pattern: ['bone lacing', 'bone density'],
		source: 'cyberware',
		getEffects: (name: string): readonly EffectDefinition[] => {
			let armorValue = 0;
			if (name.includes('plastic')) armorValue = 1;
			else if (name.includes('aluminum')) armorValue = 2;
			else if (name.includes('titanium')) armorValue = 3;

			if (armorValue === 0) return [];

			return [
				{ target: 'armor_ballistic', idSuffix: 'armor-b', fixedValue: armorValue },
				{ target: 'armor_impact', idSuffix: 'armor-i', fixedValue: armorValue }
			];
		}
	}
] as const;

/* ============================================
 * Quality Effect Definitions
 * ============================================ */

export const QUALITY_EFFECTS: readonly ItemEffectConfig[] = [
	{
		pattern: 'toughness',
		source: 'quality',
		effects: [{ target: 'physical_cm', idSuffix: 'tough', fixedValue: 1 }]
	},
	{
		pattern: 'will to live',
		source: 'quality',
		effects: [{ target: 'physical_cm', idSuffix: 'wtl', multiplier: 1 }]
	},
	{
		pattern: 'high pain tolerance',
		source: 'quality',
		effects: [
			{
				target: 'damage_resistance',
				idSuffix: 'hpt',
				multiplier: 1,
				conditional: 'Reduces wound modifiers'
			}
		]
	},
	{
		pattern: 'natural immunity',
		source: 'quality',
		effects: [
			{
				target: 'damage_resistance',
				idSuffix: 'immune',
				fixedValue: 2,
				conditional: 'Toxin/disease resistance'
			}
		]
	},
	{
		pattern: 'magic resistance',
		source: 'quality',
		effects: [{ target: 'spell_resistance', idSuffix: 'mr', multiplier: 2 }]
	},
	{
		pattern: 'lucky',
		source: 'quality',
		effects: [
			{
				target: 'edg',
				idSuffix: 'luck',
				fixedValue: 1,
				conditional: 'One extra Edge point'
			}
		]
	}
] as const;

/* ============================================
 * Adept Power Effect Definitions
 * ============================================ */

export const ADEPT_POWER_EFFECTS: readonly ItemEffectConfig[] = [
	{
		pattern: 'improved reflexes',
		source: 'adept_power',
		effects: [
			{ target: 'initiative', idSuffix: 'init', multiplier: 1 },
			{ target: 'initiative_dice', idSuffix: 'init-dice', multiplier: 1 }
		]
	},
	{
		pattern: 'combat sense',
		source: 'adept_power',
		effects: [
			{
				target: 'rea',
				idSuffix: 'cs',
				multiplier: 1,
				conditional: 'Defense and surprise tests only'
			}
		]
	},
	{
		pattern: 'mystic armor',
		source: 'adept_power',
		effects: [
			{ target: 'armor_ballistic', idSuffix: 'armor-b', multiplier: 1 },
			{ target: 'armor_impact', idSuffix: 'armor-i', multiplier: 1 }
		]
	},
	{
		pattern: 'pain resistance',
		source: 'adept_power',
		effects: [
			{
				target: 'damage_resistance',
				idSuffix: 'pr',
				multiplier: 1,
				conditional: 'Ignores wound modifiers'
			}
		]
	}
] as const;

/* ============================================
 * Matching Utilities
 * ============================================ */

/** Check if an item name matches a pattern. */
export function matchesPattern(
	name: string,
	pattern: string | readonly string[]
): boolean {
	const lowerName = name.toLowerCase();
	if (typeof pattern === 'string') {
		return lowerName.includes(pattern);
	}
	return pattern.some((p) => lowerName.includes(p));
}

/** Find matching effect config for an item name. */
export function findMatchingConfig<T extends { pattern: string | readonly string[] }>(
	configs: readonly T[],
	name: string
): T | undefined {
	return configs.find((config) => matchesPattern(name, config.pattern));
}

/** Calculate effect value from definition and rating. */
export function calculateEffectValue(effect: EffectDefinition, rating: number): number {
	if (effect.fixedValue !== undefined) {
		return effect.fixedValue;
	}
	return rating * (effect.multiplier ?? 1);
}

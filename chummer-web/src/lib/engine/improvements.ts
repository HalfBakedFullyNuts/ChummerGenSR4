/**
 * Improvements Engine
 * ===================
 * Manages stat modifications from various sources:
 * - Cyberware bonuses
 * - Bioware bonuses
 * - Quality effects
 * - Adept power bonuses
 * - Gear bonuses
 *
 * Uses data-driven configuration from improvement-data.ts
 */

import type { Character, CharacterCyberware, CharacterQuality, CharacterPower } from '$types';
import {
	CYBERWARE_EFFECTS,
	BIOWARE_EFFECTS,
	COMPLEX_CYBERWARE_EFFECTS,
	QUALITY_EFFECTS,
	ADEPT_POWER_EFFECTS,
	findMatchingConfig,
	matchesPattern,
	calculateEffectValue,
	type EffectDefinition
} from './improvement-data';

/* ============================================
 * Improvement Types
 * ============================================ */

export type ImprovementTarget =
	| 'bod' | 'agi' | 'rea' | 'str' | 'cha' | 'int' | 'log' | 'wil' | 'edg'
	| 'mag' | 'res' | 'ess'
	| 'initiative' | 'initiative_dice'
	| 'armor_ballistic' | 'armor_impact'
	| 'physical_cm' | 'stun_cm'
	| 'skill' | 'skill_group'
	| 'physical_limit' | 'mental_limit' | 'social_limit'
	| 'damage_resistance' | 'spell_resistance'
	| 'memory' | 'composure' | 'judge_intentions';

export type ImprovementSource =
	| 'cyberware'
	| 'bioware'
	| 'quality'
	| 'adept_power'
	| 'gear'
	| 'spell'
	| 'spirit'
	| 'focus';

export interface Improvement {
	readonly id: string;
	readonly source: ImprovementSource;
	readonly sourceName: string;
	readonly target: ImprovementTarget;
	readonly value: number;
	readonly conditional?: string;
}

/* ============================================
 * Generic Improvement Extraction
 * ============================================ */

/** Create improvements from effect definitions. */
function createImprovements(
	itemId: string,
	itemName: string,
	source: ImprovementSource,
	effects: readonly EffectDefinition[],
	rating: number
): Improvement[] {
	return effects.map((effect) => ({
		id: `${itemId}-${effect.idSuffix}`,
		source,
		sourceName: itemName,
		target: effect.target,
		value: calculateEffectValue(effect, rating),
		conditional: effect.conditional
	}));
}

/* ============================================
 * Cyberware Improvements
 * ============================================ */

/** Extract improvements from cyberware using data-driven configuration. */
export function getCyberwareImprovements(cyberware: readonly CharacterCyberware[]): Improvement[] {
	const improvements: Improvement[] = [];

	for (const cyber of cyberware) {
		const name = cyber.name;
		const rating = cyber.rating || 1;

		// Check standard cyberware effects
		const cyberConfig = findMatchingConfig(CYBERWARE_EFFECTS, name);
		if (cyberConfig) {
			improvements.push(
				...createImprovements(cyber.id, name, cyberConfig.source, cyberConfig.effects, rating)
			);
		}

		// Check bioware effects (some augmentations are categorized as cyberware)
		const bioConfig = findMatchingConfig(BIOWARE_EFFECTS, name);
		if (bioConfig) {
			improvements.push(
				...createImprovements(cyber.id, name, bioConfig.source, bioConfig.effects, rating)
			);
		}

		// Check complex cyberware effects (items with special logic)
		for (const complexConfig of COMPLEX_CYBERWARE_EFFECTS) {
			if (matchesPattern(name, complexConfig.pattern)) {
				const effects = complexConfig.getEffects(name.toLowerCase(), rating);
				improvements.push(
					...createImprovements(cyber.id, name, complexConfig.source, effects, rating)
				);
			}
		}
	}

	return improvements;
}

/* ============================================
 * Quality Improvements
 * ============================================ */

/** Extract improvements from qualities using data-driven configuration. */
export function getQualityImprovements(qualities: readonly CharacterQuality[]): Improvement[] {
	const improvements: Improvement[] = [];

	for (const quality of qualities) {
		const config = findMatchingConfig(QUALITY_EFFECTS, quality.name);
		if (config) {
			improvements.push(
				...createImprovements(quality.id, quality.name, config.source, config.effects, quality.rating)
			);
		}

		// Note: Exceptional Attribute raises max by 1, handled in attribute limits
	}

	return improvements;
}

/* ============================================
 * Adept Power Improvements
 * ============================================ */

/** Extract improvements from adept powers using data-driven configuration. */
export function getAdeptPowerImprovements(powers: readonly CharacterPower[]): Improvement[] {
	const improvements: Improvement[] = [];

	for (const power of powers) {
		const level = power.level || 1;
		const config = findMatchingConfig(ADEPT_POWER_EFFECTS, power.name);

		if (config) {
			improvements.push(
				...createImprovements(power.id, power.name, config.source, config.effects, level)
			);
		}

		// Note: Improved Physical Attribute and Improved Ability need specific attribute/skill
		// These are typically selected when the power is taken
	}

	return improvements;
}

/* ============================================
 * Aggregation Functions
 * ============================================ */

/** Get all improvements for a character. */
export function getAllImprovements(char: Character): Improvement[] {
	const improvements: Improvement[] = [];

	// Cyberware (includes bioware currently)
	improvements.push(...getCyberwareImprovements(char.equipment.cyberware));

	// Qualities
	improvements.push(...getQualityImprovements(char.qualities));

	// Adept powers
	if (char.magic?.powers) {
		improvements.push(...getAdeptPowerImprovements(char.magic.powers));
	}

	return improvements;
}

/** Get total improvement value for a target. */
export function getTotalImprovement(char: Character, target: ImprovementTarget): number {
	const improvements = getAllImprovements(char);

	return improvements
		.filter((i) => i.target === target)
		.reduce((sum, i) => sum + i.value, 0);
}

/** Get all improvements for a specific target with sources. */
export function getImprovementsForTarget(
	char: Character,
	target: ImprovementTarget
): Improvement[] {
	return getAllImprovements(char).filter((i) => i.target === target);
}

/** Get improvements grouped by source type. */
export function getImprovementsBySource(
	char: Character
): Record<ImprovementSource, Improvement[]> {
	const all = getAllImprovements(char);

	return {
		cyberware: all.filter((i) => i.source === 'cyberware'),
		bioware: all.filter((i) => i.source === 'bioware'),
		quality: all.filter((i) => i.source === 'quality'),
		adept_power: all.filter((i) => i.source === 'adept_power'),
		gear: all.filter((i) => i.source === 'gear'),
		spell: all.filter((i) => i.source === 'spell'),
		spirit: all.filter((i) => i.source === 'spirit'),
		focus: all.filter((i) => i.source === 'focus')
	};
}

/** Check if improvements stack (most don't in SR4). */
export function getStackedValue(improvements: Improvement[]): number {
	if (improvements.length === 0) return 0;

	// Group by source type
	const bySource: Record<string, number> = {};

	for (const imp of improvements) {
		const key = `${imp.source}-${imp.target}`;
		bySource[key] = Math.max(bySource[key] || 0, imp.value);
	}

	// Most bonuses from same source don't stack - take highest
	// Different sources stack
	return Object.values(bySource).reduce((sum, val) => sum + val, 0);
}

/** Summary of all bonuses for display. */
export interface ImprovementSummary {
	readonly target: ImprovementTarget;
	readonly totalValue: number;
	readonly sources: readonly {
		readonly name: string;
		readonly value: number;
		readonly conditional?: string;
	}[];
}

/** Get summary of improvements for a target. */
export function getImprovementSummary(
	char: Character,
	target: ImprovementTarget
): ImprovementSummary {
	const improvements = getImprovementsForTarget(char, target);

	return {
		target,
		totalValue: getStackedValue(improvements),
		sources: improvements.map((i) => ({
			name: i.sourceName,
			value: i.value,
			conditional: i.conditional
		}))
	};
}

/**
 * Improvements Engine
 * ===================
 * Manages stat modifications from various sources:
 * - Cyberware bonuses
 * - Bioware bonuses
 * - Quality effects
 * - Adept power bonuses
 * - Gear bonuses
 */

import type { Character, CharacterCyberware, CharacterQuality, CharacterPower } from '$types';

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
 * Cyberware Improvements
 * ============================================ */

/** Extract improvements from cyberware. */
export function getCyberwareImprovements(cyberware: readonly CharacterCyberware[]): Improvement[] {
	const improvements: Improvement[] = [];

	for (const cyber of cyberware) {
		const name = cyber.name.toLowerCase();
		const rating = cyber.rating || 1;

		// Wired Reflexes
		if (name.includes('wired reflexes')) {
			improvements.push({
				id: `${cyber.id}-init`,
				source: 'cyberware',
				sourceName: cyber.name,
				target: 'initiative',
				value: rating
			});
			improvements.push({
				id: `${cyber.id}-init-dice`,
				source: 'cyberware',
				sourceName: cyber.name,
				target: 'initiative_dice',
				value: rating
			});
		}

		// Synaptic Booster
		if (name.includes('synaptic booster')) {
			improvements.push({
				id: `${cyber.id}-init`,
				source: 'bioware',
				sourceName: cyber.name,
				target: 'initiative',
				value: rating
			});
			improvements.push({
				id: `${cyber.id}-init-dice`,
				source: 'bioware',
				sourceName: cyber.name,
				target: 'initiative_dice',
				value: rating
			});
		}

		// Reaction Enhancers
		if (name.includes('reaction enhancers') || name.includes('reaction enhancer')) {
			improvements.push({
				id: `${cyber.id}-rea`,
				source: 'cyberware',
				sourceName: cyber.name,
				target: 'rea',
				value: rating
			});
		}

		// Muscle Replacement
		if (name.includes('muscle replacement')) {
			improvements.push({
				id: `${cyber.id}-str`,
				source: 'cyberware',
				sourceName: cyber.name,
				target: 'str',
				value: rating
			});
			improvements.push({
				id: `${cyber.id}-agi`,
				source: 'cyberware',
				sourceName: cyber.name,
				target: 'agi',
				value: rating
			});
		}

		// Muscle Toner
		if (name.includes('muscle toner')) {
			improvements.push({
				id: `${cyber.id}-agi`,
				source: 'bioware',
				sourceName: cyber.name,
				target: 'agi',
				value: rating
			});
		}

		// Muscle Augmentation
		if (name.includes('muscle augmentation')) {
			improvements.push({
				id: `${cyber.id}-str`,
				source: 'bioware',
				sourceName: cyber.name,
				target: 'str',
				value: rating
			});
		}

		// Cerebral Booster
		if (name.includes('cerebral booster')) {
			improvements.push({
				id: `${cyber.id}-log`,
				source: 'bioware',
				sourceName: cyber.name,
				target: 'log',
				value: rating
			});
		}

		// Mnemonic Enhancer
		if (name.includes('mnemonic enhancer')) {
			improvements.push({
				id: `${cyber.id}-memory`,
				source: 'bioware',
				sourceName: cyber.name,
				target: 'memory',
				value: rating
			});
		}

		// Bone Lacing/Density
		if (name.includes('bone lacing') || name.includes('bone density')) {
			let armorValue = 0;
			if (name.includes('plastic')) armorValue = 1;
			else if (name.includes('aluminum')) armorValue = 2;
			else if (name.includes('titanium')) armorValue = 3;

			if (armorValue > 0) {
				improvements.push({
					id: `${cyber.id}-armor`,
					source: 'cyberware',
					sourceName: cyber.name,
					target: 'armor_ballistic',
					value: armorValue
				});
				improvements.push({
					id: `${cyber.id}-armor-i`,
					source: 'cyberware',
					sourceName: cyber.name,
					target: 'armor_impact',
					value: armorValue
				});
			}
		}

		// Dermal Plating
		if (name.includes('dermal plating')) {
			improvements.push({
				id: `${cyber.id}-armor-b`,
				source: 'cyberware',
				sourceName: cyber.name,
				target: 'armor_ballistic',
				value: rating
			});
			improvements.push({
				id: `${cyber.id}-armor-i`,
				source: 'cyberware',
				sourceName: cyber.name,
				target: 'armor_impact',
				value: rating
			});
		}

		// Orthoskin
		if (name.includes('orthoskin')) {
			improvements.push({
				id: `${cyber.id}-armor-b`,
				source: 'bioware',
				sourceName: cyber.name,
				target: 'armor_ballistic',
				value: rating
			});
			improvements.push({
				id: `${cyber.id}-armor-i`,
				source: 'bioware',
				sourceName: cyber.name,
				target: 'armor_impact',
				value: rating
			});
		}

		// Platelet Factories
		if (name.includes('platelet factories')) {
			improvements.push({
				id: `${cyber.id}-dam-res`,
				source: 'bioware',
				sourceName: cyber.name,
				target: 'damage_resistance',
				value: 1
			});
		}

		// Pain Editor
		if (name.includes('pain editor')) {
			improvements.push({
				id: `${cyber.id}-pain`,
				source: 'bioware',
				sourceName: cyber.name,
				target: 'damage_resistance',
				value: 2,
				conditional: 'Ignores wound modifiers'
			});
		}

		// Move-by-Wire
		if (name.includes('move-by-wire')) {
			improvements.push({
				id: `${cyber.id}-init`,
				source: 'cyberware',
				sourceName: cyber.name,
				target: 'initiative',
				value: rating * 2
			});
			improvements.push({
				id: `${cyber.id}-init-dice`,
				source: 'cyberware',
				sourceName: cyber.name,
				target: 'initiative_dice',
				value: rating
			});
			improvements.push({
				id: `${cyber.id}-rea`,
				source: 'cyberware',
				sourceName: cyber.name,
				target: 'rea',
				value: rating
			});
		}
	}

	return improvements;
}

/* ============================================
 * Quality Improvements
 * ============================================ */

/** Extract improvements from qualities. */
export function getQualityImprovements(qualities: readonly CharacterQuality[]): Improvement[] {
	const improvements: Improvement[] = [];

	for (const quality of qualities) {
		const name = quality.name.toLowerCase();

		// Exceptional Attribute
		if (name.includes('exceptional attribute')) {
			// This raises max by 1, handled separately in attribute limits
		}

		// Toughness
		if (name === 'toughness') {
			improvements.push({
				id: `${quality.id}-tough`,
				source: 'quality',
				sourceName: quality.name,
				target: 'physical_cm',
				value: 1
			});
		}

		// Will to Live
		if (name.includes('will to live')) {
			improvements.push({
				id: `${quality.id}-wtl`,
				source: 'quality',
				sourceName: quality.name,
				target: 'physical_cm',
				value: quality.rating
			});
		}

		// High Pain Tolerance
		if (name.includes('high pain tolerance')) {
			improvements.push({
				id: `${quality.id}-hpt`,
				source: 'quality',
				sourceName: quality.name,
				target: 'damage_resistance',
				value: quality.rating,
				conditional: 'Reduces wound modifiers'
			});
		}

		// Natural Immunity
		if (name.includes('natural immunity')) {
			improvements.push({
				id: `${quality.id}-immune`,
				source: 'quality',
				sourceName: quality.name,
				target: 'damage_resistance',
				value: 2,
				conditional: 'Toxin/disease resistance'
			});
		}

		// Magic Resistance
		if (name === 'magic resistance') {
			improvements.push({
				id: `${quality.id}-mr`,
				source: 'quality',
				sourceName: quality.name,
				target: 'spell_resistance',
				value: quality.rating * 2
			});
		}

		// Lucky
		if (name === 'lucky') {
			improvements.push({
				id: `${quality.id}-luck`,
				source: 'quality',
				sourceName: quality.name,
				target: 'edg',
				value: 1,
				conditional: 'One extra Edge point'
			});
		}
	}

	return improvements;
}

/* ============================================
 * Adept Power Improvements
 * ============================================ */

/** Extract improvements from adept powers. */
export function getAdeptPowerImprovements(powers: readonly CharacterPower[]): Improvement[] {
	const improvements: Improvement[] = [];

	for (const power of powers) {
		const name = power.name.toLowerCase();
		const level = power.level || 1;

		// Improved Reflexes
		if (name.includes('improved reflexes')) {
			improvements.push({
				id: `${power.id}-init`,
				source: 'adept_power',
				sourceName: power.name,
				target: 'initiative',
				value: level
			});
			improvements.push({
				id: `${power.id}-init-dice`,
				source: 'adept_power',
				sourceName: power.name,
				target: 'initiative_dice',
				value: level
			});
		}

		// Improved Physical Attribute
		if (name.includes('improved physical attribute')) {
			// Would need to know which attribute
			// This is typically selected when the power is taken
		}

		// Improved Ability
		if (name.includes('improved ability')) {
			// Would need to know which skill
		}

		// Combat Sense
		if (name.includes('combat sense')) {
			improvements.push({
				id: `${power.id}-cs`,
				source: 'adept_power',
				sourceName: power.name,
				target: 'rea',
				value: level,
				conditional: 'Defense and surprise tests only'
			});
		}

		// Mystic Armor
		if (name.includes('mystic armor')) {
			improvements.push({
				id: `${power.id}-armor-b`,
				source: 'adept_power',
				sourceName: power.name,
				target: 'armor_ballistic',
				value: level
			});
			improvements.push({
				id: `${power.id}-armor-i`,
				source: 'adept_power',
				sourceName: power.name,
				target: 'armor_impact',
				value: level
			});
		}

		// Pain Resistance
		if (name.includes('pain resistance')) {
			improvements.push({
				id: `${power.id}-pr`,
				source: 'adept_power',
				sourceName: power.name,
				target: 'damage_resistance',
				value: level,
				conditional: 'Ignores wound modifiers'
			});
		}
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

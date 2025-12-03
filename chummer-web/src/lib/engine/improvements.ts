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
import type { QualityBonus, GameQuality } from '$lib/stores/gamedata';

/* ============================================
 * Improvement Types
 * ============================================ */

export type ImprovementTarget =
	| 'bod' | 'agi' | 'rea' | 'str' | 'cha' | 'int' | 'log' | 'wil' | 'edg'
	| 'mag' | 'res' | 'ess'
	| 'initiative' | 'initiative_dice' | 'initiative_pass'
	| 'armor_ballistic' | 'armor_impact'
	| 'physical_cm' | 'stun_cm' | 'cm_overflow'
	| 'skill' | 'skill_group' | 'skill_category'
	| 'physical_limit' | 'mental_limit' | 'social_limit'
	| 'damage_resistance' | 'spell_resistance' | 'drain_resistance'
	| 'memory' | 'composure' | 'judge_intentions'
	| 'notoriety' | 'lifestyle_cost'
	| 'cyberware_ess_multiplier' | 'bioware_ess_multiplier'
	| 'reach' | 'unarmed_dv'
	| 'movement_percent' | 'swim_percent' | 'fly_speed'
	| 'nuyen_max_bp' | 'restricted_item_count';

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
	/** For skill/skill_group/skill_category improvements, the specific name */
	readonly targetName?: string;
	/** Conditional text describing when the bonus applies */
	readonly conditional?: string;
	/** Whether this is a max modifier (affects limit) vs bonus to rating */
	readonly isMaxModifier?: boolean;
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

/** Map attribute names from XML to improvement targets */
function attrNameToTarget(name: string): ImprovementTarget | null {
	const map: Record<string, ImprovementTarget> = {
		'BOD': 'bod', 'AGI': 'agi', 'REA': 'rea', 'STR': 'str',
		'CHA': 'cha', 'INT': 'int', 'LOG': 'log', 'WIL': 'wil',
		'EDG': 'edg', 'MAG': 'mag', 'RES': 'res', 'ESS': 'ess'
	};
	return map[name.toUpperCase()] || null;
}

/**
 * Parse quality bonus data into improvements.
 * This is the core function that converts QualityBonus structures to Improvement objects.
 */
export function parseQualityBonus(
	qualityId: string,
	qualityName: string,
	bonus: QualityBonus,
	_rating: number = 1
): Improvement[] {
	const improvements: Improvement[] = [];
	let idx = 0;

	// Specific attribute modifiers (min/max/val changes)
	if (bonus.specificattribute) {
		for (const attr of bonus.specificattribute) {
			const target = attrNameToTarget(attr.name);
			if (target) {
				const value = attr.min ?? attr.max ?? attr.val ?? 0;
				if (value !== 0) {
					improvements.push({
						id: `${qualityId}-attr-${idx++}`,
						source: 'quality',
						sourceName: qualityName,
						target,
						value,
						isMaxModifier: attr.max !== undefined && attr.val === undefined
					});
				}
			}
		}
	}

	// Specific skill bonuses
	if (bonus.specificskill) {
		for (const skill of bonus.specificskill) {
			if (skill.bonus && skill.bonus !== 0) {
				improvements.push({
					id: `${qualityId}-skill-${idx++}`,
					source: 'quality',
					sourceName: qualityName,
					target: 'skill',
					targetName: skill.name,
					value: skill.bonus
				});
			}
			if (skill.max && skill.max !== 0) {
				improvements.push({
					id: `${qualityId}-skillmax-${idx++}`,
					source: 'quality',
					sourceName: qualityName,
					target: 'skill',
					targetName: skill.name,
					value: skill.max,
					isMaxModifier: true
				});
			}
		}
	}

	// Skill group bonuses
	if (bonus.skillgroup) {
		for (const group of bonus.skillgroup) {
			if (group.bonus && group.bonus !== 0) {
				improvements.push({
					id: `${qualityId}-skillgrp-${idx++}`,
					source: 'quality',
					sourceName: qualityName,
					target: 'skill_group',
					targetName: group.name,
					value: group.bonus
				});
			}
		}
	}

	// Skill category bonuses
	if (bonus.skillcategory) {
		for (const cat of bonus.skillcategory) {
			if (cat.bonus && cat.bonus !== 0) {
				improvements.push({
					id: `${qualityId}-skillcat-${idx++}`,
					source: 'quality',
					sourceName: qualityName,
					target: 'skill_category',
					targetName: cat.name,
					value: cat.bonus
				});
			}
		}
	}

	// Initiative
	if (bonus.initiative && bonus.initiative !== 0) {
		improvements.push({
			id: `${qualityId}-init`,
			source: 'quality',
			sourceName: qualityName,
			target: 'initiative',
			value: bonus.initiative
		});
	}

	// Initiative Passes
	if (bonus.initiativepass && bonus.initiativepass !== 0) {
		improvements.push({
			id: `${qualityId}-initpass`,
			source: 'quality',
			sourceName: qualityName,
			target: 'initiative_pass',
			value: bonus.initiativepass
		});
	}

	// Condition Monitor
	if (bonus.conditionmonitor && bonus.conditionmonitor !== 0) {
		improvements.push({
			id: `${qualityId}-cm`,
			source: 'quality',
			sourceName: qualityName,
			target: 'physical_cm',
			value: bonus.conditionmonitor
		});
	}

	// Notoriety
	if (bonus.notoriety && bonus.notoriety !== 0) {
		improvements.push({
			id: `${qualityId}-notor`,
			source: 'quality',
			sourceName: qualityName,
			target: 'notoriety',
			value: bonus.notoriety
		});
	}

	// Composure
	if (bonus.composure && bonus.composure !== 0) {
		improvements.push({
			id: `${qualityId}-comp`,
			source: 'quality',
			sourceName: qualityName,
			target: 'composure',
			value: bonus.composure
		});
	}

	// Judge Intentions
	if (bonus.judgeintentions && bonus.judgeintentions !== 0) {
		improvements.push({
			id: `${qualityId}-judge`,
			source: 'quality',
			sourceName: qualityName,
			target: 'judge_intentions',
			value: bonus.judgeintentions
		});
	}

	// Damage Resistance
	if (bonus.damageresistance && bonus.damageresistance !== 0) {
		improvements.push({
			id: `${qualityId}-damres`,
			source: 'quality',
			sourceName: qualityName,
			target: 'damage_resistance',
			value: bonus.damageresistance
		});
	}

	// Drain Resistance
	if (bonus.drainresist && bonus.drainresist !== 0) {
		improvements.push({
			id: `${qualityId}-drain`,
			source: 'quality',
			sourceName: qualityName,
			target: 'drain_resistance',
			value: bonus.drainresist
		});
	}

	// Lifestyle Cost
	if (bonus.lifestylecost && bonus.lifestylecost !== 0) {
		improvements.push({
			id: `${qualityId}-lifestyle`,
			source: 'quality',
			sourceName: qualityName,
			target: 'lifestyle_cost',
			value: bonus.lifestylecost
		});
	}

	// Cyberware Essence Multiplier
	if (bonus.cyberwareessmultiplier && bonus.cyberwareessmultiplier !== 100) {
		improvements.push({
			id: `${qualityId}-cyberess`,
			source: 'quality',
			sourceName: qualityName,
			target: 'cyberware_ess_multiplier',
			value: bonus.cyberwareessmultiplier
		});
	}

	// Bioware Essence Multiplier
	if (bonus.biowareessmultiplier && bonus.biowareessmultiplier !== 100) {
		improvements.push({
			id: `${qualityId}-bioess`,
			source: 'quality',
			sourceName: qualityName,
			target: 'bioware_ess_multiplier',
			value: bonus.biowareessmultiplier
		});
	}

	// Reach
	if (bonus.reach && bonus.reach !== 0) {
		improvements.push({
			id: `${qualityId}-reach`,
			source: 'quality',
			sourceName: qualityName,
			target: 'reach',
			value: bonus.reach
		});
	}

	// Unarmed DV
	if (bonus.unarmeddv && bonus.unarmeddv !== 0) {
		improvements.push({
			id: `${qualityId}-unarmed`,
			source: 'quality',
			sourceName: qualityName,
			target: 'unarmed_dv',
			value: bonus.unarmeddv
		});
	}

	// Movement Percent
	if (bonus.movementpercent && bonus.movementpercent !== 0) {
		improvements.push({
			id: `${qualityId}-move`,
			source: 'quality',
			sourceName: qualityName,
			target: 'movement_percent',
			value: bonus.movementpercent
		});
	}

	// Swim Percent
	if (bonus.swimpercent && bonus.swimpercent !== 0) {
		improvements.push({
			id: `${qualityId}-swim`,
			source: 'quality',
			sourceName: qualityName,
			target: 'swim_percent',
			value: bonus.swimpercent
		});
	}

	// Fly Speed
	if (bonus.flyspeed && bonus.flyspeed !== 0) {
		improvements.push({
			id: `${qualityId}-fly`,
			source: 'quality',
			sourceName: qualityName,
			target: 'fly_speed',
			value: bonus.flyspeed
		});
	}

	// Nuyen Max BP
	if (bonus.nuyenmaxbp && bonus.nuyenmaxbp !== 0) {
		improvements.push({
			id: `${qualityId}-nuyenbp`,
			source: 'quality',
			sourceName: qualityName,
			target: 'nuyen_max_bp',
			value: bonus.nuyenmaxbp
		});
	}

	// Restricted Item Count
	if (bonus.restricteditemcount && bonus.restricteditemcount !== 0) {
		improvements.push({
			id: `${qualityId}-restrict`,
			source: 'quality',
			sourceName: qualityName,
			target: 'restricted_item_count',
			value: bonus.restricteditemcount
		});
	}

	return improvements;
}

/**
 * Extract improvements from character qualities.
 * Uses the quality's bonus data if available from game data lookup.
 */
export function getQualityImprovements(
	qualities: readonly CharacterQuality[],
	gameQualities?: readonly GameQuality[]
): Improvement[] {
	const improvements: Improvement[] = [];

	// Create a lookup map for game quality data
	const qualityMap = new Map<string, GameQuality>();
	if (gameQualities) {
		for (const gq of gameQualities) {
			qualityMap.set(gq.name.toLowerCase(), gq);
		}
	}

	for (const quality of qualities) {
		const gameQuality = qualityMap.get(quality.name.toLowerCase());

		if (gameQuality?.bonus) {
			// Use data-driven bonus parsing
			improvements.push(...parseQualityBonus(
				quality.id,
				quality.name,
				gameQuality.bonus,
				quality.rating
			));
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
export function getAllImprovements(
	char: Character,
	gameQualities?: readonly GameQuality[]
): Improvement[] {
	const improvements: Improvement[] = [];

	// Cyberware (includes bioware currently)
	improvements.push(...getCyberwareImprovements(char.equipment.cyberware));

	// Qualities - pass game data for bonus lookup
	improvements.push(...getQualityImprovements(char.qualities, gameQualities));

	// Adept powers
	if (char.magic?.powers) {
		improvements.push(...getAdeptPowerImprovements(char.magic.powers));
	}

	return improvements;
}

/** Get total improvement value for a target. */
export function getTotalImprovement(
	char: Character,
	target: ImprovementTarget,
	gameQualities?: readonly GameQuality[]
): number {
	const improvements = getAllImprovements(char, gameQualities);

	return improvements
		.filter((i) => i.target === target)
		.reduce((sum, i) => sum + i.value, 0);
}

/** Get all improvements for a specific target with sources. */
export function getImprovementsForTarget(
	char: Character,
	target: ImprovementTarget,
	gameQualities?: readonly GameQuality[]
): Improvement[] {
	return getAllImprovements(char, gameQualities).filter((i) => i.target === target);
}

/** Get improvements grouped by source type. */
export function getImprovementsBySource(
	char: Character,
	gameQualities?: readonly GameQuality[]
): Record<ImprovementSource, Improvement[]> {
	const all = getAllImprovements(char, gameQualities);

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
	target: ImprovementTarget,
	gameQualities?: readonly GameQuality[]
): ImprovementSummary {
	const improvements = getImprovementsForTarget(char, target, gameQualities);

	return {
		target,
		totalValue: getStackedValue(improvements),
		sources: improvements.map((i) => {
			const source: { readonly name: string; readonly value: number; readonly conditional?: string } = {
				name: i.sourceName,
				value: i.value
			};
			if (i.conditional) {
				(source as { name: string; value: number; conditional: string }).conditional = i.conditional;
			}
			return source;
		})
	};
}

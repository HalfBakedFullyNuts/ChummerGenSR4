/**
 * Quality Bonuses Store
 * =====================
 * Calculates and aggregates all bonuses from character qualities.
 * Provides derived stores for attribute limits, skill bonuses, and other modifiers.
 */

import { derived, type Readable } from 'svelte/store';
import { character } from './character';
import { gameData, type QualityBonus } from './gamedata';
import type { AttributeCode } from '$lib/types/attributes';

/**
 * Aggregated attribute modifiers from qualities.
 * Maps attribute code to total modifier value.
 */
export interface AttributeModifiers {
	/** Bonus to attribute value (e.g., +1 to Body) */
	bonus: Partial<Record<AttributeCode, number>>;
	/** Minimum attribute value override */
	min: Partial<Record<AttributeCode, number>>;
	/** Maximum attribute value override (limit adjustment) */
	max: Partial<Record<AttributeCode, number>>;
}

/**
 * Skill modifier from qualities.
 */
export interface SkillModifier {
	skillName: string;
	bonus: number;
	maxRating?: number;
}

/**
 * All quality bonuses aggregated for a character.
 */
export interface QualityBonuses {
	/** Attribute modifiers */
	attributes: AttributeModifiers;
	/** Skill bonuses (by skill name) */
	skillBonuses: Map<string, number>;
	/** Skill max ratings (by skill name) */
	skillMaxRatings: Map<string, number>;
	/** Skill group bonuses (by group name) */
	skillGroupBonuses: Map<string, number>;
	/** Skill category bonuses (by category name) */
	skillCategoryBonuses: Map<string, number>;
	/** Initiative bonus */
	initiative: number;
	/** Initiative passes bonus */
	initiativePasses: number;
	/** Condition monitor bonus */
	conditionMonitor: number;
	/** Composure bonus */
	composure: number;
	/** Judge Intentions bonus */
	judgeIntentions: number;
	/** Damage Resistance bonus */
	damageResistance: number;
	/** Drain Resistance bonus */
	drainResist: number;
	/** Notoriety modifier */
	notoriety: number;
	/** Lifestyle cost modifier (percentage) */
	lifestyleCost: number;
	/** Cyberware essence multiplier */
	cyberwareEssMultiplier: number;
	/** Bioware essence multiplier */
	biowareEssMultiplier: number;
	/** Reach modifier */
	reach: number;
	/** Unarmed DV modifier */
	unarmedDV: number;
	/** Movement speed modifier (percentage) */
	movementPercent: number;
	/** Swim speed modifier (percentage) */
	swimPercent: number;
	/** Fly speed */
	flySpeed: number;
	/** Restricted item count bonus */
	restrictedItemCount: number;
	/** Max BP for nuyen */
	nuyenMaxBP: number;
	/** Free positive quality BP */
	freePositiveQualityBP: number;
	/** Free negative quality BP */
	freeNegativeQualityBP: number;
	/** Skillwire rating */
	skillwire: number;
	/** Flags */
	flags: {
		uneducated: boolean;
		uncouth: boolean;
		infirm: boolean;
		sensitiveSystem: boolean;
		blackMarketDiscount: boolean;
	};
	/** Enabled tabs (adept, magician, technomancer) */
	enabledTabs: Set<string>;
}

/** Default empty bonuses. */
const EMPTY_BONUSES: QualityBonuses = {
	attributes: { bonus: {}, min: {}, max: {} },
	skillBonuses: new Map(),
	skillMaxRatings: new Map(),
	skillGroupBonuses: new Map(),
	skillCategoryBonuses: new Map(),
	initiative: 0,
	initiativePasses: 0,
	conditionMonitor: 0,
	composure: 0,
	judgeIntentions: 0,
	damageResistance: 0,
	drainResist: 0,
	notoriety: 0,
	lifestyleCost: 0,
	cyberwareEssMultiplier: 1,
	biowareEssMultiplier: 1,
	reach: 0,
	unarmedDV: 0,
	movementPercent: 0,
	swimPercent: 0,
	flySpeed: 0,
	restrictedItemCount: 0,
	nuyenMaxBP: 50, // Default max
	freePositiveQualityBP: 0,
	freeNegativeQualityBP: 0,
	skillwire: 0,
	flags: {
		uneducated: false,
		uncouth: false,
		infirm: false,
		sensitiveSystem: false,
		blackMarketDiscount: false
	},
	enabledTabs: new Set()
};

/**
 * Apply a quality's bonus to the aggregated bonuses.
 */
function applyQualityBonus(
	bonuses: QualityBonuses,
	bonus: QualityBonus,
	selectedSkill?: string,
	selectedAttribute?: string
): void {
	// Specific attribute modifiers
	if (bonus.specificattribute) {
		for (const attr of bonus.specificattribute) {
			const code = attr.name.toLowerCase() as AttributeCode;
			if (attr.val !== undefined) {
				bonuses.attributes.bonus[code] = (bonuses.attributes.bonus[code] ?? 0) + attr.val;
			}
			if (attr.min !== undefined) {
				const current = bonuses.attributes.min[code];
				bonuses.attributes.min[code] = current !== undefined
					? Math.max(current, attr.min)
					: attr.min;
			}
			if (attr.max !== undefined) {
				const current = bonuses.attributes.max[code];
				bonuses.attributes.max[code] = current !== undefined
					? Math.min(current, attr.max)
					: attr.max;
			}
		}
	}

	// Select attribute (user-chosen attribute bonus)
	if (bonus.selectattribute && selectedAttribute) {
		const code = selectedAttribute.toLowerCase() as AttributeCode;
		if (bonus.selectattribute.max !== undefined) {
			const current = bonuses.attributes.max[code];
			// selectattribute.max is a bonus to the max, not a hard cap
			bonuses.attributes.max[code] = (current ?? 0) + bonus.selectattribute.max;
		}
		if (bonus.selectattribute.min !== undefined) {
			// min here is a reduction to the max (for negative qualities like Impaired Attribute)
			const current = bonuses.attributes.max[code];
			bonuses.attributes.max[code] = (current ?? 0) - bonus.selectattribute.min;
		}
		if (bonus.selectattribute.val !== undefined) {
			bonuses.attributes.bonus[code] = (bonuses.attributes.bonus[code] ?? 0) + bonus.selectattribute.val;
		}
	}

	// Specific skill modifiers
	if (bonus.specificskill) {
		for (const skill of bonus.specificskill) {
			if (skill.bonus !== undefined) {
				const current = bonuses.skillBonuses.get(skill.name) ?? 0;
				bonuses.skillBonuses.set(skill.name, current + skill.bonus);
			}
			if (skill.max !== undefined) {
				const current = bonuses.skillMaxRatings.get(skill.name);
				bonuses.skillMaxRatings.set(
					skill.name,
					current !== undefined ? Math.min(current, skill.max) : skill.max
				);
			}
		}
	}

	// Select skill (user-chosen skill bonus, e.g., Aptitude)
	if (bonus.selectskill && selectedSkill) {
		if (bonus.selectskill.bonus !== undefined) {
			const current = bonuses.skillBonuses.get(selectedSkill) ?? 0;
			bonuses.skillBonuses.set(selectedSkill, current + bonus.selectskill.bonus);
		}
		if (bonus.selectskill.max !== undefined) {
			// Aptitude: +1 to skill max rating
			const current = bonuses.skillMaxRatings.get(selectedSkill);
			// For Aptitude-like qualities, max is a bonus to the limit, not a hard cap
			bonuses.skillMaxRatings.set(
				selectedSkill,
				(current ?? 6) + bonus.selectskill.max // Default max is 6
			);
		}
	}

	// Skill group bonuses
	if (bonus.skillgroup) {
		for (const group of bonus.skillgroup) {
			if (group.bonus !== undefined) {
				const current = bonuses.skillGroupBonuses.get(group.name) ?? 0;
				bonuses.skillGroupBonuses.set(group.name, current + group.bonus);
			}
		}
	}

	// Skill category bonuses
	if (bonus.skillcategory) {
		for (const cat of bonus.skillcategory) {
			if (cat.bonus !== undefined) {
				const current = bonuses.skillCategoryBonuses.get(cat.name) ?? 0;
				bonuses.skillCategoryBonuses.set(cat.name, current + cat.bonus);
			}
		}
	}

	// Enable tab
	if (bonus.enabletab) {
		bonuses.enabledTabs.add(bonus.enabletab);
	}

	// Simple numeric bonuses
	if (bonus.initiative !== undefined) {
		bonuses.initiative += bonus.initiative;
	}
	if (bonus.initiativepass !== undefined) {
		bonuses.initiativePasses += bonus.initiativepass;
	}
	if (bonus.conditionmonitor !== undefined) {
		bonuses.conditionMonitor += bonus.conditionmonitor;
	}
	if (bonus.composure !== undefined) {
		bonuses.composure += bonus.composure;
	}
	if (bonus.judgeintentions !== undefined) {
		bonuses.judgeIntentions += bonus.judgeintentions;
	}
	if (bonus.damageresistance !== undefined) {
		bonuses.damageResistance += bonus.damageresistance;
	}
	if (bonus.drainresist !== undefined) {
		bonuses.drainResist += bonus.drainresist;
	}
	if (bonus.notoriety !== undefined) {
		bonuses.notoriety += bonus.notoriety;
	}
	if (bonus.lifestylecost !== undefined) {
		bonuses.lifestyleCost += bonus.lifestylecost;
	}
	if (bonus.cyberwareessmultiplier !== undefined) {
		// Multipliers stack multiplicatively
		bonuses.cyberwareEssMultiplier *= bonus.cyberwareessmultiplier;
	}
	if (bonus.biowareessmultiplier !== undefined) {
		bonuses.biowareEssMultiplier *= bonus.biowareessmultiplier;
	}
	if (bonus.reach !== undefined) {
		bonuses.reach += bonus.reach;
	}
	if (bonus.unarmeddv !== undefined) {
		bonuses.unarmedDV += bonus.unarmeddv;
	}
	if (bonus.movementpercent !== undefined) {
		bonuses.movementPercent += bonus.movementpercent;
	}
	if (bonus.swimpercent !== undefined) {
		bonuses.swimPercent += bonus.swimpercent;
	}
	if (bonus.flyspeed !== undefined) {
		bonuses.flySpeed = Math.max(bonuses.flySpeed, bonus.flyspeed);
	}
	if (bonus.restricteditemcount !== undefined) {
		bonuses.restrictedItemCount += bonus.restricteditemcount;
	}
	if (bonus.nuyenmaxbp !== undefined) {
		bonuses.nuyenMaxBP = Math.max(bonuses.nuyenMaxBP, bonus.nuyenmaxbp);
	}
	if (bonus.freepositivequalities !== undefined) {
		bonuses.freePositiveQualityBP += bonus.freepositivequalities;
	}
	if (bonus.freenegativequalities !== undefined) {
		bonuses.freeNegativeQualityBP += bonus.freenegativequalities;
	}
	if (bonus.skillwire !== undefined) {
		bonuses.skillwire = Math.max(bonuses.skillwire, bonus.skillwire);
	}

	// Flags
	if (bonus.uneducated) {
		bonuses.flags.uneducated = true;
	}
	if (bonus.uncouth) {
		bonuses.flags.uncouth = true;
	}
	if (bonus.infirm) {
		bonuses.flags.infirm = true;
	}
	if (bonus.sensitivesystem) {
		bonuses.flags.sensitiveSystem = true;
	}
	if (bonus.blackmarketdiscount) {
		bonuses.flags.blackMarketDiscount = true;
	}
}

/**
 * Derived store that calculates all quality bonuses for the current character.
 */
export const qualityBonuses: Readable<QualityBonuses> = derived(
	[character, gameData],
	([$character, $gameData]) => {
		if (!$character || !$gameData) {
			return EMPTY_BONUSES;
		}

		// Create a fresh bonuses object (don't mutate EMPTY_BONUSES)
		const bonuses: QualityBonuses = {
			attributes: { bonus: {}, min: {}, max: {} },
			skillBonuses: new Map(),
			skillMaxRatings: new Map(),
			skillGroupBonuses: new Map(),
			skillCategoryBonuses: new Map(),
			initiative: 0,
			initiativePasses: 0,
			conditionMonitor: 0,
			composure: 0,
			judgeIntentions: 0,
			damageResistance: 0,
			drainResist: 0,
			notoriety: 0,
			lifestyleCost: 0,
			cyberwareEssMultiplier: 1,
			biowareEssMultiplier: 1,
			reach: 0,
			unarmedDV: 0,
			movementPercent: 0,
			swimPercent: 0,
			flySpeed: 0,
			restrictedItemCount: 0,
			nuyenMaxBP: 50,
			freePositiveQualityBP: 0,
			freeNegativeQualityBP: 0,
			skillwire: 0,
			flags: {
				uneducated: false,
				uncouth: false,
				infirm: false,
				sensitiveSystem: false,
				blackMarketDiscount: false
			},
			enabledTabs: new Set()
		};

		// Process each quality on the character
		for (const charQuality of $character.qualities) {
			// Find the game data for this quality
			const baseName = charQuality.name.replace(/\s+#\d+$/, '');
			const gameQuality = $gameData.qualities.find(q => q.name === baseName);

			if (gameQuality?.bonus) {
				applyQualityBonus(
					bonuses,
					gameQuality.bonus,
					charQuality.selectedSkill,
					charQuality.selectedAttribute
				);
			}
		}

		return bonuses;
	}
);

/**
 * Get the effective max rating for a skill, including quality bonuses.
 * Default is 6 (can be raised by Aptitude, etc.)
 */
export function getEffectiveSkillMax(skillName: string, bonuses: QualityBonuses): number {
	const baseMax = 6;
	const qualityBonus = bonuses.skillMaxRatings.get(skillName);

	if (qualityBonus !== undefined) {
		// If the quality set a max rating bonus (like Aptitude +1), add it
		return baseMax + qualityBonus - 6; // qualityBonus already includes base 6
	}

	return baseMax;
}

/**
 * Get the effective bonus for a skill from qualities.
 */
export function getSkillBonus(skillName: string, bonuses: QualityBonuses): number {
	return bonuses.skillBonuses.get(skillName) ?? 0;
}

/**
 * Get the effective attribute max limit adjustment from qualities.
 * Positive values increase the max, negative values decrease it.
 */
export function getAttributeMaxAdjustment(
	attrCode: AttributeCode,
	bonuses: QualityBonuses
): number {
	return bonuses.attributes.max[attrCode] ?? 0;
}

/**
 * Get the effective attribute bonus from qualities.
 */
export function getAttributeBonus(
	attrCode: AttributeCode,
	bonuses: QualityBonuses
): number {
	return bonuses.attributes.bonus[attrCode] ?? 0;
}

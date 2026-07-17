/**
 * Quality Utilities
 * =================
 * Functions for formatting quality bonuses and generating searchable tags.
 */

import type { QualityBonus, GameQuality } from '$stores/gamedata';
import type { BonusValue } from '$types';

/** A formatted bonus line for display. */
export interface FormattedBonus {
	/** Short description of the bonus. */
	text: string;
	/** Whether this is a positive (buff) or negative (debuff) effect. */
	positive: boolean;
}

/**
 * Coerce a bonus value to a number for display/comparison. Quality bonus
 * values are always numeric today; unresolved "Rating"-style expressions
 * (used by cyberware/bioware/powers, not qualities) fall back to NaN,
 * which is filtered out by the `!== undefined` checks below never firing
 * on a NaN-producing string in practice.
 */
function n(v: BonusValue | undefined): number {
	return typeof v === 'number' ? v : Number(v);
}

/**
 * Format a QualityBonus object into an array of readable bonus descriptions.
 * Returns an empty array if no bonus or bonus is empty.
 */
export function formatQualityBonus(bonus: QualityBonus | undefined): FormattedBonus[] {
	if (!bonus) return [];

	const results: FormattedBonus[] = [];

	// Attribute bonuses
	if (bonus.specificattribute) {
		for (const attr of bonus.specificattribute) {
			if (attr.val !== undefined) {
				const sign = n(attr.val) >= 0 ? '+' : '';
				results.push({
					text: `${sign}${attr.val} ${attr.name}`,
					positive: n(attr.val) >= 0
				});
			}
			if (attr.min !== undefined) {
				results.push({
					text: `${attr.name} min ${attr.min}`,
					positive: true
				});
			}
			if (attr.max !== undefined) {
				results.push({
					text: `${attr.name} max ${attr.max}`,
					positive: false
				});
			}
		}
	}

	// Add new attribute (like MAG for Adept)
	if (bonus.addattribute) {
		for (const attr of bonus.addattribute) {
			results.push({
				text: `Gains ${attr.name} attribute`,
				positive: true
			});
		}
	}

	// Enable tab (magician, adept, technomancer)
	if (bonus.enabletab) {
		const tabName = bonus.enabletab.charAt(0).toUpperCase() + bonus.enabletab.slice(1);
		results.push({
			text: `Enables ${tabName} abilities`,
			positive: true
		});
	}

	// Skill bonuses
	if (bonus.specificskill) {
		for (const skill of bonus.specificskill) {
			if (skill.bonus !== undefined) {
				const sign = n(skill.bonus) >= 0 ? '+' : '';
				results.push({
					text: `${sign}${skill.bonus} ${skill.name}`,
					positive: n(skill.bonus) >= 0
				});
			}
			if (skill.max !== undefined) {
				results.push({
					text: `${skill.name} max ${skill.max}`,
					positive: false
				});
			}
		}
	}

	// Skill group bonuses
	if (bonus.skillgroup) {
		for (const group of bonus.skillgroup) {
			if (group.bonus !== undefined) {
				const sign = n(group.bonus) >= 0 ? '+' : '';
				results.push({
					text: `${sign}${group.bonus} ${group.name} group`,
					positive: n(group.bonus) >= 0
				});
			}
		}
	}

	// Skill category bonuses
	if (bonus.skillcategory) {
		for (const cat of bonus.skillcategory) {
			if (cat.bonus !== undefined) {
				const sign = n(cat.bonus) >= 0 ? '+' : '';
				results.push({
					text: `${sign}${cat.bonus} ${cat.name} skills`,
					positive: n(cat.bonus) >= 0
				});
			}
		}
	}

	// Select skill (user choice)
	if (bonus.selectskill) {
		if (bonus.selectskill.bonus !== undefined) {
			const sign = n(bonus.selectskill.bonus) >= 0 ? '+' : '';
			results.push({
				text: `${sign}${bonus.selectskill.bonus} to chosen skill`,
				positive: n(bonus.selectskill.bonus) >= 0
			});
		}
	}

	// Select attribute (user choice)
	if (bonus.selectattribute) {
		if (bonus.selectattribute.val !== undefined) {
			const sign = n(bonus.selectattribute.val) >= 0 ? '+' : '';
			results.push({
				text: `${sign}${bonus.selectattribute.val} to chosen attribute`,
				positive: n(bonus.selectattribute.val) >= 0
			});
		}
	}

	// Initiative
	if (bonus.initiative !== undefined) {
		const sign = n(bonus.initiative) >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.initiative} Initiative`,
			positive: n(bonus.initiative) >= 0
		});
	}

	// Initiative Pass
	if (bonus.initiativepass !== undefined) {
		const sign = n(bonus.initiativepass) >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.initiativepass} Initiative Pass${bonus.initiativepass !== 1 ? 'es' : ''}`,
			positive: n(bonus.initiativepass) >= 0
		});
	}

	// Condition Monitor (physical/stun/threshold/overflow boxes)
	if (bonus.conditionmonitor) {
		const cm = bonus.conditionmonitor;
		if (cm.physical !== undefined) {
			const sign = n(cm.physical) >= 0 ? '+' : '';
			results.push({
				text: `${sign}${cm.physical} Physical Condition Monitor`,
				positive: n(cm.physical) >= 0
			});
		}
		if (cm.stun !== undefined) {
			const sign = n(cm.stun) >= 0 ? '+' : '';
			results.push({
				text: `${sign}${cm.stun} Stun Condition Monitor`,
				positive: n(cm.stun) >= 0
			});
		}
		if (cm.overflow !== undefined) {
			const sign = n(cm.overflow) >= 0 ? '+' : '';
			results.push({
				text: `${sign}${cm.overflow} Condition Monitor Overflow`,
				positive: n(cm.overflow) >= 0
			});
		}
	}

	// Notoriety
	if (bonus.notoriety !== undefined) {
		const sign = n(bonus.notoriety) >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.notoriety} Notoriety`,
			positive: n(bonus.notoriety) <= 0 // Lower notoriety is better
		});
	}

	// Composure
	if (bonus.composure !== undefined) {
		const sign = n(bonus.composure) >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.composure} Composure`,
			positive: n(bonus.composure) >= 0
		});
	}

	// Judge Intentions
	if (bonus.judgeintentions !== undefined) {
		const sign = n(bonus.judgeintentions) >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.judgeintentions} Judge Intentions`,
			positive: n(bonus.judgeintentions) >= 0
		});
	}

	// Damage Resistance
	if (bonus.damageresistance !== undefined) {
		const sign = n(bonus.damageresistance) >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.damageresistance} Damage Resistance`,
			positive: n(bonus.damageresistance) >= 0
		});
	}

	// Drain Resistance
	if (bonus.drainresist !== undefined) {
		const sign = n(bonus.drainresist) >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.drainresist} Drain Resistance`,
			positive: n(bonus.drainresist) >= 0
		});
	}

	// Lifestyle cost modifier
	if (bonus.lifestylecost !== undefined) {
		results.push({
			text: `${bonus.lifestylecost}% Lifestyle cost`,
			positive: n(bonus.lifestylecost) < 0
		});
	}

	// Cyberware essence multiplier
	if (bonus.cyberwareessmultiplier !== undefined) {
		const percent = Math.round((n(bonus.cyberwareessmultiplier) - 1) * 100);
		const sign = percent >= 0 ? '+' : '';
		results.push({
			text: `${sign}${percent}% Cyberware Essence`,
			positive: percent < 0
		});
	}

	// Bioware essence multiplier
	if (bonus.biowareessmultiplier !== undefined) {
		const percent = Math.round((n(bonus.biowareessmultiplier) - 1) * 100);
		const sign = percent >= 0 ? '+' : '';
		results.push({
			text: `${sign}${percent}% Bioware Essence`,
			positive: percent < 0
		});
	}

	// Reach
	if (bonus.reach !== undefined) {
		const sign = n(bonus.reach) >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.reach} Reach`,
			positive: n(bonus.reach) >= 0
		});
	}

	// Unarmed DV
	if (bonus.unarmeddv !== undefined) {
		const sign = n(bonus.unarmeddv) >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.unarmeddv} Unarmed DV`,
			positive: n(bonus.unarmeddv) >= 0
		});
	}

	// Movement percent
	if (bonus.movementpercent !== undefined) {
		const sign = n(bonus.movementpercent) >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.movementpercent}% Movement`,
			positive: n(bonus.movementpercent) >= 0
		});
	}

	// Swim percent
	if (bonus.swimpercent !== undefined) {
		const sign = n(bonus.swimpercent) >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.swimpercent}% Swimming`,
			positive: n(bonus.swimpercent) >= 0
		});
	}

	// Fly speed
	if (bonus.flyspeed !== undefined) {
		results.push({
			text: `Fly speed ${bonus.flyspeed}`,
			positive: true
		});
	}

	// Restricted gear allowance
	if (bonus.restricteditemcount !== undefined) {
		results.push({
			text: `+${bonus.restricteditemcount} Restricted item${bonus.restricteditemcount !== 1 ? 's' : ''}`,
			positive: true
		});
	}

	// Nuyen max BP
	if (bonus.nuyenmaxbp !== undefined) {
		results.push({
			text: `Max ${bonus.nuyenmaxbp} BP on Nuyen`,
			positive: n(bonus.nuyenmaxbp) > 0
		});
	}

	// Free quality BP
	if (bonus.freepositivequalities !== undefined) {
		results.push({
			text: `${bonus.freepositivequalities} free Positive Quality BP`,
			positive: true
		});
	}
	if (bonus.freenegativequalities !== undefined) {
		results.push({
			text: `${bonus.freenegativequalities} free Negative Quality BP`,
			positive: true
		});
	}

	// Skillwire
	if (bonus.skillwire !== undefined) {
		results.push({
			text: `Skillwire Rating ${bonus.skillwire}`,
			positive: true
		});
	}

	// Flag-based penalties
	if (bonus.uneducated) {
		results.push({
			text: 'Technical/Academic skills cost double',
			positive: false
		});
	}
	if (bonus.uncouth) {
		results.push({
			text: 'Social skills cost double',
			positive: false
		});
	}
	if (bonus.infirm) {
		results.push({
			text: 'Physical attributes cost double',
			positive: false
		});
	}
	if (bonus.sensitivesystem) {
		results.push({
			text: 'Double Essence cost for cyberware',
			positive: false
		});
	}

	// Black market access
	if (bonus.blackmarketdiscount) {
		results.push({
			text: 'Black Market discount access',
			positive: true
		});
	}

	return results;
}

/**
 * Format quality bonus as a single-line summary string.
 * Returns empty string if no bonuses.
 */
export function formatQualityBonusSummary(bonus: QualityBonus | undefined): string {
	const formatted = formatQualityBonus(bonus);
	if (formatted.length === 0) return '';
	return formatted.map((f) => f.text).join(', ');
}

/** Quality tag categories for searchable keywords. */
export type QualityTag =
	| 'combat'
	| 'social'
	| 'magic'
	| 'matrix'
	| 'physical'
	| 'mental'
	| 'skill'
	| 'attribute'
	| 'movement'
	| 'resistance'
	| 'essence'
	| 'karma'
	| 'metatype'
	| 'lifestyle'
	| 'gear'
	| 'initiative';

/**
 * Generate searchable tags for a quality based on its bonuses and effect text.
 * Returns array of tag strings for filtering/searching.
 */
export function generateQualityTags(quality: GameQuality): QualityTag[] {
	const tags = new Set<QualityTag>();
	const bonus = quality.bonus;
	const effect = quality.effect?.toLowerCase() ?? '';

	// Analyze bonus structure
	if (bonus) {
		// Combat-related
		if (
			bonus.reach !== undefined ||
			bonus.unarmeddv !== undefined ||
			bonus.damageresistance !== undefined
		) {
			tags.add('combat');
		}

		// Initiative
		if (bonus.initiative !== undefined || bonus.initiativepass !== undefined) {
			tags.add('initiative');
			tags.add('combat');
		}

		// Social
		if (
			bonus.composure !== undefined ||
			bonus.judgeintentions !== undefined ||
			bonus.notoriety !== undefined
		) {
			tags.add('social');
		}
		if (bonus.uncouth) {
			tags.add('social');
		}

		// Magic
		if (
			bonus.drainresist !== undefined ||
			bonus.enabletab === 'magician' ||
			bonus.enabletab === 'adept'
		) {
			tags.add('magic');
		}
		if (bonus.addattribute?.some((a) => a.name === 'MAG')) {
			tags.add('magic');
		}

		// Matrix / Technomancer
		if (bonus.enabletab === 'technomancer') {
			tags.add('matrix');
		}
		if (bonus.addattribute?.some((a) => a.name === 'RES')) {
			tags.add('matrix');
		}

		// Skill-related
		if (
			bonus.specificskill ||
			bonus.skillgroup ||
			bonus.skillcategory ||
			bonus.selectskill ||
			bonus.skillwire !== undefined
		) {
			tags.add('skill');
		}
		if (bonus.uneducated || bonus.uncouth) {
			tags.add('skill');
		}

		// Attribute-related
		if (bonus.specificattribute || bonus.addattribute || bonus.selectattribute) {
			tags.add('attribute');
		}
		if (bonus.infirm) {
			tags.add('attribute');
			tags.add('physical');
		}

		// Movement
		if (
			bonus.movementpercent !== undefined ||
			bonus.swimpercent !== undefined ||
			bonus.flyspeed !== undefined
		) {
			tags.add('movement');
			tags.add('physical');
		}

		// Resistance
		if (bonus.damageresistance !== undefined || bonus.drainresist !== undefined) {
			tags.add('resistance');
		}

		// Essence
		if (
			bonus.cyberwareessmultiplier !== undefined ||
			bonus.biowareessmultiplier !== undefined ||
			bonus.sensitivesystem
		) {
			tags.add('essence');
		}

		// Lifestyle
		if (bonus.lifestylecost !== undefined) {
			tags.add('lifestyle');
		}

		// Gear
		if (bonus.restricteditemcount !== undefined || bonus.blackmarketdiscount) {
			tags.add('gear');
		}

		// Condition monitor (physical/mental)
		if (bonus.conditionmonitor !== undefined) {
			tags.add('physical');
		}
	}

	// Analyze effect text for additional keywords
	if (effect.includes('combat') || effect.includes('attack') || effect.includes('weapon')) {
		tags.add('combat');
	}
	if (effect.includes('social') || effect.includes('charisma') || effect.includes('negotiation')) {
		tags.add('social');
	}
	if (
		effect.includes('magic') ||
		effect.includes('spell') ||
		effect.includes('mana') ||
		effect.includes('astral')
	) {
		tags.add('magic');
	}
	if (
		effect.includes('matrix') ||
		effect.includes('hacking') ||
		effect.includes('technomancer') ||
		effect.includes('sprite')
	) {
		tags.add('matrix');
	}
	if (
		effect.includes('physical') ||
		effect.includes('body') ||
		effect.includes('strength') ||
		effect.includes('agility')
	) {
		tags.add('physical');
	}
	if (
		effect.includes('mental') ||
		effect.includes('logic') ||
		effect.includes('willpower') ||
		effect.includes('intuition')
	) {
		tags.add('mental');
	}
	if (
		effect.includes('metatype') ||
		effect.includes('ork') ||
		effect.includes('elf') ||
		effect.includes('dwarf') ||
		effect.includes('troll')
	) {
		tags.add('metatype');
	}
	if (effect.includes('karma')) {
		tags.add('karma');
	}
	if (effect.includes('initiative')) {
		tags.add('initiative');
	}

	return Array.from(tags);
}

/**
 * Check if a quality matches a search query.
 * Searches name, effect, and generated tags.
 */
export function qualityMatchesSearch(quality: GameQuality, search: string): boolean {
	if (!search) return true;

	const lower = search.toLowerCase();
	const terms = lower.split(/\s+/).filter((t) => t.length > 0);

	// Get searchable text
	const name = quality.name.toLowerCase();
	const effect = quality.effect?.toLowerCase() ?? '';
	const tags = generateQualityTags(quality);
	const bonusSummary = formatQualityBonusSummary(quality.bonus).toLowerCase();

	// All terms must match something
	return terms.every((term) => {
		// Check if term is a tag prefix (e.g., "tag:combat" or just "combat" for tags)
		if (term.startsWith('tag:')) {
			const tagSearch = term.slice(4);
			return tags.some((t) => t.includes(tagSearch));
		}

		// Normal search - check all fields
		return (
			name.includes(term) ||
			effect.includes(term) ||
			tags.some((t) => t.includes(term)) ||
			bonusSummary.includes(term)
		);
	});
}

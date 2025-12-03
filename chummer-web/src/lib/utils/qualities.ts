/**
 * Quality Utilities
 * =================
 * Functions for formatting quality bonuses and generating searchable tags.
 */

import type { QualityBonus, GameQuality } from '$stores/gamedata';

/**
 * Manual effect descriptions for qualities that don't have mechanical bonuses.
 * These provide human-readable descriptions based on SR4 rulebooks.
 */
export const QUALITY_DESCRIPTIONS: Record<string, string> = {
	// === Positive Qualities (SR4 Core) ===
	'360-degree Eyesight': 'Cannot be flanked or surprised from behind; +2 dice to visual Perception',
	'Ambidextrous': 'No off-hand penalty; gain +1 die before splitting dice pool when using two weapons',
	'Astral Chameleon': 'Astral signature fades in half normal time; -2 dice to track via astral signature',
	'Blandness': '-2 dice to attempts to remember or describe you; +2 to blend into crowds',
	'Codeslinger': '+2 dice to a specific Matrix action (selected at purchase)',
	'Double Jointed': '+2 dice to escape restraints; can fit through tight spaces',
	'Erased (1 Week)': 'Public record data has been erased; data theft results deleted in 1 week',
	'Erased (24 Hours)': 'Public record data has been erased; data theft results deleted in 24 hours',
	'First Impression': '+2 dice to Social skill tests during first meeting with a person or group',
	'Guts': '+2 dice to resist fear and intimidation; may spend Edge to auto-succeed fear tests',
	'High Pain Tolerance': 'Ignore wound modifiers equal to rating',
	'Home Ground': '+2 dice to tests within chosen area of familiarity',
	'Human Looking': 'Metahuman appears human; +2 dice to avoid discrimination',
	'Lucky': '+1 Edge attribute maximum',
	'Magic Resistance': '+rating x2 dice to resist spells (cannot be targeted by beneficial spells)',
	'Mentor Spirit': 'Receive guidance and bonuses from a mentor spirit',
	'Murky Link': 'Ritual spellcasters take -3 dice to target you',
	'Natural Hardening': 'Immune to Black IC biofeedback damage up to rating',
	'Natural Immunity': '+2 dice to resist specific toxin or disease (selected at purchase)',
	'Photographic Memory': '+2 dice to memory tests; never forget anything witnessed directly',
	'Quick Healer': '+2 dice to Healing tests made on you',
	'Resistance to Pathogens/Toxins': '+1 die to resist all pathogens and toxins',
	'Spirit Affinity': '+1 die to summon and bind spirits of chosen type',
	'Toughness': '+1 Physical Condition Monitor box',
	'Will to Live': '+1 Overflow box per rating (1-3)',

	// === Negative Qualities (SR4 Core) ===
	'Addiction (Mild)': 'Must make Addiction test at interval; failure causes craving',
	'Addiction (Moderate)': 'Must make Addiction test at interval; failure causes withdrawal',
	'Addiction (Severe)': 'Must make Addiction test at interval; severe withdrawal on failure',
	'Addiction (Burnout)': 'Automatic withdrawal without regular use; -1 to attributes while addicted',
	'Allergy (Mild)': 'Suffer 2 boxes damage per minute of exposure (resisted with Body)',
	'Allergy (Moderate)': 'Suffer 3 boxes damage per Combat Turn of exposure (resisted with Body)',
	'Allergy (Severe)': 'Suffer 1 box Physical damage per Combat Turn of exposure',
	'Allergy (Extreme)': 'Suffer 2 boxes Physical damage per Combat Turn of exposure',
	'Bad Luck': 'Edge does not refresh; only 1 Edge point per session from GM award',
	'Bad Rep': '+3 Notoriety; -2 dice to Social tests with those who know your reputation',
	'Codeblock': '-2 dice to a specific Matrix action (selected at purchase)',
	'Combat Paralysis': 'Always act last in first Combat Turn; -3 dice on Surprise tests',
	'Elf Poser': 'Human who believes they are an elf; risk of social consequences',
	'Gremlins': 'Technology glitches around you; devices more likely to fail',
	'Incompetent': 'Cannot default on chosen skill group; skill group max is 0',
	'Low Pain Tolerance': 'Wound modifiers doubled',
	'Ork Poser': 'Human/Elf who believes they are an ork; risk of social consequences',
	'Scorched': 'Cannot enter VR; BTL exposure causes 1 box Stun damage',
	'Sensitive Neural Structure': 'Black IC damage and dumpshock deal Physical instead of Stun',
	'Sensitive System': 'Double Essence cost for all cyberware',
	'SINner (Standard)': 'Have a legal SIN; can be tracked and identified',
	'SINner (Criminal)': 'Have a criminal SIN; -1 dice to Social tests when SIN is known',
	'SINner (Corporate Limited)': 'Limited corporate SIN; tied to a megacorporation',
	'SINner (Corporate)': 'Full corporate SIN; owned by a megacorporation',
	'Spirit Bane': '-2 dice when dealing with chosen spirit type; spirits are hostile',
	'Uncouth': 'Social skill groups cost double Karma; cannot use Social skills as groups',
	'Uneducated': 'Technical and Academic knowledge skills cost double Karma',
	'Weak Immune System': '-2 dice to resist diseases and infections',

	// === Additional Common Qualities ===
	'Adrenaline Surge': '+1 Initiative Pass on first turn of combat; requires Body 5+',
	'Bilingual': 'Native fluency in two languages',
	'Common Sense': 'GM warns you before obviously stupid actions',
	'Focused Concentration': 'Sustain spells without penalty equal to rating',
	'Restricted Gear': 'May purchase one item with Availability up to 20 at character creation',
	'School of Hard Knocks': 'Street knowledge comes naturally; +1 die to Street knowledge tests',
	'Technical School': '+1 die to Technical skill tests when using AR instructions',
	'College Education': '+1 die to Academic knowledge tests',
	'Distinctive Style': 'Memorable appearance; +2 dice to identify or remember you',
	'Flashbacks': 'Risk of flashbacks when stressed; may freeze or act irrationally',
	'Amnesia': 'Cannot remember past events; backstory unknown',
	'Astral Beacon': 'Astral signature is unusually bright; +2 dice to track you astrally',
	'Creature of Comfort': 'Suffer penalties when lifestyle drops below High',
	'Dependent': 'Have someone who relies on you; must support them',
	'Loss of Confidence': '-2 dice to a specific skill when under pressure',
	'Prejudiced': 'Hostile toward a specific group; penalties to social interactions',
	'Simsense Vertigo': '-2 dice to all actions while in VR or using simsense',
	'Social Stress': '-1 die to Social tests in specific situations',
	'Vindictive': 'Compelled to seek revenge; -2 Composure when wronged',

	// === Magic/Resonance Qualities ===
	'Magician': 'Awakened character capable of casting spells and summoning spirits',
	'Mystic Adept': 'Awakened with both adept powers and spellcasting ability',
	'Technomancer': 'Emerged character with innate Matrix abilities',
	'Astral Perception': 'Can perceive the astral plane at will',
	'Spirit Whisperer': 'May communicate with unbound spirits; +1 die to Social tests with spirits',
	'Sprite Affinity': 'Chosen sprite type is more cooperative; +1 die to compile and register'
};

/** A formatted bonus line for display. */
export interface FormattedBonus {
	/** Short description of the bonus. */
	text: string;
	/** Whether this is a positive (buff) or negative (debuff) effect. */
	positive: boolean;
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
				const sign = attr.val >= 0 ? '+' : '';
				results.push({
					text: `${sign}${attr.val} ${attr.name}`,
					positive: attr.val >= 0
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
				const sign = skill.bonus >= 0 ? '+' : '';
				results.push({
					text: `${sign}${skill.bonus} ${skill.name}`,
					positive: skill.bonus >= 0
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
				const sign = group.bonus >= 0 ? '+' : '';
				results.push({
					text: `${sign}${group.bonus} ${group.name} group`,
					positive: group.bonus >= 0
				});
			}
		}
	}

	// Skill category bonuses
	if (bonus.skillcategory) {
		for (const cat of bonus.skillcategory) {
			if (cat.bonus !== undefined) {
				const sign = cat.bonus >= 0 ? '+' : '';
				results.push({
					text: `${sign}${cat.bonus} ${cat.name} skills`,
					positive: cat.bonus >= 0
				});
			}
		}
	}

	// Select skill (user choice)
	if (bonus.selectskill) {
		if (bonus.selectskill.bonus !== undefined) {
			const sign = bonus.selectskill.bonus >= 0 ? '+' : '';
			results.push({
				text: `${sign}${bonus.selectskill.bonus} to chosen skill`,
				positive: bonus.selectskill.bonus >= 0
			});
		}
	}

	// Select attribute (user choice)
	if (bonus.selectattribute) {
		if (bonus.selectattribute.val !== undefined) {
			const sign = bonus.selectattribute.val >= 0 ? '+' : '';
			results.push({
				text: `${sign}${bonus.selectattribute.val} to chosen attribute`,
				positive: bonus.selectattribute.val >= 0
			});
		}
	}

	// Initiative
	if (bonus.initiative !== undefined) {
		const sign = bonus.initiative >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.initiative} Initiative`,
			positive: bonus.initiative >= 0
		});
	}

	// Initiative Pass
	if (bonus.initiativepass !== undefined) {
		const sign = bonus.initiativepass >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.initiativepass} Initiative Pass${bonus.initiativepass !== 1 ? 'es' : ''}`,
			positive: bonus.initiativepass >= 0
		});
	}

	// Condition Monitor
	if (bonus.conditionmonitor !== undefined) {
		const sign = bonus.conditionmonitor >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.conditionmonitor} Condition Monitor`,
			positive: bonus.conditionmonitor >= 0
		});
	}

	// Notoriety
	if (bonus.notoriety !== undefined) {
		const sign = bonus.notoriety >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.notoriety} Notoriety`,
			positive: bonus.notoriety <= 0 // Lower notoriety is better
		});
	}

	// Composure
	if (bonus.composure !== undefined) {
		const sign = bonus.composure >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.composure} Composure`,
			positive: bonus.composure >= 0
		});
	}

	// Judge Intentions
	if (bonus.judgeintentions !== undefined) {
		const sign = bonus.judgeintentions >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.judgeintentions} Judge Intentions`,
			positive: bonus.judgeintentions >= 0
		});
	}

	// Damage Resistance
	if (bonus.damageresistance !== undefined) {
		const sign = bonus.damageresistance >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.damageresistance} Damage Resistance`,
			positive: bonus.damageresistance >= 0
		});
	}

	// Drain Resistance
	if (bonus.drainresist !== undefined) {
		const sign = bonus.drainresist >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.drainresist} Drain Resistance`,
			positive: bonus.drainresist >= 0
		});
	}

	// Lifestyle cost modifier
	if (bonus.lifestylecost !== undefined) {
		results.push({
			text: `${bonus.lifestylecost}% Lifestyle cost`,
			positive: bonus.lifestylecost < 0
		});
	}

	// Cyberware essence multiplier (stored as percentage, e.g., 90 = 90% of normal cost)
	if (bonus.cyberwareessmultiplier !== undefined) {
		const percent = Math.round(bonus.cyberwareessmultiplier - 100);
		const sign = percent >= 0 ? '+' : '';
		results.push({
			text: `${sign}${percent}% Cyberware Essence cost`,
			positive: percent < 0
		});
	}

	// Bioware essence multiplier (stored as percentage, e.g., 90 = 90% of normal cost)
	if (bonus.biowareessmultiplier !== undefined) {
		const percent = Math.round(bonus.biowareessmultiplier - 100);
		const sign = percent >= 0 ? '+' : '';
		results.push({
			text: `${sign}${percent}% Bioware Essence cost`,
			positive: percent < 0
		});
	}

	// Basic Bioware essence multiplier (Type O System, Ronin)
	if (bonus.basicbiowareessmultiplier !== undefined) {
		const percent = Math.round(bonus.basicbiowareessmultiplier - 100);
		const sign = percent >= 0 ? '+' : '';
		results.push({
			text: `${sign}${percent}% Basic Bioware Essence cost`,
			positive: percent < 0
		});
	}

	// Reach
	if (bonus.reach !== undefined) {
		const sign = bonus.reach >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.reach} Reach`,
			positive: bonus.reach >= 0
		});
	}

	// Unarmed DV
	if (bonus.unarmeddv !== undefined) {
		const sign = bonus.unarmeddv >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.unarmeddv} Unarmed DV`,
			positive: bonus.unarmeddv >= 0
		});
	}

	// Movement percent
	if (bonus.movementpercent !== undefined) {
		const sign = bonus.movementpercent >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.movementpercent}% Movement`,
			positive: bonus.movementpercent >= 0
		});
	}

	// Swim percent
	if (bonus.swimpercent !== undefined) {
		const sign = bonus.swimpercent >= 0 ? '+' : '';
		results.push({
			text: `${sign}${bonus.swimpercent}% Swimming`,
			positive: bonus.swimpercent >= 0
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
			positive: bonus.nuyenmaxbp > 0
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
	return formatted.map(f => f.text).join(', ');
}

/**
 * Get a human-readable description for a quality.
 * Returns the quality's effect field if defined, otherwise looks up
 * in QUALITY_DESCRIPTIONS, finally returns undefined if not found.
 */
export function getQualityDescription(quality: GameQuality): string | undefined {
	// Prefer the effect from the quality data itself
	if (quality.effect) {
		return quality.effect;
	}

	// Fall back to manual descriptions
	return QUALITY_DESCRIPTIONS[quality.name];
}

/**
 * Check if a quality has any displayable information (effect, bonus, or description).
 */
export function hasQualityInfo(quality: GameQuality): boolean {
	if (quality.effect) return true;
	if (quality.bonus && formatQualityBonus(quality.bonus).length > 0) return true;
	if (QUALITY_DESCRIPTIONS[quality.name]) return true;
	return false;
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
		if (bonus.composure !== undefined || bonus.judgeintentions !== undefined || bonus.notoriety !== undefined) {
			tags.add('social');
		}
		if (bonus.uncouth) {
			tags.add('social');
		}

		// Magic
		if (bonus.drainresist !== undefined || bonus.enabletab === 'magician' || bonus.enabletab === 'adept') {
			tags.add('magic');
		}
		if (bonus.addattribute?.some(a => a.name === 'MAG')) {
			tags.add('magic');
		}

		// Matrix / Technomancer
		if (bonus.enabletab === 'technomancer') {
			tags.add('matrix');
		}
		if (bonus.addattribute?.some(a => a.name === 'RES')) {
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
			bonus.basicbiowareessmultiplier !== undefined ||
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
	if (effect.includes('magic') || effect.includes('spell') || effect.includes('mana') || effect.includes('astral')) {
		tags.add('magic');
	}
	if (effect.includes('matrix') || effect.includes('hacking') || effect.includes('technomancer') || effect.includes('sprite')) {
		tags.add('matrix');
	}
	if (effect.includes('physical') || effect.includes('body') || effect.includes('strength') || effect.includes('agility')) {
		tags.add('physical');
	}
	if (effect.includes('mental') || effect.includes('logic') || effect.includes('willpower') || effect.includes('intuition')) {
		tags.add('mental');
	}
	if (effect.includes('metatype') || effect.includes('ork') || effect.includes('elf') || effect.includes('dwarf') || effect.includes('troll')) {
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
	const terms = lower.split(/\s+/).filter(t => t.length > 0);

	// Get searchable text
	const name = quality.name.toLowerCase();
	const effect = quality.effect?.toLowerCase() ?? '';
	const tags = generateQualityTags(quality);
	const bonusSummary = formatQualityBonusSummary(quality.bonus).toLowerCase();

	// All terms must match something
	return terms.every(term => {
		// Check if term is a tag prefix (e.g., "tag:combat" or just "combat" for tags)
		if (term.startsWith('tag:')) {
			const tagSearch = term.slice(4);
			return tags.some(t => t.includes(tagSearch));
		}

		// Normal search - check all fields
		return (
			name.includes(term) ||
			effect.includes(term) ||
			tags.some(t => t.includes(term)) ||
			bonusSummary.includes(term)
		);
	});
}

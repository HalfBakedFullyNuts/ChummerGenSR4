/**
 * Career Store Module
 * ===================
 * Career mode transition, karma/nuyen tracking, expense log,
 * and post-creation advancement (skills, attributes, magic).
 */

import { get, derived, type Readable } from 'svelte/store';
import { type Character, type ExpenseEntry, getKnowledgeSkillAttribute } from '$types';
import { characterStore, generateId } from './character';

/* ========================================
 * Constants
 * ======================================== */

/** Karma costs for CAREER MODE advancement in SR4. */
export const KARMA_COSTS = {
	/* Skills */
	NEW_SKILL: 4,
	IMPROVE_SKILL_MULTIPLIER: 2,
	NEW_SPECIALIZATION: 2,
	NEW_SKILL_GROUP: 10,
	IMPROVE_SKILL_GROUP_MULTIPLIER: 5,
	NEW_KNOWLEDGE_SKILL: 2,
	IMPROVE_KNOWLEDGE_SKILL_MULTIPLIER: 1,

	/* Attributes */
	IMPROVE_ATTRIBUTE_MULTIPLIER: 5,

	/* Magic */
	NEW_SPELL: 5,
	NEW_COMPLEX_FORM: 5,
	IMPROVE_COMPLEX_FORM_MULTIPLIER: 1,
	INITIATION_BASE: 10,
	INITIATION_MULTIPLIER: 3,
	SUBMERSION_BASE: 10,
	SUBMERSION_MULTIPLIER: 3,

	/* Qualities & Contacts */
	QUALITY_MULTIPLIER: 2,
	CONTACT_MULTIPLIER: 2,

	/* Resources */
	NUYEN_PER_KARMA: 2500
} as const;

/** Focus bonding karma costs by focus type. */
export const FOCUS_BONDING_COSTS = {
	ANCHORING: 3,
	COUNTERSPELLING: 2,
	BANISHING: 2,
	DISENCHANTING: 3,
	POWER: 6,
	SHIELDING: 4,
	SPELL: 3,
	SPELL_CATEGORY: 4,
	SPELLCASTING: 2,
	SUSTAINING: 2,
	CENTERING: 3,
	CENTERING_FLEXIBLE_SIGNATURE: 4,
	MASKING: 5,
	POWER_QI: 2,
	SUMMONING: 3,
	BINDING: 2,
	WEAPON: 3
} as const;

/* ========================================
 * General Career Functions
 * ======================================== */

/** Transition character from creation to career mode. */
export function enterCareerMode(): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (char.status === 'career')
		return { success: false, error: 'Character is already in career mode' };

	characterStore.update((c) => {
		if (!c) return c;
		return {
			...c,
			status: 'career',
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Derived store for career mode status. */
export const isCareerMode: Readable<boolean> = derived(
	{ subscribe: characterStore.subscribe } as Readable<Character | null>,
	($char) => $char?.status === 'career'
);

/** Add an expense entry to the log. */
export function addExpenseEntry(type: 'karma' | 'nuyen', amount: number, reason: string): void {
	const entry: ExpenseEntry = {
		id: generateId(),
		date: new Date().toISOString(),
		type,
		amount,
		reason
	};

	characterStore.update((c) => {
		if (!c) return c;
		return {
			...c,
			expenseLog: [...c.expenseLog, entry],
			updatedAt: new Date().toISOString()
		};
	});
}

/** Get the expense log for the character. */
export function getExpenseLog(): readonly ExpenseEntry[] {
	const char = get(characterStore);
	return char?.expenseLog || [];
}

/* ========================================
 * Karma/Nuyen Management
 * ======================================== */

/** Spend karma (internal helper). */
export function spendKarmaInternal(
	amount: number,
	reason: string
): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (char.karma < amount)
		return { success: false, error: `Not enough karma (have ${char.karma}, need ${amount})` };

	characterStore.update((c) => {
		if (!c) return c;
		return {
			...c,
			karma: c.karma - amount,
			updatedAt: new Date().toISOString()
		};
	});

	addExpenseEntry('karma', -amount, reason);
	return { success: true };
}

/** Award karma to the character. */
export function awardKarma(amount: number, reason: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (amount <= 0) return { success: false, error: 'Amount must be positive' };

	characterStore.update((c) => {
		if (!c) return c;
		return {
			...c,
			karma: c.karma + amount,
			totalKarma: c.totalKarma + amount,
			updatedAt: new Date().toISOString()
		};
	});

	addExpenseEntry('karma', amount, reason);
	return { success: true };
}

/** Award nuyen to the character. */
export function awardNuyen(amount: number, reason: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (amount <= 0) return { success: false, error: 'Amount must be positive' };

	characterStore.update((c) => {
		if (!c) return c;
		return {
			...c,
			nuyen: c.nuyen + amount,
			updatedAt: new Date().toISOString()
		};
	});

	addExpenseEntry('nuyen', amount, reason);
	return { success: true };
}

/** Spend nuyen. */
export function spendNuyen(amount: number, reason: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (amount <= 0) return { success: false, error: 'Amount must be positive' };
	if (char.nuyen < amount)
		return { success: false, error: `Not enough nuyen (have ${char.nuyen}, need ${amount})` };

	characterStore.update((c) => {
		if (!c) return c;
		return {
			...c,
			nuyen: c.nuyen - amount,
			updatedAt: new Date().toISOString()
		};
	});

	addExpenseEntry('nuyen', -amount, reason);
	return { success: true };
}

/* ========================================
 * Advancement Functions
 * ======================================== */

/** Calculate karma cost to improve an attribute. */
export function getAttributeImprovementCost(attributeKey: string): number | null {
	const char = get(characterStore);
	if (!char) return null;

	const attr = char.attributes[attributeKey as keyof typeof char.attributes];
	if (typeof attr !== 'object' || attr === null) return null;

	const currentRating = attr.base + attr.bonus;
	const newRating = currentRating + 1;

	const limits = char.attributeLimits[attributeKey as keyof typeof char.attributeLimits];
	if (typeof limits === 'object' && limits !== null && 'aug' in limits) {
		if (newRating > limits.aug) return null;
	}

	return newRating * KARMA_COSTS.IMPROVE_ATTRIBUTE_MULTIPLIER;
}

/** Improve an attribute with karma. */
export function improveAttribute(attributeKey: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (char.status !== 'career')
		return { success: false, error: 'Character must be in career mode' };

	const attr = char.attributes[attributeKey as keyof typeof char.attributes];
	if (typeof attr !== 'object' || attr === null)
		return { success: false, error: 'Invalid attribute' };

	const newRating = attr.base + 1;

	const limits = char.attributeLimits[attributeKey as keyof typeof char.attributeLimits];
	if (typeof limits === 'object' && limits !== null && 'max' in limits) {
		if (newRating > limits.max)
			return { success: false, error: `Attribute already at maximum (${limits.max})` };
	}

	const cost = newRating * KARMA_COSTS.IMPROVE_ATTRIBUTE_MULTIPLIER;
	if (char.karma < cost)
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };

	const spendResult = spendKarmaInternal(
		cost,
		`Improved ${attributeKey.toUpperCase()} to ${newRating}`
	);
	if (!spendResult.success) return spendResult;

	characterStore.update((c) => {
		if (!c) return c;
		const key = attributeKey as keyof typeof c.attributes;
		const oldAttr = c.attributes[key];
		if (typeof oldAttr !== 'object' || oldAttr === null) return c;

		return {
			...c,
			attributes: {
				...c.attributes,
				[key]: {
					...oldAttr,
					karma: oldAttr.karma + cost,
					base: oldAttr.base + 1
				}
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Calculate karma cost to improve a skill. */
export function getSkillImprovementCost(skillName: string): number | null {
	const char = get(characterStore);
	if (!char) return null;

	const skill = char.skills.find((s) => s.name === skillName);
	if (!skill) return KARMA_COSTS.NEW_SKILL;

	const newRating = skill.rating + 1;
	if (newRating > 6) return null;

	return newRating * KARMA_COSTS.IMPROVE_SKILL_MULTIPLIER;
}

/** Improve a skill with karma. */
export function improveSkill(skillName: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (char.status !== 'career')
		return { success: false, error: 'Character must be in career mode' };

	const skillIndex = char.skills.findIndex((s) => s.name === skillName);
	if (skillIndex === -1) return { success: false, error: 'Skill not found. Use learnNewSkill.' };

	const skill = char.skills[skillIndex]!;
	const newRating = skill.rating + 1;

	if (newRating > 6) return { success: false, error: 'Skill already at maximum (6)' };

	const cost = newRating * KARMA_COSTS.IMPROVE_SKILL_MULTIPLIER;
	if (char.karma < cost)
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };

	const spendResult = spendKarmaInternal(cost, `Improved ${skillName} to ${newRating}`);
	if (!spendResult.success) return spendResult;

	characterStore.update((c) => {
		if (!c) return c;
		const skills = [...c.skills];
		skills[skillIndex] = {
			...skill,
			rating: newRating,
			karmaSpent: skill.karmaSpent + cost
		};
		return {
			...c,
			skills,
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Learn a new skill (rating 1) with karma. */
export function learnNewSkill(skillName: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (char.status !== 'career')
		return { success: false, error: 'Character must be in career mode' };

	if (char.skills.some((s) => s.name === skillName)) {
		return { success: false, error: 'Already has this skill. Use improveSkill instead.' };
	}

	const cost = KARMA_COSTS.NEW_SKILL;
	if (char.karma < cost)
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };

	const spendResult = spendKarmaInternal(cost, `Learned ${skillName} at rating 1`);
	if (!spendResult.success) return spendResult;

	characterStore.update((c) => {
		if (!c) return c;
		return {
			...c,
			skills: [
				...c.skills,
				{
					name: skillName,
					rating: 1,
					specialization: null,
					bonus: 0,
					karmaSpent: cost
				}
			],
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Add a specialization to a skill with karma. */
export function addSpecialization(
	skillName: string,
	specialization: string
): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (char.status !== 'career')
		return { success: false, error: 'Character must be in career mode' };

	const skillIndex = char.skills.findIndex((s) => s.name === skillName);
	if (skillIndex === -1) return { success: false, error: 'Skill not found' };

	const skill = char.skills[skillIndex]!;
	if (skill.specialization) return { success: false, error: 'Skill already has a specialization' };

	const cost = 2;
	if (char.karma < cost)
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };

	const spendResult = spendKarmaInternal(
		cost,
		`Added specialization "${specialization}" to ${skillName}`
	);
	if (!spendResult.success) return spendResult;

	characterStore.update((c) => {
		if (!c) return c;
		const skills = [...c.skills];
		skills[skillIndex] = {
			...skill,
			specialization,
			karmaSpent: skill.karmaSpent + cost
		};
		return {
			...c,
			skills,
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Learn a new knowledge skill with karma. */
export function learnKnowledgeSkill(
	name: string,
	category: 'Academic' | 'Interest' | 'Language' | 'Professional' | 'Street'
): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (char.status !== 'career')
		return { success: false, error: 'Character must be in career mode' };

	if (char.knowledgeSkills.some((s) => s.name === name)) {
		return { success: false, error: 'Already has this knowledge skill' };
	}

	const cost = KARMA_COSTS.NEW_KNOWLEDGE_SKILL;
	if (char.karma < cost)
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };

	const spendResult = spendKarmaInternal(cost, `Learned knowledge skill: ${name}`);
	if (!spendResult.success) return spendResult;

	characterStore.update((c) => {
		if (!c) return c;
		return {
			...c,
			knowledgeSkills: [
				...c.knowledgeSkills,
				{
					id: generateId(),
					name,
					category,
					attribute: getKnowledgeSkillAttribute(category),
					rating: 1,
					specialization: null,
					isNative: false
				}
			],
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Improve a knowledge skill with karma. */
export function improveKnowledgeSkill(skillId: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (char.status !== 'career')
		return { success: false, error: 'Character must be in career mode' };

	const skillIndex = char.knowledgeSkills.findIndex((s) => s.id === skillId);
	if (skillIndex === -1) return { success: false, error: 'Knowledge skill not found' };

	const skill = char.knowledgeSkills[skillIndex]!;
	const newRating = skill.rating + 1;

	if (newRating > 6) return { success: false, error: 'Knowledge skill already at maximum (6)' };

	const cost = newRating * KARMA_COSTS.IMPROVE_KNOWLEDGE_SKILL_MULTIPLIER;
	if (char.karma < cost)
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };

	const spendResult = spendKarmaInternal(cost, `Improved ${skill.name} to ${newRating}`);
	if (!spendResult.success) return spendResult;

	characterStore.update((c) => {
		if (!c) return c;
		const knowledgeSkills = [...c.knowledgeSkills];
		knowledgeSkills[skillIndex] = {
			...skill,
			rating: newRating
		};
		return {
			...c,
			knowledgeSkills,
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/* ========================================
 * Magic & Resonance Advancement
 * ======================================== */

/** Learn a new spell with karma. */
export function learnSpell(spell: {
	name: string;
	category: string;
	type: string;
	range: string;
	damage: string;
	duration: string;
	dv: string;
}): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (char.status !== 'career')
		return { success: false, error: 'Character must be in career mode' };
	if (!char.magic) return { success: false, error: 'Character is not awakened' };

	if (char.magic.spells.some((s) => s.name === spell.name)) {
		return { success: false, error: 'Already knows this spell' };
	}

	const cost = KARMA_COSTS.NEW_SPELL;
	if (char.karma < cost)
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };

	const spendResult = spendKarmaInternal(cost, `Learned spell: ${spell.name}`);
	if (!spendResult.success) return spendResult;

	characterStore.update((c) => {
		if (!c || !c.magic) return c;
		return {
			...c,
			magic: {
				...c.magic,
				spells: [
					...c.magic.spells,
					{
						id: generateId(),
						...spell,
						notes: ''
					}
				]
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Calculate initiation cost. */
export function getInitiationCost(): number | null {
	const char = get(characterStore);
	if (!char || !char.magic) return null;

	const newGrade = char.magic.initiateGrade + 1;
	return KARMA_COSTS.INITIATION_BASE + newGrade * KARMA_COSTS.INITIATION_MULTIPLIER;
}

/** Initiate to the next grade. */
export function initiate(): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (char.status !== 'career')
		return { success: false, error: 'Character must be in career mode' };
	if (!char.magic) return { success: false, error: 'Character is not awakened' };

	const newGrade = char.magic.initiateGrade + 1;
	const cost = KARMA_COSTS.INITIATION_BASE + newGrade * KARMA_COSTS.INITIATION_MULTIPLIER;

	if (char.karma < cost)
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };

	const spendResult = spendKarmaInternal(cost, `Initiated to grade ${newGrade}`);
	if (!spendResult.success) return spendResult;

	characterStore.update((c) => {
		if (!c || !c.magic) return c;
		return {
			...c,
			magic: {
				...c.magic,
				initiateGrade: newGrade
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Calculate submersion cost. */
export function getSubmersionCost(currentGrade: number): number {
	const newGrade = currentGrade + 1;
	return KARMA_COSTS.SUBMERSION_BASE + newGrade * KARMA_COSTS.SUBMERSION_MULTIPLIER;
}

/** Submerge to increase submersion grade. */
export function submerge(): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (char.status !== 'career')
		return { success: false, error: 'Character must be in career mode' };
	if (!char.resonance) return { success: false, error: 'Character is not a technomancer' };

	const newGrade = char.resonance.submersionGrade + 1;
	const cost = KARMA_COSTS.SUBMERSION_BASE + newGrade * KARMA_COSTS.SUBMERSION_MULTIPLIER;

	if (char.karma < cost)
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };

	const spendResult = spendKarmaInternal(cost, `Submerged to grade ${newGrade}`);
	if (!spendResult.success) return spendResult;

	characterStore.update((c) => {
		if (!c || !c.resonance) return c;
		return {
			...c,
			resonance: {
				...c.resonance,
				submersionGrade: newGrade
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Learn a new complex form with karma. */
export function learnComplexForm(form: {
	name: string;
	target: string;
	duration: string;
	fv: string;
}): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (char.status !== 'career')
		return { success: false, error: 'Character must be in career mode' };
	if (!char.resonance) return { success: false, error: 'Character is not a technomancer' };

	if (char.resonance.complexForms.some((f) => f.name === form.name)) {
		return { success: false, error: 'Already knows this complex form' };
	}

	const cost = KARMA_COSTS.NEW_COMPLEX_FORM;
	if (char.karma < cost)
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };

	const spendResult = spendKarmaInternal(cost, `Learned complex form: ${form.name}`);
	if (!spendResult.success) return spendResult;

	characterStore.update((c) => {
		if (!c || !c.resonance) return c;
		return {
			...c,
			resonance: {
				...c.resonance,
				complexForms: [
					...c.resonance.complexForms,
					{
						id: generateId(),
						...form,
						rating: 1,
						notes: ''
					}
				]
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

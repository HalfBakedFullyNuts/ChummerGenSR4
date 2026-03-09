/**
 * Knowledge Skills Store Module
 * =============================
 * Knowledge skill CRUD, free point calculation,
 * BP/Karma cost calculations.
 */

import { get, derived, type Readable } from 'svelte/store';
import {
	type Character,
	type KnowledgeSkill,
	type KnowledgeSkillCategory,
	getKnowledgeSkillAttribute,
	calculateAttributeTotal
} from '$types';
import { characterStore, generateId } from './character';

/** BP cost per knowledge skill point. */
const KNOWLEDGE_SKILL_BP_COST = 2;

/** Karma cost multiplier for knowledge skills (new rating × 2). */
const KNOWLEDGE_SKILL_KARMA_MULTIPLIER = 2;

/** Calculate free knowledge skill points based on INT + LOG. */
export function calculateFreeKnowledgePoints(char: Character | null): number {
	if (!char) return 0;
	const int = calculateAttributeTotal(char.attributes.int);
	const log = calculateAttributeTotal(char.attributes.log);
	return (int + log) * 3;
}

/** Calculate total knowledge skill points spent. */
export function calculateKnowledgePointsSpent(char: Character | null): number {
	if (!char) return 0;
	return char.knowledgeSkills.reduce((total, skill) => total + skill.rating, 0);
}

/** Calculate BP cost for knowledge skills beyond free points. */
export function calculateKnowledgeSkillBPCost(char: Character | null): number {
	if (!char) return 0;
	const freePoints = calculateFreeKnowledgePoints(char);
	const spent = calculateKnowledgePointsSpent(char);
	const excess = Math.max(0, spent - freePoints);
	return excess * KNOWLEDGE_SKILL_BP_COST;
}

/** Calculate Karma cost for knowledge skills beyond free points. */
export function calculateKnowledgeSkillKarmaCost(char: Character | null): number {
	if (!char) return 0;
	const freePoints = calculateFreeKnowledgePoints(char);
	let spent = 0;
	let karmaCost = 0;

	const sortedSkills = [...char.knowledgeSkills].sort((a, b) => a.rating - b.rating);

	for (const skill of sortedSkills) {
		for (let r = 1; r <= skill.rating; r++) {
			spent++;
			if (spent > freePoints) {
				karmaCost += r * KNOWLEDGE_SKILL_KARMA_MULTIPLIER;
			}
		}
	}

	return karmaCost;
}

/** Update the BP spent on knowledge skills (internal helper). */
function updateKnowledgeSkillBP(): void {
	const char = get(characterStore);
	if (!char) return;

	const isKarmaBuild = char.buildMethod === 'karma';
	const cost = isKarmaBuild
		? calculateKnowledgeSkillKarmaCost(char)
		: calculateKnowledgeSkillBPCost(char);

	const updated: Character = {
		...char,
		buildPointsSpent: {
			...char.buildPointsSpent,
			knowledgeSkills: cost
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Add a new knowledge skill. */
export function addKnowledgeSkill(
	name: string,
	category: KnowledgeSkillCategory,
	rating: number = 1,
	isNative: boolean = false
): void {
	const char = get(characterStore);
	if (!char) return;

	if (char.knowledgeSkills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
		return;
	}

	const attribute = getKnowledgeSkillAttribute(category);

	const hasNativeLang = char.knowledgeSkills.some((s) => s.category === 'Language' && s.isNative);
	const shouldBeNative = category === 'Language' && !hasNativeLang;

	const newSkill: KnowledgeSkill = {
		id: generateId(),
		name,
		category,
		attribute,
		rating: shouldBeNative || isNative ? 0 : Math.max(1, Math.min(6, rating)),
		specialization: null,
		isNative: shouldBeNative || isNative
	};

	const updated: Character = {
		...char,
		knowledgeSkills: [...char.knowledgeSkills, newSkill],
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
	updateKnowledgeSkillBP();
}

/** Remove a knowledge skill by ID. Native languages cannot be removed. */
export function removeKnowledgeSkill(skillId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const skill = char.knowledgeSkills.find((s) => s.id === skillId);
	if (skill?.isNative) return;

	const updated: Character = {
		...char,
		knowledgeSkills: char.knowledgeSkills.filter((s) => s.id !== skillId),
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
	updateKnowledgeSkillBP();
}

/** Update a knowledge skill's rating. */
export function setKnowledgeSkillRating(skillId: string, rating: number): void {
	const char = get(characterStore);
	if (!char) return;

	const clampedRating = Math.max(1, Math.min(6, rating));

	const updated: Character = {
		...char,
		knowledgeSkills: char.knowledgeSkills.map((s) =>
			s.id === skillId ? { ...s, rating: clampedRating } : s
		),
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
	updateKnowledgeSkillBP();
}

/** Update a knowledge skill's category (and recalculate attribute). */
export function setKnowledgeSkillCategory(skillId: string, category: KnowledgeSkillCategory): void {
	const char = get(characterStore);
	if (!char) return;

	const attribute = getKnowledgeSkillAttribute(category);

	const updated: Character = {
		...char,
		knowledgeSkills: char.knowledgeSkills.map((s) =>
			s.id === skillId ? { ...s, category, attribute } : s
		),
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Update a knowledge skill's specialization. */
export function setKnowledgeSkillSpecialization(
	skillId: string,
	specialization: string | null
): void {
	const char = get(characterStore);
	if (!char) return;

	const updated: Character = {
		...char,
		knowledgeSkills: char.knowledgeSkills.map((s) =>
			s.id === skillId ? { ...s, specialization } : s
		),
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Increment a knowledge skill's rating. */
export function incrementKnowledgeSkill(skillId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const skill = char.knowledgeSkills.find((s) => s.id === skillId);
	if (!skill || skill.rating >= 6) return;

	setKnowledgeSkillRating(skillId, skill.rating + 1);
}

/** Decrement a knowledge skill's rating. */
export function decrementKnowledgeSkill(skillId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const skill = char.knowledgeSkills.find((s) => s.id === skillId);
	if (!skill || skill.rating <= 1) return;

	setKnowledgeSkillRating(skillId, skill.rating - 1);
}

/** Check if character has a native language. */
export const hasNativeLanguage: Readable<boolean> = derived(
	{ subscribe: characterStore.subscribe } as Readable<Character | null>,
	($char) => $char?.knowledgeSkills.some((s) => s.category === 'Language' && s.isNative) ?? false
);

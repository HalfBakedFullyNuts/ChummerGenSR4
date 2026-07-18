/**
 * Skills Store Module
 * ===================
 * Active skill and skill group management.
 * Individual skill CRUD, skill groups, specializations.
 */

import { get } from 'svelte/store';
import {
	type Character,
	type CharacterSkill,
	type CharacterSkillGroup,
	type SkillGroupName,
	MAX_SKILL_GROUP_RATING
} from '$types';
import { skills as skillsStore } from './gamedata';
import { characterStore } from './character';

/** BP cost per skill point. */
const SKILL_BP_PER_POINT = 4;

/** BP cost per skill group point. */
const SKILL_GROUP_BP_PER_POINT = 10;

/** BP/Karma cost per skill specialization. */
const SPECIALIZATION_BP_COST = 2;

/** Calculate total BP spent on individual skills. */
export function calculateSkillsBP(skills: readonly CharacterSkill[]): number {
	return skills.reduce((sum, s) => sum + s.rating * SKILL_BP_PER_POINT, 0);
}

/** Calculate total BP spent on skill groups. */
export function calculateSkillGroupsBP(skillGroups: readonly CharacterSkillGroup[]): number {
	return skillGroups.reduce((sum, g) => sum + g.rating * SKILL_GROUP_BP_PER_POINT, 0);
}

/** Calculate total BP/karma spent on skill specializations. */
export function calculateSpecializationsBP(skills: readonly CharacterSkill[]): number {
	return skills.filter((s) => s.specialization !== null).length * SPECIALIZATION_BP_COST;
}

/** Add or update a skill. Creates new skill or updates existing rating. */
export function setSkill(name: string, rating: number, specialization: string | null = null): void {
	const char = get(characterStore);
	if (!char) return;

	const existingIndex = char.skills.findIndex((s) => s.name === name);
	let newSkills: CharacterSkill[];

	if (existingIndex >= 0) {
		newSkills = char.skills.map((s, i) =>
			i === existingIndex ? { ...s, rating, specialization } : s
		);
	} else {
		const skillDef = get(skillsStore).find((s) => s.name === name);
		const newSkill: CharacterSkill = {
			name,
			rating,
			specialization,
			bonus: 0,
			karmaSpent: 0,
			...(skillDef !== undefined ? { category: skillDef.category, group: skillDef.skillgroup } : {})
		};
		newSkills = [...char.skills, newSkill];
	}

	newSkills = newSkills.filter((s) => s.rating > 0);

	const updated: Character = {
		...char,
		skills: newSkills,
		buildPointsSpent: {
			...char.buildPointsSpent,
			skills: calculateSkillsBP(newSkills),
			specializations: calculateSpecializationsBP(newSkills)
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Remove a skill from the character. */
export function removeSkill(name: string): void {
	const char = get(characterStore);
	if (!char) return;

	const newSkills = char.skills.filter((s) => s.name !== name);

	const updated: Character = {
		...char,
		skills: newSkills,
		buildPointsSpent: {
			...char.buildPointsSpent,
			skills: calculateSkillsBP(newSkills),
			specializations: calculateSpecializationsBP(newSkills)
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Set or update a skill's specialization. */
export function setSkillSpecialization(
	skillName: string,
	specialization: string | null
): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };

	const skillIndex = char.skills.findIndex((s) => s.name === skillName);
	if (skillIndex < 0) {
		return { success: false, error: 'Skill not found' };
	}

	const skill = char.skills[skillIndex]!;
	if (skill.rating <= 0) {
		return { success: false, error: 'Cannot specialize a skill with 0 rating' };
	}

	const newSkills = char.skills.map((s, i) => (i === skillIndex ? { ...s, specialization } : s));

	const updated: Character = {
		...char,
		skills: newSkills,
		buildPointsSpent: {
			...char.buildPointsSpent,
			specializations: calculateSpecializationsBP(newSkills)
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
	return { success: true };
}

/** Remove a skill's specialization. */
export function removeSkillSpecialization(skillName: string): { success: boolean; error?: string } {
	return setSkillSpecialization(skillName, null);
}

/** Get all skill names that belong to a skill group. */
export function getSkillsInGroup(groupName: SkillGroupName): string[] {
	const allSkills = get(skillsStore);
	return allSkills.filter((s) => s.skillgroup === groupName).map((s) => s.name);
}

/** Check if a skill group is broken. */
export function isSkillGroupBroken(groupName: SkillGroupName): boolean {
	const char = get(characterStore);
	if (!char) return false;

	const group = char.skillGroups.find((g) => g.name === groupName);
	if (!group) return false;

	if (group.broken) return true;

	const skillNames = getSkillsInGroup(groupName);
	for (const skillName of skillNames) {
		const skill = char.skills.find((s) => s.name === skillName);
		if (skill && skill.rating > group.rating) {
			return true;
		}
	}

	return false;
}

/** Get the effective rating for a skill, considering individual and group ratings. */
export function getEffectiveSkillRating(skillName: string): number {
	const char = get(characterStore);
	if (!char) return 0;

	const skill = char.skills.find((s) => s.name === skillName);
	const individualRating = skill?.rating ?? 0;

	const allSkills = get(skillsStore);
	const skillDef = allSkills.find((s) => s.name === skillName);
	if (!skillDef?.skillgroup) {
		return individualRating;
	}

	const group = char.skillGroups.find((g) => g.name === skillDef.skillgroup);
	const groupRating = group?.rating ?? 0;

	return Math.max(individualRating, groupRating);
}

/** Set a skill group rating. */
export function setSkillGroup(
	groupName: SkillGroupName,
	rating: number
): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };

	if (rating < 0 || rating > MAX_SKILL_GROUP_RATING) {
		return { success: false, error: `Rating must be between 0 and ${MAX_SKILL_GROUP_RATING}` };
	}

	const existingGroup = char.skillGroups.find((g) => g.name === groupName);
	if (existingGroup?.broken) {
		return { success: false, error: 'Cannot modify a broken skill group' };
	}

	const skillNames = getSkillsInGroup(groupName);
	for (const skillName of skillNames) {
		const skill = char.skills.find((s) => s.name === skillName);
		if (skill && skill.rating > rating && rating > 0) {
			return {
				success: false,
				error: `Cannot set group below individual skill rating (${skillName} is at ${skill.rating})`
			};
		}
	}

	let newSkillGroups: CharacterSkillGroup[];
	if (rating === 0) {
		newSkillGroups = char.skillGroups.filter((g) => g.name !== groupName);
	} else if (existingGroup) {
		newSkillGroups = char.skillGroups.map((g) => (g.name === groupName ? { ...g, rating } : g));
	} else {
		const newGroup: CharacterSkillGroup = {
			name: groupName,
			rating,
			broken: false
		};
		newSkillGroups = [...char.skillGroups, newGroup];
	}

	const updated: Character = {
		...char,
		skillGroups: newSkillGroups,
		buildPointsSpent: {
			...char.buildPointsSpent,
			skillGroups: calculateSkillGroupsBP(newSkillGroups)
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
	return { success: true };
}

/** Increment a skill group rating by 1. */
export function incrementSkillGroup(groupName: SkillGroupName): {
	success: boolean;
	error?: string;
} {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };

	const group = char.skillGroups.find((g) => g.name === groupName);
	const currentRating = group?.rating ?? 0;

	return setSkillGroup(groupName, currentRating + 1);
}

/** Decrement a skill group rating by 1. */
export function decrementSkillGroup(groupName: SkillGroupName): {
	success: boolean;
	error?: string;
} {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };

	const group = char.skillGroups.find((g) => g.name === groupName);
	const currentRating = group?.rating ?? 0;

	if (currentRating <= 0) {
		return { success: false, error: 'Group rating is already 0' };
	}

	return setSkillGroup(groupName, currentRating - 1);
}

/** Break a skill group (mark as broken). */
export function breakSkillGroup(groupName: SkillGroupName): void {
	const char = get(characterStore);
	if (!char) return;

	const existingGroup = char.skillGroups.find((g) => g.name === groupName);
	if (!existingGroup) return;

	const newSkillGroups = char.skillGroups.map((g) =>
		g.name === groupName ? { ...g, broken: true } : g
	);

	const updated: Character = {
		...char,
		skillGroups: newSkillGroups,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Modified setSkill that handles skill group breaking. */
export function setSkillWithGroupCheck(
	name: string,
	rating: number,
	specialization: string | null = null
): void {
	const char = get(characterStore);
	if (!char) return;

	const allSkills = get(skillsStore);
	const skillDef = allSkills.find((s) => s.name === name);

	if (skillDef?.skillgroup) {
		const groupName = skillDef.skillgroup as SkillGroupName;
		const group = char.skillGroups.find((g) => g.name === groupName);

		if (group && rating > group.rating && !group.broken) {
			breakSkillGroup(groupName);
		}
	}

	setSkill(name, rating, specialization);
}

/**
 * Character Creation Store
 * ========================
 * Wizard flow, build method selection, metatype setup,
 * and custom build points.
 *
 * This module operates on the shared characterStore and
 * currentStepStore exported from character.ts.
 */

import { get, derived, type Readable } from 'svelte/store';
import { type Character, type BuildMethod, createEmptyCharacter } from '$types';
import { findMetatype, type GameData } from './gamedata';
import {
	characterStore,
	currentStepStore,
	generateId,
	getMagicType,
	type WizardStep,
	type WizardStepConfig,
	WIZARD_STEPS
} from './character';

/** Maximum BP for standard character creation. */
const MAX_BP = 400;

/** Starting Karma for Karma build method (Runner's Companion). */
const KARMA_BUILD_STARTING = 750;

/**
 * Karma Build costs for CHARACTER CREATION per Runner's Companion.
 * These are used when creating a character with the Karma Build method.
 * Different from career mode advancement costs (see KARMA_COSTS).
 */
export const KARMA_BUILD_COSTS = {
	/* Attributes */
	/** Attribute: new rating × 3 */
	ATTRIBUTE_MULTIPLIER: 3,

	/* Skills */
	/** Active Skill (new): 4 karma */
	NEW_SKILL: 4,
	/** Active Skill (improve): new rating × 2 */
	SKILL_MULTIPLIER: 2,
	/** Specialization: 2 karma */
	SPECIALIZATION: 2,
	/** Skill Group (new): 10 karma */
	NEW_SKILL_GROUP: 10,
	/** Skill Group (improve): new rating × 5 */
	SKILL_GROUP_MULTIPLIER: 5,
	/** Knowledge Skill (new): 2 karma */
	NEW_KNOWLEDGE_SKILL: 2,
	/** Knowledge Skill (improve): new rating × 1 */
	KNOWLEDGE_SKILL_MULTIPLIER: 1,

	/* Magic */
	/** Spell: 5 karma */
	SPELL: 5,
	/** Complex Form (new): 2 karma */
	COMPLEX_FORM: 2,
	/** Complex Form (improve): new rating × 1 */
	COMPLEX_FORM_MULTIPLIER: 1,

	/* Qualities & Contacts */
	/** Quality: BP cost × 2 */
	QUALITY_MULTIPLIER: 2,
	/** Contact: (Loyalty + Connection) × 2 */
	CONTACT_MULTIPLIER: 2,

	/* Resources */
	/** Resources: 1 karma = 2,500¥ */
	NUYEN_PER_KARMA: 2500,

	/* Metatype */
	/** Metatype costs in karma (BP × 2) */
	METATYPE_MULTIPLIER: 2
} as const;

/**
 * Start creating a new character.
 * Initializes empty character with given build method.
 */
export function startNewCharacter(userId: string, buildMethod: BuildMethod = 'bp'): void {
	const id = generateId();
	const char = createEmptyCharacter(id, userId, buildMethod);
	characterStore.set(char);
	currentStepStore.set('metatype');
}

/**
 * Set the build method for the current character.
 * Updates starting points based on method.
 */
export function setBuildMethod(method: BuildMethod): void {
	const char = get(characterStore);
	if (!char) return;

	const startingPoints = method === 'karma' ? KARMA_BUILD_STARTING : MAX_BP;

	const updated: Character = {
		...char,
		buildMethod: method,
		buildPoints: startingPoints,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Set the current wizard step.
 * Validates step exists before setting.
 */
export function setWizardStep(step: WizardStep): void {
	const validStep = WIZARD_STEPS.find((s) => s.id === step);
	if (validStep) {
		currentStepStore.set(step);
	}
}

/**
 * Get visible wizard steps for the current character.
 * Filters out magic step for mundane characters.
 */
function getVisibleWizardSteps(): readonly WizardStepConfig[] {
	const char = get(characterStore);
	const type = getMagicType(char);

	if (type === 'mundane') {
		return WIZARD_STEPS.filter((s) => s.id !== 'magic');
	}
	return WIZARD_STEPS;
}

/**
 * Go to the next wizard step.
 * Returns false if already at last step.
 * Skips magic step for mundane characters.
 */
export function nextWizardStep(): boolean {
	const current = get(currentStepStore);
	const visibleSteps = getVisibleWizardSteps();
	const currentIndex = visibleSteps.findIndex((s) => s.id === current);

	if (currentIndex < 0 || currentIndex >= visibleSteps.length - 1) {
		return false;
	}

	const nextStep = visibleSteps[currentIndex + 1];
	if (nextStep) {
		currentStepStore.set(nextStep.id);
	}
	return true;
}

/**
 * Go to the previous wizard step.
 * Returns false if already at first step.
 * Skips magic step for mundane characters.
 */
export function prevWizardStep(): boolean {
	const current = get(currentStepStore);
	const visibleSteps = getVisibleWizardSteps();
	const currentIndex = visibleSteps.findIndex((s) => s.id === current);

	if (currentIndex <= 0) {
		return false;
	}

	const prevStep = visibleSteps[currentIndex - 1];
	if (prevStep) {
		currentStepStore.set(prevStep.id);
	}
	return true;
}

/**
 * Set character metatype.
 * Updates attribute limits and base values from metatype data.
 */
export function setMetatype(
	gameData: GameData,
	metatypeName: string,
	metavariantName: string | null = null
): void {
	const char = get(characterStore);
	if (!char) return;

	const metatype = findMetatype(gameData, metatypeName);
	if (!metatype) return;

	/* Calculate BP cost */
	let bpCost = metatype.bp;
	if (metavariantName) {
		const variant = metatype.metavariants.find((v) => v.name === metavariantName);
		if (variant) {
			bpCost = variant.bp;
		}
	}

	/* Set attribute base values to metatype minimums */
	const attrs = metatype.attributes;

	/* Update character with new metatype */
	const updated: Character = {
		...char,
		identity: {
			...char.identity,
			metatype: metatypeName,
			metavariant: metavariantName
		},
		attributes: {
			...char.attributes,
			bod: { ...char.attributes.bod, base: attrs.bod.min },
			agi: { ...char.attributes.agi, base: attrs.agi.min },
			rea: { ...char.attributes.rea, base: attrs.rea.min },
			str: { ...char.attributes.str, base: attrs.str.min },
			cha: { ...char.attributes.cha, base: attrs.cha.min },
			int: { ...char.attributes.int, base: attrs.int.min },
			log: { ...char.attributes.log, base: attrs.log.min },
			wil: { ...char.attributes.wil, base: attrs.wil.min },
			edg: { ...char.attributes.edg, base: attrs.edg.min }
		},
		attributeLimits: metatype.attributes,
		buildPointsSpent: {
			...char.buildPointsSpent,
			metatype: bpCost
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Set custom starting build points.
 * Allows players to use non-standard starting values.
 */
export function setCustomBuildPoints(amount: number): void {
	const char = get(characterStore);
	if (!char) return;

	// Clamp to reasonable bounds
	const min = char.buildMethod === 'karma' ? 400 : 200;
	const max = char.buildMethod === 'karma' ? 1200 : 800;
	const clampedAmount = Math.max(min, Math.min(max, amount));

	const updated: Character = {
		...char,
		buildPoints: clampedAmount,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Derived store for visible wizard steps (filters magic for mundane). */
export const visibleWizardSteps: Readable<readonly WizardStepConfig[]> = derived(
	{ subscribe: characterStore.subscribe } as Readable<Character | null>,
	($char) => {
		const type = getMagicType($char);
		if (type === 'mundane') {
			return WIZARD_STEPS.filter((s) => s.id !== 'magic');
		}
		return WIZARD_STEPS;
	}
);

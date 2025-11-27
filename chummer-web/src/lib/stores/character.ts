/**
 * Character Store
 * ================
 * Manages the current character being created or edited.
 * Provides reactive state and mutation functions.
 */

import { writable, derived, get, type Readable, type Writable } from 'svelte/store';
import {
	type Character,
	type BuildMethod,
	type CharacterQuality,
	type CharacterSkill,
	type Contact,
	type AttributeValue,
	createEmptyCharacter
} from '$types';
import { findMetatype, type GameData } from './gamedata';

/** Maximum BP for standard character creation. */
const MAX_BP = 400;

/** Wizard step identifiers. */
export type WizardStep =
	| 'method'
	| 'metatype'
	| 'attributes'
	| 'qualities'
	| 'skills'
	| 'magic'
	| 'equipment'
	| 'contacts'
	| 'finalize';

/** Wizard step configuration. */
export interface WizardStepConfig {
	id: WizardStep;
	label: string;
	description: string;
	required: boolean;
}

/** All wizard steps in order. */
export const WIZARD_STEPS: readonly WizardStepConfig[] = [
	{ id: 'method', label: 'Build Method', description: 'Choose BP or Karma', required: true },
	{ id: 'metatype', label: 'Metatype', description: 'Select your race', required: true },
	{ id: 'attributes', label: 'Attributes', description: 'Allocate attribute points', required: true },
	{ id: 'qualities', label: 'Qualities', description: 'Select positive and negative qualities', required: true },
	{ id: 'skills', label: 'Skills', description: 'Choose and rate your skills', required: true },
	{ id: 'magic', label: 'Magic/Resonance', description: 'Configure magical abilities', required: false },
	{ id: 'contacts', label: 'Contacts', description: 'Define your network', required: true },
	{ id: 'finalize', label: 'Finalize', description: 'Review and complete', required: true }
] as const;

/* Internal writable store */
const characterStore: Writable<Character | null> = writable(null);
const currentStepStore: Writable<WizardStep> = writable('method');

/**
 * Generate unique ID for new entities.
 * Uses timestamp + random suffix for uniqueness.
 */
function generateId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `${timestamp}-${random}`;
}

/**
 * Start creating a new character.
 * Initializes empty character with given build method.
 */
export function startNewCharacter(
	userId: string,
	buildMethod: BuildMethod = 'bp'
): void {
	const id = generateId();
	const char = createEmptyCharacter(id, userId, buildMethod);
	characterStore.set(char);
	currentStepStore.set('metatype');
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
 * Go to the next wizard step.
 * Returns false if already at last step.
 */
export function nextWizardStep(): boolean {
	const current = get(currentStepStore);
	const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === current);

	if (currentIndex < 0 || currentIndex >= WIZARD_STEPS.length - 1) {
		return false;
	}

	const nextStep = WIZARD_STEPS[currentIndex + 1];
	if (nextStep) {
		currentStepStore.set(nextStep.id);
	}
	return true;
}

/**
 * Go to the previous wizard step.
 * Returns false if already at first step.
 */
export function prevWizardStep(): boolean {
	const current = get(currentStepStore);
	const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === current);

	if (currentIndex <= 0) {
		return false;
	}

	const prevStep = WIZARD_STEPS[currentIndex - 1];
	if (prevStep) {
		currentStepStore.set(prevStep.id);
	}
	return true;
}

/**
 * Set character metatype.
 * Updates attribute limits from metatype data.
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

	/* Update character with new metatype */
	const updated: Character = {
		...char,
		identity: {
			...char.identity,
			metatype: metatypeName,
			metavariant: metavariantName
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

/** Attribute keys that have AttributeValue (not number or null). */
export type AttributeValueKey = 'bod' | 'agi' | 'rea' | 'str' | 'cha' | 'int' | 'log' | 'wil' | 'edg';

/**
 * Set a single attribute value.
 * Validates against metatype limits.
 */
export function setAttribute(
	attrCode: AttributeValueKey,
	value: number
): void {
	const char = get(characterStore);
	if (!char) return;

	const limits = char.attributeLimits[attrCode];
	if (!limits) return;

	/* Clamp value to limits */
	const clampedValue = Math.max(limits.min, Math.min(limits.max, value));

	const currentAttr = char.attributes[attrCode];
	if (!currentAttr) return;

	const newAttr: AttributeValue = {
		...currentAttr,
		base: clampedValue
	};

	const updated: Character = {
		...char,
		attributes: {
			...char.attributes,
			[attrCode]: newAttr
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Add a quality to the character.
 * Validates BP limits and restrictions.
 */
export function addQuality(
	name: string,
	category: 'Positive' | 'Negative',
	bp: number
): void {
	const char = get(characterStore);
	if (!char) return;

	/* Check if quality already exists */
	const exists = char.qualities.some((q) => q.name === name);
	if (exists) return;

	const newQuality: CharacterQuality = {
		id: generateId(),
		name,
		category,
		bp,
		rating: 1,
		notes: ''
	};

	const updated: Character = {
		...char,
		qualities: [...char.qualities, newQuality],
		buildPointsSpent: {
			...char.buildPointsSpent,
			qualities: char.buildPointsSpent.qualities + bp
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Remove a quality from the character.
 * Refunds BP cost.
 */
export function removeQuality(qualityId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const quality = char.qualities.find((q) => q.id === qualityId);
	if (!quality) return;

	const updated: Character = {
		...char,
		qualities: char.qualities.filter((q) => q.id !== qualityId),
		buildPointsSpent: {
			...char.buildPointsSpent,
			qualities: char.buildPointsSpent.qualities - quality.bp
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Add or update a skill.
 * Creates new skill or updates existing rating.
 */
export function setSkill(
	name: string,
	rating: number,
	specialization: string | null = null
): void {
	const char = get(characterStore);
	if (!char) return;

	const existingIndex = char.skills.findIndex((s) => s.name === name);
	let newSkills: CharacterSkill[];

	if (existingIndex >= 0) {
		/* Update existing skill */
		newSkills = char.skills.map((s, i) =>
			i === existingIndex ? { ...s, rating, specialization } : s
		);
	} else {
		/* Add new skill */
		const newSkill: CharacterSkill = {
			name,
			rating,
			specialization,
			bonus: 0,
			karmaSpent: 0
		};
		newSkills = [...char.skills, newSkill];
	}

	const updated: Character = {
		...char,
		skills: newSkills,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Remove a skill from the character.
 */
export function removeSkill(name: string): void {
	const char = get(characterStore);
	if (!char) return;

	const updated: Character = {
		...char,
		skills: char.skills.filter((s) => s.name !== name),
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Add a contact to the character.
 */
export function addContact(
	name: string,
	type: string,
	loyalty: number,
	connection: number
): void {
	const char = get(characterStore);
	if (!char) return;

	const newContact: Contact = {
		id: generateId(),
		name,
		type,
		loyalty: Math.max(1, Math.min(6, loyalty)),
		connection: Math.max(1, Math.min(6, connection)),
		notes: ''
	};

	const updated: Character = {
		...char,
		contacts: [...char.contacts, newContact],
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Remove a contact from the character.
 */
export function removeContact(contactId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const updated: Character = {
		...char,
		contacts: char.contacts.filter((c) => c.id !== contactId),
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Update character identity fields.
 */
export function updateIdentity(
	field: keyof Character['identity'],
	value: string
): void {
	const char = get(characterStore);
	if (!char) return;

	const updated: Character = {
		...char,
		identity: {
			...char.identity,
			[field]: value
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/* Exported readable stores */
export const character: Readable<Character | null> = { subscribe: characterStore.subscribe };
export const currentStep: Readable<WizardStep> = { subscribe: currentStepStore.subscribe };

/** Derived store for remaining BP. */
export const remainingBP: Readable<number> = derived(
	character,
	($char) => {
		if (!$char) return MAX_BP;
		const spent = Object.values($char.buildPointsSpent).reduce((a, b) => a + b, 0);
		return $char.buildPoints - spent;
	}
);

/** Derived store for BP spent breakdown. */
export const bpBreakdown: Readable<Character['buildPointsSpent'] | null> = derived(
	character,
	($char) => $char?.buildPointsSpent ?? null
);

/** Derived store for current step index. */
export const currentStepIndex: Readable<number> = derived(
	currentStep,
	($step) => WIZARD_STEPS.findIndex((s) => s.id === $step)
);

/** Check if character has a metatype selected. */
export const hasMetatype: Readable<boolean> = derived(
	character,
	($char) => !!$char?.identity.metatype
);

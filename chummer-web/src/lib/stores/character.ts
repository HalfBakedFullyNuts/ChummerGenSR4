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
	type CharacterMagic,
	type CharacterSpell,
	type CharacterPower,
	type CharacterResonance,
	type Contact,
	type AttributeValue,
	type CharacterWeapon,
	type CharacterArmor,
	type CharacterCyberware,
	type CharacterBioware,
	type CharacterVehicle,
	type CharacterMartialArt,
	type CharacterGear,
	type CharacterLifestyle,
	type GameWeapon,
	type GameArmor,
	type GameCyberware,
	type GameGear,
	type CyberwareGrade,
	type BiowareGrade,
	type ExpenseEntry,
	bpToNuyen,
	createEmptyCharacter
} from '$types';
import {
	findMetatype,
	type GameData,
	type GameBioware,
	type GameVehicle,
	type GameMartialArt
} from './gamedata';
import { calculateArmorTotals, type ArmorTotals } from '$lib/engine/calculations';

/** Maximum BP for standard character creation. */
const MAX_BP = 400;

/** Starting Karma for Karma build method (Runner's Companion). */
const KARMA_BUILD_STARTING = 750;

/**
 * Karma Build costs per Runner's Companion.
 * Different from career mode advancement costs.
 */
export const KARMA_BUILD_COSTS = {
	/** Attribute: new rating × 5 */
	ATTRIBUTE_MULTIPLIER: 5,
	/** Active Skill (new): 4 karma */
	NEW_SKILL: 4,
	/** Active Skill (improve): new rating × 2 */
	SKILL_MULTIPLIER: 2,
	/** Skill Group (new): 10 karma */
	NEW_SKILL_GROUP: 10,
	/** Skill Group (improve): new rating × 5 */
	SKILL_GROUP_MULTIPLIER: 5,
	/** Quality: BP cost × 2 */
	QUALITY_MULTIPLIER: 2,
	/** Spell/Complex Form: 5 karma */
	SPELL: 5,
	COMPLEX_FORM: 5,
	/** Contact: (Loyalty + Connection) karma */
	CONTACT_MULTIPLIER: 1,
	/** Resources: 1 karma = 2,500¥ (lower rate than BP) */
	NUYEN_PER_KARMA: 2500,
	/** Metatype costs in karma (BP × 2) */
	METATYPE_MULTIPLIER: 2
} as const;

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
	{ id: 'equipment', label: 'Equipment', description: 'Purchase gear and cyberware', required: true },
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

/** Technomancer quality names. */
const TECHNOMANCER_QUALITIES = ['Technomancer', 'Latent Technomancer'] as const;

/** Magic type based on qualities. */
export type MagicType = 'mundane' | 'magician' | 'adept' | 'mystic_adept' | 'aspected' | 'technomancer';

/**
 * Determine character's magic type from qualities.
 */
export function getMagicType(char: Character | null): MagicType {
	if (!char) return 'mundane';

	const qualityNames = char.qualities.map((q) => q.name);

	if (qualityNames.includes('Magician')) return 'magician';
	if (qualityNames.includes('Mystic Adept')) return 'mystic_adept';
	if (qualityNames.includes('Adept')) return 'adept';
	if (qualityNames.some((n) => n.startsWith('Aspected Magician'))) return 'aspected';
	if (qualityNames.some((n) => TECHNOMANCER_QUALITIES.includes(n as typeof TECHNOMANCER_QUALITIES[number]))) {
		return 'technomancer';
	}

	return 'mundane';
}

/** Derived store for character's magic type. */
export const magicType: Readable<MagicType> = derived(
	character,
	($char) => getMagicType($char)
);

/**
 * Initialize magic for a character.
 * Sets up magic attribute and tradition.
 */
export function initializeMagic(tradition: string): void {
	const char = get(characterStore);
	if (!char) return;

	const type = getMagicType(char);
	if (type === 'mundane') return;

	const magicData: CharacterMagic = {
		tradition,
		mentor: null,
		initiateGrade: 0,
		powerPoints: type === 'adept' || type === 'mystic_adept' ? 6 : 0,
		powerPointsUsed: 0,
		spells: [],
		powers: [],
		spirits: [],
		foci: [],
		metamagics: []
	};

	/* Set Magic attribute to starting value (typically 1 for awakened) */
	const updated: Character = {
		...char,
		magic: magicData,
		attributes: {
			...char.attributes,
			mag: { base: 1, bonus: 0, karma: 0 }
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Set the magic tradition.
 */
export function setTradition(tradition: string): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	const updated: Character = {
		...char,
		magic: {
			...char.magic,
			tradition
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Set the character's mentor spirit.
 * Mentor spirits provide bonuses and disadvantages.
 * Costs 5 BP during character creation.
 */
export function setMentor(mentorName: string | null): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	/* Calculate BP cost: 5 BP for mentor spirit */
	const newMentorBP = mentorName !== null ? 5 : 0;

	/* Check BP availability */
	const totalSpent = Object.values(char.buildPointsSpent).reduce((a, b) => a + b, 0);
	const bpDiff = newMentorBP - char.buildPointsSpent.mentor;
	if (totalSpent + bpDiff > char.buildPoints) return;

	const updated: Character = {
		...char,
		magic: {
			...char.magic,
			mentor: mentorName
		},
		buildPointsSpent: {
			...char.buildPointsSpent,
			mentor: newMentorBP
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Add a spell to the character.
 * Costs 5 BP per spell during creation.
 */
export function addSpell(spell: {
	name: string;
	category: string;
	type: string;
	range: string;
	damage: string;
	duration: string;
	dv: string;
}): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	/* Check if spell already exists */
	if (char.magic.spells.some((s) => s.name === spell.name)) return;

	const newSpell: CharacterSpell = {
		id: generateId(),
		...spell,
		notes: ''
	};

	const updated: Character = {
		...char,
		magic: {
			...char.magic,
			spells: [...char.magic.spells, newSpell]
		},
		buildPointsSpent: {
			...char.buildPointsSpent,
			spells: char.buildPointsSpent.spells + 5
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Remove a spell from the character.
 */
export function removeSpell(spellId: string): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	const updated: Character = {
		...char,
		magic: {
			...char.magic,
			spells: char.magic.spells.filter((s) => s.id !== spellId)
		},
		buildPointsSpent: {
			...char.buildPointsSpent,
			spells: char.buildPointsSpent.spells - 5
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Add an adept power to the character.
 */
export function addPower(power: { name: string; points: number; level: number }): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	/* Check power point availability */
	const newUsed = char.magic.powerPointsUsed + power.points;
	if (newUsed > char.magic.powerPoints) return;

	const newPower: CharacterPower = {
		id: generateId(),
		name: power.name,
		points: power.points,
		level: power.level,
		notes: ''
	};

	const updated: Character = {
		...char,
		magic: {
			...char.magic,
			powers: [...char.magic.powers, newPower],
			powerPointsUsed: newUsed
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Remove an adept power from the character.
 */
export function removePower(powerId: string): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	const power = char.magic.powers.find((p) => p.id === powerId);
	if (!power) return;

	const updated: Character = {
		...char,
		magic: {
			...char.magic,
			powers: char.magic.powers.filter((p) => p.id !== powerId),
			powerPointsUsed: char.magic.powerPointsUsed - power.points
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Initialize technomancer resonance.
 */
export function initializeResonance(stream: string): void {
	const char = get(characterStore);
	if (!char) return;

	const resonanceData: CharacterResonance = {
		stream,
		submersionGrade: 0,
		complexForms: [],
		sprites: [],
		echoes: []
	};

	const updated: Character = {
		...char,
		resonance: resonanceData,
		attributes: {
			...char.attributes,
			res: { base: 1, bonus: 0, karma: 0 }
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Add a complex form to the character (technomancer).
 * Costs 5 BP per complex form during creation.
 */
export function addComplexForm(form: {
	name: string;
	target: string;
	duration: string;
	fv: string;
}): void {
	const char = get(characterStore);
	if (!char || !char.resonance) return;

	/* Check if form already exists */
	if (char.resonance.complexForms.some((f) => f.name === form.name)) return;

	const newForm = {
		id: generateId(),
		...form,
		rating: 1,
		notes: ''
	};

	const updated: Character = {
		...char,
		resonance: {
			...char.resonance,
			complexForms: [...char.resonance.complexForms, newForm]
		},
		buildPointsSpent: {
			...char.buildPointsSpent,
			complexForms: char.buildPointsSpent.complexForms + 5
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Remove a complex form from the character.
 */
export function removeComplexForm(formId: string): void {
	const char = get(characterStore);
	if (!char || !char.resonance) return;

	const updated: Character = {
		...char,
		resonance: {
			...char.resonance,
			complexForms: char.resonance.complexForms.filter((f) => f.id !== formId)
		},
		buildPointsSpent: {
			...char.buildPointsSpent,
			complexForms: char.buildPointsSpent.complexForms - 5
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Learn a new complex form with karma (career mode).
 */
export function learnComplexForm(form: {
	name: string;
	target: string;
	duration: string;
	fv: string;
}): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (char.status !== 'career') {
		return { success: false, error: 'Character must be in career mode' };
	}
	if (!char.resonance) {
		return { success: false, error: 'Character is not a technomancer' };
	}

	/* Check if already has form */
	if (char.resonance.complexForms.some((f) => f.name === form.name)) {
		return { success: false, error: 'Already knows this complex form' };
	}

	const cost = KARMA_COSTS.NEW_COMPLEX_FORM;
	if (char.karma < cost) {
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };
	}

	/* Spend karma */
	const spendResult = spendKarmaInternal(cost, `Learned complex form: ${form.name}`);
	if (!spendResult.success) return spendResult;

	/* Add form */
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

/* ============================================
 * Equipment Functions
 * ============================================ */

/**
 * Set BP spent on resources (nuyen).
 * Updates starting nuyen based on BP-to-nuyen conversion.
 */
export function setResourcesBP(bp: number): void {
	const char = get(characterStore);
	if (!char) return;

	/* Clamp to valid range (0-50 BP) */
	const clampedBP = Math.max(0, Math.min(50, bp));
	const nuyen = bpToNuyen(clampedBP);

	const updated: Character = {
		...char,
		buildPointsSpent: {
			...char.buildPointsSpent,
			resources: clampedBP
		},
		startingNuyen: nuyen,
		nuyen: nuyen - calculateEquipmentSpent(char),
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Calculate total nuyen spent on equipment.
 */
function calculateEquipmentSpent(char: Character): number {
	let total = 0;

	for (const weapon of char.equipment.weapons) {
		total += weapon.cost;
	}
	for (const armor of char.equipment.armor) {
		total += armor.cost;
	}
	for (const cyber of char.equipment.cyberware) {
		total += cyber.cost;
	}
	for (const gear of char.equipment.gear) {
		total += gear.cost * gear.quantity;
	}
	if (char.equipment.lifestyle) {
		total += char.equipment.lifestyle.monthlyCost * char.equipment.lifestyle.monthsPrepaid;
	}

	return total;
}

/**
 * Add a weapon to the character's equipment.
 */
export function addWeapon(weapon: GameWeapon): void {
	const char = get(characterStore);
	if (!char) return;

	/* Check if we have enough nuyen */
	if (char.nuyen < weapon.cost) return;

	// Parse max ammo from ammo string
	const ammoMatch = weapon.ammo.match(/^(\d+)/);
	const maxAmmo = ammoMatch ? parseInt(ammoMatch[1], 10) : 0;

	const newWeapon: CharacterWeapon = {
		id: generateId(),
		name: weapon.name,
		category: weapon.category,
		type: weapon.type,
		reach: weapon.reach,
		damage: weapon.damage,
		ap: weapon.ap,
		mode: weapon.mode,
		rc: weapon.rc,
		ammo: weapon.ammo,
		currentAmmo: maxAmmo, // Initialize with full ammo
		conceal: weapon.conceal,
		cost: weapon.cost,
		accessories: [],
		notes: ''
	};

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			weapons: [...char.equipment.weapons, newWeapon]
		},
		nuyen: char.nuyen - weapon.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Remove a weapon from the character's equipment.
 */
export function removeWeapon(weaponId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const weapon = char.equipment.weapons.find((w) => w.id === weaponId);
	if (!weapon) return;

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			weapons: char.equipment.weapons.filter((w) => w.id !== weaponId)
		},
		nuyen: char.nuyen + weapon.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Add armor to the character's equipment.
 */
export function addArmor(armor: GameArmor): void {
	const char = get(characterStore);
	if (!char) return;

	if (char.nuyen < armor.cost) return;

	const newArmor: CharacterArmor = {
		id: generateId(),
		name: armor.name,
		category: armor.category,
		ballistic: armor.ballistic,
		impact: armor.impact,
		capacity: armor.capacity,
		capacityUsed: 0,
		equipped: true,
		cost: armor.cost,
		modifications: [],
		notes: ''
	};

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			armor: [...char.equipment.armor, newArmor]
		},
		nuyen: char.nuyen - armor.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Remove armor from the character's equipment.
 */
export function removeArmor(armorId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const armor = char.equipment.armor.find((a) => a.id === armorId);
	if (!armor) return;

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			armor: char.equipment.armor.filter((a) => a.id !== armorId)
		},
		nuyen: char.nuyen + armor.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Add an accessory to a weapon.
 */
export function addWeaponAccessory(
	weaponId: string,
	accessory: { name: string; mount: string; cost: number }
): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };

	const weapon = char.equipment.weapons.find((w) => w.id === weaponId);
	if (!weapon) return { success: false, error: 'Weapon not found' };

	if (char.nuyen < accessory.cost) {
		return { success: false, error: `Not enough nuyen. Need ${accessory.cost}¥` };
	}

	const newAccessory = {
		id: generateId(),
		name: accessory.name,
		mount: accessory.mount,
		cost: accessory.cost
	};

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			weapons: char.equipment.weapons.map((w) =>
				w.id === weaponId
					? { ...w, accessories: [...w.accessories, newAccessory] }
					: w
			)
		},
		nuyen: char.nuyen - accessory.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
	return { success: true };
}

/**
 * Remove an accessory from a weapon.
 */
export function removeWeaponAccessory(
	weaponId: string,
	accessoryId: string
): void {
	const char = get(characterStore);
	if (!char) return;

	const weapon = char.equipment.weapons.find((w) => w.id === weaponId);
	if (!weapon) return;

	const accessory = weapon.accessories.find((a) => a.id === accessoryId);
	if (!accessory) return;

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			weapons: char.equipment.weapons.map((w) =>
				w.id === weaponId
					? { ...w, accessories: w.accessories.filter((a) => a.id !== accessoryId) }
					: w
			)
		},
		nuyen: char.nuyen + accessory.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Toggle armor equipped status.
 */
export function toggleArmorEquipped(armorId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			armor: char.equipment.armor.map((a) =>
				a.id === armorId ? { ...a, equipped: !a.equipped } : a
			)
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Add a modification to armor.
 */
export function addArmorModification(
	armorId: string,
	mod: { name: string; rating: number; cost: number; capacityCost: number }
): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };

	const armor = char.equipment.armor.find((a) => a.id === armorId);
	if (!armor) return { success: false, error: 'Armor not found' };

	const currentCapacity = armor.modifications?.reduce((sum, m) => sum + m.capacityCost, 0) ?? 0;
	if (currentCapacity + mod.capacityCost > armor.capacity) {
		return { success: false, error: 'Not enough capacity' };
	}

	if (char.nuyen < mod.cost) {
		return { success: false, error: `Not enough nuyen. Need ${mod.cost}¥` };
	}

	const newMod = {
		id: generateId(),
		name: mod.name,
		rating: mod.rating,
		cost: mod.cost,
		capacityCost: mod.capacityCost
	};

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			armor: char.equipment.armor.map((a) =>
				a.id === armorId
					? { ...a, modifications: [...(a.modifications || []), newMod] }
					: a
			)
		},
		nuyen: char.nuyen - mod.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
	return { success: true };
}

/**
 * Remove a modification from armor.
 */
export function removeArmorModification(armorId: string, modId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const armor = char.equipment.armor.find((a) => a.id === armorId);
	if (!armor) return;

	const mod = armor.modifications?.find((m) => m.id === modId);
	if (!mod) return;

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			armor: char.equipment.armor.map((a) =>
				a.id === armorId
					? { ...a, modifications: a.modifications?.filter((m) => m.id !== modId) || [] }
					: a
			)
		},
		nuyen: char.nuyen + mod.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Calculate total armor value using SR4 stacking rules.
 * Delegates to calculations engine for DRY compliance.
 */
export function calculateTotalArmor(): ArmorTotals {
	const char = get(characterStore);
	if (!char) return { ballistic: 0, impact: 0, encumbrance: 0 };
	return calculateArmorTotals(char);
}

/**
 * Add cyberware to the character.
 * Reduces essence based on grade.
 */
export function addCyberware(
	cyber: GameCyberware,
	grade: CyberwareGrade = 'Standard'
): void {
	const char = get(characterStore);
	if (!char) return;

	/* Get grade multipliers */
	const gradeMultipliers: Record<CyberwareGrade, { ess: number; cost: number }> = {
		'Standard': { ess: 1.0, cost: 1 },
		'Alphaware': { ess: 0.8, cost: 2 },
		'Betaware': { ess: 0.7, cost: 4 },
		'Deltaware': { ess: 0.5, cost: 10 },
		'Used': { ess: 1.2, cost: 0.5 }
	};

	const multiplier = gradeMultipliers[grade];
	const essenceCost = cyber.ess * multiplier.ess;
	const nuyenCost = Math.floor(cyber.cost * multiplier.cost);

	/* Check if we have enough nuyen and essence */
	if (char.nuyen < nuyenCost) return;
	if (char.attributes.ess - essenceCost < 0) return;

	const newCyber: CharacterCyberware = {
		id: generateId(),
		name: cyber.name,
		category: cyber.category,
		grade,
		rating: cyber.rating || 1,
		essence: essenceCost,
		cost: nuyenCost,
		capacity: 0,
		capacityUsed: 0,
		location: '',
		subsystems: [],
		notes: ''
	};

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			cyberware: [...char.equipment.cyberware, newCyber]
		},
		attributes: {
			...char.attributes,
			ess: char.attributes.ess - essenceCost
		},
		nuyen: char.nuyen - nuyenCost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Remove cyberware from the character.
 * Restores essence.
 */
export function removeCyberware(cyberId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const cyber = char.equipment.cyberware.find((c) => c.id === cyberId);
	if (!cyber) return;

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			cyberware: char.equipment.cyberware.filter((c) => c.id !== cyberId)
		},
		attributes: {
			...char.attributes,
			ess: char.attributes.ess + cyber.essence
		},
		nuyen: char.nuyen + cyber.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/* ============================================
 * Bioware Functions
 * ============================================ */

/**
 * Add bioware to the character.
 */
export function addBioware(
	bio: GameBioware,
	grade: BiowareGrade = 'Standard',
	rating: number = 1
): void {
	const char = get(characterStore);
	if (!char) return;

	/* Get grade multipliers */
	const gradeMultipliers: Record<BiowareGrade, { ess: number; cost: number }> = {
		'Standard': { ess: 1.0, cost: 1 },
		'Cultured': { ess: 0.75, cost: 4 }
	};

	const multiplier = gradeMultipliers[grade];
	const essenceCost = bio.ess * multiplier.ess * rating;
	const nuyenCost = Math.floor(bio.cost * multiplier.cost * rating);

	/* Check if we have enough nuyen and essence */
	if (char.nuyen < nuyenCost) return;
	if (char.attributes.ess - essenceCost < 0) return;

	const newBio: CharacterBioware = {
		id: generateId(),
		name: bio.name,
		category: bio.category,
		grade,
		rating,
		essence: essenceCost,
		cost: nuyenCost,
		notes: ''
	};

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			bioware: [...char.equipment.bioware, newBio]
		},
		attributes: {
			...char.attributes,
			ess: char.attributes.ess - essenceCost
		},
		nuyen: char.nuyen - nuyenCost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Remove bioware from the character.
 */
export function removeBioware(bioId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const bio = char.equipment.bioware.find((b) => b.id === bioId);
	if (!bio) return;

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			bioware: char.equipment.bioware.filter((b) => b.id !== bioId)
		},
		attributes: {
			...char.attributes,
			ess: char.attributes.ess + bio.essence
		},
		nuyen: char.nuyen + bio.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/* ============================================
 * Vehicle Functions
 * ============================================ */

/**
 * Add a vehicle to the character.
 */
export function addVehicle(vehicle: GameVehicle): void {
	const char = get(characterStore);
	if (!char) return;

	if (char.nuyen < vehicle.cost) return;

	const newVehicle: CharacterVehicle = {
		id: generateId(),
		name: vehicle.name,
		category: vehicle.category,
		handling: vehicle.handling,
		accel: vehicle.accel,
		speed: vehicle.speed,
		pilot: vehicle.pilot,
		body: vehicle.body,
		armor: vehicle.armor,
		sensor: vehicle.sensor,
		cost: vehicle.cost,
		mods: [],
		notes: ''
	};

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			vehicles: [...char.equipment.vehicles, newVehicle]
		},
		nuyen: char.nuyen - vehicle.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Remove a vehicle from the character.
 */
export function removeVehicle(vehicleId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const vehicle = char.equipment.vehicles.find((v) => v.id === vehicleId);
	if (!vehicle) return;

	/* Calculate total refund including mods */
	let refund = vehicle.cost;
	for (const mod of vehicle.mods) {
		refund += mod.cost;
	}

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			vehicles: char.equipment.vehicles.filter((v) => v.id !== vehicleId)
		},
		nuyen: char.nuyen + refund,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/* ============================================
 * Martial Arts Functions
 * ============================================ */

/** BP cost for martial arts. */
export const MARTIAL_ARTS_COSTS = {
	STYLE: 5,
	TECHNIQUE: 2
} as const;

/**
 * Add a martial art style to the character.
 */
export function addMartialArt(style: GameMartialArt): void {
	const char = get(characterStore);
	if (!char) return;

	/* Check if already known */
	if (char.equipment.martialArts.some((m) => m.name === style.name)) return;

	/* Check BP cost (5 BP per style) */
	const bpCost = MARTIAL_ARTS_COSTS.STYLE;
	const currentSpent = Object.values(char.buildPointsSpent).reduce((a, b) => a + b, 0);
	if (currentSpent + bpCost > char.buildPoints) return;

	const newArt: CharacterMartialArt = {
		id: generateId(),
		name: style.name,
		techniques: []
	};

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			martialArts: [...char.equipment.martialArts, newArt]
		},
		buildPointsSpent: {
			...char.buildPointsSpent,
			martialArts: char.buildPointsSpent.martialArts + bpCost
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Remove a martial art style from the character.
 */
export function removeMartialArt(artId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const art = char.equipment.martialArts.find((m) => m.id === artId);
	if (!art) return;

	/* Refund BP for style + techniques */
	const bpRefund = MARTIAL_ARTS_COSTS.STYLE + (art.techniques.length * MARTIAL_ARTS_COSTS.TECHNIQUE);

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			martialArts: char.equipment.martialArts.filter((m) => m.id !== artId)
		},
		buildPointsSpent: {
			...char.buildPointsSpent,
			martialArts: Math.max(0, char.buildPointsSpent.martialArts - bpRefund)
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Add a technique to a martial art style.
 */
export function addMartialArtTechnique(artId: string, technique: string): void {
	const char = get(characterStore);
	if (!char) return;

	const art = char.equipment.martialArts.find((m) => m.id === artId);
	if (!art) return;

	/* Check if already known */
	if (art.techniques.includes(technique)) return;

	/* Check BP cost (2 BP per technique) */
	const bpCost = MARTIAL_ARTS_COSTS.TECHNIQUE;
	const currentSpent = Object.values(char.buildPointsSpent).reduce((a, b) => a + b, 0);
	if (currentSpent + bpCost > char.buildPoints) return;

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			martialArts: char.equipment.martialArts.map((m) =>
				m.id === artId ? { ...m, techniques: [...m.techniques, technique] } : m
			)
		},
		buildPointsSpent: {
			...char.buildPointsSpent,
			martialArts: char.buildPointsSpent.martialArts + bpCost
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Remove a technique from a martial art style.
 */
export function removeMartialArtTechnique(artId: string, technique: string): void {
	const char = get(characterStore);
	if (!char) return;

	const art = char.equipment.martialArts.find((m) => m.id === artId);
	if (!art) return;

	if (!art.techniques.includes(technique)) return;

	const bpRefund = MARTIAL_ARTS_COSTS.TECHNIQUE;

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			martialArts: char.equipment.martialArts.map((m) =>
				m.id === artId ? { ...m, techniques: m.techniques.filter((t) => t !== technique) } : m
			)
		},
		buildPointsSpent: {
			...char.buildPointsSpent,
			martialArts: Math.max(0, char.buildPointsSpent.martialArts - bpRefund)
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Add gear to the character's equipment.
 */
export function addGear(gear: GameGear, quantity: number = 1, containerId: string | null = null): void {
	const char = get(characterStore);
	if (!char) return;

	const totalCost = gear.cost * quantity;
	if (char.nuyen < totalCost) return;

	/* If adding to a container, check capacity */
	if (containerId) {
		const container = char.equipment.gear.find((g) => g.id === containerId);
		if (!container || container.capacity <= 0) return;
		const capacityCost = gear.capacityCost ?? 1;
		if (container.capacityUsed + capacityCost > container.capacity) return;
	}

	/* Check if gear already exists and stack (only if not in a container) */
	const existingIndex = containerId === null
		? char.equipment.gear.findIndex((g) => g.name === gear.name && g.containerId === null)
		: -1;

	let newGear: readonly CharacterGear[];
	if (existingIndex >= 0) {
		newGear = char.equipment.gear.map((g, i) =>
			i === existingIndex ? { ...g, quantity: g.quantity + quantity } : g
		);
	} else {
		const newItem: CharacterGear = {
			id: generateId(),
			name: gear.name,
			category: gear.category,
			rating: gear.rating,
			quantity,
			cost: gear.cost,
			location: '',
			notes: '',
			capacity: gear.capacity ?? 0,
			capacityUsed: 0,
			capacityCost: gear.capacityCost ?? 1,
			containerId,
			containedItems: []
		};
		newGear = [...char.equipment.gear, newItem];

		/* Update container's capacity used and contained items list */
		if (containerId) {
			const containerIndex = newGear.findIndex((g) => g.id === containerId);
			if (containerIndex >= 0) {
				const container = newGear[containerIndex]!;
				newGear = newGear.map((g, i) =>
					i === containerIndex
						? {
							...g,
							capacityUsed: container.capacityUsed + (gear.capacityCost ?? 1),
							containedItems: [...container.containedItems, newItem.id]
						}
						: g
				);
			}
		}
	}

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			gear: newGear
		},
		nuyen: char.nuyen - totalCost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Remove gear from the character's equipment.
 * Also removes any contained items.
 */
export function removeGear(gearId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const gear = char.equipment.gear.find((g) => g.id === gearId);
	if (!gear) return;

	/* Calculate refund including contained items */
	let refund = gear.cost * gear.quantity;

	/* Get IDs of all items to remove (this item + all contained items recursively) */
	const idsToRemove = new Set<string>([gearId]);

	function addContainedItems(containerId: string): void {
		for (const item of char.equipment.gear) {
			if (item.containerId === containerId) {
				idsToRemove.add(item.id);
				refund += item.cost * item.quantity;
				addContainedItems(item.id); // Recursively add nested items
			}
		}
	}
	addContainedItems(gearId);

	/* If this item was in a container, update the container's capacity */
	let newGear = char.equipment.gear.filter((g) => !idsToRemove.has(g.id));
	if (gear.containerId) {
		const containerIndex = newGear.findIndex((g) => g.id === gear.containerId);
		if (containerIndex >= 0) {
			const container = newGear[containerIndex]!;
			newGear = newGear.map((g, i) =>
				i === containerIndex
					? {
						...g,
						capacityUsed: Math.max(0, container.capacityUsed - gear.capacityCost),
						containedItems: container.containedItems.filter((id) => id !== gearId)
					}
					: g
			);
		}
	}

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			gear: newGear
		},
		nuyen: char.nuyen + refund,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Move gear to a different container (or out of a container).
 */
export function moveGearToContainer(gearId: string, newContainerId: string | null): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}

	const gear = char.equipment.gear.find((g) => g.id === gearId);
	if (!gear) {
		return { success: false, error: 'Gear not found' };
	}

	/* Can't move a container into itself */
	if (newContainerId === gearId) {
		return { success: false, error: 'Cannot move container into itself' };
	}

	/* Check if new container has capacity */
	if (newContainerId) {
		const newContainer = char.equipment.gear.find((g) => g.id === newContainerId);
		if (!newContainer) {
			return { success: false, error: 'Target container not found' };
		}
		if (newContainer.capacity <= 0) {
			return { success: false, error: 'Target is not a container' };
		}
		if (newContainer.capacityUsed + gear.capacityCost > newContainer.capacity) {
			return { success: false, error: 'Not enough capacity in target container' };
		}
	}

	let newGear = [...char.equipment.gear];

	/* Remove from old container */
	if (gear.containerId) {
		const oldContainerIndex = newGear.findIndex((g) => g.id === gear.containerId);
		if (oldContainerIndex >= 0) {
			const oldContainer = newGear[oldContainerIndex]!;
			newGear[oldContainerIndex] = {
				...oldContainer,
				capacityUsed: Math.max(0, oldContainer.capacityUsed - gear.capacityCost),
				containedItems: oldContainer.containedItems.filter((id) => id !== gearId)
			};
		}
	}

	/* Add to new container */
	if (newContainerId) {
		const newContainerIndex = newGear.findIndex((g) => g.id === newContainerId);
		if (newContainerIndex >= 0) {
			const newContainer = newGear[newContainerIndex]!;
			newGear[newContainerIndex] = {
				...newContainer,
				capacityUsed: newContainer.capacityUsed + gear.capacityCost,
				containedItems: [...newContainer.containedItems, gearId]
			};
		}
	}

	/* Update gear's container reference */
	const gearIndex = newGear.findIndex((g) => g.id === gearId);
	if (gearIndex >= 0) {
		newGear[gearIndex] = {
			...gear,
			containerId: newContainerId
		};
	}

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			gear: newGear
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
	return { success: true };
}

/**
 * Set the character's lifestyle.
 */
export function setLifestyle(
	name: string,
	level: string,
	monthlyCost: number,
	monthsPrepaid: number = 1
): void {
	const char = get(characterStore);
	if (!char) return;

	const totalCost = monthlyCost * monthsPrepaid;

	/* Refund old lifestyle if exists */
	let currentNuyen = char.nuyen;
	if (char.equipment.lifestyle) {
		currentNuyen += char.equipment.lifestyle.monthlyCost * char.equipment.lifestyle.monthsPrepaid;
	}

	if (currentNuyen < totalCost) return;

	const newLifestyle: CharacterLifestyle = {
		id: generateId(),
		name,
		level,
		monthlyCost,
		monthsPrepaid,
		location: '',
		notes: ''
	};

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			lifestyle: newLifestyle
		},
		nuyen: currentNuyen - totalCost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Remove the character's lifestyle.
 */
export function removeLifestyle(): void {
	const char = get(characterStore);
	if (!char || !char.equipment.lifestyle) return;

	const refund = char.equipment.lifestyle.monthlyCost * char.equipment.lifestyle.monthsPrepaid;

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			lifestyle: null
		},
		nuyen: char.nuyen + refund,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Derived store for remaining nuyen. */
export const remainingNuyen: Readable<number> = derived(
	character,
	($char) => $char?.nuyen ?? 0
);

/** Derived store for starting nuyen. */
export const startingNuyen: Readable<number> = derived(
	character,
	($char) => $char?.startingNuyen ?? 0
);

/** Derived store for current essence. */
export const currentEssence: Readable<number> = derived(
	character,
	($char) => $char?.attributes.ess ?? 6.0
);

/* ============================================
 * Save/Load Functions (Firebase Integration)
 * ============================================ */

import {
	saveCharacter as firebaseSave,
	loadCharacter as firebaseLoad,
	deleteCharacter as firebaseDelete,
	listUserCharacters as firebaseList,
	duplicateCharacter as firebaseDuplicate,
	type CharacterSummary
} from '$lib/firebase';

/** Result type for async operations. */
interface AsyncResult<T = void> {
	success: boolean;
	error?: string;
	data?: T;
}

/**
 * Save current character to Firebase.
 * Returns success status.
 */
export async function saveCurrentCharacter(): Promise<AsyncResult> {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character to save' };
	}

	const result = await firebaseSave(char);
	return result;
}

/**
 * Load a character from Firebase by ID.
 * Sets the loaded character as current.
 */
export async function loadSavedCharacter(characterId: string): Promise<AsyncResult<Character | null>> {
	const result = await firebaseLoad(characterId);

	if (result.success && result.data) {
		characterStore.set(result.data);
		/* Set step based on character status */
		if (result.data.status === 'creation') {
			currentStepStore.set('finalize');
		}
	}

	return result;
}

/**
 * Load an imported character into the store.
 * Used when importing from Chummer XML files.
 */
export function loadImportedCharacter(importedChar: Character): void {
	characterStore.set(importedChar);
	/* Set step based on character status */
	if (importedChar.status === 'creation') {
		currentStepStore.set('finalize');
	}
}

/**
 * Delete a character from Firebase.
 * If it's the current character, clears the store.
 */
export async function deleteSavedCharacter(characterId: string): Promise<AsyncResult> {
	const char = get(characterStore);

	const result = await firebaseDelete(characterId);

	if (result.success && char?.id === characterId) {
		characterStore.set(null);
		currentStepStore.set('method');
	}

	return result;
}

/**
 * List all characters for a user.
 */
export async function listCharacters(userId: string): Promise<AsyncResult<CharacterSummary[]>> {
	return firebaseList(userId);
}

/**
 * Duplicate a character.
 * Creates a copy with a new ID.
 */
export async function duplicateCurrentCharacter(): Promise<AsyncResult<Character | null>> {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character to duplicate' };
	}

	const newId = generateId();
	return firebaseDuplicate(char.id, newId, char.userId);
}

/**
 * Clear the current character from store.
 * Does not delete from Firebase.
 */
export function clearCurrentCharacter(): void {
	characterStore.set(null);
	currentStepStore.set('method');
}

/**
 * Check if there are unsaved changes.
 * Compares current character to last saved version.
 */
let lastSavedVersion: string | null = null;

export function markAsSaved(): void {
	const char = get(characterStore);
	lastSavedVersion = char ? JSON.stringify(char) : null;
}

export function hasUnsavedChanges(): boolean {
	const char = get(characterStore);
	if (!char) return false;

	const currentVersion = JSON.stringify(char);
	return currentVersion !== lastSavedVersion;
}

/** Derived store for unsaved changes indicator. */
export const isDirty: Readable<boolean> = derived(
	character,
	($char) => {
		if (!$char) return false;
		const currentVersion = JSON.stringify($char);
		return currentVersion !== lastSavedVersion;
	}
);

/**
 * Auto-save interval (in milliseconds).
 * Set to null to disable auto-save.
 */
let autoSaveInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Enable auto-save with given interval.
 * Saves every interval ms if there are unsaved changes.
 */
export function enableAutoSave(intervalMs: number = 30000): void {
	disableAutoSave();

	autoSaveInterval = setInterval(async () => {
		if (hasUnsavedChanges()) {
			const result = await saveCurrentCharacter();
			if (result.success) {
				markAsSaved();
			}
		}
	}, intervalMs);
}

/**
 * Disable auto-save.
 */
export function disableAutoSave(): void {
	if (autoSaveInterval) {
		clearInterval(autoSaveInterval);
		autoSaveInterval = null;
	}
}

/* ========================================
 * Career Mode Functions
 * ======================================== */

/**
 * Karma costs for various improvements in SR4.
 */
export const KARMA_COSTS = {
	NEW_SKILL: 4,
	IMPROVE_SKILL_MULTIPLIER: 2, /* New rating × 2 */
	NEW_SKILL_GROUP: 10,
	IMPROVE_SKILL_GROUP_MULTIPLIER: 5, /* New rating × 5 */
	NEW_KNOWLEDGE_SKILL: 2,
	IMPROVE_KNOWLEDGE_SKILL_MULTIPLIER: 1, /* New rating × 1 */
	IMPROVE_ATTRIBUTE_MULTIPLIER: 5, /* New rating × 5 */
	NEW_SPELL: 5,
	NEW_COMPLEX_FORM: 5,
	INITIATION_BASE: 10,
	INITIATION_MULTIPLIER: 3, /* 10 + (grade × 3) */
	SUBMERSION_BASE: 10,
	SUBMERSION_MULTIPLIER: 3, /* 10 + (grade × 3) */
	QUALITY_MULTIPLIER: 2 /* BP × 2 to add/remove */
} as const;

/**
 * Transition character from creation to career mode.
 * Cannot be undone.
 */
export function enterCareerMode(): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (char.status === 'career') {
		return { success: false, error: 'Character is already in career mode' };
	}

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

/**
 * Add an expense entry to the log.
 */
function addExpenseEntry(type: 'karma' | 'nuyen', amount: number, reason: string): void {
	const entry = {
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

/**
 * Award karma to the character.
 */
export function awardKarma(amount: number, reason: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (amount <= 0) {
		return { success: false, error: 'Amount must be positive' };
	}

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

/**
 * Spend karma (internal helper).
 */
function spendKarmaInternal(amount: number, reason: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (char.karma < amount) {
		return { success: false, error: `Not enough karma (have ${char.karma}, need ${amount})` };
	}

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

/**
 * Award nuyen to the character.
 */
export function awardNuyen(amount: number, reason: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (amount <= 0) {
		return { success: false, error: 'Amount must be positive' };
	}

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

/**
 * Spend nuyen.
 */
export function spendNuyen(amount: number, reason: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (amount <= 0) {
		return { success: false, error: 'Amount must be positive' };
	}
	if (char.nuyen < amount) {
		return { success: false, error: `Not enough nuyen (have ${char.nuyen}, need ${amount})` };
	}

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

/**
 * Calculate karma cost to improve an attribute.
 */
export function getAttributeImprovementCost(attributeKey: string): number | null {
	const char = get(characterStore);
	if (!char) return null;

	const attr = char.attributes[attributeKey as keyof typeof char.attributes];
	if (typeof attr !== 'object' || attr === null) return null;

	const currentRating = attr.base + attr.bonus;
	const newRating = currentRating + 1;

	/* Check against max */
	const limits = char.attributeLimits[attributeKey as keyof typeof char.attributeLimits];
	if (typeof limits === 'object' && limits !== null && 'aug' in limits) {
		if (newRating > limits.aug) return null;
	}

	return newRating * KARMA_COSTS.IMPROVE_ATTRIBUTE_MULTIPLIER;
}

/**
 * Improve an attribute with karma.
 */
export function improveAttribute(attributeKey: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (char.status !== 'career') {
		return { success: false, error: 'Character must be in career mode' };
	}

	const attr = char.attributes[attributeKey as keyof typeof char.attributes];
	if (typeof attr !== 'object' || attr === null) {
		return { success: false, error: 'Invalid attribute' };
	}

	const currentRating = attr.base;
	const newRating = currentRating + 1;

	/* Check limits */
	const limits = char.attributeLimits[attributeKey as keyof typeof char.attributeLimits];
	if (typeof limits === 'object' && limits !== null && 'max' in limits) {
		if (newRating > limits.max) {
			return { success: false, error: `Attribute already at maximum (${limits.max})` };
		}
	}

	const cost = newRating * KARMA_COSTS.IMPROVE_ATTRIBUTE_MULTIPLIER;
	if (char.karma < cost) {
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };
	}

	/* Spend karma */
	const spendResult = spendKarmaInternal(cost, `Improved ${attributeKey.toUpperCase()} to ${newRating}`);
	if (!spendResult.success) return spendResult;

	/* Update attribute */
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

/**
 * Calculate karma cost to improve a skill.
 */
export function getSkillImprovementCost(skillName: string): number | null {
	const char = get(characterStore);
	if (!char) return null;

	const skill = char.skills.find((s) => s.name === skillName);
	if (!skill) return KARMA_COSTS.NEW_SKILL;

	const newRating = skill.rating + 1;
	if (newRating > 6) return null; /* Max skill rating */

	return newRating * KARMA_COSTS.IMPROVE_SKILL_MULTIPLIER;
}

/**
 * Improve a skill with karma.
 */
export function improveSkill(skillName: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (char.status !== 'career') {
		return { success: false, error: 'Character must be in career mode' };
	}

	const skillIndex = char.skills.findIndex((s) => s.name === skillName);
	if (skillIndex === -1) {
		return { success: false, error: 'Skill not found. Use learnNewSkill to add a new skill.' };
	}

	const skill = char.skills[skillIndex]!;
	const newRating = skill.rating + 1;

	if (newRating > 6) {
		return { success: false, error: 'Skill already at maximum (6)' };
	}

	const cost = newRating * KARMA_COSTS.IMPROVE_SKILL_MULTIPLIER;
	if (char.karma < cost) {
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };
	}

	/* Spend karma */
	const spendResult = spendKarmaInternal(cost, `Improved ${skillName} to ${newRating}`);
	if (!spendResult.success) return spendResult;

	/* Update skill */
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

/**
 * Learn a new skill (rating 1) with karma.
 */
export function learnNewSkill(skillName: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (char.status !== 'career') {
		return { success: false, error: 'Character must be in career mode' };
	}

	/* Check if already has skill */
	if (char.skills.some((s) => s.name === skillName)) {
		return { success: false, error: 'Already has this skill. Use improveSkill instead.' };
	}

	const cost = KARMA_COSTS.NEW_SKILL;
	if (char.karma < cost) {
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };
	}

	/* Spend karma */
	const spendResult = spendKarmaInternal(cost, `Learned ${skillName} at rating 1`);
	if (!spendResult.success) return spendResult;

	/* Add skill */
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

/**
 * Add a specialization to a skill with karma.
 */
export function addSpecialization(skillName: string, specialization: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (char.status !== 'career') {
		return { success: false, error: 'Character must be in career mode' };
	}

	const skillIndex = char.skills.findIndex((s) => s.name === skillName);
	if (skillIndex === -1) {
		return { success: false, error: 'Skill not found' };
	}

	const skill = char.skills[skillIndex]!;
	if (skill.specialization) {
		return { success: false, error: 'Skill already has a specialization' };
	}

	const cost = 2; /* 2 karma for specialization in career mode */
	if (char.karma < cost) {
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };
	}

	/* Spend karma */
	const spendResult = spendKarmaInternal(cost, `Added specialization "${specialization}" to ${skillName}`);
	if (!spendResult.success) return spendResult;

	/* Update skill */
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

/**
 * Learn a new knowledge skill with karma.
 */
export function learnKnowledgeSkill(
	name: string,
	category: 'Academic' | 'Interest' | 'Language' | 'Professional' | 'Street'
): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (char.status !== 'career') {
		return { success: false, error: 'Character must be in career mode' };
	}

	/* Check if already has skill */
	if (char.knowledgeSkills.some((s) => s.name === name)) {
		return { success: false, error: 'Already has this knowledge skill' };
	}

	const cost = KARMA_COSTS.NEW_KNOWLEDGE_SKILL;
	if (char.karma < cost) {
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };
	}

	/* Spend karma */
	const spendResult = spendKarmaInternal(cost, `Learned knowledge skill: ${name}`);
	if (!spendResult.success) return spendResult;

	/* Add skill */
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
					rating: 1,
					specialization: null
				}
			],
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/**
 * Improve a knowledge skill with karma.
 */
export function improveKnowledgeSkill(skillId: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (char.status !== 'career') {
		return { success: false, error: 'Character must be in career mode' };
	}

	const skillIndex = char.knowledgeSkills.findIndex((s) => s.id === skillId);
	if (skillIndex === -1) {
		return { success: false, error: 'Knowledge skill not found' };
	}

	const skill = char.knowledgeSkills[skillIndex]!;
	const newRating = skill.rating + 1;

	if (newRating > 6) {
		return { success: false, error: 'Knowledge skill already at maximum (6)' };
	}

	const cost = newRating * KARMA_COSTS.IMPROVE_KNOWLEDGE_SKILL_MULTIPLIER;
	if (char.karma < cost) {
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };
	}

	/* Spend karma */
	const spendResult = spendKarmaInternal(cost, `Improved ${skill.name} to ${newRating}`);
	if (!spendResult.success) return spendResult;

	/* Update skill */
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

/**
 * Learn a new spell with karma (for magicians).
 */
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
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (char.status !== 'career') {
		return { success: false, error: 'Character must be in career mode' };
	}
	if (!char.magic) {
		return { success: false, error: 'Character is not awakened' };
	}

	/* Check if already has spell */
	if (char.magic.spells.some((s) => s.name === spell.name)) {
		return { success: false, error: 'Already knows this spell' };
	}

	const cost = KARMA_COSTS.NEW_SPELL;
	if (char.karma < cost) {
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };
	}

	/* Spend karma */
	const spendResult = spendKarmaInternal(cost, `Learned spell: ${spell.name}`);
	if (!spendResult.success) return spendResult;

	/* Add spell */
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

/**
 * Calculate initiation cost.
 */
export function getInitiationCost(): number | null {
	const char = get(characterStore);
	if (!char || !char.magic) return null;

	const newGrade = char.magic.initiateGrade + 1;
	return KARMA_COSTS.INITIATION_BASE + (newGrade * KARMA_COSTS.INITIATION_MULTIPLIER);
}

/**
 * Initiate to the next grade.
 */
export function initiate(): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (char.status !== 'career') {
		return { success: false, error: 'Character must be in career mode' };
	}
	if (!char.magic) {
		return { success: false, error: 'Character is not awakened' };
	}

	const newGrade = char.magic.initiateGrade + 1;
	const cost = KARMA_COSTS.INITIATION_BASE + (newGrade * KARMA_COSTS.INITIATION_MULTIPLIER);

	if (char.karma < cost) {
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };
	}

	/* Spend karma */
	const spendResult = spendKarmaInternal(cost, `Initiated to grade ${newGrade}`);
	if (!spendResult.success) return spendResult;

	/* Update magic */
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

/* ============================================
 * Technomancer Submersion (Career Mode)
 * ============================================ */

/**
 * Calculate the karma cost for the next submersion grade.
 */
export function getSubmersionCost(currentGrade: number): number {
	const newGrade = currentGrade + 1;
	return KARMA_COSTS.SUBMERSION_BASE + (newGrade * KARMA_COSTS.SUBMERSION_MULTIPLIER);
}

/**
 * Submerge to increase submersion grade.
 * Requires career mode and resonance.
 */
export function submerge(): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (char.status !== 'career') {
		return { success: false, error: 'Character must be in career mode' };
	}
	if (!char.resonance) {
		return { success: false, error: 'Character is not a technomancer' };
	}

	const newGrade = char.resonance.submersionGrade + 1;
	const cost = KARMA_COSTS.SUBMERSION_BASE + (newGrade * KARMA_COSTS.SUBMERSION_MULTIPLIER);

	if (char.karma < cost) {
		return { success: false, error: `Not enough karma (need ${cost}, have ${char.karma})` };
	}

	/* Spend karma */
	const spendResult = spendKarmaInternal(cost, `Submerged to grade ${newGrade}`);
	if (!spendResult.success) return spendResult;

	/* Update resonance */
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

/**
 * Learn an echo (requires submersion).
 * Each submersion grade grants one echo.
 */
export function learnEcho(echoName: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (!char.resonance) {
		return { success: false, error: 'Character is not a technomancer' };
	}

	/* Check if already known */
	if (char.resonance.echoes.includes(echoName)) {
		return { success: false, error: 'Echo already known' };
	}

	/* Check if they have available echo slots (one per submersion grade) */
	const availableSlots = char.resonance.submersionGrade;
	const usedSlots = char.resonance.echoes.length;

	if (usedSlots >= availableSlots) {
		return { success: false, error: 'No echo slots available (need to submerge)' };
	}

	/* Add the echo */
	characterStore.update((c) => {
		if (!c || !c.resonance) return c;
		return {
			...c,
			resonance: {
				...c.resonance,
				echoes: [...c.resonance.echoes, echoName]
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/**
 * Remove an echo.
 */
export function removeEcho(echoName: string): void {
	const char = get(characterStore);
	if (!char || !char.resonance) return;

	if (!char.resonance.echoes.includes(echoName)) return;

	characterStore.update((c) => {
		if (!c || !c.resonance) return c;
		return {
			...c,
			resonance: {
				...c.resonance,
				echoes: c.resonance.echoes.filter((e) => e !== echoName)
			},
			updatedAt: new Date().toISOString()
		};
	});
}

/* ============================================
 * Spirit Management Functions
 * ============================================ */

import type { BoundSpirit, CompiledSprite } from '$types';

/**
 * Add a bound spirit to the character.
 * @param spiritType - Type of spirit (e.g., "Fire", "Air", "Beast")
 * @param force - Force of the spirit
 * @param services - Number of services owed
 * @param bound - Whether the spirit is bound (true) or just summoned (false)
 */
export function addSpirit(
	spiritType: string,
	force: number,
	services: number,
	bound: boolean = false
): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (!char.magic) {
		return { success: false, error: 'Character is not awakened' };
	}

	const newSpirit: BoundSpirit = {
		id: generateId(),
		type: spiritType,
		force: Math.max(1, Math.min(12, force)),
		services: Math.max(0, services),
		bound
	};

	characterStore.update((c) => {
		if (!c || !c.magic) return c;
		return {
			...c,
			magic: {
				...c.magic,
				spirits: [...c.magic.spirits, newSpirit]
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/**
 * Remove a spirit from the character.
 */
export function removeSpirit(spiritId: string): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	characterStore.update((c) => {
		if (!c || !c.magic) return c;
		return {
			...c,
			magic: {
				...c.magic,
				spirits: c.magic.spirits.filter((s) => s.id !== spiritId)
			},
			updatedAt: new Date().toISOString()
		};
	});
}

/**
 * Use a service from a spirit.
 */
export function useSpiritService(spiritId: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char || !char.magic) {
		return { success: false, error: 'No character or magic' };
	}

	const spirit = char.magic.spirits.find((s) => s.id === spiritId);
	if (!spirit) {
		return { success: false, error: 'Spirit not found' };
	}
	if (spirit.services <= 0) {
		return { success: false, error: 'No services remaining' };
	}

	characterStore.update((c) => {
		if (!c || !c.magic) return c;
		return {
			...c,
			magic: {
				...c.magic,
				spirits: c.magic.spirits.map((s) =>
					s.id === spiritId ? { ...s, services: s.services - 1 } : s
				)
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/**
 * Update spirit services (for adding more via binding).
 */
export function updateSpiritServices(spiritId: string, services: number): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	characterStore.update((c) => {
		if (!c || !c.magic) return c;
		return {
			...c,
			magic: {
				...c.magic,
				spirits: c.magic.spirits.map((s) =>
					s.id === spiritId ? { ...s, services: Math.max(0, services) } : s
				)
			},
			updatedAt: new Date().toISOString()
		};
	});
}

/* ============================================
 * Metamagic Functions
 * ============================================ */

/**
 * Learn a metamagic ability (requires initiation).
 * Each initiation grade grants one metamagic.
 */
export function learnMetamagic(metamagicName: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (!char.magic) {
		return { success: false, error: 'Character is not awakened' };
	}

	/* Check if already known */
	if (char.magic.metamagics.includes(metamagicName)) {
		return { success: false, error: 'Metamagic already known' };
	}

	/* Check if they have available metamagic slots (one per initiation grade) */
	const availableSlots = char.magic.initiateGrade;
	const usedSlots = char.magic.metamagics.length;

	if (usedSlots >= availableSlots) {
		return { success: false, error: 'No metamagic slots available (need to initiate)' };
	}

	/* Add the metamagic */
	characterStore.update((c) => {
		if (!c || !c.magic) return c;
		return {
			...c,
			magic: {
				...c.magic,
				metamagics: [...c.magic.metamagics, metamagicName]
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/**
 * Remove a metamagic ability.
 */
export function removeMetamagic(metamagicName: string): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	characterStore.update((c) => {
		if (!c || !c.magic) return c;
		return {
			...c,
			magic: {
				...c.magic,
				metamagics: c.magic.metamagics.filter((m) => m !== metamagicName)
			},
			updatedAt: new Date().toISOString()
		};
	});
}

/* ============================================
 * Sprite Management Functions
 * ============================================ */

/**
 * Add a compiled sprite to the character.
 * @param spriteType - Type of sprite (e.g., "Crack", "Data", "Machine")
 * @param rating - Rating of the sprite
 * @param tasks - Number of tasks owed
 * @param registered - Whether the sprite is registered
 */
export function addSprite(
	spriteType: string,
	rating: number,
	tasks: number,
	registered: boolean = false
): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}
	if (!char.resonance) {
		return { success: false, error: 'Character is not a technomancer' };
	}

	const newSprite: CompiledSprite = {
		id: generateId(),
		type: spriteType,
		rating: Math.max(1, Math.min(12, rating)),
		tasks: Math.max(0, tasks),
		registered
	};

	characterStore.update((c) => {
		if (!c || !c.resonance) return c;
		return {
			...c,
			resonance: {
				...c.resonance,
				sprites: [...c.resonance.sprites, newSprite]
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/**
 * Remove a sprite from the character.
 */
export function removeSprite(spriteId: string): void {
	const char = get(characterStore);
	if (!char || !char.resonance) return;

	characterStore.update((c) => {
		if (!c || !c.resonance) return c;
		return {
			...c,
			resonance: {
				...c.resonance,
				sprites: c.resonance.sprites.filter((s) => s.id !== spriteId)
			},
			updatedAt: new Date().toISOString()
		};
	});
}

/**
 * Use a task from a sprite.
 */
export function useSpriteTask(spriteId: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char || !char.resonance) {
		return { success: false, error: 'No character or resonance' };
	}

	const sprite = char.resonance.sprites.find((s) => s.id === spriteId);
	if (!sprite) {
		return { success: false, error: 'Sprite not found' };
	}
	if (sprite.tasks <= 0) {
		return { success: false, error: 'No tasks remaining' };
	}

	characterStore.update((c) => {
		if (!c || !c.resonance) return c;
		return {
			...c,
			resonance: {
				...c.resonance,
				sprites: c.resonance.sprites.map((s) =>
					s.id === spriteId ? { ...s, tasks: s.tasks - 1 } : s
				)
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/**
 * Register a sprite (makes it permanent until decompiled).
 */
export function registerSprite(spriteId: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char || !char.resonance) {
		return { success: false, error: 'No character or resonance' };
	}

	const sprite = char.resonance.sprites.find((s) => s.id === spriteId);
	if (!sprite) {
		return { success: false, error: 'Sprite not found' };
	}
	if (sprite.registered) {
		return { success: false, error: 'Sprite already registered' };
	}

	characterStore.update((c) => {
		if (!c || !c.resonance) return c;
		return {
			...c,
			resonance: {
				...c.resonance,
				sprites: c.resonance.sprites.map((s) =>
					s.id === spriteId ? { ...s, registered: true } : s
				)
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/**
 * Update sprite tasks (for adding more via sustaining).
 */
export function updateSpriteTasks(spriteId: string, tasks: number): void {
	const char = get(characterStore);
	if (!char || !char.resonance) return;

	characterStore.update((c) => {
		if (!c || !c.resonance) return c;
		return {
			...c,
			resonance: {
				...c.resonance,
				sprites: c.resonance.sprites.map((s) =>
					s.id === spriteId ? { ...s, tasks: Math.max(0, tasks) } : s
				)
			},
			updatedAt: new Date().toISOString()
		};
	});
}

/**
 * Get the expense log for the character.
 */
export function getExpenseLog(): ExpenseEntry[] {
	const char = get(characterStore);
	return char?.expenseLog ? [...char.expenseLog] : [];
}

/**
 * Derived store for career mode status.
 */
export const isCareerMode: Readable<boolean> = derived(
	character,
	($char) => $char?.status === 'career'
);

/**
 * Update condition monitor value.
 * Used for tracking damage during gameplay.
 */
export function updateCondition(type: 'physical' | 'stun', value: number): void {
	characterStore.update((c) => {
		if (!c) return c;

		const maxValue = type === 'physical'
			? Math.ceil((c.attributes.bod.base + c.attributes.bod.bonus) / 2) + 8
			: Math.ceil((c.attributes.wil.base + c.attributes.wil.bonus) / 2) + 8;

		const clampedValue = Math.max(0, Math.min(value, maxValue));

		return {
			...c,
			condition: {
				...c.condition,
				[type === 'physical' ? 'physicalCurrent' : 'stunCurrent']: clampedValue
			}
		};
	});
}

/**
 * Update current Edge points.
 * Used for tracking Edge spending/recovery during gameplay.
 */
export function updateEdge(value: number): void {
	characterStore.update((c) => {
		if (!c) return c;

		const maxEdge = c.attributes.edg.base + c.attributes.edg.bonus;
		const clampedValue = Math.max(0, Math.min(value, maxEdge));

		return {
			...c,
			condition: {
				...c.condition,
				edgeCurrent: clampedValue
			}
		};
	});
}

/**
 * Spend Edge point(s).
 * Returns false if not enough Edge available.
 */
export function spendEdge(amount: number = 1): boolean {
	const char = get(characterStore);
	if (!char) return false;

	const current = char.condition.edgeCurrent;
	if (current < amount) return false;

	updateEdge(current - amount);
	return true;
}

/**
 * Recover Edge point(s).
 */
export function recoverEdge(amount: number = 1): void {
	const char = get(characterStore);
	if (!char) return;

	const current = char.condition.edgeCurrent;
	const maxEdge = char.attributes.edg.base + char.attributes.edg.bonus;
	updateEdge(Math.min(current + amount, maxEdge));
}

/**
 * Fully refresh Edge to maximum.
 */
export function refreshEdge(): void {
	const char = get(characterStore);
	if (!char) return;

	const maxEdge = char.attributes.edg.base + char.attributes.edg.bonus;
	updateEdge(maxEdge);
}

/* ============================================
 * Ammo Tracking Functions
 * ============================================ */

/**
 * Get the maximum ammo capacity for a weapon.
 * Parses ammo strings like "15(c)" or "30(c)".
 */
export function getMaxAmmo(ammoString: string): number {
	const match = ammoString.match(/^(\d+)/);
	return match ? parseInt(match[1], 10) : 0;
}

/**
 * Spend ammo for a weapon.
 * @param weaponId - The weapon ID.
 * @param amount - Amount of ammo to spend (default 1).
 * @returns True if successful, false if not enough ammo.
 */
export function spendAmmo(weaponId: string, amount: number = 1): boolean {
	const char = get(characterStore);
	if (!char) return false;

	const weapon = char.equipment.weapons.find((w) => w.id === weaponId);
	if (!weapon) return false;

	if (weapon.currentAmmo < amount) return false;

	characterStore.update((c) => {
		if (!c) return c;
		return {
			...c,
			equipment: {
				...c.equipment,
				weapons: c.equipment.weapons.map((w) =>
					w.id === weaponId ? { ...w, currentAmmo: w.currentAmmo - amount } : w
				)
			}
		};
	});

	return true;
}

/**
 * Reload a weapon to its maximum capacity.
 * @param weaponId - The weapon ID.
 */
export function reloadWeapon(weaponId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const weapon = char.equipment.weapons.find((w) => w.id === weaponId);
	if (!weapon) return;

	const maxAmmo = getMaxAmmo(weapon.ammo);

	characterStore.update((c) => {
		if (!c) return c;
		return {
			...c,
			equipment: {
				...c.equipment,
				weapons: c.equipment.weapons.map((w) =>
					w.id === weaponId ? { ...w, currentAmmo: maxAmmo } : w
				)
			}
		};
	});
}

/**
 * Set ammo for a weapon to a specific value.
 * @param weaponId - The weapon ID.
 * @param value - The ammo value to set.
 */
export function setAmmo(weaponId: string, value: number): void {
	const char = get(characterStore);
	if (!char) return;

	const weapon = char.equipment.weapons.find((w) => w.id === weaponId);
	if (!weapon) return;

	const maxAmmo = getMaxAmmo(weapon.ammo);
	const clampedValue = Math.max(0, Math.min(value, maxAmmo));

	characterStore.update((c) => {
		if (!c) return c;
		return {
			...c,
			equipment: {
				...c.equipment,
				weapons: c.equipment.weapons.map((w) =>
					w.id === weaponId ? { ...w, currentAmmo: clampedValue } : w
				)
			}
		};
	});
}

/** Re-export CharacterSummary type for convenience. */
export type { CharacterSummary };

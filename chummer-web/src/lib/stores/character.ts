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
	type CharacterGear,
	type CharacterLifestyle,
	type GameWeapon,
	type GameArmor,
	type GameCyberware,
	type GameGear,
	type CyberwareGrade,
	bpToNuyen,
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
		currentAmmo: 0,
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
		equipped: false,
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

/**
 * Add gear to the character's equipment.
 */
export function addGear(gear: GameGear, quantity: number = 1): void {
	const char = get(characterStore);
	if (!char) return;

	const totalCost = gear.cost * quantity;
	if (char.nuyen < totalCost) return;

	/* Check if gear already exists and stack */
	const existingIndex = char.equipment.gear.findIndex((g) => g.name === gear.name);

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
			notes: ''
		};
		newGear = [...char.equipment.gear, newItem];
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
 */
export function removeGear(gearId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const gear = char.equipment.gear.find((g) => g.id === gearId);
	if (!gear) return;

	const refund = gear.cost * gear.quantity;

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			gear: char.equipment.gear.filter((g) => g.id !== gearId)
		},
		nuyen: char.nuyen + refund,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
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

/** Re-export CharacterSummary type for convenience. */
export type { CharacterSummary };

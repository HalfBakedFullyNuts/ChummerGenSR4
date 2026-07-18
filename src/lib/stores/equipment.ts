/**
 * Equipment Store Module
 * ======================
 * Weapons, armor, cyberware, bioware, vehicles,
 * martial arts, gear, lifestyle, and resources.
 */

import { get, derived, type Readable } from 'svelte/store';
import {
	type Character,
	type CharacterWeapon,
	type CharacterArmor,
	type CharacterCyberware,
	type CharacterBioware,
	type CharacterVehicle,
	type CharacterMartialArt,
	type CharacterGear,
	type CharacterLifestyle,
	type CharacterFocus,
	type GameWeapon,
	type GameArmor,
	type GameCyberware,
	type GameBioware,
	type GameVehicle,
	type GameGear,
	type CyberwareGrade,
	type BiowareGrade,
	type Improvement
} from '$types';
import { characterStore, generateId } from './character';
import { type GameMartialArt } from './gamedata';
import {
	createImprovementsFromBonus,
	removeImprovements,
	removeImprovementsForTree,
	resolveBonusValue,
	valueOf,
	evaluateRatingFormula
} from '../engine/improvementManager';

/**
 * Essence-cost multiplier from CyberwareEssCost/BiowareEssCost improvements
 * (e.g. Biocompatability: cyberwareessmultiplier 90 ⇒ ×0.9 essence cost),
 * reading only improvements the character already has — desktop does not
 * retroactively adjust previously-installed items when the multiplier
 * quality is added later (see issue #64 risk notes).
 */
function essenceMultiplier(imps: readonly Improvement[], kind: 'Cyberware' | 'Bioware'): number {
	const type = kind === 'Cyberware' ? 'CyberwareEssCost' : 'BiowareEssCost';
	let pct = valueOf(imps, type) || 100;
	if (kind === 'Cyberware' && valueOf(imps, 'SensitiveSystem') > 0) pct *= 2; // SR4: doubles cyberware essence cost
	return pct / 100;
}

/* ============================================
 * Resources
 * ============================================ */

function bpToNuyen(bp: number) {
	return bp * 5000;
}

/** Set BP spent on resources (nuyen). */
export function setResourcesBP(bp: number): void {
	const char = get(characterStore);
	if (!char) return;

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

/** Calculate total nuyen spent on equipment. */
export function calculateEquipmentSpent(char: Character): number {
	let total = 0;

	for (const weapon of char.equipment.weapons) total += weapon.cost;
	for (const armor of char.equipment.armor) total += armor.cost;
	for (const cyber of char.equipment.cyberware) total += cyber.cost;
	for (const gear of char.equipment.gear) total += gear.cost * gear.quantity;
	if (char.equipment.lifestyle) {
		total += char.equipment.lifestyle.monthlyCost * char.equipment.lifestyle.monthsPrepaid;
	}

	return total;
}

/* ============================================
 * Weapons & Armor
 * ============================================ */

/** Add a weapon to the character's equipment. */
export function addWeapon(weapon: GameWeapon): void {
	const char = get(characterStore);
	if (!char) return;

	if (char.nuyen < weapon.cost) return;

	const ammoMatch = weapon.ammo.match(/^(\d+)/);
	const maxAmmo = ammoMatch && ammoMatch[1] ? parseInt(ammoMatch[1], 10) : 0;

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
		currentAmmo: maxAmmo,
		conceal: weapon.conceal,
		cost: weapon.cost,
		accessories: [],
		modifications: [],
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

/** Remove a weapon from the character's equipment. */
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

/* ============================================
 * Foci
 * ============================================ */

/** Add a focus to the character's equipment. */
export function addFocus(
	name: string,
	category: string,
	force: number,
	costMultiplier: number
): void {
	const char = get(characterStore);
	if (!char) return;

	const cost = force * costMultiplier;
	if (char.nuyen < cost) return;

	const newFocus: CharacterFocus = {
		id: generateId(),
		name,
		category,
		force,
		cost,
		bonded: false,
		improvements: []
	};

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			foci: [...(char.equipment.foci || []), newFocus]
		},
		nuyen: char.nuyen - cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Remove a focus. */
export function removeFocus(focusId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const fociList = char.equipment.foci || [];
	const focus = fociList.find((f) => f.id === focusId);
	if (!focus) return;

	// If bonded, refund Karma/BP. We assume UI has prompted them or handles unbonding gracefully.
	// For simplicity, just refund nuyen here, UI can unbond first.
	// We will refund Nuyen.
	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			foci: fociList.filter((f) => f.id !== focusId)
		},
		nuyen: char.nuyen + focus.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Add armor to the character's equipment. */
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

	const newImprovements = armor.bonus
		? createImprovementsFromBonus('Armor', newArmor.id, armor.bonus)
		: [];

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			armor: [...char.equipment.armor, newArmor]
		},
		improvements: [...char.improvements, ...newImprovements],
		nuyen: char.nuyen - armor.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Remove armor from the character's equipment. */
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
		improvements: removeImprovements(char.improvements, 'Armor', armorId),
		nuyen: char.nuyen + armor.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * Set whether a piece of armor is worn. Only equipped armor contributes to
 * calculateArmorBallistic/Impact — desktop wears armor at purchase by
 * default, but the web has no equip-toggle UI yet, so armor bought via
 * addArmor starts unequipped and must be equipped explicitly.
 */
export function setArmorEquipped(armorId: string, equipped: boolean): void {
	const char = get(characterStore);
	if (!char) return;

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			armor: char.equipment.armor.map((a) => (a.id === armorId ? { ...a, equipped } : a))
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/* ============================================
 * Cyberware & Bioware
 * ============================================ */

/**
 * Resolve a cyberware ess/cost value at the purchased rating:
 *  - a `FixedValues(...)` table (e.g. Wired Reflexes essence 2/3/5) is
 *    looked up by rating, clamped into [1, table.length];
 *  - otherwise a continuous Rating formula (e.g. "Rating * 3000",
 *    "600 + (Rating * 100)") is evaluated against the purchased rating
 *    (issue #71-adjacent bug: these used to be reduced to a flat coefficient
 *    at conversion time and never actually scaled with rating);
 *  - otherwise falls back to the flat value.
 */
function resolveByRating(
	flat: number,
	byRating: readonly number[] | undefined,
	formula: string | undefined,
	rating: number
): number {
	if (byRating !== undefined && byRating.length > 0) {
		const index = Math.min(Math.max(rating, 1), byRating.length) - 1;
		return byRating[index] ?? flat;
	}
	if (formula !== undefined) {
		const evaluated = evaluateRatingFormula(formula, rating);
		if (evaluated !== undefined) return evaluated;
	}
	return flat;
}

/** Add cyberware to the character. Reduces essence. `rating` defaults to the item's own rating field when omitted. */
export function addCyberware(cyber: GameCyberware, grade: CyberwareGrade = 'Standard', rating?: number): void {
	const char = get(characterStore);
	if (!char) return;

	const gradeMultipliers: Record<CyberwareGrade, { ess: number; cost: number }> = {
		Standard: { ess: 1.0, cost: 1 },
		Alphaware: { ess: 0.8, cost: 2 },
		Betaware: { ess: 0.7, cost: 4 },
		Deltaware: { ess: 0.5, cost: 10 },
		Used: { ess: 1.2, cost: 0.5 }
	};

	const purchasedRating = rating ?? cyber.rating ?? 1;
	const multiplier = gradeMultipliers[grade];
	const baseEss = resolveByRating(cyber.ess, cyber.essByRating, cyber.essFormula, purchasedRating);
	const baseCost = resolveByRating(cyber.cost, cyber.costByRating, cyber.costFormula, purchasedRating);
	const essenceCost = baseEss * multiplier.ess * essenceMultiplier(char.improvements, 'Cyberware');
	const nuyenCost = Math.floor(baseCost * multiplier.cost);

	if (char.nuyen < nuyenCost) return;
	if (char.attributes.ess - essenceCost < 0) return;

	const newCyber: CharacterCyberware = {
		id: generateId(),
		name: cyber.name,
		category: cyber.category,
		grade,
		rating: purchasedRating,
		essence: essenceCost,
		cost: nuyenCost,
		capacity: 0,
		capacityUsed: 0,
		location: '',
		children: [],
		notes: ''
	};

	const newImprovements = cyber.bonus
		? createImprovementsFromBonus('Cyberware', newCyber.id, cyber.bonus, newCyber.rating)
		: [];

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
		improvements: [...char.improvements, ...newImprovements],
		nuyen: char.nuyen - nuyenCost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Collect a cyberware item's id plus every descendant child id (recursive). */
function collectCyberwareTreeIds(cyber: CharacterCyberware): string[] {
	return [cyber.id, ...cyber.children.flatMap(collectCyberwareTreeIds)];
}

/** Remove cyberware from the character. Restores essence. Also removes any child cyberware's improvements. */
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
		improvements: removeImprovementsForTree(
			char.improvements,
			'Cyberware',
			collectCyberwareTreeIds(cyber)
		),
		nuyen: char.nuyen + cyber.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Add a child cyberware to a parent cyberware. */
export function addChildCyberware(
	parentId: string,
	cyber: GameCyberware,
	grade: CyberwareGrade = 'Standard',
	rating?: number
): void {
	const char = get(characterStore);
	if (!char) return;

	const gradeMultipliers: Record<CyberwareGrade, { ess: number; cost: number }> = {
		Standard: { ess: 1.0, cost: 1 },
		Alphaware: { ess: 0.8, cost: 2 },
		Betaware: { ess: 0.7, cost: 4 },
		Deltaware: { ess: 0.5, cost: 10 },
		Used: { ess: 1.2, cost: 0.5 }
	};

	const purchasedRating = rating ?? cyber.rating ?? 1;
	const multiplier = gradeMultipliers[grade];
	// Child cyberware essence is inherently reduced in some rules, but standard calculation here is base.
	const baseEss = resolveByRating(cyber.ess, cyber.essByRating, cyber.essFormula, purchasedRating);
	const baseCost = resolveByRating(cyber.cost, cyber.costByRating, cyber.costFormula, purchasedRating);
	const essenceCost = baseEss * multiplier.ess * essenceMultiplier(char.improvements, 'Cyberware');
	const nuyenCost = Math.floor(baseCost * multiplier.cost);

	if (char.nuyen < nuyenCost) return;
	// Parent cyberware may have capacity we should use instead of essence, but leaving basic logic first
	if (char.attributes.ess - essenceCost < 0) return;

	const newChild: CharacterCyberware = {
		id: generateId(),
		name: cyber.name,
		category: cyber.category,
		grade,
		rating: purchasedRating,
		essence: essenceCost,
		cost: nuyenCost,
		capacity: 0,
		capacityUsed: 0,
		location: '',
		children: [],
		notes: ''
	};

	const newImprovements = cyber.bonus
		? createImprovementsFromBonus('Cyberware', newChild.id, cyber.bonus, newChild.rating)
		: [];

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			cyberware: char.equipment.cyberware.map((c) =>
				c.id === parentId ? { ...c, children: [...c.children, newChild] } : c
			)
		},
		attributes: {
			...char.attributes,
			ess: char.attributes.ess - essenceCost
		},
		improvements: [...char.improvements, ...newImprovements],
		nuyen: char.nuyen - nuyenCost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Remove a child cyberware from a parent cyberware. Restores essence. Also removes any grandchild improvements. */
export function removeChildCyberware(parentId: string, childId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const parent = char.equipment.cyberware.find((c) => c.id === parentId);
	if (!parent) return;

	const child = parent.children.find((c) => c.id === childId);
	if (!child) return;

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			cyberware: char.equipment.cyberware.map((c) =>
				c.id === parentId
					? { ...c, children: c.children.filter((ch) => ch.id !== childId) }
					: c
			)
		},
		attributes: {
			...char.attributes,
			ess: char.attributes.ess + child.essence
		},
		improvements: removeImprovementsForTree(
			char.improvements,
			'Cyberware',
			collectCyberwareTreeIds(child)
		),
		nuyen: char.nuyen + child.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}


/** Add bioware to the character. */
export function addBioware(
	bio: GameBioware,
	grade: BiowareGrade = 'Standard',
	rating: number = 1
): void {
	const char = get(characterStore);
	if (!char) return;

	const gradeMultipliers: Record<BiowareGrade, { ess: number; cost: number }> = {
		Standard: { ess: 1.0, cost: 1 },
		Cultured: { ess: 0.75, cost: 4 }
	};

	const multiplier = gradeMultipliers[grade];
	const essenceCost = bio.ess * multiplier.ess * rating * essenceMultiplier(char.improvements, 'Bioware');
	const nuyenCost = Math.floor(bio.cost * multiplier.cost * rating);

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

	const newImprovements = bio.bonus
		? createImprovementsFromBonus('Bioware', newBio.id, bio.bonus, rating)
		: [];

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
		improvements: [...char.improvements, ...newImprovements],
		nuyen: char.nuyen - nuyenCost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Remove bioware from the character. */
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
		improvements: removeImprovements(char.improvements, 'Bioware', bioId),
		nuyen: char.nuyen + bio.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/* ============================================
 * Vehicles
 * ============================================ */

/** Add a vehicle to the character. */
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
		weapons: [],
		gear: [],
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

/** Remove a vehicle from the character. */
export function removeVehicle(vehicleId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const vehicle = char.equipment.vehicles.find((v) => v.id === vehicleId);
	if (!vehicle) return;

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

/** Add a weapon to a vehicle. */
export function addWeaponToVehicle(vehicleId: string, weapon: GameWeapon): void {
	const char = get(characterStore);
	if (!char) return;

	if (char.nuyen < weapon.cost) return;

	const ammoMatch = weapon.ammo.match(/^(\d+)/);
	const maxAmmo = ammoMatch && ammoMatch[1] ? parseInt(ammoMatch[1], 10) : 0;

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
		currentAmmo: maxAmmo,
		conceal: weapon.conceal,
		cost: weapon.cost,
		accessories: [],
		modifications: [],
		notes: ''
	};

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			vehicles: char.equipment.vehicles.map((v) =>
				v.id === vehicleId ? { ...v, weapons: [...(v.weapons || []), newWeapon] } : v
			)
		},
		nuyen: char.nuyen - weapon.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Remove a weapon from a vehicle. */
export function removeWeaponFromVehicle(vehicleId: string, weaponId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const vehicle = char.equipment.vehicles.find((v) => v.id === vehicleId);
	if (!vehicle) return;

	const weapon = vehicle.weapons?.find((w) => w.id === weaponId);
	if (!weapon) return;

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			vehicles: char.equipment.vehicles.map((v) =>
				v.id === vehicleId
					? { ...v, weapons: v.weapons.filter((w) => w.id !== weaponId) }
					: v
			)
		},
		nuyen: char.nuyen + weapon.cost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}


/* ============================================
 * Martial Arts
 * ============================================ */

/** BP cost for martial arts. */
export const MARTIAL_ARTS_COSTS = {
	STYLE: 5,
	TECHNIQUE: 2
} as const;

/** Add a martial art style to the character. */
export function addMartialArt(style: GameMartialArt): void {
	const char = get(characterStore);
	if (!char) return;

	if (char.equipment.martialArts.some((m) => m.name === style.name)) return;

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

/** Remove a martial art style from the character. */
export function removeMartialArt(artId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const art = char.equipment.martialArts.find((m) => m.id === artId);
	if (!art) return;

	const bpRefund = MARTIAL_ARTS_COSTS.STYLE + art.techniques.length * MARTIAL_ARTS_COSTS.TECHNIQUE;

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

/** Add a technique to a martial art style. */
export function addMartialArtTechnique(artId: string, technique: string): void {
	const char = get(characterStore);
	if (!char) return;

	const art = char.equipment.martialArts.find((m) => m.id === artId);
	if (!art) return;

	if (art.techniques.includes(technique)) return;

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

/** Remove a technique from a martial art style. */
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

/* ============================================
 * Gear
 * ============================================ */

/**
 * Resolve a GameGear's per-unit cost at a purchased rating: a Rating-based
 * `costFormula` expression (e.g. "Rating * 500", "25 + Rating") takes
 * priority, falling back to a `costByRating` FixedValues table, then the
 * flat `cost`.
 */
function resolveGearCost(gear: GameGear, rating: number): number {
	if (gear.costFormula) {
		const resolved = resolveBonusValue(gear.costFormula, rating);
		if (resolved !== undefined) return resolved;
	}
	// costFormula is already resolved above, so pass undefined for resolveByRating's
	// formula parameter (widened to 4 args by the cyberware Rating-scaling PR #2).
	return resolveByRating(gear.cost, gear.costByRating, undefined, rating);
}

/** Add gear to the character's equipment. `rating` defaults to the item's own rating field when omitted. */
export function addGear(
	gear: GameGear,
	quantity: number = 1,
	containerId: string | null = null,
	rating?: number
): void {
	const char = get(characterStore);
	if (!char) return;

	const purchasedRating = rating ?? gear.rating ?? 1;
	const unitCost = resolveGearCost(gear, purchasedRating);
	const totalCost = unitCost * quantity;
	if (char.nuyen < totalCost) return;

	if (containerId) {
		const container = char.equipment.gear.find((g) => g.id === containerId);
		if (!container || container.capacity <= 0) return;
		const capacityCost = gear.capacityCost ?? 1;
		if (container.capacityUsed + capacityCost > container.capacity) return;
	}

	const existingIndex =
		containerId === null
			? char.equipment.gear.findIndex((g) => g.name === gear.name && g.containerId === null)
			: -1;

	let newGear: readonly CharacterGear[];
	let newImprovements: ReturnType<typeof createImprovementsFromBonus> = [];
	if (existingIndex >= 0) {
		// Stacking onto an existing item — desktop creates improvements once
		// per gear object, not per unit, so no new improvements here.
		newGear = char.equipment.gear.map((g, i) =>
			i === existingIndex ? { ...g, quantity: g.quantity + quantity } : g
		);
	} else {
		const newItem: CharacterGear = {
			id: generateId(),
			name: gear.name,
			category: gear.category,
			rating: purchasedRating,
			quantity,
			cost: unitCost,
			location: '',
			notes: '',
			capacity: gear.capacity ?? 0,
			capacityUsed: 0,
			capacityCost: gear.capacityCost ?? 1,
			containerId,
			containedItems: [],
			children: []
		};
		newGear = [...char.equipment.gear, newItem];
		newImprovements = gear.bonus
			? createImprovementsFromBonus('Gear', newItem.id, gear.bonus, purchasedRating || 1)
			: [];

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
		improvements: [...char.improvements, ...newImprovements],
		nuyen: char.nuyen - totalCost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Remove gear from the character's equipment. Also removes contained items' improvements. */
export function removeGear(gearId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const gear = char.equipment.gear.find((g) => g.id === gearId);
	if (!gear) return;

	let refund = gear.cost * gear.quantity;
	const idsToRemove = new Set<string>([gearId]);

	function addContainedItems(containerId: string): void {
		const charGear = char!.equipment.gear;
		for (const item of charGear) {
			if (item.containerId === containerId) {
				idsToRemove.add(item.id);
				refund += item.cost * item.quantity;
				addContainedItems(item.id);
			}
		}
	}
	addContainedItems(gearId);

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
		improvements: removeImprovementsForTree(char.improvements, 'Gear', [...idsToRemove]),
		nuyen: char.nuyen + refund,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Move gear to a different container (or out of a container). */
export function moveGearToContainer(
	gearId: string,
	newContainerId: string | null
): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character loaded' };
	}

	const gear = char.equipment.gear.find((g) => g.id === gearId);
	if (!gear) {
		return { success: false, error: 'Gear not found' };
	}

	if (newContainerId === gearId) {
		return { success: false, error: 'Cannot move container into itself' };
	}

	if (newContainerId) {
		const newContainer = char.equipment.gear.find((g) => g.id === newContainerId);
		if (!newContainer) return { success: false, error: 'Target container not found' };
		if (newContainer.capacity <= 0) return { success: false, error: 'Target is not a container' };
		if (newContainer.capacityUsed + gear.capacityCost > newContainer.capacity) {
			return { success: false, error: 'Not enough capacity in target container' };
		}
	}

	let newGear = [...char.equipment.gear];

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

/** Add a gear child directly to a parent gear (nesting, not just container). `rating` defaults to the item's own rating field when omitted. */
export function addGearToGear(
	parentId: string,
	gear: GameGear,
	quantity: number = 1,
	rating?: number
): void {
	const char = get(characterStore);
	if (!char) return;

	const purchasedRating = rating ?? gear.rating ?? 1;
	const unitCost = resolveGearCost(gear, purchasedRating);
	const totalCost = unitCost * quantity;
	if (char.nuyen < totalCost) return;

	const newChild: CharacterGear = {
		id: generateId(),
		name: gear.name,
		category: gear.category,
		rating: purchasedRating,
		quantity,
		cost: unitCost,
		location: '',
		notes: '',
		capacity: gear.capacity ?? 0,
		capacityUsed: 0,
		capacityCost: gear.capacityCost ?? 1,
		containerId: parentId,
		containedItems: [],
		children: []
	};

	const newImprovements = gear.bonus
		? createImprovementsFromBonus('Gear', newChild.id, gear.bonus, purchasedRating || 1)
		: [];

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			gear: char.equipment.gear.map((g) =>
				g.id === parentId ? { ...g, children: [...g.children, newChild] } : g
			)
		},
		improvements: [...char.improvements, ...newImprovements],
		nuyen: char.nuyen - totalCost,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Collect a gear item's id plus every descendant child id (recursive). */
function collectGearTreeIds(gear: CharacterGear): string[] {
	return [gear.id, ...gear.children.flatMap(collectGearTreeIds)];
}

/** Remove a gear child from a parent gear. Also removes any grandchild improvements. */
export function removeGearFromGear(parentId: string, childId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const parent = char.equipment.gear.find((g) => g.id === parentId);
	if (!parent) return;

	const child = parent.children.find((c) => c.id === childId);
	if (!child) return;

	const updated: Character = {
		...char,
		equipment: {
			...char.equipment,
			gear: char.equipment.gear.map((g) =>
				g.id === parentId
					? { ...g, children: g.children.filter((ch) => ch.id !== childId) }
					: g
			)
		},
		improvements: removeImprovementsForTree(char.improvements, 'Gear', collectGearTreeIds(child)),
		nuyen: char.nuyen + child.cost * child.quantity,
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/* ============================================

 * Lifestyle
 * ============================================ */

/** Set the character's lifestyle. */
export function setLifestyle(
	name: string,
	level: string,
	monthlyCost: number,
	monthsPrepaid: number = 1
): void {
	const char = get(characterStore);
	if (!char) return;

	const totalCost = monthlyCost * monthsPrepaid;

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

/** Remove the character's lifestyle. */
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

/* ============================================
 * Derived Stores
 * ============================================ */

/** Derived store for remaining nuyen. */
export const remainingNuyen: Readable<number> = derived(
	{ subscribe: characterStore.subscribe } as Readable<Character | null>,
	($char) => $char?.nuyen ?? 0
);

/** Derived store for starting nuyen. */
export const startingNuyen: Readable<number> = derived(
	{ subscribe: characterStore.subscribe } as Readable<Character | null>,
	($char) => $char?.startingNuyen ?? 0
);

/** Derived store for current essence. */
export const currentEssence: Readable<number> = derived(
	{ subscribe: characterStore.subscribe } as Readable<Character | null>,
	($char) => $char?.attributes.ess ?? 6.0
);

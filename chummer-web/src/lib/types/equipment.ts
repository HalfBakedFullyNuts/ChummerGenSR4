/**
 * Equipment Types for Shadowrun 4th Edition
 * ==========================================
 * Defines weapons, armor, cyberware, and gear.
 */

/* ============================================
 * Weapon Types
 * ============================================ */

/** Weapon types (melee vs ranged). */
export type WeaponType = 'Melee' | 'Ranged';

/** Weapon category from game data. */
export type WeaponCategory =
	| 'Blades'
	| 'Clubs'
	| 'Exotic Melee Weapons'
	| 'Exotic Ranged Weapons'
	| 'Unarmed'
	| 'Bows'
	| 'Crossbows'
	| 'Throwing Weapons'
	| 'Tasers'
	| 'Holdouts'
	| 'Light Pistols'
	| 'Heavy Pistols'
	| 'Machine Pistols'
	| 'Submachine Guns'
	| 'Assault Rifles'
	| 'Battle Rifles'
	| 'Sports Rifles'
	| 'Sniper Rifles'
	| 'Shotguns'
	| 'Special Weapons'
	| 'Light Machine Guns'
	| 'Medium Machine Guns'
	| 'Heavy Machine Guns'
	| 'Assault Cannons'
	| 'Flamethrowers'
	| 'Laser Weapons'
	| 'Grenade Launchers'
	| 'Mortar Launchers'
	| 'Missile Launchers'
	| 'Vehicle Weapons';

/** Game data weapon definition. */
export interface GameWeapon {
	readonly name: string;
	readonly category: string;
	readonly type: WeaponType;
	readonly reach: number;
	readonly damage: string;
	readonly ap: string;
	readonly mode: string;
	readonly rc: string;
	readonly ammo: string;
	readonly conceal: number;
	readonly avail: string;
	readonly cost: number;
	readonly source: string;
	readonly page: number;
}

/** Weapon owned by a character. */
export interface CharacterWeapon {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly type: WeaponType;
	readonly reach: number;
	readonly damage: string;
	readonly ap: string;
	readonly mode: string;
	readonly rc: string;
	readonly ammo: string;
	readonly currentAmmo: number;
	readonly conceal: number;
	readonly cost: number;
	readonly accessories: readonly WeaponAccessory[];
	readonly notes: string;
}

/** Weapon accessory/modification. */
export interface WeaponAccessory {
	readonly id: string;
	readonly name: string;
	readonly mount: string;
	readonly cost: number;
}

/* ============================================
 * Armor Types
 * ============================================ */

/** Armor category from game data. */
export type ArmorCategory =
	| 'Armor'
	| 'Clothing'
	| 'Environmental Armor'
	| 'Fashion'
	| 'Helmets and Shields'
	| 'Military Grade Armor'
	| 'SecureTech PPP System';

/** Game data armor definition. */
export interface GameArmor {
	readonly name: string;
	readonly category: string;
	readonly ballistic: number;
	readonly impact: number;
	readonly capacity: number;
	readonly avail: string;
	readonly cost: number;
	readonly source: string;
	readonly page: number;
}

/** Armor owned by a character. */
export interface CharacterArmor {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly ballistic: number;
	readonly impact: number;
	readonly capacity: number;
	readonly capacityUsed: number;
	readonly equipped: boolean;
	readonly cost: number;
	readonly modifications: readonly ArmorModification[];
	readonly notes: string;
}

/** Armor modification. */
export interface ArmorModification {
	readonly id: string;
	readonly name: string;
	readonly rating: number;
	readonly capacity: number;
	readonly cost: number;
}

/* ============================================
 * Cyberware Types
 * ============================================ */

/** Cyberware category from game data. */
export type CyberwareCategory =
	| 'Headware'
	| 'Eyeware'
	| 'Earware'
	| 'Biodrone Control'
	| 'Bodyware'
	| 'Cyberlimb'
	| 'Cyberlimb Enhancement'
	| 'Cyberlimb Accessory'
	| 'Cyberweapon'
	| 'Cosmetic Modification'
	| 'Cosmetic Implant'
	| 'Nanocybernetics';

/** Cyberware grade affecting essence and cost. */
export type CyberwareGrade =
	| 'Standard'
	| 'Alphaware'
	| 'Betaware'
	| 'Deltaware'
	| 'Used';

/** Grade multiplier definition. */
export interface CyberwareGradeMultiplier {
	readonly name: string;
	readonly essMultiplier: number;
	readonly costMultiplier: number;
	readonly availModifier: number;
}

/** Standard cyberware grades. */
export const CYBERWARE_GRADES: readonly CyberwareGradeMultiplier[] = [
	{ name: 'Standard', essMultiplier: 1.0, costMultiplier: 1, availModifier: 0 },
	{ name: 'Alphaware', essMultiplier: 0.8, costMultiplier: 2, availModifier: 0 },
	{ name: 'Betaware', essMultiplier: 0.7, costMultiplier: 4, availModifier: 0 },
	{ name: 'Deltaware', essMultiplier: 0.5, costMultiplier: 10, availModifier: 0 },
	{ name: 'Used', essMultiplier: 1.2, costMultiplier: 0.5, availModifier: -1 }
] as const;

/** Game data cyberware definition. */
export interface GameCyberware {
	readonly name: string;
	readonly category: string;
	readonly ess: number;
	readonly capacity: string;
	readonly avail: string;
	readonly cost: number;
	readonly source: string;
	readonly page: number;
	readonly rating: number;
	readonly minRating: number;
	readonly maxRating: number;
}

/** Cyberware installed on a character. */
export interface CharacterCyberware {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly grade: CyberwareGrade;
	readonly rating: number;
	readonly essence: number;
	readonly cost: number;
	readonly capacity: number;
	readonly capacityUsed: number;
	readonly location: string;
	readonly subsystems: readonly CharacterCyberware[];
	readonly notes: string;
}

/* ============================================
 * General Gear Types
 * ============================================ */

/** Essential gear categories for MVP. */
export type GearCategory =
	| 'Commlink'
	| 'Commlink Accessories'
	| 'Commlink Modules'
	| 'Commlink Operating System'
	| 'Commlink Option'
	| 'Commlink Upgrade'
	| 'Communications'
	| 'ID/Credsticks'
	| 'B&E Gear'
	| 'Biotech'
	| 'DocWagon Contract'
	| 'Drugs'
	| 'Foci'
	| 'Magical Supplies'
	| 'Security Devices'
	| 'Sensors'
	| 'Slap Patches'
	| 'Camping and Survival Gear'
	| 'Disguise'
	| 'Surveillance and Security Devices';

/** Game data gear definition. */
export interface GameGear {
	readonly name: string;
	readonly category: string;
	readonly rating: number;
	readonly avail: string;
	readonly cost: number;
	readonly source: string;
	readonly page: number;
}

/** Gear owned by a character. */
export interface CharacterGear {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly rating: number;
	readonly quantity: number;
	readonly cost: number;
	readonly location: string;
	readonly notes: string;
}

/* ============================================
 * Lifestyle Types
 * ============================================ */

/** Lifestyle level from game data. */
export type LifestyleLevel =
	| 'Street'
	| 'Squatter'
	| 'Low'
	| 'Middle'
	| 'High'
	| 'Luxury';

/** Game data lifestyle definition. */
export interface GameLifestyle {
	readonly name: string;
	readonly cost: number;
	readonly dice: number;
	readonly multiplier: number;
	readonly source: string;
	readonly page: number;
}

/** Lifestyle on a character. */
export interface CharacterLifestyle {
	readonly id: string;
	readonly name: string;
	readonly level: string;
	readonly monthlyCost: number;
	readonly monthsPrepaid: number;
	readonly location: string;
	readonly notes: string;
}

/* ============================================
 * Equipment Summary Types
 * ============================================ */

/** All equipment on a character. */
export interface CharacterEquipment {
	readonly weapons: readonly CharacterWeapon[];
	readonly armor: readonly CharacterArmor[];
	readonly cyberware: readonly CharacterCyberware[];
	readonly gear: readonly CharacterGear[];
	readonly lifestyle: CharacterLifestyle | null;
}

/** Calculate total equipment cost. */
export function calculateEquipmentCost(equipment: CharacterEquipment): number {
	let total = 0;

	for (const weapon of equipment.weapons) {
		total += weapon.cost;
		for (const acc of weapon.accessories) {
			total += acc.cost;
		}
	}

	for (const armor of equipment.armor) {
		total += armor.cost;
		for (const mod of armor.modifications) {
			total += mod.cost;
		}
	}

	for (const cyber of equipment.cyberware) {
		total += cyber.cost;
	}

	for (const item of equipment.gear) {
		total += item.cost * item.quantity;
	}

	if (equipment.lifestyle) {
		total += equipment.lifestyle.monthlyCost * equipment.lifestyle.monthsPrepaid;
	}

	return total;
}

/** Calculate total essence cost of cyberware. */
export function calculateEssenceCost(cyberware: readonly CharacterCyberware[]): number {
	let total = 0;
	for (const cyber of cyberware) {
		total += cyber.essence;
		for (const sub of cyber.subsystems) {
			total += sub.essence;
		}
	}
	return total;
}

/** Empty equipment template. */
export const EMPTY_EQUIPMENT: CharacterEquipment = {
	weapons: [],
	armor: [],
	cyberware: [],
	gear: [],
	lifestyle: null
} as const;

/* ============================================
 * Resources / Nuyen Conversion
 * ============================================ */

/** BP to Nuyen conversion rates. */
export const BP_TO_NUYEN_RATES = [
	{ bp: 0, nuyen: 0 },
	{ bp: 5, nuyen: 20000 },
	{ bp: 10, nuyen: 50000 },
	{ bp: 20, nuyen: 90000 },
	{ bp: 30, nuyen: 150000 },
	{ bp: 40, nuyen: 225000 },
	{ bp: 50, nuyen: 275000 }
] as const;

/** Get nuyen for BP spent on resources. */
export function bpToNuyen(bp: number): number {
	// Find the highest tier that bp qualifies for
	for (let i = BP_TO_NUYEN_RATES.length - 1; i >= 0; i--) {
		const rate = BP_TO_NUYEN_RATES[i];
		if (rate && bp >= rate.bp) {
			return rate.nuyen;
		}
	}
	return 0;
}

/** Get minimum BP required for nuyen amount. */
export function nuyenToBp(nuyen: number): number {
	for (let i = BP_TO_NUYEN_RATES.length - 1; i >= 0; i--) {
		const rate = BP_TO_NUYEN_RATES[i];
		if (rate && nuyen >= rate.nuyen) {
			return rate.bp;
		}
	}
	return 0;
}

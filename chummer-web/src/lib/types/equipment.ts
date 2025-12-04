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
	readonly avail?: string;
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
	readonly avail?: string;
	readonly modifications: readonly ArmorModification[];
	readonly notes: string;
}

/** Armor modification. */
export interface ArmorModification {
	readonly id: string;
	readonly name: string;
	readonly rating: number;
	readonly capacityCost: number;
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
	readonly avail?: string;
	readonly subsystems: readonly CharacterCyberware[];
	readonly notes: string;
}

/* ============================================
 * Bioware Types
 * ============================================ */

/** Bioware category from game data. */
export type BiowareCategory =
	| 'Basic'
	| 'Biosculpting'
	| 'Cosmetic'
	| 'Cultured'
	| 'Endosymbiont'
	| 'Genetech: Genetic Restoration'
	| 'Genetech: Phenotype Adjustments'
	| 'Genetech: Transgenics'
	| 'Genetic Infusions'
	| 'Organs and Limbs'
	| 'Symbiont';

/** Bioware grade affecting essence and cost. */
export type BiowareGrade = 'Standard' | 'Cultured';

/** Grade multiplier for bioware. */
export const BIOWARE_GRADES = [
	{ name: 'Standard', essMultiplier: 1.0, costMultiplier: 1 },
	{ name: 'Cultured', essMultiplier: 0.75, costMultiplier: 4 }
] as const;

/** Bioware installed on a character. */
export interface CharacterBioware {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly grade: BiowareGrade;
	readonly rating: number;
	readonly essence: number;
	readonly cost: number;
	readonly avail?: string;
	readonly notes: string;
}

/* ============================================
 * Vehicle Types
 * ============================================ */

/** Vehicle category from game data. */
export type VehicleCategory =
	| 'Personal Mobility Vehicles'
	| 'Bikes'
	| 'Cars'
	| 'Trucks'
	| 'Hovercraft'
	| 'Watercraft'
	| 'Gliders and FPMV'
	| 'LAVs'
	| 'Military, Security and Medical Craft'
	| 'Boats & Subs'
	| 'Winged Planes'
	| 'Rotorcraft'
	| 'Zeppelin'
	| 'VTOL/VSTOL'
	| 'Drones: Micro'
	| 'Drones: Mini'
	| 'Drones: Small'
	| 'Drones: Medium'
	| 'Drones: Large';

/** Vehicle owned by a character. */
export interface CharacterVehicle {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly handling: string;
	readonly accel: string;
	readonly speed: string;
	readonly pilot: number;
	readonly body: number;
	readonly armor: number;
	readonly sensor: number;
	readonly cost: number;
	readonly mods: readonly VehicleMod[];
	readonly notes: string;
}

/** Vehicle modification. */
export interface VehicleMod {
	readonly id: string;
	readonly name: string;
	readonly rating: number;
	readonly slots: number;
	readonly cost: number;
}

/* ============================================
 * Martial Arts Types
 * ============================================ */

/** Martial art style owned by a character. */
export interface CharacterMartialArt {
	readonly id: string;
	readonly name: string;
	readonly techniques: readonly string[];
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
	readonly capacity?: number;
	readonly capacityCost?: number;
	readonly isContainer?: boolean;
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
	readonly avail?: string;
	readonly notes: string;
	/** Container capacity (if this gear can hold other gear). */
	readonly capacity: number;
	/** Capacity used by contained items. */
	readonly capacityUsed: number;
	/** Capacity this item consumes when placed in a container. */
	readonly capacityCost: number;
	/** ID of the container this item is in (null if not in a container). */
	readonly containerId: string | null;
	/** Items contained within this gear (if it's a container). */
	readonly containedItems: readonly string[];
}

/** Check if gear has capacity to hold items. */
export function isGearContainer(gear: CharacterGear): boolean {
	return gear.capacity > 0;
}

/** Calculate remaining capacity of a container gear. */
export function getRemainingCapacity(gear: CharacterGear): number {
	return gear.capacity - gear.capacityUsed;
}

/** Check if gear can fit in a container. */
export function canFitInContainer(container: CharacterGear, item: CharacterGear): boolean {
	if (!isGearContainer(container)) return false;
	if (item.capacityCost <= 0) return true; // Items with no capacity cost always fit
	return getRemainingCapacity(container) >= item.capacityCost;
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
	readonly bioware: readonly CharacterBioware[];
	readonly vehicles: readonly CharacterVehicle[];
	readonly gear: readonly CharacterGear[];
	readonly lifestyle: CharacterLifestyle | null;
	readonly martialArts: readonly CharacterMartialArt[];
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

	for (const bio of equipment.bioware) {
		total += bio.cost;
	}

	for (const vehicle of equipment.vehicles) {
		total += vehicle.cost;
		for (const mod of vehicle.mods) {
			total += mod.cost;
		}
	}

	for (const item of equipment.gear) {
		total += item.cost * item.quantity;
	}

	if (equipment.lifestyle) {
		total += equipment.lifestyle.monthlyCost * equipment.lifestyle.monthsPrepaid;
	}

	// Martial arts have BP cost, not nuyen cost (5 BP per style, 2 BP per technique)
	// So they don't add to equipment cost

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

/** Calculate total essence cost of bioware. */
export function calculateBiowareEssenceCost(bioware: readonly CharacterBioware[]): number {
	let total = 0;
	for (const bio of bioware) {
		total += bio.essence;
	}
	return total;
}

/** Calculate combined essence cost of cyberware and bioware. */
export function calculateTotalEssenceCost(equipment: CharacterEquipment): number {
	return calculateEssenceCost(equipment.cyberware) + calculateBiowareEssenceCost(equipment.bioware);
}

/** Empty equipment template. */
export const EMPTY_EQUIPMENT: CharacterEquipment = {
	weapons: [],
	armor: [],
	cyberware: [],
	bioware: [],
	vehicles: [],
	gear: [],
	lifestyle: null,
	martialArts: []
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

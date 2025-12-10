/**
 * Type definitions module.
 * Re-exports all TypeScript interfaces for the application.
 */

/* Attribute types */
export type {
	AttributeCode,
	PhysicalAttribute,
	MentalAttribute,
	SpecialAttribute,
	AttributeLimits,
	AttributeValue,
	Attribute,
	MetatypeAttributes
} from './attributes';

export { type CharacterAttributes } from './attributes';

export {
	DEFAULT_ATTRIBUTE_VALUE,
	ATTRIBUTE_NAMES,
	calculateAttributeTotal,
	isAttributeValid
} from './attributes';

/* Skill types */
export type {
	SkillCategoryType,
	ActiveSkillCategory,
	KnowledgeSkillCategory,
	SkillCategory,
	SkillGroupName,
	SkillDefinition,
	CharacterSkill,
	CharacterSkillGroup,
	KnowledgeSkill
} from './skills';

export {
	MAX_SKILL_RATING_CREATION,
	MAX_SKILL_RATING_CAREER,
	MAX_SKILL_GROUP_RATING,
	calculateSkillPool,
	calculateDefaultPool,
	calculateSkillBpCost,
	getKnowledgeSkillAttribute
} from './skills';

/* Character types */
export type {
	BuildMethod,
	CharacterStatus,
	Metatype,
	Metavariant,
	CharacterQuality,
	Contact,
	ExpenseEntry,
	BuildPointAllocation,
	CharacterIdentity,
	CharacterBackground,
	CharacterReputation,
	ConditionMonitor,
	Character,
	CharacterMagic,
	CharacterSpell,
	CharacterPower,
	BoundSpirit,
	Focus,
	CharacterResonance,
	ComplexForm,
	CompiledSprite,
	CharacterSettings
} from './character';

export {
	DEFAULT_CHARACTER_SETTINGS,
	DEFAULT_BP_ALLOCATION,
	createEmptyCharacter
} from './character';

/* Equipment types */
export type {
	WeaponType,
	WeaponCategory,
	GameWeapon,
	CharacterWeapon,
	WeaponAccessory,
	ArmorCategory,
	GameArmor,
	CharacterArmor,
	ArmorModification,
	CyberwareCategory,
	CyberwareGrade,
	CyberwareGradeMultiplier,
	GameCyberware,
	CharacterCyberware,
	BiowareCategory,
	BiowareGrade,
	CharacterBioware,
	VehicleCategory,
	CharacterVehicle,
	VehicleMod,
	CharacterMartialArt,
	GearCategory,
	GameGear,
	CharacterGear,
	LifestyleLevel,
	GameLifestyle,
	CharacterLifestyle,
	CharacterEquipment
} from './equipment';

export {
	CYBERWARE_GRADES,
	BIOWARE_GRADES,
	BP_TO_NUYEN_RATES,
	EMPTY_EQUIPMENT,
	calculateEquipmentCost,
	calculateEssenceCost,
	calculateBiowareEssenceCost,
	calculateTotalEssenceCost,
	bpToNuyen,
	nuyenToBp
} from './equipment';

/**
 * Stores module exports.
 * Re-exports all Svelte stores from a single entry point.
 */

export { user, isSignedIn, type AppUser } from './user';

export {
	gameData,
	gameDataLoading,
	metatypes,
	skills,
	qualities,
	positiveQualities,
	negativeQualities,
	spells,
	powers,
	traditions,
	loadGameData,
	findMetatype,
	findSkill,
	findQuality,
	filterSkillsByCategory,
	filterSkillsByGroup,
	type GameData,
	type GameQuality,
	type GameSpell,
	type GamePower,
	type GameTradition,
	type GameMentor,
	type GameLifestyle,
	type GameProgram,
	type SkillCategoryDef
} from './gamedata';

export {
	character,
	currentStep,
	currentStepIndex,
	remainingBP,
	bpBreakdown,
	hasMetatype,
	magicType,
	startNewCharacter,
	setWizardStep,
	nextWizardStep,
	prevWizardStep,
	setMetatype,
	setAttribute,
	addQuality,
	removeQuality,
	setSkill,
	removeSkill,
	addContact,
	removeContact,
	updateIdentity,
	initializeMagic,
	setTradition,
	addSpell,
	removeSpell,
	addPower,
	removePower,
	initializeResonance,
	getMagicType,
	WIZARD_STEPS,
	type WizardStep,
	type WizardStepConfig,
	type AttributeValueKey,
	type MagicType
} from './character';

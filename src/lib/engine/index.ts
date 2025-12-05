/**
 * Rules Engine
 * ============
 * Core game logic for Shadowrun 4th Edition.
 * Handles calculations, validation, and improvements.
 */

// Calculations - derived values (initiative, condition monitors, limits, etc.)
export {
	getAttributeTotal,
	getMagicTotal,
	getResonanceTotal,
	getEssence,
	calculatePhysicalCM,
	calculateStunCM,
	calculateOverflow,
	getWoundModifier,
	calculateInitiative,
	calculateInitiativeDice,
	calculateInitiativeBonus,
	calculateWalkSpeed,
	calculateRunSpeed,
	calculateSprintBonus,
	calculatePhysicalLimit,
	calculateMentalLimit,
	calculateSocialLimit,
	calculateDicePool,
	calculateComposure,
	calculateJudgeIntentions,
	calculateMemory,
	calculateLiftCarry,
	calculateDefense,
	calculateDodge,
	calculateArmorBallistic,
	calculateArmorImpact,
	calculateDrainResist,
	calculateAstralInitiative,
	calculateAstralInitiativeDice,
	calculateFadingResist,
	calculateMatrixInitiative,
	calculateMatrixInitiativeDice,
	calculateAll,
	type CharacterCalculations
} from './calculations';

// Validation - character build validation
export {
	validateCharacter,
	getValidationErrors,
	getValidationWarnings,
	isCharacterComplete,
	type ValidationSeverity,
	type ValidationIssue,
	type ValidationResult
} from './validation';

// Improvements - bonuses from cyberware, qualities, powers, etc.
export {
	getCyberwareImprovements,
	getQualityImprovements,
	getAdeptPowerImprovements,
	getAllImprovements,
	getTotalImprovement,
	getImprovementsForTarget,
	getImprovementsBySource,
	getStackedValue,
	getImprovementSummary,
	type ImprovementTarget,
	type ImprovementSource,
	type Improvement,
	type ImprovementSummary
} from './improvements';

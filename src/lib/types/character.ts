/**
 * Character Types for Shadowrun 4th Edition
 * ==========================================
 * Core character data model including all components
 * needed for character creation and career mode.
 */

import type { CharacterAttributes, MetatypeAttributes } from './attributes';
import type { CharacterSkill, CharacterSkillGroup, KnowledgeSkill } from './skills';
import type { CharacterEquipment } from './equipment';
import { EMPTY_EQUIPMENT } from './equipment';

/** Character build methods. */
export type BuildMethod = 'bp' | 'karma';

/** Character creation status. */
export type CharacterStatus = 'creation' | 'career';

/**
 * Metatype definition from game data.
 * Includes attribute limits and racial qualities.
 */
export interface Metatype {
	readonly name: string;
	readonly category: string;
	readonly bp: number;
	readonly attributes: MetatypeAttributes;
	readonly movement: string;
	readonly qualities: {
		readonly positive: readonly string[];
		readonly negative: readonly string[];
	};
	readonly source: string;
	readonly page: number;
	readonly metavariants: readonly Metavariant[];
}

/**
 * Metavariant (sub-race) definition.
 * Modifies base metatype with additional qualities.
 */
export interface Metavariant {
	readonly name: string;
	readonly bp: number;
	readonly qualities: {
		readonly positive: readonly string[];
		readonly negative: readonly string[];
	};
	readonly source: string;
	readonly page: number;
}

/**
 * Quality on a character.
 * Tracks the quality and any levels/selections.
 */
export interface CharacterQuality {
	readonly id: string;
	readonly name: string;
	readonly category: 'Positive' | 'Negative';
	readonly bp: number;
	readonly rating: number;
	readonly notes: string;
	/** Selected skill for qualities with selectskill bonus (e.g., Aptitude, Incompetent). */
	readonly selectedSkill?: string;
	/** Selected attribute for qualities with selectattribute bonus (e.g., Exceptional Attribute). */
	readonly selectedAttribute?: string;
}

/**
 * Contact definition.
 * NPCs the character knows with loyalty and connection.
 */
export interface Contact {
	readonly id: string;
	readonly name: string;
	readonly type: string;
	readonly loyalty: number;
	readonly connection: number;
	readonly notes: string;
}

/**
 * Expense log entry for tracking karma/nuyen.
 * Records all transactions in career mode.
 */
export interface ExpenseEntry {
	readonly id: string;
	readonly date: string;
	readonly type: 'karma' | 'nuyen';
	readonly amount: number;
	readonly reason: string;
}

/**
 * Build point allocation tracking.
 * Shows how BP are distributed during creation.
 */
export interface BuildPointAllocation {
	readonly metatype: number;
	readonly attributes: number;
	readonly skills: number;
	readonly skillGroups: number;
	readonly knowledgeSkills: number;
	readonly qualities: number;
	readonly spells: number;
	readonly complexForms: number;
	readonly contacts: number;
	readonly resources: number;
	readonly mentor: number;
	readonly martialArts: number;
}

/**
 * Character identity information.
 * Personal details and background.
 */
export interface CharacterIdentity {
	readonly name: string;
	readonly alias: string;
	readonly playerName: string;
	readonly metatype: string;
	readonly metavariant: string | null;
	readonly sex: string;
	readonly age: string;
	readonly height: string;
	readonly weight: string;
	readonly hair: string;
	readonly eyes: string;
	readonly skin: string;
}

/**
 * Character background and notes.
 * Story and roleplay information.
 */
export interface CharacterBackground {
	readonly description: string;
	readonly background: string;
	readonly concept: string;
	readonly notes: string;
}

/**
 * Character reputation scores.
 * Street cred, notoriety, and public awareness.
 */
export interface CharacterReputation {
	readonly streetCred: number;
	readonly notoriety: number;
	readonly publicAwareness: number;
}

/**
 * Condition monitor tracking.
 * Physical and stun damage boxes, plus Edge points.
 */
export interface ConditionMonitor {
	readonly physicalMax: number;
	readonly physicalCurrent: number;
	readonly stunMax: number;
	readonly stunCurrent: number;
	readonly overflow: number;
	readonly edgeCurrent: number;
}

/**
 * Core character data structure.
 * Contains all information for a complete character.
 */
export interface Character {
	/* Identity */
	readonly id: string;
	readonly userId: string;
	readonly identity: CharacterIdentity;
	readonly background: CharacterBackground;

	/* Status */
	readonly status: CharacterStatus;
	readonly buildMethod: BuildMethod;
	readonly buildPoints: number;
	readonly buildPointsSpent: BuildPointAllocation;

	/* Attributes */
	readonly attributes: CharacterAttributes;
	readonly attributeLimits: MetatypeAttributes;

	/* Skills */
	readonly skills: readonly CharacterSkill[];
	readonly skillGroups: readonly CharacterSkillGroup[];
	readonly knowledgeSkills: readonly KnowledgeSkill[];
	readonly knowledgeSkillPoints: number;

	/* Qualities */
	readonly qualities: readonly CharacterQuality[];

	/* Magic (null if mundane) */
	readonly magic: CharacterMagic | null;

	/* Resonance (null if not technomancer) */
	readonly resonance: CharacterResonance | null;

	/* Social */
	readonly contacts: readonly Contact[];

	/* Equipment */
	readonly equipment: CharacterEquipment;

	/* Resources */
	readonly nuyen: number;
	readonly startingNuyen: number;
	readonly karma: number;
	readonly totalKarma: number;

	/* Reputation */
	readonly reputation: CharacterReputation;

	/* Condition */
	readonly condition: ConditionMonitor;

	/* Career */
	readonly expenseLog: readonly ExpenseEntry[];

	/* Metadata */
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly settings: CharacterSettings;
}

/**
 * Magic-related character data.
 * For adepts, magicians, and mystic adepts.
 */
export interface CharacterMagic {
	readonly tradition: string;
	readonly mentor: string | null;
	readonly initiateGrade: number;
	readonly powerPoints: number;
	readonly powerPointsUsed: number;
	readonly spells: readonly CharacterSpell[];
	readonly powers: readonly CharacterPower[];
	readonly spirits: readonly BoundSpirit[];
	readonly foci: readonly Focus[];
	readonly metamagics: readonly string[];
}

/**
 * Spell on a character.
 */
export interface CharacterSpell {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly type: string;
	readonly range: string;
	readonly damage: string;
	readonly duration: string;
	readonly dv: string;
	readonly notes: string;
}

/**
 * Adept power on a character.
 */
export interface CharacterPower {
	readonly id: string;
	readonly name: string;
	readonly points: number;
	readonly level: number;
	readonly notes: string;
}

/**
 * Bound spirit.
 */
export interface BoundSpirit {
	readonly id: string;
	readonly type: string;
	readonly force: number;
	readonly services: number;
	readonly bound: boolean;
}

/**
 * Magical focus.
 */
export interface Focus {
	readonly id: string;
	readonly name: string;
	readonly type: string;
	readonly force: number;
	readonly bonded: boolean;
}

/**
 * Resonance-related character data.
 * For technomancers.
 */
export interface CharacterResonance {
	readonly stream: string;
	readonly submersionGrade: number;
	readonly complexForms: readonly ComplexForm[];
	readonly sprites: readonly CompiledSprite[];
	readonly echoes: readonly string[];
}

/**
 * Complex form on a character.
 */
export interface ComplexForm {
	readonly id: string;
	readonly name: string;
	readonly rating: number;
	readonly target: string;
	readonly duration: string;
	readonly notes: string;
}

/**
 * Compiled sprite.
 */
export interface CompiledSprite {
	readonly id: string;
	readonly type: string;
	readonly rating: number;
	readonly tasks: number;
	readonly registered: boolean;
}

/**
 * Character-specific settings.
 * House rules and preferences.
 */
export interface CharacterSettings {
	readonly maxAvailability: number;
	readonly startingBP: number;
	readonly startingKarma: number;
	readonly startingNuyen: number;
	readonly ignoreRules: boolean;
}

/** Default character settings for standard SR4 rules. */
export const DEFAULT_CHARACTER_SETTINGS: CharacterSettings = {
	maxAvailability: 12,
	startingBP: 400,
	startingKarma: 0,
	startingNuyen: 0,
	ignoreRules: false
} as const;

/** Default build point allocation (empty). */
export const DEFAULT_BP_ALLOCATION: BuildPointAllocation = {
	metatype: 0,
	attributes: 0,
	skills: 0,
	skillGroups: 0,
	knowledgeSkills: 0,
	qualities: 0,
	spells: 0,
	complexForms: 0,
	contacts: 0,
	resources: 0,
	mentor: 0,
	martialArts: 0
} as const;

/**
 * Create a new empty character.
 * Returns a character with default values for creation.
 */
export function createEmptyCharacter(
	id: string,
	userId: string,
	buildMethod: BuildMethod = 'bp'
): Character {
	const now = new Date().toISOString();

	return {
		id,
		userId,
		identity: {
			name: '',
			alias: '',
			playerName: '',
			metatype: '',
			metavariant: null,
			sex: '',
			age: '',
			height: '',
			weight: '',
			hair: '',
			eyes: '',
			skin: ''
		},
		background: {
			description: '',
			background: '',
			concept: '',
			notes: ''
		},
		status: 'creation',
		buildMethod,
		buildPoints: DEFAULT_CHARACTER_SETTINGS.startingBP,
		buildPointsSpent: DEFAULT_BP_ALLOCATION,
		attributes: {
			bod: { base: 0, bonus: 0, karma: 0 },
			agi: { base: 0, bonus: 0, karma: 0 },
			rea: { base: 0, bonus: 0, karma: 0 },
			str: { base: 0, bonus: 0, karma: 0 },
			cha: { base: 0, bonus: 0, karma: 0 },
			int: { base: 0, bonus: 0, karma: 0 },
			log: { base: 0, bonus: 0, karma: 0 },
			wil: { base: 0, bonus: 0, karma: 0 },
			edg: { base: 0, bonus: 0, karma: 0 },
			mag: null,
			res: null,
			ess: 6.0
		},
		attributeLimits: {
			bod: { min: 1, max: 6, aug: 9 },
			agi: { min: 1, max: 6, aug: 9 },
			rea: { min: 1, max: 6, aug: 9 },
			str: { min: 1, max: 6, aug: 9 },
			cha: { min: 1, max: 6, aug: 9 },
			int: { min: 1, max: 6, aug: 9 },
			log: { min: 1, max: 6, aug: 9 },
			wil: { min: 1, max: 6, aug: 9 },
			ini: { min: 2, max: 12, aug: 18 },
			edg: { min: 1, max: 6, aug: 6 },
			mag: { min: 1, max: 6, aug: 6 },
			res: { min: 1, max: 6, aug: 6 },
			ess: { min: 0, max: 6, aug: 6 }
		},
		skills: [],
		skillGroups: [],
		knowledgeSkills: [],
		knowledgeSkillPoints: 0,
		qualities: [],
		magic: null,
		resonance: null,
		contacts: [],
		equipment: EMPTY_EQUIPMENT,
		nuyen: 0,
		startingNuyen: 0,
		karma: 0,
		totalKarma: 0,
		reputation: {
			streetCred: 0,
			notoriety: 0,
			publicAwareness: 0
		},
		condition: {
			physicalMax: 10,
			physicalCurrent: 0,
			stunMax: 10,
			stunCurrent: 0,
			overflow: 0,
			edgeCurrent: 0
		},
		expenseLog: [],
		createdAt: now,
		updatedAt: now,
		settings: DEFAULT_CHARACTER_SETTINGS
	};
}

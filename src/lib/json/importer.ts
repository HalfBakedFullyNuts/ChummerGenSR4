/**
 * ChummerWeb JSON Import Module
 * =============================
 * Imports ChummerWeb JSON files and converts to internal Character format.
 * Uses the existing Character interface as the schema.
 */

import type { Character } from '$types';
import { createEmptyCharacter } from '$types';

/** Result of import operation. */
export interface ImportResult {
	success: boolean;
	error?: string;
	character?: Character;
}

/**
 * Generate a unique ID for the character.
 */
function generateId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `${timestamp}-${random}`;
}

/**
 * Validate required character fields.
 * Returns error message if invalid, null if valid.
 */
function validateCharacter(data: unknown): string | null {
	if (!data || typeof data !== 'object') {
		return 'Invalid JSON: not an object';
	}

	const obj = data as Record<string, unknown>;

	/* Check for required top-level structure */
	if (!obj.identity || typeof obj.identity !== 'object') {
		return 'Invalid character: missing identity section';
	}

	if (!obj.attributes || typeof obj.attributes !== 'object') {
		return 'Invalid character: missing attributes section';
	}

	if (!obj.settings || typeof obj.settings !== 'object') {
		return 'Invalid character: missing settings section';
	}

	return null;
}

/**
 * Deep merge character data with defaults.
 * Ensures all required fields exist even if not in import.
 */
function mergeWithDefaults(
	data: Record<string, unknown>,
	userId: string
): Character {
	const id = generateId();
	const base = createEmptyCharacter(id, userId, 'bp');
	const now = new Date().toISOString();

	/* Helper to safely get object values */
	const getObj = <T>(obj: unknown, key: string, defaultVal: T): T => {
		if (obj && typeof obj === 'object' && key in obj) {
			return (obj as Record<string, unknown>)[key] as T;
		}
		return defaultVal;
	};

	/* Helper to safely get array values */
	const getArr = <T>(obj: unknown, key: string): T[] => {
		if (obj && typeof obj === 'object' && key in obj) {
			const val = (obj as Record<string, unknown>)[key];
			return Array.isArray(val) ? val : [];
		}
		return [];
	};

	/* Helper to safely get number */
	const getNum = (obj: unknown, key: string, defaultVal: number): number => {
		if (obj && typeof obj === 'object' && key in obj) {
			const val = (obj as Record<string, unknown>)[key];
			const num = Number(val);
			return isNaN(num) ? defaultVal : num;
		}
		return defaultVal;
	};

	/* Helper to safely get string */
	const getStr = (obj: unknown, key: string, defaultVal: string): string => {
		if (obj && typeof obj === 'object' && key in obj) {
			return String((obj as Record<string, unknown>)[key] ?? defaultVal);
		}
		return defaultVal;
	};

	const identity = data.identity as Record<string, unknown> ?? {};
	const background = data.background as Record<string, unknown> ?? {};
	const settings = data.settings as Record<string, unknown> ?? {};
	const buildPointsSpent = data.buildPointsSpent as Record<string, unknown> ?? {};
	const reputation = data.reputation as Record<string, unknown> ?? {};
	const condition = data.condition as Record<string, unknown> ?? {};
	const equipment = data.equipment as Record<string, unknown> ?? {};

	return {
		id,
		userId,
		identity: {
			name: getStr(identity, 'name', ''),
			alias: getStr(identity, 'alias', ''),
			playerName: getStr(identity, 'playerName', ''),
			metatype: getStr(identity, 'metatype', ''),
			metavariant: identity.metavariant as string | null ?? null,
			sex: getStr(identity, 'sex', ''),
			age: getStr(identity, 'age', ''),
			height: getStr(identity, 'height', ''),
			weight: getStr(identity, 'weight', ''),
			hair: getStr(identity, 'hair', ''),
			eyes: getStr(identity, 'eyes', ''),
			skin: getStr(identity, 'skin', '')
		},
		background: {
			description: getStr(background, 'description', ''),
			background: getStr(background, 'background', ''),
			concept: getStr(background, 'concept', ''),
			notes: getStr(background, 'notes', '')
		},
		status: getStr(data, 'status', 'creation') as Character['status'],
		buildMethod: getStr(data, 'buildMethod', 'bp') as Character['buildMethod'],
		buildPoints: getNum(data, 'buildPoints', 400),
		buildPointsSpent: {
			metatype: getNum(buildPointsSpent, 'metatype', 0),
			attributes: getNum(buildPointsSpent, 'attributes', 0),
			skills: getNum(buildPointsSpent, 'skills', 0),
			skillGroups: getNum(buildPointsSpent, 'skillGroups', 0),
			qualities: getNum(buildPointsSpent, 'qualities', 0),
			spells: getNum(buildPointsSpent, 'spells', 0),
			complexForms: getNum(buildPointsSpent, 'complexForms', 0),
			contacts: getNum(buildPointsSpent, 'contacts', 0),
			resources: getNum(buildPointsSpent, 'resources', 0),
			mentor: getNum(buildPointsSpent, 'mentor', 0),
			martialArts: getNum(buildPointsSpent, 'martialArts', 0)
		},
		attributes: getObj(data, 'attributes', base.attributes),
		attributeLimits: getObj(data, 'attributeLimits', base.attributeLimits),
		skills: getArr(data, 'skills'),
		skillGroups: getArr(data, 'skillGroups'),
		knowledgeSkills: getArr(data, 'knowledgeSkills'),
		knowledgeSkillPoints: getNum(data, 'knowledgeSkillPoints', 0),
		qualities: getArr(data, 'qualities'),
		magic: data.magic as Character['magic'] ?? null,
		resonance: data.resonance as Character['resonance'] ?? null,
		contacts: getArr(data, 'contacts'),
		equipment: {
			weapons: getArr(equipment, 'weapons'),
			armor: getArr(equipment, 'armor'),
			cyberware: getArr(equipment, 'cyberware'),
			bioware: getArr(equipment, 'bioware'),
			gear: getArr(equipment, 'gear'),
			vehicles: getArr(equipment, 'vehicles'),
			lifestyle: equipment.lifestyle as Character['equipment']['lifestyle'] ?? null,
			martialArts: getArr(equipment, 'martialArts')
		},
		nuyen: getNum(data, 'nuyen', 0),
		startingNuyen: getNum(data, 'startingNuyen', 0),
		karma: getNum(data, 'karma', 0),
		totalKarma: getNum(data, 'totalKarma', 0),
		reputation: {
			streetCred: getNum(reputation, 'streetCred', 0),
			notoriety: getNum(reputation, 'notoriety', 0),
			publicAwareness: getNum(reputation, 'publicAwareness', 0)
		},
		condition: {
			physicalMax: getNum(condition, 'physicalMax', 10),
			physicalCurrent: getNum(condition, 'physicalCurrent', 0),
			stunMax: getNum(condition, 'stunMax', 10),
			stunCurrent: getNum(condition, 'stunCurrent', 0),
			overflow: getNum(condition, 'overflow', 0),
			edgeCurrent: getNum(condition, 'edgeCurrent', 0)
		},
		expenseLog: getArr(data, 'expenseLog'),
		createdAt: now,
		updatedAt: now,
		settings: {
			maxAvailability: getNum(settings, 'maxAvailability', 12),
			startingBP: getNum(settings, 'startingBP', 400),
			startingKarma: getNum(settings, 'startingKarma', 0),
			startingNuyen: getNum(settings, 'startingNuyen', 0),
			ignoreRules: Boolean(settings.ignoreRules ?? false)
		}
	};
}

/**
 * Import a character from ChummerWeb JSON string.
 */
export function importFromJson(jsonString: string, userId: string): ImportResult {
	try {
		const data = JSON.parse(jsonString);

		/* Validate structure */
		const validationError = validateCharacter(data);
		if (validationError) {
			return { success: false, error: validationError };
		}

		/* Merge with defaults and create character */
		const character = mergeWithDefaults(data, userId);
		return { success: true, character };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to parse JSON';
		return { success: false, error: message };
	}
}

/**
 * Import from file input.
 */
export async function importFromFile(file: File, userId: string): Promise<ImportResult> {
	try {
		const text = await file.text();
		return importFromJson(text, userId);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to read file';
		return { success: false, error: message };
	}
}

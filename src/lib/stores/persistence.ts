/**
 * Persistence Store Module
 * ========================
 * Save/Load functions, Firebase integration,
 * unsaved changes tracking, and auto-save functionality.
 */

import { get, derived, type Readable } from 'svelte/store';
import { type Character, type BuildMethod, createEmptyCharacter } from '$types';
import { characterStore, currentStepStore, generateId, character } from './character';
import { gameData, type GameData } from './gamedata';
import {
	saveCharacter as firebaseSave,
	loadCharacter as firebaseLoad,
	deleteCharacter as firebaseDelete,
	listUserCharacters as firebaseList,
	duplicateCharacter as firebaseDuplicate,
	type CharacterSummary
} from '$lib/firebase';

/**
 * Backfill CharacterSkill.category/group for saves persisted before issue
 * #65 added them (name-lookup against loaded game data). A no-op once every
 * skill already carries both fields — cheap to call unconditionally on load.
 */
export function backfillSkillMeta(char: Character, data: GameData): Character {
	const needsBackfill = char.skills.some((s) => s.category === undefined || s.group === undefined);
	if (!needsBackfill) return char;

	const skills = char.skills.map((s) => {
		if (s.category !== undefined && s.group !== undefined) return s;
		const def = data.skills.find((d) => d.name === s.name);
		if (!def) return s;
		return { ...s, category: def.category, group: def.skillgroup };
	});

	return { ...char, skills };
}

interface AsyncResult<T = void> {
	success: boolean;
	error?: string;
	data?: T;
}

/** Save current character to Firebase. */
export async function saveCurrentCharacter(): Promise<AsyncResult> {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character to save' };
	}

	return await firebaseSave(char);
}

/** Load a character from Firebase by ID. */
export async function loadSavedCharacter(
	characterId: string
): Promise<AsyncResult<Character | null>> {
	const result = await firebaseLoad(characterId);

	if (result.success && result.data) {
		const backfilled = backfillSkillMeta(result.data, get(gameData));
		characterStore.set(backfilled);
		if (backfilled.status === 'creation') {
			currentStepStore.set('finalize');
		}
	}

	return result;
}

/** Load an imported character (e.g. from XML) into the store. */
export function loadImportedCharacter(importedChar: Character): void {
	const backfilled = backfillSkillMeta(importedChar, get(gameData));
	characterStore.set(backfilled);
	if (backfilled.status === 'creation') {
		currentStepStore.set('finalize');
	}
}

/** Start a manual character entry (ignores validation rules). */
export function startManualCharacter(userId: string, buildMethod: BuildMethod = 'bp'): void {
	const id = generateId();
	const char = createEmptyCharacter(id, userId, buildMethod);

	const manualChar: Character = {
		...char,
		settings: {
			...char.settings,
			ignoreRules: true
		}
	};

	characterStore.set(manualChar);
	currentStepStore.set('finalize');
}

/** Delete a character from Firebase. */
export async function deleteSavedCharacter(characterId: string): Promise<AsyncResult> {
	const char = get(characterStore);

	const result = await firebaseDelete(characterId);

	if (result.success && char?.id === characterId) {
		characterStore.set(null);
		currentStepStore.set('method');
	}

	return result;
}

/** List all characters for a user. */
export async function listCharacters(userId: string): Promise<AsyncResult<CharacterSummary[]>> {
	return firebaseList(userId);
}

/** Duplicate a character. */
export async function duplicateCurrentCharacter(): Promise<AsyncResult<Character | null>> {
	const char = get(characterStore);
	if (!char) {
		return { success: false, error: 'No character to duplicate' };
	}

	const newId = generateId();
	return firebaseDuplicate(char.id, newId, char.userId);
}

/** Clear the current character from store (doesn't delete from Firebase). */
export function clearCurrentCharacter(): void {
	characterStore.set(null);
	currentStepStore.set('method');
}

/* ============================================
 * Unsaved Changes Tracking & Auto-Save
 * ============================================ */

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
export const isDirty: Readable<boolean> = derived(character, ($char) => {
	if (!$char) return false;
	const currentVersion = JSON.stringify($char);
	return currentVersion !== lastSavedVersion;
});

let autoSaveInterval: ReturnType<typeof setInterval> | null = null;

/** Enable auto-save with given interval. */
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

/** Disable auto-save. */
export function disableAutoSave(): void {
	if (autoSaveInterval) {
		clearInterval(autoSaveInterval);
		autoSaveInterval = null;
	}
}

/** Re-export CharacterSummary type for convenience. */
export type { CharacterSummary } from '$lib/firebase';

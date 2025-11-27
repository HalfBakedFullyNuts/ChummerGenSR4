/**
 * Firebase Firestore character storage module.
 * Handles CRUD operations for characters in Firestore.
 */

import {
	collection,
	doc,
	getDoc,
	getDocs,
	setDoc,
	deleteDoc,
	query,
	where,
	orderBy,
	limit,
	type DocumentData,
	type QuerySnapshot
} from 'firebase/firestore';
import { getDbInstance } from './config';
import type { Character } from '$types';

/** Collection name for characters. */
const CHARACTERS_COLLECTION = 'characters';

/** Result type for database operations. */
interface DbResult<T = void> {
	success: boolean;
	error?: string;
	data?: T;
}

/** Character summary for list views. */
export interface CharacterSummary {
	id: string;
	name: string;
	alias: string;
	metatype: string;
	status: 'creation' | 'career';
	updatedAt: string;
	createdAt: string;
}

/**
 * Save a character to Firestore.
 * Creates new document or updates existing one.
 */
export async function saveCharacter(character: Character): Promise<DbResult> {
	try {
		const db = getDbInstance();
		const charRef = doc(db, CHARACTERS_COLLECTION, character.id);

		/* Update timestamp */
		const charToSave = {
			...character,
			updatedAt: new Date().toISOString()
		};

		await setDoc(charRef, charToSave);
		return { success: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to save character';
		return { success: false, error: message };
	}
}

/**
 * Load a character from Firestore by ID.
 * Returns null if character not found.
 */
export async function loadCharacter(characterId: string): Promise<DbResult<Character | null>> {
	try {
		const db = getDbInstance();
		const charRef = doc(db, CHARACTERS_COLLECTION, characterId);
		const charSnap = await getDoc(charRef);

		if (!charSnap.exists()) {
			return { success: true, data: null };
		}

		const data = charSnap.data() as Character;
		return { success: true, data };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to load character';
		return { success: false, error: message };
	}
}

/**
 * Delete a character from Firestore.
 */
export async function deleteCharacter(characterId: string): Promise<DbResult> {
	try {
		const db = getDbInstance();
		const charRef = doc(db, CHARACTERS_COLLECTION, characterId);
		await deleteDoc(charRef);
		return { success: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to delete character';
		return { success: false, error: message };
	}
}

/**
 * List all characters for a user.
 * Returns character summaries ordered by most recently updated.
 */
export async function listUserCharacters(
	userId: string,
	maxResults: number = 100
): Promise<DbResult<CharacterSummary[]>> {
	try {
		const db = getDbInstance();
		const charsRef = collection(db, CHARACTERS_COLLECTION);
		const q = query(
			charsRef,
			where('userId', '==', userId),
			orderBy('updatedAt', 'desc'),
			limit(maxResults)
		);

		const snapshot: QuerySnapshot<DocumentData> = await getDocs(q);
		const characters: CharacterSummary[] = [];

		snapshot.forEach((doc) => {
			const data = doc.data();
			characters.push({
				id: doc.id,
				name: data.identity?.name || 'Unnamed',
				alias: data.identity?.alias || '',
				metatype: data.identity?.metatype || 'Unknown',
				status: data.status || 'creation',
				updatedAt: data.updatedAt || '',
				createdAt: data.createdAt || ''
			});
		});

		return { success: true, data: characters };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to list characters';
		return { success: false, error: message };
	}
}

/**
 * Check if a character exists and belongs to a user.
 * Used for authorization checks.
 */
export async function verifyCharacterOwnership(
	characterId: string,
	userId: string
): Promise<DbResult<boolean>> {
	try {
		const db = getDbInstance();
		const charRef = doc(db, CHARACTERS_COLLECTION, characterId);
		const charSnap = await getDoc(charRef);

		if (!charSnap.exists()) {
			return { success: true, data: false };
		}

		const data = charSnap.data();
		const isOwner = data.userId === userId;
		return { success: true, data: isOwner };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to verify ownership';
		return { success: false, error: message };
	}
}

/**
 * Duplicate a character with a new ID.
 * Useful for creating variants or backups.
 */
export async function duplicateCharacter(
	characterId: string,
	newId: string,
	userId: string
): Promise<DbResult<Character | null>> {
	try {
		/* Load existing character */
		const loadResult = await loadCharacter(characterId);
		if (!loadResult.success || !loadResult.data) {
			return { success: false, error: 'Source character not found' };
		}

		const original = loadResult.data;

		/* Verify ownership */
		if (original.userId !== userId) {
			return { success: false, error: 'Not authorized to duplicate this character' };
		}

		/* Create duplicate with new ID and timestamps */
		const now = new Date().toISOString();
		const duplicate: Character = {
			...original,
			id: newId,
			identity: {
				...original.identity,
				name: `${original.identity.name} (Copy)`
			},
			createdAt: now,
			updatedAt: now
		};

		/* Save duplicate */
		const saveResult = await saveCharacter(duplicate);
		if (!saveResult.success) {
			return { success: false, error: saveResult.error || 'Failed to save duplicate' };
		}

		return { success: true, data: duplicate };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to duplicate character';
		return { success: false, error: message };
	}
}

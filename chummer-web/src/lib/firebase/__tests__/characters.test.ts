/**
 * Firebase Characters Service Tests
 * ==================================
 * Tests for Firestore character CRUD operations.
 * Uses mocks to avoid hitting real Firebase.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/* Mock Firebase modules */
vi.mock('firebase/firestore', () => ({
	collection: vi.fn(),
	doc: vi.fn(),
	getDoc: vi.fn(),
	getDocs: vi.fn(),
	setDoc: vi.fn(),
	deleteDoc: vi.fn(),
	query: vi.fn(),
	where: vi.fn(),
	orderBy: vi.fn(),
	limit: vi.fn()
}));

vi.mock('../config', () => ({
	getDbInstance: vi.fn(() => ({}))
}));

import {
	saveCharacter,
	loadCharacter,
	deleteCharacter,
	listUserCharacters,
	verifyCharacterOwnership,
	duplicateCharacter
} from '../characters';
import { createEmptyCharacter } from '$types';
import { doc, getDoc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

describe('Firebase Characters Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('saveCharacter', () => {
		it('should save a character to Firestore', async () => {
			const character = createEmptyCharacter('test-char-1', 'user-123', 'bp');
			(setDoc as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const result = await saveCharacter(character);

			expect(result.success).toBe(true);
			expect(setDoc).toHaveBeenCalled();
		});

		it('should return error on Firestore failure', async () => {
			const character = createEmptyCharacter('test-char-1', 'user-123', 'bp');
			(setDoc as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

			const result = await saveCharacter(character);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Network error');
		});

		it('should update timestamp when saving', async () => {
			const character = createEmptyCharacter('test-char-1', 'user-123', 'bp');
			const originalUpdatedAt = character.updatedAt;

			/* Wait a tick to ensure timestamp changes */
			await new Promise((r) => setTimeout(r, 10));

			(setDoc as ReturnType<typeof vi.fn>).mockImplementation((_, data) => {
				expect(data.updatedAt).not.toBe(originalUpdatedAt);
				return Promise.resolve();
			});

			await saveCharacter(character);
		});
	});

	describe('loadCharacter', () => {
		it('should load a character from Firestore', async () => {
			const character = createEmptyCharacter('test-char-1', 'user-123', 'bp');
			(getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
				exists: () => true,
				data: () => character
			});

			const result = await loadCharacter('test-char-1');

			expect(result.success).toBe(true);
			expect(result.data).toEqual(character);
		});

		it('should return null for non-existent character', async () => {
			(getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
				exists: () => false
			});

			const result = await loadCharacter('non-existent');

			expect(result.success).toBe(true);
			expect(result.data).toBeNull();
		});

		it('should return error on Firestore failure', async () => {
			(getDoc as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Permission denied'));

			const result = await loadCharacter('test-char-1');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Permission denied');
		});
	});

	describe('deleteCharacter', () => {
		it('should delete a character from Firestore', async () => {
			(deleteDoc as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const result = await deleteCharacter('test-char-1');

			expect(result.success).toBe(true);
			expect(deleteDoc).toHaveBeenCalled();
		});

		it('should return error on Firestore failure', async () => {
			(deleteDoc as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

			const result = await deleteCharacter('test-char-1');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Network error');
		});
	});

	describe('listUserCharacters', () => {
		it('should list all characters for a user', async () => {
			const mockDocs = [
				{
					id: 'char-1',
					data: () => ({
						identity: { name: 'Test Char 1', alias: 'TC1', metatype: 'Human' },
						status: 'creation',
						updatedAt: '2024-01-01T00:00:00Z',
						createdAt: '2024-01-01T00:00:00Z'
					})
				},
				{
					id: 'char-2',
					data: () => ({
						identity: { name: 'Test Char 2', alias: 'TC2', metatype: 'Elf' },
						status: 'career',
						updatedAt: '2024-01-02T00:00:00Z',
						createdAt: '2024-01-02T00:00:00Z'
					})
				}
			];

			(getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({
				forEach: (cb: (doc: typeof mockDocs[0]) => void) => mockDocs.forEach(cb)
			});

			const result = await listUserCharacters('user-123');

			expect(result.success).toBe(true);
			expect(result.data).toHaveLength(2);
			expect(result.data?.[0].name).toBe('Test Char 1');
			expect(result.data?.[1].metatype).toBe('Elf');
		});

		it('should return empty array for user with no characters', async () => {
			(getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({
				forEach: () => {}
			});

			const result = await listUserCharacters('user-no-chars');

			expect(result.success).toBe(true);
			expect(result.data).toEqual([]);
		});

		it('should handle missing identity data gracefully', async () => {
			const mockDocs = [
				{
					id: 'char-1',
					data: () => ({
						/* Missing identity object */
						status: 'creation'
					})
				}
			];

			(getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({
				forEach: (cb: (doc: typeof mockDocs[0]) => void) => mockDocs.forEach(cb)
			});

			const result = await listUserCharacters('user-123');

			expect(result.success).toBe(true);
			expect(result.data?.[0].name).toBe('Unnamed');
			expect(result.data?.[0].metatype).toBe('Unknown');
		});
	});

	describe('verifyCharacterOwnership', () => {
		it('should return true for character owner', async () => {
			(getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
				exists: () => true,
				data: () => ({ userId: 'user-123' })
			});

			const result = await verifyCharacterOwnership('char-1', 'user-123');

			expect(result.success).toBe(true);
			expect(result.data).toBe(true);
		});

		it('should return false for non-owner', async () => {
			(getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
				exists: () => true,
				data: () => ({ userId: 'user-456' })
			});

			const result = await verifyCharacterOwnership('char-1', 'user-123');

			expect(result.success).toBe(true);
			expect(result.data).toBe(false);
		});

		it('should return false for non-existent character', async () => {
			(getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
				exists: () => false
			});

			const result = await verifyCharacterOwnership('non-existent', 'user-123');

			expect(result.success).toBe(true);
			expect(result.data).toBe(false);
		});
	});

	describe('duplicateCharacter', () => {
		it('should duplicate a character with new ID', async () => {
			const originalChar = createEmptyCharacter('original-id', 'user-123', 'bp');
			originalChar.identity.name = 'Original Character';

			(getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
				exists: () => true,
				data: () => originalChar
			});
			(setDoc as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const result = await duplicateCharacter('original-id', 'new-id', 'user-123');

			expect(result.success).toBe(true);
			expect(result.data?.id).toBe('new-id');
			expect(result.data?.identity.name).toBe('Original Character (Copy)');
		});

		it('should fail if source character not found', async () => {
			(getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
				exists: () => false
			});

			const result = await duplicateCharacter('non-existent', 'new-id', 'user-123');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Source character not found');
		});

		it('should fail if user does not own source character', async () => {
			const originalChar = createEmptyCharacter('original-id', 'other-user', 'bp');

			(getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
				exists: () => true,
				data: () => originalChar
			});

			const result = await duplicateCharacter('original-id', 'new-id', 'user-123');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Not authorized to duplicate this character');
		});
	});
});

describe('Character Data Integrity', () => {
	it('should preserve all character fields when saving and loading', async () => {
		const character = createEmptyCharacter('test-char', 'user-123', 'bp');

		/* Modify character with various data */
		const modifiedChar = {
			...character,
			identity: {
				...character.identity,
				name: 'Test Runner',
				alias: 'Shadow',
				metatype: 'Elf'
			},
			buildPointsSpent: {
				...character.buildPointsSpent,
				metatype: 30,
				attributes: 100,
				skills: 50
			},
			nuyen: 50000,
			attributes: {
				...character.attributes,
				ess: 5.2
			}
		};

		let savedData: typeof modifiedChar | null = null;

		(setDoc as ReturnType<typeof vi.fn>).mockImplementation((_, data) => {
			savedData = data;
			return Promise.resolve();
		});

		(getDoc as ReturnType<typeof vi.fn>).mockImplementation(() => ({
			exists: () => true,
			data: () => savedData
		}));

		/* Save */
		const saveResult = await saveCharacter(modifiedChar);
		expect(saveResult.success).toBe(true);

		/* Load */
		const loadResult = await loadCharacter('test-char');
		expect(loadResult.success).toBe(true);

		/* Verify integrity (except updatedAt which changes on save) */
		const loaded = loadResult.data;
		expect(loaded?.identity.name).toBe('Test Runner');
		expect(loaded?.identity.alias).toBe('Shadow');
		expect(loaded?.identity.metatype).toBe('Elf');
		expect(loaded?.buildPointsSpent.metatype).toBe(30);
		expect(loaded?.buildPointsSpent.attributes).toBe(100);
		expect(loaded?.nuyen).toBe(50000);
		expect(loaded?.attributes.ess).toBe(5.2);
	});
});

/**
 * Character Store Tests
 * =====================
 * Validates character creation mechanics match desktop Chummer.
 * Tests BP costs, limits, and character state management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	character,
	remainingBP,
	startNewCharacter,
	addQuality,
	removeQuality,
	setSkill,
	removeSkill,
	addContact,
	removeContact,
	setResourcesBP,
	remainingNuyen,
	startingNuyen,
	getMaxAmmo,
	spendAmmo,
	reloadWeapon,
	setAmmo,
	addWeapon
} from '../character';

describe('Character Store - BP Management', () => {
	beforeEach(() => {
		// Start fresh character for each test
		startNewCharacter('test-user', 'bp');
	});

	describe('Initial State', () => {
		it('should start with 400 BP', () => {
			expect(get(remainingBP)).toBe(400);
		});

		it('should start with empty qualities', () => {
			const char = get(character);
			expect(char?.qualities).toHaveLength(0);
		});

		it('should start with empty skills', () => {
			const char = get(character);
			expect(char?.skills).toHaveLength(0);
		});

		it('should start with 0 nuyen', () => {
			expect(get(remainingNuyen)).toBe(0);
			expect(get(startingNuyen)).toBe(0);
		});

		it('should start with 6.0 essence', () => {
			const char = get(character);
			expect(char?.attributes.ess).toBe(6.0);
		});
	});
});

describe('Character Store - Quality BP Costs', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
	});

	describe('Positive Qualities', () => {
		/**
		 * SR4 p.78 - Positive qualities cost BP
		 */
		it('should deduct BP for positive qualities', () => {
			const initialBP = get(remainingBP);

			addQuality('Ambidextrous', 'Positive', 5);

			expect(get(remainingBP)).toBe(initialBP - 5);
		});

		it('should track multiple positive qualities', () => {
			const initialBP = get(remainingBP);

			addQuality('Ambidextrous', 'Positive', 5);
			addQuality('Quick Healer', 'Positive', 10);

			expect(get(remainingBP)).toBe(initialBP - 15);
			expect(get(character)?.qualities).toHaveLength(2);
		});

		it('should prevent duplicate qualities', () => {
			addQuality('Ambidextrous', 'Positive', 5);
			addQuality('Ambidextrous', 'Positive', 5);

			expect(get(character)?.qualities).toHaveLength(1);
		});

		it('should refund BP when removing positive quality', () => {
			addQuality('Ambidextrous', 'Positive', 5);
			const bpAfterAdd = get(remainingBP);

			const qual = get(character)?.qualities[0];
			if (qual) {
				removeQuality(qual.id);
			}

			expect(get(remainingBP)).toBe(bpAfterAdd + 5);
			expect(get(character)?.qualities).toHaveLength(0);
		});
	});

	describe('Negative Qualities', () => {
		/**
		 * SR4 p.78 - Negative qualities give BP back
		 * Stored as negative numbers in our system
		 */
		it('should add BP for negative qualities', () => {
			const initialBP = get(remainingBP);

			// Negative qualities have negative BP cost (gives points back)
			addQuality('Addiction (Mild)', 'Negative', -5);

			expect(get(remainingBP)).toBe(initialBP + 5);
		});

		it('should track multiple negative qualities', () => {
			const initialBP = get(remainingBP);

			addQuality('Addiction (Mild)', 'Negative', -5);
			addQuality('Bad Luck', 'Negative', -20);

			expect(get(remainingBP)).toBe(initialBP + 25);
		});

		it('should deduct BP when removing negative quality', () => {
			addQuality('Addiction (Mild)', 'Negative', -5);
			const bpAfterAdd = get(remainingBP);

			const qual = get(character)?.qualities[0];
			if (qual) {
				removeQuality(qual.id);
			}

			expect(get(remainingBP)).toBe(bpAfterAdd - 5);
		});
	});

	describe('Quality Limits', () => {
		/**
		 * SR4 p.78 - Maximum 35 BP in positive qualities
		 * Maximum 35 BP from negative qualities
		 * Note: Our system doesn't enforce this in the store,
		 * but the Finalize component validates it
		 */
		it('should allow up to 35 BP in positive qualities', () => {
			// Add qualities totaling 35 BP
			addQuality('Quality1', 'Positive', 15);
			addQuality('Quality2', 'Positive', 10);
			addQuality('Quality3', 'Positive', 10);

			const totalPositive = get(character)?.qualities
				.filter(q => q.category === 'Positive')
				.reduce((sum, q) => sum + q.bp, 0);

			expect(totalPositive).toBe(35);
		});

		it('should track when positive qualities exceed 35 BP limit', () => {
			addQuality('Quality1', 'Positive', 20);
			addQuality('Quality2', 'Positive', 20);

			const totalPositive = get(character)?.qualities
				.filter(q => q.category === 'Positive')
				.reduce((sum, q) => sum + q.bp, 0);

			// System allows it but tracks it (validation happens in UI)
			expect(totalPositive).toBe(40);
		});
	});
});

describe('Character Store - Skill BP Costs', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
	});

	/**
	 * SR4 p.84 - Active Skills cost 4 BP per rating
	 * Note: Our setSkill doesn't currently track BP in buildPointsSpent.skills
	 * This test documents expected behavior
	 */
	describe('Active Skill Costs', () => {
		it('should add skill to character', () => {
			setSkill('Pistols', 4, null);

			const char = get(character);
			const skill = char?.skills.find(s => s.name === 'Pistols');

			expect(skill).toBeDefined();
			expect(skill?.rating).toBe(4);
		});

		it('should update existing skill rating', () => {
			setSkill('Pistols', 3, null);
			setSkill('Pistols', 5, null);

			const char = get(character);
			expect(char?.skills).toHaveLength(1);
			expect(char?.skills[0]?.rating).toBe(5);
		});

		it('should add specialization to skill', () => {
			setSkill('Pistols', 4, 'Semi-Automatics');

			const char = get(character);
			const skill = char?.skills.find(s => s.name === 'Pistols');

			expect(skill?.specialization).toBe('Semi-Automatics');
		});

		it('should remove skill from character', () => {
			setSkill('Pistols', 4, null);
			removeSkill('Pistols');

			expect(get(character)?.skills).toHaveLength(0);
		});
	});

	describe('Skill Rating Limits', () => {
		/**
		 * SR4 p.84 - Maximum skill rating 6 during creation
		 */
		it('should allow skills up to rating 6', () => {
			setSkill('Pistols', 6, null);

			const skill = get(character)?.skills.find(s => s.name === 'Pistols');
			expect(skill?.rating).toBe(6);
		});

		it('should track multiple skills', () => {
			setSkill('Pistols', 4, null);
			setSkill('Automatics', 3, null);
			setSkill('Dodge', 5, null);

			expect(get(character)?.skills).toHaveLength(3);
		});
	});
});

describe('Character Store - Contact BP Costs', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
	});

	/**
	 * SR4 p.86 - Contact cost = Loyalty + Connection
	 */
	describe('Contact Costs', () => {
		it('should add contact to character', () => {
			addContact('Fixer Frank', 'Fixer', 3, 4);

			const char = get(character);
			expect(char?.contacts).toHaveLength(1);
			expect(char?.contacts[0]?.name).toBe('Fixer Frank');
		});

		it('should set contact loyalty and connection', () => {
			addContact('Fixer Frank', 'Fixer', 3, 4);

			const contact = get(character)?.contacts[0];
			expect(contact?.loyalty).toBe(3);
			expect(contact?.connection).toBe(4);
		});

		it('should clamp loyalty to 1-6 range', () => {
			addContact('Test Contact', 'Fixer', 0, 3);

			const contact = get(character)?.contacts[0];
			expect(contact?.loyalty).toBe(1); // Clamped from 0
		});

		it('should clamp connection to 1-6 range', () => {
			addContact('Test Contact', 'Fixer', 3, 10);

			const contact = get(character)?.contacts[0];
			expect(contact?.connection).toBe(6); // Clamped from 10
		});

		it('should remove contact', () => {
			addContact('Fixer Frank', 'Fixer', 3, 4);

			const contact = get(character)?.contacts[0];
			if (contact) {
				removeContact(contact.id);
			}

			expect(get(character)?.contacts).toHaveLength(0);
		});

		it('should track multiple contacts', () => {
			addContact('Fixer Frank', 'Fixer', 3, 4);
			addContact('Street Doc', 'Street Doc', 2, 3);
			addContact('Arms Dealer', 'Arms Dealer', 4, 5);

			expect(get(character)?.contacts).toHaveLength(3);
		});
	});

	describe('Contact BP Calculation', () => {
		/**
		 * Contact BP = Loyalty + Connection
		 */
		it('should calculate contact BP as loyalty + connection', () => {
			addContact('Fixer Frank', 'Fixer', 3, 4);

			const contact = get(character)?.contacts[0];
			const expectedBP = (contact?.loyalty ?? 0) + (contact?.connection ?? 0);

			expect(expectedBP).toBe(7);
		});

		it('should calculate total contacts BP correctly', () => {
			addContact('Contact1', 'Fixer', 2, 2); // 4 BP
			addContact('Contact2', 'Fixer', 3, 3); // 6 BP
			addContact('Contact3', 'Fixer', 4, 4); // 8 BP

			const contacts = get(character)?.contacts ?? [];
			const totalBP = contacts.reduce((sum, c) => sum + c.loyalty + c.connection, 0);

			expect(totalBP).toBe(18);
		});
	});
});

describe('Character Store - Resources/Nuyen', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
	});

	/**
	 * SR4 p.81 - BP to Nuyen conversion table
	 */
	describe('BP to Nuyen Conversion', () => {
		it('should set 0 BP = 0 nuyen', () => {
			setResourcesBP(0);

			expect(get(startingNuyen)).toBe(0);
			expect(get(remainingNuyen)).toBe(0);
		});

		it('should set 5 BP = 20,000 nuyen', () => {
			setResourcesBP(5);

			expect(get(startingNuyen)).toBe(20000);
		});

		it('should set 10 BP = 50,000 nuyen', () => {
			setResourcesBP(10);

			expect(get(startingNuyen)).toBe(50000);
		});

		it('should set 20 BP = 90,000 nuyen', () => {
			setResourcesBP(20);

			expect(get(startingNuyen)).toBe(90000);
		});

		it('should set 30 BP = 150,000 nuyen', () => {
			setResourcesBP(30);

			expect(get(startingNuyen)).toBe(150000);
		});

		it('should set 40 BP = 225,000 nuyen', () => {
			setResourcesBP(40);

			expect(get(startingNuyen)).toBe(225000);
		});

		it('should set 50 BP = 275,000 nuyen', () => {
			setResourcesBP(50);

			expect(get(startingNuyen)).toBe(275000);
		});

		it('should clamp BP to maximum 50', () => {
			setResourcesBP(100);

			const char = get(character);
			expect(char?.buildPointsSpent.resources).toBe(50);
			expect(get(startingNuyen)).toBe(275000);
		});

		it('should clamp BP to minimum 0', () => {
			setResourcesBP(-10);

			const char = get(character);
			expect(char?.buildPointsSpent.resources).toBe(0);
		});

		it('should use highest qualifying tier for in-between values', () => {
			setResourcesBP(15); // Between 10 and 20

			// Should use 10 BP tier = 50,000 nuyen
			expect(get(startingNuyen)).toBe(50000);
		});

		it('should deduct resources BP from remaining BP', () => {
			const initialBP = get(remainingBP);

			setResourcesBP(30);

			expect(get(remainingBP)).toBe(initialBP - 30);
		});
	});
});

describe('Character Store - Ammo Tracking', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
	});

	describe('getMaxAmmo', () => {
		it('should parse simple ammo strings', () => {
			expect(getMaxAmmo('15(c)')).toBe(15);
			expect(getMaxAmmo('30(c)')).toBe(30);
			expect(getMaxAmmo('100(belt)')).toBe(100);
		});

		it('should return 0 for invalid strings', () => {
			expect(getMaxAmmo('')).toBe(0);
			expect(getMaxAmmo('NA')).toBe(0);
		});
	});

	describe('ammo management', () => {
		const testWeapon = {
			name: 'Ares Predator IV',
			category: 'Heavy Pistols',
			type: 'Ranged' as const,
			reach: 0,
			damage: '5P',
			ap: '-1',
			mode: 'SA',
			rc: '-',
			ammo: '15(c)',
			conceal: 0,
			avail: '4R',
			cost: 350,
			source: 'SR4',
			page: 312
		};

		beforeEach(() => {
			// Set resources so we have nuyen to buy weapons
			setResourcesBP(20); // 90,000 nuyen
		});

		it('should spend ammo correctly', () => {
			addWeapon(testWeapon);
			const char = get(character);
			const weaponId = char?.equipment.weapons[0]?.id;
			expect(weaponId).toBeDefined();

			// Should start with max ammo
			expect(char?.equipment.weapons[0]?.currentAmmo).toBe(15);

			// Spend 1 ammo
			const result = spendAmmo(weaponId!, 1);
			expect(result).toBe(true);

			const updated = get(character);
			expect(updated?.equipment.weapons[0]?.currentAmmo).toBe(14);
		});

		it('should not spend more ammo than available', () => {
			addWeapon(testWeapon);
			const char = get(character);
			const weaponId = char?.equipment.weapons[0]?.id;

			// Try to spend more than available
			const result = spendAmmo(weaponId!, 100);
			expect(result).toBe(false);

			// Ammo should be unchanged
			const updated = get(character);
			expect(updated?.equipment.weapons[0]?.currentAmmo).toBe(15);
		});

		it('should reload weapon to max', () => {
			addWeapon(testWeapon);
			const char = get(character);
			const weaponId = char?.equipment.weapons[0]?.id;

			// Spend some ammo first
			spendAmmo(weaponId!, 10);

			// Reload
			reloadWeapon(weaponId!);

			const updated = get(character);
			expect(updated?.equipment.weapons[0]?.currentAmmo).toBe(15);
		});

		it('should set ammo to specific value', () => {
			addWeapon(testWeapon);
			const char = get(character);
			const weaponId = char?.equipment.weapons[0]?.id;

			setAmmo(weaponId!, 5);

			const updated = get(character);
			expect(updated?.equipment.weapons[0]?.currentAmmo).toBe(5);
		});

		it('should clamp ammo to max', () => {
			addWeapon(testWeapon);
			const char = get(character);
			const weaponId = char?.equipment.weapons[0]?.id;

			setAmmo(weaponId!, 100);

			const updated = get(character);
			expect(updated?.equipment.weapons[0]?.currentAmmo).toBe(15);
		});

		it('should clamp ammo to 0', () => {
			addWeapon(testWeapon);
			const char = get(character);
			const weaponId = char?.equipment.weapons[0]?.id;

			setAmmo(weaponId!, -5);

			const updated = get(character);
			expect(updated?.equipment.weapons[0]?.currentAmmo).toBe(0);
		});
	});
});

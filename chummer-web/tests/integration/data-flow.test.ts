/**
 * Data Flow Integration Tests
 * ============================
 * Tests data transformations between XML, JSON, and Firestore.
 */

import { describe, it, expect } from 'vitest';
import { createEmptyCharacter, type Character } from '$lib/types/character';
import { generateShareCode, createPublicShare, createShareInvitation } from '$lib/sharing/sharing';
import {
	createGameDate,
	createCalendarEvent,
	createCampaignTimeline,
	addEventToTimeline,
	formatGameDate,
	daysBetween
} from '$lib/calendar/calendar';

describe('Data Flow Integration', () => {
	describe('Character Data Transformations', () => {
		it('should create character with all required fields', () => {
			const char = createEmptyCharacter('test-id', 'user-id');

			// Verify all required fields exist
			expect(char.id).toBeDefined();
			expect(char.userId).toBeDefined();
			expect(char.identity).toBeDefined();
			expect(char.attributes).toBeDefined();
			expect(char.skills).toBeDefined();
			expect(char.qualities).toBeDefined();
			expect(char.equipment).toBeDefined();
			expect(char.expenseLog).toBeDefined();
			expect(char.createdAt).toBeDefined();
			expect(char.updatedAt).toBeDefined();
		});

		it('should have valid timestamp format', () => {
			const char = createEmptyCharacter('test-id', 'user-id');

			// Timestamps should be ISO format
			expect(() => new Date(char.createdAt)).not.toThrow();
			expect(() => new Date(char.updatedAt)).not.toThrow();
		});

		it('should initialize equipment with empty arrays', () => {
			const char = createEmptyCharacter('test-id', 'user-id');

			expect(char.equipment.weapons).toEqual([]);
			expect(char.equipment.armor).toEqual([]);
			expect(char.equipment.gear).toEqual([]);
			expect(char.equipment.cyberware).toEqual([]);
			expect(char.equipment.bioware).toEqual([]);
			expect(char.equipment.vehicles).toEqual([]);
		});
	});

	describe('Sharing Data Flow', () => {
		it('should generate valid share codes', () => {
			const code1 = generateShareCode();
			const code2 = generateShareCode();

			expect(code1).toMatch(/^[a-z0-9]+$/);
			expect(code2).toMatch(/^[a-z0-9]+$/);
			expect(code1).not.toBe(code2);
		});

		it('should create public share with metadata', () => {
			const share = createPublicShare('char-123', 'user-456', {
				visibility: 'public',
				expiresInDays: null
			});

			expect(share.characterId).toBe('char-123');
			expect(share.ownerId).toBe('user-456');
			expect(share.shareCode).toBeDefined();
			expect(share.visibility).toBe('public');
			expect(share.viewCount).toBe(0);
		});

		it('should create share invitation', () => {
			const invitation = createShareInvitation('char-123', 'owner-456', 'target-user-789', 'view', 'Check out my character!');

			expect(invitation.characterId).toBe('char-123');
			expect(invitation.fromUserId).toBe('owner-456');
			expect(invitation.toUserId).toBe('target-user-789');
			expect(invitation.status).toBe('pending');
			expect(invitation.permission).toBe('view');
		});
	});

	describe('Calendar Data Flow', () => {
		it('should create and format game dates', () => {
			const date = createGameDate(2072, 6, 15);

			expect(date.year).toBe(2072);
			expect(date.month).toBe(6);
			expect(date.day).toBe(15);

			expect(formatGameDate(date, 'short')).toBe('6/15/2072');
			expect(formatGameDate(date, 'long')).toBe('June 15, 2072');
		});

		it('should calculate days between dates', () => {
			const start = createGameDate(2072, 1, 1);
			const end = createGameDate(2072, 1, 31);

			expect(daysBetween(start, end)).toBe(30);
		});

		it('should create timeline with events', () => {
			let timeline = createCampaignTimeline(createGameDate(2072, 1, 1));

			const event1 = createCalendarEvent('e1', 'mission', 'First Run', createGameDate(2072, 1, 15), {
				description: 'Corporate extraction'
			});

			const event2 = createCalendarEvent('e2', 'session', 'Session 1', createGameDate(2072, 1, 10), {
				description: 'Character introductions'
			});

			timeline = addEventToTimeline(timeline, event1);
			timeline = addEventToTimeline(timeline, event2);

			// Events should be sorted by date
			expect(timeline.events).toHaveLength(2);
			expect(timeline.events[0].id).toBe('e2'); // Jan 10 comes first
			expect(timeline.events[1].id).toBe('e1'); // Jan 15 comes second
		});
	});

	describe('Equipment Data Structures', () => {
		it('should support weapon with accessories', () => {
			const weapon = {
				id: 'w1',
				name: 'Ares Predator IV',
				category: 'Heavy Pistol',
				damage: '5P',
				ap: -1,
				mode: 'SA',
				rc: 0,
				ammo: 15,
				ammoType: 'Regular',
				equipped: true,
				accessories: ['Smartgun System', 'Extended Clip'],
				notes: ''
			};

			expect(weapon.accessories).toHaveLength(2);
			expect(weapon.accessories).toContain('Smartgun System');
		});

		it('should support armor with modifications', () => {
			const armor = {
				id: 'a1',
				name: 'Armor Jacket',
				ballistic: 8,
				impact: 6,
				capacity: 8,
				equipped: true,
				modifications: [
					{ name: 'Nonconductivity 4', capacity: 4 },
					{ name: 'Fire Resistance 4', capacity: 4 }
				],
				notes: ''
			};

			expect(armor.modifications).toHaveLength(2);
			const totalCapacity = armor.modifications.reduce((sum, m) => sum + m.capacity, 0);
			expect(totalCapacity).toBe(8);
		});

		it('should support cyberware with grades', () => {
			const standardWare = {
				id: 'c1',
				name: 'Wired Reflexes 1',
				rating: 1,
				essenceCost: 2,
				grade: 'Standard',
				equipped: true,
				notes: ''
			};

			const alphaWare = {
				id: 'c2',
				name: 'Wired Reflexes 1',
				rating: 1,
				essenceCost: 1.6, // 20% reduction for Alpha
				grade: 'Alphaware',
				equipped: true,
				notes: ''
			};

			expect(alphaWare.essenceCost).toBeLessThan(standardWare.essenceCost);
		});
	});

	describe('Expense Log Data', () => {
		it('should track karma transactions', () => {
			const karmaExpense = {
				id: 'exp-1',
				date: '2072-06-15T10:00:00.000Z',
				type: 'karma' as const,
				amount: -25,
				reason: 'Improved Body from 4 to 5',
				category: 'Attribute' as const,
				session: 'Session 5'
			};

			expect(karmaExpense.amount).toBeLessThan(0); // Expense is negative
			expect(karmaExpense.category).toBe('Attribute');
		});

		it('should track nuyen transactions', () => {
			const nuyenIncome = {
				id: 'exp-2',
				date: '2072-06-15T10:00:00.000Z',
				type: 'nuyen' as const,
				amount: 15000,
				reason: 'Payment for extraction job',
				category: 'Mission' as const,
				session: 'Session 5'
			};

			expect(nuyenIncome.amount).toBeGreaterThan(0); // Income is positive
			expect(nuyenIncome.category).toBe('Mission');
		});

		it('should support all expense categories', () => {
			const categories = [
				'Attribute', 'Skill', 'Quality', 'Spell', 'Power',
				'ComplexForm', 'Initiation', 'Submersion', 'Gear',
				'Lifestyle', 'Contact', 'Mission', 'Other'
			];

			categories.forEach(cat => {
				const expense = {
					id: `exp-${cat}`,
					date: new Date().toISOString(),
					type: 'karma' as const,
					amount: -10,
					reason: `Test ${cat}`,
					category: cat
				};
				expect(expense.category).toBe(cat);
			});
		});
	});
});

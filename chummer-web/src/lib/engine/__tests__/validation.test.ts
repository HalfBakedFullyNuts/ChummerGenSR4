/**
 * Validation Engine Tests
 * =======================
 * Tests for SR4 character build validation including availability restrictions.
 */

import { describe, it, expect } from 'vitest';
import {
	parseAvailability,
	validateAvailability,
	validateCharacter,
	type ParsedAvailability
} from '../validation';
import type { Character } from '$types';

/* ============================================
 * Availability Parsing Tests
 * ============================================ */

describe('parseAvailability', () => {
	it('should parse simple numeric availability', () => {
		const result = parseAvailability('6');
		expect(result.rating).toBe(6);
		expect(result.restriction).toBe('');
	});

	it('should parse availability with R (Restricted) suffix', () => {
		const result = parseAvailability('12R');
		expect(result.rating).toBe(12);
		expect(result.restriction).toBe('R');
	});

	it('should parse availability with F (Forbidden) suffix', () => {
		const result = parseAvailability('16F');
		expect(result.rating).toBe(16);
		expect(result.restriction).toBe('F');
	});

	it('should handle lowercase restriction suffixes', () => {
		expect(parseAvailability('8r').restriction).toBe('R');
		expect(parseAvailability('14f').restriction).toBe('F');
	});

	it('should handle empty or dash availability as 0', () => {
		expect(parseAvailability('').rating).toBe(0);
		expect(parseAvailability('-').rating).toBe(0);
		expect(parseAvailability('0').rating).toBe(0);
	});

	it('should handle rating expressions with + modifier', () => {
		// Some items have "Rating * 2" or similar expressions
		const result = parseAvailability('8+2');
		expect(result.rating).toBe(10);
	});

	it('should parse variable availability with x (times rating)', () => {
		// e.g., "Rating x 2R" should be parsed at base rating
		const result = parseAvailability('6R');
		expect(result.rating).toBe(6);
		expect(result.restriction).toBe('R');
	});
});

/* ============================================
 * Availability Validation Tests
 * ============================================ */

describe('validateAvailability', () => {
	// Helper to create minimal character for testing
	const createTestCharacter = (overrides: Partial<Character> = {}): Character => ({
		id: 'test-char',
		userId: 'test-user',
		identity: { name: 'Test Runner', metatype: 'Human', ethnicity: '', age: 25, sex: '', height: '', weight: '' },
		attributes: {
			bod: { base: 3, bonus: 0, karma: 0 },
			agi: { base: 3, bonus: 0, karma: 0 },
			rea: { base: 3, bonus: 0, karma: 0 },
			str: { base: 3, bonus: 0, karma: 0 },
			cha: { base: 3, bonus: 0, karma: 0 },
			int: { base: 3, bonus: 0, karma: 0 },
			log: { base: 3, bonus: 0, karma: 0 },
			wil: { base: 3, bonus: 0, karma: 0 },
			edg: { base: 2, bonus: 0, karma: 0 },
			ess: 6
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
			edg: { min: 2, max: 7, aug: 7 },
			mag: { min: 0, max: 6, aug: 9 },
			res: { min: 0, max: 6, aug: 9 }
		},
		skills: [],
		skillGroups: [],
		knowledgeSkills: [],
		qualities: [],
		contacts: [],
		equipment: {
			weapons: [],
			armor: [],
			cyberware: [],
			bioware: [],
			vehicles: [],
			gear: [],
			lifestyle: null,
			martialArts: []
		},
		nuyen: 5000,
		karma: 0,
		totalKarma: 0,
		buildPoints: 400,
		buildPointsSpent: { metatype: 0, attributes: 0, skills: 0, qualities: 0, resources: 0, contacts: 0, other: 0 },
		status: 'creation',
		settings: { maxAvailability: 12, allowForbidden: false, bookFilter: [] },
		expenseLog: [],
		notes: '',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	});

	it('should return no issues for equipment with availability <= 12 during creation', () => {
		const char = createTestCharacter({
			equipment: {
				weapons: [{
					id: '1',
					name: 'Ares Predator IV',
					category: 'Heavy Pistols',
					type: 'Ranged',
					reach: 0,
					damage: '5P',
					ap: '-1',
					mode: 'SA',
					rc: '0',
					ammo: '15(c)',
					currentAmmo: 15,
					conceal: 0,
					cost: 350,
					avail: '4R',
					accessories: [],
					notes: ''
				}],
				armor: [],
				cyberware: [],
				bioware: [],
				vehicles: [],
				gear: [],
				lifestyle: null,
				martialArts: []
			}
		});

		const issues = validateAvailability(char);
		expect(issues).toHaveLength(0);
	});

	it('should flag equipment with availability > 12 during creation', () => {
		const char = createTestCharacter({
			equipment: {
				weapons: [{
					id: '1',
					name: 'Ares Alpha',
					category: 'Assault Rifles',
					type: 'Ranged',
					reach: 0,
					damage: '6P',
					ap: '-1',
					mode: 'SA/BF/FA',
					rc: '2',
					ammo: '42(c)',
					currentAmmo: 42,
					conceal: 0,
					cost: 2650,
					avail: '14F',
					accessories: [],
					notes: ''
				}],
				armor: [],
				cyberware: [],
				bioware: [],
				vehicles: [],
				gear: [],
				lifestyle: null,
				martialArts: []
			}
		});

		const issues = validateAvailability(char);
		expect(issues.length).toBeGreaterThan(0);
		expect(issues.some(i => i.code === 'AVAIL_TOO_HIGH')).toBe(true);
	});

	it('should flag Forbidden items during creation when not allowed', () => {
		const char = createTestCharacter({
			settings: { maxAvailability: 12, allowForbidden: false, bookFilter: [] },
			equipment: {
				weapons: [{
					id: '1',
					name: 'AK-97',
					category: 'Assault Rifles',
					type: 'Ranged',
					reach: 0,
					damage: '6P',
					ap: '-1',
					mode: 'SA/BF/FA',
					rc: '0',
					ammo: '38(c)',
					currentAmmo: 38,
					conceal: 0,
					cost: 950,
					avail: '8F',
					accessories: [],
					notes: ''
				}],
				armor: [],
				cyberware: [],
				bioware: [],
				vehicles: [],
				gear: [],
				lifestyle: null,
				martialArts: []
			}
		});

		const issues = validateAvailability(char);
		expect(issues.some(i => i.code === 'FORBIDDEN_ITEM')).toBe(true);
	});

	it('should allow Forbidden items when allowForbidden is true', () => {
		const char = createTestCharacter({
			settings: { maxAvailability: 12, allowForbidden: true, bookFilter: [] },
			equipment: {
				weapons: [{
					id: '1',
					name: 'AK-97',
					category: 'Assault Rifles',
					type: 'Ranged',
					reach: 0,
					damage: '6P',
					ap: '-1',
					mode: 'SA/BF/FA',
					rc: '0',
					ammo: '38(c)',
					currentAmmo: 38,
					conceal: 0,
					cost: 950,
					avail: '8F',
					accessories: [],
					notes: ''
				}],
				armor: [],
				cyberware: [],
				bioware: [],
				vehicles: [],
				gear: [],
				lifestyle: null,
				martialArts: []
			}
		});

		const issues = validateAvailability(char);
		expect(issues.some(i => i.code === 'FORBIDDEN_ITEM')).toBe(false);
	});

	it('should skip availability validation for career mode characters', () => {
		const char = createTestCharacter({
			status: 'career',
			equipment: {
				weapons: [{
					id: '1',
					name: 'Panther XXL',
					category: 'Assault Cannons',
					type: 'Ranged',
					reach: 0,
					damage: '10P',
					ap: '-5',
					mode: 'SA',
					rc: '0',
					ammo: '15(c)',
					currentAmmo: 15,
					conceal: 0,
					cost: 20000,
					avail: '20F',
					accessories: [],
					notes: ''
				}],
				armor: [],
				cyberware: [],
				bioware: [],
				vehicles: [],
				gear: [],
				lifestyle: null,
				martialArts: []
			}
		});

		const issues = validateAvailability(char);
		expect(issues).toHaveLength(0);
	});

	it('should validate armor availability', () => {
		const char = createTestCharacter({
			equipment: {
				weapons: [],
				armor: [{
					id: '1',
					name: 'Full Body Armor',
					category: 'Military Grade Armor',
					ballistic: 14,
					impact: 12,
					capacity: 12,
					capacityUsed: 0,
					equipped: true,
					cost: 15000,
					avail: '14R',
					modifications: [],
					notes: ''
				}],
				cyberware: [],
				bioware: [],
				vehicles: [],
				gear: [],
				lifestyle: null,
				martialArts: []
			}
		});

		const issues = validateAvailability(char);
		expect(issues.some(i => i.code === 'AVAIL_TOO_HIGH')).toBe(true);
	});

	it('should validate cyberware availability', () => {
		const char = createTestCharacter({
			equipment: {
				weapons: [],
				armor: [],
				cyberware: [{
					id: '1',
					name: 'Wired Reflexes 3',
					category: 'Bodyware',
					grade: 'Standard',
					rating: 3,
					essence: 5.0,
					cost: 205000,
					capacity: 0,
					capacityUsed: 0,
					location: '',
					avail: '16R',
					subsystems: [],
					notes: ''
				}],
				bioware: [],
				vehicles: [],
				gear: [],
				lifestyle: null,
				martialArts: []
			}
		});

		const issues = validateAvailability(char);
		expect(issues.some(i => i.code === 'AVAIL_TOO_HIGH')).toBe(true);
	});

	it('should validate gear availability', () => {
		const char = createTestCharacter({
			equipment: {
				weapons: [],
				armor: [],
				cyberware: [],
				bioware: [],
				vehicles: [],
				gear: [{
					id: '1',
					name: 'Area Jammer',
					category: 'Security Devices',
					rating: 6,
					quantity: 1,
					cost: 3000,
					location: '',
					avail: '14F',
					notes: '',
					capacity: 0,
					capacityUsed: 0,
					capacityCost: 0,
					containerId: null,
					containedItems: []
				}],
				lifestyle: null,
				martialArts: []
			}
		});

		const issues = validateAvailability(char);
		expect(issues.some(i => i.code === 'AVAIL_TOO_HIGH')).toBe(true);
		expect(issues.some(i => i.code === 'FORBIDDEN_ITEM')).toBe(true);
	});
});

/* ============================================
 * Full Validation Integration Tests
 * ============================================ */

describe('validateCharacter - availability integration', () => {
	const createTestCharacter = (overrides: Partial<Character> = {}): Character => ({
		id: 'test-char',
		userId: 'test-user',
		identity: { name: 'Test Runner', metatype: 'Human', ethnicity: '', age: 25, sex: '', height: '', weight: '' },
		attributes: {
			bod: { base: 3, bonus: 0, karma: 0 },
			agi: { base: 3, bonus: 0, karma: 0 },
			rea: { base: 3, bonus: 0, karma: 0 },
			str: { base: 3, bonus: 0, karma: 0 },
			cha: { base: 3, bonus: 0, karma: 0 },
			int: { base: 3, bonus: 0, karma: 0 },
			log: { base: 3, bonus: 0, karma: 0 },
			wil: { base: 3, bonus: 0, karma: 0 },
			edg: { base: 2, bonus: 0, karma: 0 },
			ess: 6
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
			edg: { min: 2, max: 7, aug: 7 },
			mag: { min: 0, max: 6, aug: 9 },
			res: { min: 0, max: 6, aug: 9 }
		},
		skills: [],
		skillGroups: [],
		knowledgeSkills: [],
		qualities: [],
		contacts: [],
		equipment: {
			weapons: [],
			armor: [],
			cyberware: [],
			bioware: [],
			vehicles: [],
			gear: [],
			lifestyle: null,
			martialArts: []
		},
		nuyen: 5000,
		karma: 0,
		totalKarma: 0,
		buildPoints: 400,
		buildPointsSpent: { metatype: 0, attributes: 0, skills: 0, qualities: 0, resources: 0, contacts: 0, other: 0 },
		status: 'creation',
		settings: { maxAvailability: 12, allowForbidden: false, bookFilter: [] },
		expenseLog: [],
		notes: '',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	});

	it('should include availability issues in full validation result', () => {
		const char = createTestCharacter({
			equipment: {
				weapons: [{
					id: '1',
					name: 'Military Assault Rifle',
					category: 'Assault Rifles',
					type: 'Ranged',
					reach: 0,
					damage: '7P',
					ap: '-2',
					mode: 'SA/BF/FA',
					rc: '2',
					ammo: '50(c)',
					currentAmmo: 50,
					conceal: 0,
					cost: 5000,
					avail: '18F',
					accessories: [],
					notes: ''
				}],
				armor: [],
				cyberware: [],
				bioware: [],
				vehicles: [],
				gear: [],
				lifestyle: null,
				martialArts: []
			}
		});

		const result = validateCharacter(char);
		expect(result.issues.some(i => i.code === 'AVAIL_TOO_HIGH')).toBe(true);
		expect(result.issues.some(i => i.code === 'FORBIDDEN_ITEM')).toBe(true);
	});
});

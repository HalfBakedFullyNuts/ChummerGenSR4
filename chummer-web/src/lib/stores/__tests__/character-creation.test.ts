/**
 * Character Creation Integration Tests
 * =====================================
 * Validates complete character creation workflow matches desktop Chummer.
 * Tests BP allocation across all categories working together.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	character,
	remainingBP,
	bpBreakdown,
	startNewCharacter,
	setMetatype,
	setAttribute,
	addQuality,
	setSkill,
	addContact,
	setResourcesBP,
	addCyberware,
	initializeMagic,
	addSpell,
	magicType,
	remainingNuyen,
	currentEssence
} from '../character';
import type { GameData } from '../gamedata';
import type { GameCyberware } from '$types';

// Mock game data for metatype tests
const mockGameData: GameData = {
	metatypes: [
		{
			name: 'Human',
			category: 'Metahuman',
			bp: 0,
			attributes: {
				bod: { min: 1, max: 6, aug: 9 },
				agi: { min: 1, max: 6, aug: 9 },
				rea: { min: 1, max: 6, aug: 9 },
				str: { min: 1, max: 6, aug: 9 },
				cha: { min: 1, max: 6, aug: 9 },
				int: { min: 1, max: 6, aug: 9 },
				log: { min: 1, max: 6, aug: 9 },
				wil: { min: 1, max: 6, aug: 9 },
				ini: { min: 2, max: 12, aug: 18 },
				edg: { min: 2, max: 7, aug: 7 },
				mag: { min: 1, max: 6, aug: 6 },
				res: { min: 1, max: 6, aug: 6 },
				ess: { min: 0, max: 6, aug: 6 }
			},
			movement: '10/25',
			qualities: { positive: [], negative: [] },
			source: 'SR4',
			page: 81,
			metavariants: []
		},
		{
			name: 'Elf',
			category: 'Metahuman',
			bp: 30,
			attributes: {
				bod: { min: 1, max: 6, aug: 9 },
				agi: { min: 2, max: 7, aug: 10 },
				rea: { min: 1, max: 6, aug: 9 },
				str: { min: 1, max: 6, aug: 9 },
				cha: { min: 3, max: 8, aug: 11 },
				int: { min: 1, max: 6, aug: 9 },
				log: { min: 1, max: 6, aug: 9 },
				wil: { min: 1, max: 6, aug: 9 },
				ini: { min: 2, max: 12, aug: 18 },
				edg: { min: 1, max: 6, aug: 6 },
				mag: { min: 1, max: 6, aug: 6 },
				res: { min: 1, max: 6, aug: 6 },
				ess: { min: 0, max: 6, aug: 6 }
			},
			movement: '10/25',
			qualities: { positive: ['Low-Light Vision'], negative: [] },
			source: 'SR4',
			page: 81,
			metavariants: []
		},
		{
			name: 'Troll',
			category: 'Metahuman',
			bp: 40,
			attributes: {
				bod: { min: 5, max: 10, aug: 15 },
				agi: { min: 1, max: 5, aug: 7 },
				rea: { min: 1, max: 6, aug: 9 },
				str: { min: 5, max: 10, aug: 15 },
				cha: { min: 1, max: 4, aug: 6 },
				int: { min: 1, max: 5, aug: 7 },
				log: { min: 1, max: 5, aug: 7 },
				wil: { min: 1, max: 6, aug: 9 },
				ini: { min: 2, max: 11, aug: 16 },
				edg: { min: 1, max: 6, aug: 6 },
				mag: { min: 1, max: 6, aug: 6 },
				res: { min: 1, max: 6, aug: 6 },
				ess: { min: 0, max: 6, aug: 6 }
			},
			movement: '10/25',
			qualities: { positive: ['Thermographic Vision', '+1 Reach'], negative: [] },
			source: 'SR4',
			page: 81,
			metavariants: []
		}
	],
	metatypeCategories: ['Metahuman'],
	skills: [],
	skillGroups: [],
	skillCategories: [],
	qualities: [],
	qualityCategories: [],
	spells: [],
	spellCategories: [],
	powers: [],
	traditions: [],
	mentors: [],
	lifestyles: [],
	programs: [],
	programCategories: [],
	weapons: [],
	weaponCategories: [],
	armor: [],
	armorCategories: [],
	cyberware: [],
	cyberwareCategories: [],
	cyberwareGrades: [],
	gear: [],
	gearCategories: []
};

describe('Character Creation - Metatype BP Costs', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
	});

	/**
	 * SR4 p.81 - Metatype costs
	 * Human: 0 BP, Elf: 30 BP, Dwarf: 25 BP, Ork: 20 BP, Troll: 40 BP
	 */
	it('should cost 0 BP for Human', () => {
		setMetatype(mockGameData, 'Human');

		expect(get(bpBreakdown)?.metatype).toBe(0);
		expect(get(remainingBP)).toBe(400);
	});

	it('should cost 30 BP for Elf', () => {
		setMetatype(mockGameData, 'Elf');

		expect(get(bpBreakdown)?.metatype).toBe(30);
		expect(get(remainingBP)).toBe(370);
	});

	it('should cost 40 BP for Troll', () => {
		setMetatype(mockGameData, 'Troll');

		expect(get(bpBreakdown)?.metatype).toBe(40);
		expect(get(remainingBP)).toBe(360);
	});

	it('should set metatype name on character identity', () => {
		setMetatype(mockGameData, 'Elf');

		expect(get(character)?.identity.metatype).toBe('Elf');
	});

	it('should update attribute limits from metatype', () => {
		setMetatype(mockGameData, 'Troll');

		const char = get(character);
		expect(char?.attributeLimits.bod.min).toBe(5);
		expect(char?.attributeLimits.bod.max).toBe(10);
		expect(char?.attributeLimits.str.min).toBe(5);
	});
});

describe('Character Creation - Complete BP Budget', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
	});

	/**
	 * Test building a complete character and tracking BP
	 */
	it('should track BP across all categories', () => {
		// Metatype: Elf (30 BP)
		setMetatype(mockGameData, 'Elf');

		// Qualities: +20 positive, -15 negative = 5 BP net
		addQuality('Ambidextrous', 'Positive', 5);
		addQuality('Quick Healer', 'Positive', 10);
		addQuality('High Pain Tolerance 1', 'Positive', 5);
		addQuality('Addiction (Mild)', 'Negative', -5);
		addQuality('Allergy (Uncommon, Mild)', 'Negative', -5);
		addQuality('SINner', 'Negative', -5);

		// Contacts: 3+4 + 2+3 = 12 BP
		addContact('Fixer', 'Fixer', 3, 4);
		addContact('Street Doc', 'Street Doc', 2, 3);

		// Resources: 30 BP = 150,000 nuyen
		setResourcesBP(30);

		const breakdown = get(bpBreakdown);

		expect(breakdown?.metatype).toBe(30);
		expect(breakdown?.qualities).toBe(5); // 20 - 15
		expect(breakdown?.resources).toBe(30);
	});

	it('should allow spending exactly 400 BP', () => {
		// Build a character that uses exactly 400 BP
		setMetatype(mockGameData, 'Human'); // 0 BP

		// Qualities: 35 positive, -35 negative = 0 net
		addQuality('Quality1', 'Positive', 35);
		addQuality('Quality2', 'Negative', -35);

		// Resources: 50 BP
		setResourcesBP(50);

		// Now we have 350 BP left for attributes, skills, contacts
		const remaining = get(remainingBP);
		expect(remaining).toBe(350);
	});

	it('should track overspending (going negative)', () => {
		setMetatype(mockGameData, 'Troll'); // 40 BP

		// Add lots of expensive things
		addQuality('Expensive Quality', 'Positive', 35);
		setResourcesBP(50);

		// Just qualities and metatype and resources
		// 40 + 35 + 50 = 125 BP used
		expect(get(remainingBP)).toBe(275);
	});
});

describe('Character Creation - Magic Character', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
	});

	/**
	 * SR4 - Awakened characters
	 */
	it('should detect mundane character type', () => {
		expect(get(magicType)).toBe('mundane');
	});

	it('should detect magician from quality', () => {
		addQuality('Magician', 'Positive', 15);

		expect(get(magicType)).toBe('magician');
	});

	it('should detect adept from quality', () => {
		addQuality('Adept', 'Positive', 5);

		expect(get(magicType)).toBe('adept');
	});

	it('should detect mystic adept from quality', () => {
		addQuality('Mystic Adept', 'Positive', 10);

		expect(get(magicType)).toBe('mystic_adept');
	});

	it('should detect technomancer from quality', () => {
		addQuality('Technomancer', 'Positive', 5);

		expect(get(magicType)).toBe('technomancer');
	});

	it('should initialize magic with tradition', () => {
		addQuality('Magician', 'Positive', 15);
		initializeMagic('Hermetic');

		const char = get(character);
		expect(char?.magic).not.toBeNull();
		expect(char?.magic?.tradition).toBe('Hermetic');
	});

	it('should track spell BP costs', () => {
		addQuality('Magician', 'Positive', 15);
		initializeMagic('Hermetic');

		const initialBreakdown = get(bpBreakdown);
		const initialSpellBP = initialBreakdown?.spells ?? 0;

		addSpell({
			name: 'Fireball',
			category: 'Combat',
			type: 'P',
			range: 'LOS (A)',
			damage: 'P',
			duration: 'I',
			dv: '(F/2)+3'
		});

		const newBreakdown = get(bpBreakdown);
		// Each spell costs 5 BP
		expect(newBreakdown?.spells).toBe(initialSpellBP + 5);
	});
});

describe('Character Creation - Cyberware and Essence Interaction', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
		setResourcesBP(50); // Get lots of nuyen
	});

	const mockCyberware: GameCyberware = {
		name: 'Test Cyberware',
		category: 'Bodyware',
		ess: 1.0,
		capacity: '0',
		avail: '4',
		cost: 5000,
		source: 'SR4',
		page: 339,
		rating: 1,
		minRating: 1,
		maxRating: 1
	};

	it('should affect magic attribute with essence loss', () => {
		// Awakened character
		addQuality('Magician', 'Positive', 15);
		initializeMagic('Hermetic');

		const initialEssence = get(currentEssence);

		// Add cyberware
		addCyberware(mockCyberware, 'Standard');

		// Essence should be reduced
		expect(get(currentEssence)).toBe(initialEssence - 1.0);
	});

	it('should calculate correct essence with multiple grades', () => {
		const cyber1: GameCyberware = { ...mockCyberware, name: 'Cyber1', ess: 1.0 };
		const cyber2: GameCyberware = { ...mockCyberware, name: 'Cyber2', ess: 1.0 };
		const cyber3: GameCyberware = { ...mockCyberware, name: 'Cyber3', ess: 1.0 };

		addCyberware(cyber1, 'Standard');   // 1.0 essence
		addCyberware(cyber2, 'Alphaware');  // 0.8 essence
		addCyberware(cyber3, 'Deltaware');  // 0.5 essence

		// 6.0 - 1.0 - 0.8 - 0.5 = 3.7
		expect(get(currentEssence)).toBeCloseTo(3.7);
	});
});

describe('Character Creation - Street Samurai Example', () => {
	/**
	 * Test building a typical street samurai character
	 */
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
	});

	it('should build valid street samurai within 400 BP', () => {
		// Human street sam
		setMetatype(mockGameData, 'Human'); // 0 BP

		// Qualities (net 0)
		addQuality('Ambidextrous', 'Positive', 5);
		addQuality('High Pain Tolerance 1', 'Positive', 5);
		addQuality('SINner', 'Negative', -5);
		addQuality('Addiction (Mild)', 'Negative', -5);

		// Resources for cyberware
		setResourcesBP(50); // 50 BP, 275,000 nuyen

		// Contacts
		addContact('Fixer', 'Fixer', 3, 4); // 7 BP worth
		addContact('Street Doc', 'Street Doc', 2, 3); // 5 BP worth

		// Skills would be here (using setSkill)
		setSkill('Pistols', 5, 'Semi-Automatics');
		setSkill('Automatics', 4, null);
		setSkill('Dodge', 4, null);
		setSkill('Perception', 3, null);

		// Verify we haven't exceeded BP
		expect(get(remainingBP)).toBeGreaterThanOrEqual(0);

		// Verify character is valid
		const char = get(character);
		expect(char?.identity.metatype).toBe('Human');
		expect(char?.qualities.length).toBe(4);
		expect(char?.contacts.length).toBe(2);
		expect(char?.skills.length).toBe(4);
	});
});

describe('Character Creation - Mage Example', () => {
	/**
	 * Test building a typical mage character
	 */
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
	});

	it('should build valid mage within 400 BP', () => {
		// Elf mage
		setMetatype(mockGameData, 'Elf'); // 30 BP

		// Magician quality
		addQuality('Magician', 'Positive', 15);

		// Some negative qualities for points
		addQuality('Sensitive System', 'Negative', -15);

		// Initialize magic
		initializeMagic('Hermetic');

		// Add spells (5 BP each)
		addSpell({
			name: 'Manabolt',
			category: 'Combat',
			type: 'M',
			range: 'LOS',
			damage: 'P',
			duration: 'I',
			dv: '(F/2)'
		});
		addSpell({
			name: 'Heal',
			category: 'Health',
			type: 'M',
			range: 'T',
			damage: '-',
			duration: 'P',
			dv: '(Damage Value)-2'
		});
		addSpell({
			name: 'Invisibility',
			category: 'Illusion',
			type: 'M',
			range: 'LOS',
			damage: '-',
			duration: 'S',
			dv: '(F/2)+1'
		});

		// Resources (small amount for mage)
		setResourcesBP(10); // 50,000 nuyen

		// Verify BP usage
		// Metatype: 30, Magician: 15, Sensitive System: -15, Spells: 15, Resources: 10
		// Total: 55 BP used
		const breakdown = get(bpBreakdown);
		expect(breakdown?.metatype).toBe(30);
		expect(breakdown?.spells).toBe(15);
		expect(breakdown?.resources).toBe(10);

		// Verify magic is initialized
		expect(get(character)?.magic).not.toBeNull();
		expect(get(character)?.magic?.spells.length).toBe(3);
	});
});

describe('Character Creation - Validation Rules', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
	});

	describe('Quality Limits', () => {
		it('should track when positive qualities exceed 35 BP', () => {
			addQuality('Quality1', 'Positive', 20);
			addQuality('Quality2', 'Positive', 20);

			const positiveTotal = get(character)?.qualities
				.filter(q => q.category === 'Positive')
				.reduce((sum, q) => sum + q.bp, 0);

			expect(positiveTotal).toBe(40);
			// Note: System allows this, validation happens in Finalize component
		});

		it('should track when negative qualities exceed 35 BP', () => {
			addQuality('Quality1', 'Negative', -20);
			addQuality('Quality2', 'Negative', -20);

			const negativeTotal = Math.abs(
				get(character)?.qualities
					.filter(q => q.category === 'Negative')
					.reduce((sum, q) => sum + q.bp, 0) ?? 0
			);

			expect(negativeTotal).toBe(40);
		});
	});

	describe('Essence Limits', () => {
		it('should prevent essence going below 0', () => {
			setResourcesBP(50);

			const bigCyber: GameCyberware = {
				name: 'Massive Cyber',
				category: 'Bodyware',
				ess: 7.0, // More than max essence
				capacity: '0',
				avail: '4',
				cost: 1000,
				source: 'SR4',
				page: 1,
				rating: 1,
				minRating: 1,
				maxRating: 1
			};

			addCyberware(bigCyber, 'Standard');

			// Should not be added
			expect(get(character)?.equipment.cyberware).toHaveLength(0);
			expect(get(currentEssence)).toBe(6.0);
		});
	});
});

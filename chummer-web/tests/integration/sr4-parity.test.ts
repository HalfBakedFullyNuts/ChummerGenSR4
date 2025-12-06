/**
 * SR4 Rulebook Parity Tests
 * =========================
 * Validates that web app calculations match desktop Chummer/SR4 rulebook exactly.
 * Tests complete character builds against known correct values.
 *
 * Reference: Shadowrun 4th Edition Core Rulebook (SR4), 20th Anniversary Edition (SR4A)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	character,
	startNewCharacter,
	setMetatype,
	setAttribute,
	addQuality,
	addCyberware,
	setSkill,
	setResourcesBP,
	initializeMagic,
	addSpell,
	remainingBP,
	bpBreakdown,
	currentEssence,
	enterCareerMode,
	awardKarma,
	improveAttribute,
	improveSkill,
	learnNewSkill,
	addSpecialization,
	initiate,
	KARMA_COSTS
} from '$lib/stores/character';
import {
	calculatePhysicalCM,
	calculateStunCM,
	calculateOverflow,
	calculateInitiative,
	calculateInitiativeDice,
	calculateInitiativeBonus,
	calculatePhysicalLimit,
	calculateMentalLimit,
	calculateSocialLimit,
	calculateComposure,
	calculateJudgeIntentions,
	calculateMemory,
	calculateLiftCarry,
	calculateDefense,
	calculateWalkSpeed,
	calculateRunSpeed,
	calculateDrainResist,
	calculateAll
} from '$lib/engine/calculations';
import type { Character, GameCyberware } from '$types';
import type { GameData } from '$lib/stores/gamedata';

/* ============================================
 * Mock Game Data - SR4 Core Metatypes
 * SR4 p.81 - Metatype BP Costs and Attributes
 * ============================================ */

const SR4_METATYPES: GameData = {
	metatypes: [
		{
			name: 'Human',
			category: 'Metahuman',
			bp: 0, // SR4 p.81
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
			bp: 30, // SR4 p.81
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
			name: 'Dwarf',
			category: 'Metahuman',
			bp: 25, // SR4 p.81
			attributes: {
				bod: { min: 2, max: 7, aug: 10 },
				agi: { min: 1, max: 5, aug: 7 },
				rea: { min: 1, max: 5, aug: 7 },
				str: { min: 3, max: 8, aug: 11 },
				cha: { min: 1, max: 6, aug: 9 },
				int: { min: 1, max: 6, aug: 9 },
				log: { min: 1, max: 6, aug: 9 },
				wil: { min: 2, max: 7, aug: 10 },
				ini: { min: 2, max: 11, aug: 16 },
				edg: { min: 1, max: 6, aug: 6 },
				mag: { min: 1, max: 6, aug: 6 },
				res: { min: 1, max: 6, aug: 6 },
				ess: { min: 0, max: 6, aug: 6 }
			},
			movement: '8/20',
			qualities: { positive: ['Thermographic Vision', '+2 dice vs pathogens/toxins'], negative: [] },
			source: 'SR4',
			page: 81,
			metavariants: []
		},
		{
			name: 'Ork',
			category: 'Metahuman',
			bp: 20, // SR4 p.81
			attributes: {
				bod: { min: 3, max: 8, aug: 11 },
				agi: { min: 1, max: 6, aug: 9 },
				rea: { min: 1, max: 6, aug: 9 },
				str: { min: 3, max: 8, aug: 11 },
				cha: { min: 1, max: 5, aug: 7 },
				int: { min: 1, max: 6, aug: 9 },
				log: { min: 1, max: 5, aug: 7 },
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
			bp: 40, // SR4 p.81
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

/* ============================================
 * SR4 Parity Tests - Core Calculations
 * ============================================ */

describe('SR4 Parity - Condition Monitors', () => {
	/**
	 * SR4 p.243 - Physical Condition Monitor
	 * Boxes = 8 + (BOD ÷ 2, round up)
	 * Note: Tests are limited to human max (6) without metatype selection
	 */
	describe('Physical Condition Monitor (SR4 p.243)', () => {
		const testCases = [
			{ bod: 1, expected: 9 },   // 8 + ceil(1/2) = 8 + 1 = 9
			{ bod: 2, expected: 9 },   // 8 + ceil(2/2) = 8 + 1 = 9
			{ bod: 3, expected: 10 },  // 8 + ceil(3/2) = 8 + 2 = 10
			{ bod: 4, expected: 10 },  // 8 + ceil(4/2) = 8 + 2 = 10
			{ bod: 5, expected: 11 },  // 8 + ceil(5/2) = 8 + 3 = 11
			{ bod: 6, expected: 11 },  // 8 + ceil(6/2) = 8 + 3 = 11 (Human max)
		];

		testCases.forEach(({ bod, expected }) => {
			it(`BOD ${bod} = ${expected} boxes`, () => {
				startNewCharacter('test-user', 'bp');
				setAttribute('bod', bod);
				const char = get(character)!;
				expect(calculatePhysicalCM(char)).toBe(expected);
			});
		});
	});

	/**
	 * SR4 p.243 - Stun Condition Monitor
	 * Boxes = 8 + (WIL ÷ 2, round up)
	 * Note: Tests are limited to human max (6) without metatype selection
	 */
	describe('Stun Condition Monitor (SR4 p.243)', () => {
		const testCases = [
			{ wil: 1, expected: 9 },
			{ wil: 3, expected: 10 },
			{ wil: 5, expected: 11 },
			{ wil: 6, expected: 11 }, // Human max
		];

		testCases.forEach(({ wil, expected }) => {
			it(`WIL ${wil} = ${expected} boxes`, () => {
				startNewCharacter('test-user', 'bp');
				setAttribute('wil', wil);
				const char = get(character)!;
				expect(calculateStunCM(char)).toBe(expected);
			});
		});
	});

	/**
	 * SR4 p.244 - Overflow Damage
	 * Overflow = BOD (death occurs when overflow track is full)
	 */
	describe('Overflow (SR4 p.244)', () => {
		it('Overflow equals BOD', () => {
			startNewCharacter('test-user', 'bp');
			setAttribute('bod', 5);
			const char = get(character)!;
			expect(calculateOverflow(char)).toBe(5);
		});
	});
});

describe('SR4 Parity - Initiative', () => {
	/**
	 * SR4 p.145 - Initiative
	 * Initiative Score = REA + INT + modifiers
	 * Roll Initiative Dice (1d6 base) and add to score
	 */
	describe('Base Initiative (SR4 p.145)', () => {
		const testCases = [
			{ rea: 3, int: 3, expected: 6 },
			{ rea: 4, int: 5, expected: 9 },
			{ rea: 6, int: 6, expected: 12 }, // Human max natural
		];

		testCases.forEach(({ rea, int, expected }) => {
			it(`REA ${rea} + INT ${int} = ${expected}`, () => {
				startNewCharacter('test-user', 'bp');
				setAttribute('rea', rea);
				setAttribute('int', int);
				const char = get(character)!;
				expect(calculateInitiative(char)).toBe(expected);
			});
		});
	});

	/**
	 * SR4 p.339 - Wired Reflexes
	 * Rating 1: +1 REA, +1 Init Pass
	 * Rating 2: +2 REA, +2 Init Passes
	 * Rating 3: +3 REA, +3 Init Passes
	 */
	describe('Wired Reflexes (SR4 p.339)', () => {
		beforeEach(() => {
			startNewCharacter('test-user', 'bp');
			setResourcesBP(50);
		});

		const wiredReflexes: GameCyberware[] = [
			{ name: 'Wired Reflexes 1', category: 'Bodyware', ess: 2.0, capacity: '0', avail: '8R', cost: 11000, source: 'SR4', page: 339, rating: 1, minRating: 1, maxRating: 1 },
			{ name: 'Wired Reflexes 2', category: 'Bodyware', ess: 3.0, capacity: '0', avail: '12R', cost: 32000, source: 'SR4', page: 339, rating: 2, minRating: 2, maxRating: 2 },
			{ name: 'Wired Reflexes 3', category: 'Bodyware', ess: 5.0, capacity: '0', avail: '20R', cost: 100000, source: 'SR4', page: 339, rating: 3, minRating: 3, maxRating: 3 },
		];

		it('Rating 1: +1 Initiative Pass (total 2 dice)', () => {
			addCyberware(wiredReflexes[0]!, 'Standard');
			const char = get(character)!;
			expect(calculateInitiativeDice(char)).toBe(2); // 1 base + 1
			expect(calculateInitiativeBonus(char)).toBe(1);
		});

		it('Rating 2: +2 Initiative Passes (total 3 dice)', () => {
			addCyberware(wiredReflexes[1]!, 'Standard');
			const char = get(character)!;
			expect(calculateInitiativeDice(char)).toBe(3); // 1 base + 2
			expect(calculateInitiativeBonus(char)).toBe(2);
		});

		it('Rating 3: +3 Initiative Passes (total 4 dice)', () => {
			addCyberware(wiredReflexes[2]!, 'Standard');
			const char = get(character)!;
			expect(calculateInitiativeDice(char)).toBe(4); // 1 base + 3
			expect(calculateInitiativeBonus(char)).toBe(3);
		});
	});
});

describe('SR4 Parity - Movement', () => {
	/**
	 * SR4 p.148 - Movement
	 * Walk = AGI × 2 meters/Combat Turn
	 * Run = AGI × 4 meters/Combat Turn
	 */
	describe('Walking and Running (SR4 p.148)', () => {
		const testCases = [
			{ agi: 3, walk: 6, run: 12 },
			{ agi: 4, walk: 8, run: 16 },
			{ agi: 5, walk: 10, run: 20 },
			{ agi: 6, walk: 12, run: 24 },
		];

		testCases.forEach(({ agi, walk, run }) => {
			it(`AGI ${agi}: Walk ${walk}m, Run ${run}m`, () => {
				startNewCharacter('test-user', 'bp');
				setAttribute('agi', agi);
				const char = get(character)!;
				expect(calculateWalkSpeed(char)).toBe(walk);
				expect(calculateRunSpeed(char)).toBe(run);
			});
		});
	});
});

describe('SR4 Parity - Limits', () => {
	/**
	 * SR4A/SR5 - Limits (optional rule)
	 * Physical Limit = ceil((STR×2 + BOD + REA) / 3)
	 * Mental Limit = ceil((LOG×2 + INT + WIL) / 3)
	 * Social Limit = ceil((CHA×2 + WIL + floor(ESS)) / 3)
	 */
	describe('Physical Limit', () => {
		const testCases = [
			{ str: 3, bod: 3, rea: 3, expected: 4 }, // ceil(12/3) = 4
			{ str: 4, bod: 4, rea: 4, expected: 6 }, // ceil(16/3) = 6
			{ str: 6, bod: 6, rea: 6, expected: 8 }, // ceil(24/3) = 8
		];

		testCases.forEach(({ str, bod, rea, expected }) => {
			it(`STR ${str}, BOD ${bod}, REA ${rea} = ${expected}`, () => {
				startNewCharacter('test-user', 'bp');
				setAttribute('str', str);
				setAttribute('bod', bod);
				setAttribute('rea', rea);
				const char = get(character)!;
				expect(calculatePhysicalLimit(char)).toBe(expected);
			});
		});
	});

	describe('Mental Limit', () => {
		const testCases = [
			{ log: 3, int: 3, wil: 3, expected: 4 },
			{ log: 5, int: 4, wil: 4, expected: 6 },
			{ log: 6, int: 6, wil: 6, expected: 8 },
		];

		testCases.forEach(({ log, int, wil, expected }) => {
			it(`LOG ${log}, INT ${int}, WIL ${wil} = ${expected}`, () => {
				startNewCharacter('test-user', 'bp');
				setAttribute('log', log);
				setAttribute('int', int);
				setAttribute('wil', wil);
				const char = get(character)!;
				expect(calculateMentalLimit(char)).toBe(expected);
			});
		});
	});

	describe('Social Limit with Essence', () => {
		it('Full Essence (6) in calculation', () => {
			startNewCharacter('test-user', 'bp');
			setAttribute('cha', 4);
			setAttribute('wil', 4);
			const char = get(character)!;
			// (4×2 + 4 + 6) / 3 = 18/3 = 6
			expect(calculateSocialLimit(char)).toBe(6);
		});

		it('Reduced Essence affects Social Limit', () => {
			startNewCharacter('test-user', 'bp');
			setResourcesBP(50);
			setAttribute('cha', 4);
			setAttribute('wil', 4);

			// Add cyberware to reduce essence
			const datajack: GameCyberware = {
				name: 'Datajack',
				category: 'Headware',
				ess: 0.1,
				capacity: '0',
				avail: '2',
				cost: 1000,
				source: 'SR4',
				page: 328,
				rating: 1,
				minRating: 1,
				maxRating: 1
			};

			// Multiple datajacks to reduce essence significantly
			for (let i = 0; i < 3; i++) {
				addCyberware({ ...datajack, name: `Datajack ${i}` }, 'Standard');
			}

			const char = get(character)!;
			// Essence ~5.7, floor = 5
			// (4×2 + 4 + 5) / 3 = 17/3 = 5.67, ceil = 6
			// Still 6 since it rounds up
			expect(calculateSocialLimit(char)).toBe(6);
		});
	});
});

describe('SR4 Parity - Derived Pools', () => {
	/**
	 * SR4 p.130 - Common Derived Attributes
	 * Composure = CHA + WIL
	 * Judge Intentions = CHA + INT
	 * Memory = LOG + WIL
	 * Lift/Carry = BOD + STR
	 */
	describe('Common Pools (SR4 p.130)', () => {
		beforeEach(() => {
			startNewCharacter('test-user', 'bp');
		});

		it('Composure = CHA + WIL', () => {
			setAttribute('cha', 4);
			setAttribute('wil', 5);
			const char = get(character)!;
			expect(calculateComposure(char)).toBe(9);
		});

		it('Judge Intentions = CHA + INT', () => {
			setAttribute('cha', 4);
			setAttribute('int', 5);
			const char = get(character)!;
			expect(calculateJudgeIntentions(char)).toBe(9);
		});

		it('Memory = LOG + WIL', () => {
			setAttribute('log', 4);
			setAttribute('wil', 5);
			const char = get(character)!;
			expect(calculateMemory(char)).toBe(9);
		});

		it('Lift/Carry = BOD + STR', () => {
			setAttribute('bod', 4);
			setAttribute('str', 5);
			const char = get(character)!;
			expect(calculateLiftCarry(char)).toBe(9);
		});
	});

	/**
	 * SR4 p.160 - Defense
	 * Reaction + Intuition
	 */
	describe('Defense Pool (SR4 p.160)', () => {
		it('Defense = REA + INT', () => {
			startNewCharacter('test-user', 'bp');
			setAttribute('rea', 4);
			setAttribute('int', 5);
			const char = get(character)!;
			expect(calculateDefense(char)).toBe(9);
		});
	});
});

describe('SR4 Parity - Essence & Cyberware', () => {
	/**
	 * SR4 p.327 - Cyberware Grades
	 * Standard: 100% essence, 100% cost
	 * Alphaware: 80% essence, 120% cost
	 * Betaware: 60% essence, 150% cost (Availability +4)
	 * Deltaware: 50% essence, 250% cost (Availability +8)
	 */
	describe('Cyberware Grade Essence Multipliers (SR4 p.327)', () => {
		const testCyber: GameCyberware = {
			name: 'Test Cyberware',
			category: 'Bodyware',
			ess: 1.0,
			capacity: '0',
			avail: '4',
			cost: 10000,
			source: 'SR4',
			page: 327,
			rating: 1,
			minRating: 1,
			maxRating: 1
		};

		beforeEach(() => {
			startNewCharacter('test-user', 'bp');
			setResourcesBP(50);
		});

		it('Standard: 1.0 essence cost', () => {
			addCyberware(testCyber, 'Standard');
			expect(get(currentEssence)).toBeCloseTo(5.0);
		});

		it('Alphaware: 0.8 essence cost', () => {
			addCyberware(testCyber, 'Alphaware');
			expect(get(currentEssence)).toBeCloseTo(5.2);
		});

		it('Betaware: 0.7 essence cost', () => {
			addCyberware(testCyber, 'Betaware');
			expect(get(currentEssence)).toBeCloseTo(5.3);
		});

		it('Deltaware: 0.5 essence cost', () => {
			addCyberware(testCyber, 'Deltaware');
			expect(get(currentEssence)).toBeCloseTo(5.5);
		});
	});

	/**
	 * Test cumulative essence loss
	 */
	describe('Cumulative Essence Loss', () => {
		beforeEach(() => {
			startNewCharacter('test-user', 'bp');
			setResourcesBP(50);
		});

		it('Multiple implants stack essence loss', () => {
			const datajack: GameCyberware = {
				name: 'Datajack',
				category: 'Headware',
				ess: 0.1,
				capacity: '0',
				avail: '2',
				cost: 1000,
				source: 'SR4',
				page: 328,
				rating: 1,
				minRating: 1,
				maxRating: 1
			};

			const smartlink: GameCyberware = {
				name: 'Smartlink',
				category: 'Headware',
				ess: 0.1,
				capacity: '0',
				avail: '4R',
				cost: 2000,
				source: 'SR4',
				page: 332,
				rating: 1,
				minRating: 1,
				maxRating: 1
			};

			const wiredReflexes: GameCyberware = {
				name: 'Wired Reflexes 1',
				category: 'Bodyware',
				ess: 2.0,
				capacity: '0',
				avail: '8R',
				cost: 11000,
				source: 'SR4',
				page: 339,
				rating: 1,
				minRating: 1,
				maxRating: 1
			};

			addCyberware(datajack, 'Standard');      // -0.1
			addCyberware(smartlink, 'Standard');     // -0.1
			addCyberware(wiredReflexes, 'Standard'); // -2.0

			// 6.0 - 0.1 - 0.1 - 2.0 = 3.8
			expect(get(currentEssence)).toBeCloseTo(3.8);
		});

		it('Mixed grades calculate correctly', () => {
			const cyber1: GameCyberware = {
				name: 'Cyber 1',
				category: 'Bodyware',
				ess: 1.0,
				capacity: '0',
				avail: '4',
				cost: 5000,
				source: 'SR4',
				page: 1,
				rating: 1,
				minRating: 1,
				maxRating: 1
			};

			const cyber2: GameCyberware = {
				name: 'Cyber 2',
				category: 'Bodyware',
				ess: 1.0,
				capacity: '0',
				avail: '4',
				cost: 5000,
				source: 'SR4',
				page: 1,
				rating: 1,
				minRating: 1,
				maxRating: 1
			};

			const cyber3: GameCyberware = {
				name: 'Cyber 3',
				category: 'Bodyware',
				ess: 1.0,
				capacity: '0',
				avail: '4',
				cost: 5000,
				source: 'SR4',
				page: 1,
				rating: 1,
				minRating: 1,
				maxRating: 1
			};

			addCyberware(cyber1, 'Standard');  // 1.0 × 1.0 = 1.0
			addCyberware(cyber2, 'Alphaware'); // 1.0 × 0.8 = 0.8
			addCyberware(cyber3, 'Deltaware'); // 1.0 × 0.5 = 0.5

			// 6.0 - 1.0 - 0.8 - 0.5 = 3.7
			expect(get(currentEssence)).toBeCloseTo(3.7);
		});
	});
});

describe('SR4 Parity - Build Point Costs', () => {
	/**
	 * SR4 p.81 - Metatype BP Costs
	 */
	describe('Metatype BP Costs (SR4 p.81)', () => {
		const metatypeCosts = [
			{ name: 'Human', bp: 0 },
			{ name: 'Elf', bp: 30 },
			{ name: 'Dwarf', bp: 25 },
			{ name: 'Ork', bp: 20 },
			{ name: 'Troll', bp: 40 },
		];

		metatypeCosts.forEach(({ name, bp }) => {
			it(`${name} costs ${bp} BP`, () => {
				startNewCharacter('test-user', 'bp');
				setMetatype(SR4_METATYPES, name);
				expect(get(bpBreakdown)?.metatype).toBe(bp);
				expect(get(remainingBP)).toBe(400 - bp);
			});
		});
	});

	/**
	 * SR4 p.89 - Resources (Tiered BP-to-Nuyen rates)
	 * Uses progressive rate table per SR4 p.89
	 */
	describe('Resources BP Cost (SR4 p.89)', () => {
		beforeEach(() => {
			startNewCharacter('test-user', 'bp');
		});

		it('5 BP = 20,000¥', () => {
			setResourcesBP(5);
			expect(get(character)?.nuyen).toBe(20000);
		});

		it('10 BP = 50,000¥', () => {
			setResourcesBP(10);
			expect(get(character)?.nuyen).toBe(50000);
		});

		it('20 BP = 90,000¥', () => {
			setResourcesBP(20);
			expect(get(character)?.nuyen).toBe(90000);
		});

		it('30 BP = 150,000¥', () => {
			setResourcesBP(30);
			expect(get(character)?.nuyen).toBe(150000);
		});

		it('40 BP = 225,000¥', () => {
			setResourcesBP(40);
			expect(get(character)?.nuyen).toBe(225000);
		});

		it('50 BP = 275,000¥', () => {
			setResourcesBP(50);
			expect(get(character)?.nuyen).toBe(275000);
		});
	});
});

describe('SR4 Parity - Career Mode Karma Costs', () => {
	/**
	 * SR4 p.264-266 - Advancement Costs
	 * Note: Character attributes start at 0 (base) in a new character
	 * Karma cost = New Rating × 5
	 */
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
		enterCareerMode();
		awardKarma(200, 'Test karma');
	});

	describe('Attribute Improvement (SR4 p.264)', () => {
		it('New Rating × 5 Karma (0->1 costs 5)', () => {
			// BOD 0->1 costs 1 × 5 = 5 karma
			const karmaBefore = get(character)?.karma ?? 0;
			improveAttribute('bod');
			const karmaAfter = get(character)?.karma ?? 0;
			expect(karmaBefore - karmaAfter).toBe(5);
		});

		it('Sequential improvements cost correctly', () => {
			const initialKarma = get(character)?.karma ?? 0;

			// BOD 0->1 = 5 karma
			improveAttribute('bod');
			// BOD 1->2 = 10 karma
			improveAttribute('bod');
			// BOD 2->3 = 15 karma
			improveAttribute('bod');

			const finalKarma = get(character)?.karma ?? 0;
			// Total: 5 + 10 + 15 = 30 karma
			expect(initialKarma - finalKarma).toBe(30);
		});
	});

	describe('Skill Improvement (SR4 p.265)', () => {
		beforeEach(() => {
			setSkill('Pistols', 3);
		});

		it('New Rating × 2 Karma', () => {
			// Pistols 3->4 costs 4 × 2 = 8 karma
			const karmaBefore = get(character)?.karma ?? 0;
			improveSkill('Pistols');
			const karmaAfter = get(character)?.karma ?? 0;
			expect(karmaBefore - karmaAfter).toBe(8);
		});
	});

	describe('New Skill (SR4 p.265)', () => {
		it('New Active Skill costs 4 Karma', () => {
			const karmaBefore = get(character)?.karma ?? 0;
			learnNewSkill('Automatics');
			const karmaAfter = get(character)?.karma ?? 0;
			expect(karmaBefore - karmaAfter).toBe(4);
			expect(KARMA_COSTS.NEW_SKILL).toBe(4);
		});
	});

	describe('Specialization (SR4 p.265)', () => {
		beforeEach(() => {
			setSkill('Pistols', 3);
		});

		it('Specialization costs 2 Karma', () => {
			const karmaBefore = get(character)?.karma ?? 0;
			addSpecialization('Pistols', 'Semi-Automatics');
			const karmaAfter = get(character)?.karma ?? 0;
			expect(karmaBefore - karmaAfter).toBe(2);
		});
	});

	describe('Initiation (SR4 p.198)', () => {
		beforeEach(() => {
			addQuality('Magician', 'Positive', 15);
			initializeMagic('Hermetic');
		});

		it('First Initiation costs 13 Karma (10 + 1×3)', () => {
			const karmaBefore = get(character)?.karma ?? 0;
			initiate();
			const karmaAfter = get(character)?.karma ?? 0;
			// 10 + (1 × 3) = 13
			expect(karmaBefore - karmaAfter).toBe(13);
		});

		it('Second Initiation costs 16 Karma (10 + 2×3)', () => {
			initiate(); // First
			const karmaBefore = get(character)?.karma ?? 0;
			initiate(); // Second
			const karmaAfter = get(character)?.karma ?? 0;
			// 10 + (2 × 3) = 16
			expect(karmaBefore - karmaAfter).toBe(16);
		});
	});

	describe('Karma Cost Constants', () => {
		it('All karma costs match SR4 rulebook', () => {
			expect(KARMA_COSTS.NEW_SKILL).toBe(4);
			expect(KARMA_COSTS.IMPROVE_SKILL_MULTIPLIER).toBe(2);
			expect(KARMA_COSTS.NEW_SKILL_GROUP).toBe(10);
			expect(KARMA_COSTS.IMPROVE_SKILL_GROUP_MULTIPLIER).toBe(5);
			expect(KARMA_COSTS.NEW_KNOWLEDGE_SKILL).toBe(2);
			expect(KARMA_COSTS.IMPROVE_KNOWLEDGE_SKILL_MULTIPLIER).toBe(1);
			expect(KARMA_COSTS.IMPROVE_ATTRIBUTE_MULTIPLIER).toBe(5);
			expect(KARMA_COSTS.NEW_SPELL).toBe(5);
			expect(KARMA_COSTS.NEW_COMPLEX_FORM).toBe(5);
			expect(KARMA_COSTS.INITIATION_BASE).toBe(10);
			expect(KARMA_COSTS.INITIATION_MULTIPLIER).toBe(3);
		});
	});
});

describe('SR4 Parity - Magic', () => {
	/**
	 * SR4 p.176 - Drain Resistance
	 * Hermetic: WIL + LOG
	 * Shamanic: WIL + CHA
	 */
	describe('Drain Resistance (SR4 p.176)', () => {
		beforeEach(() => {
			startNewCharacter('test-user', 'bp');
			addQuality('Magician', 'Positive', 15);
		});

		it('Hermetic: WIL + LOG', () => {
			initializeMagic('Hermetic');
			setAttribute('wil', 4);
			setAttribute('log', 5);
			const char = get(character)!;
			expect(calculateDrainResist(char)).toBe(9);
		});

		it('Shamanic: WIL + CHA', () => {
			initializeMagic('Shamanic');
			setAttribute('wil', 4);
			setAttribute('cha', 5);
			const char = get(character)!;
			expect(calculateDrainResist(char)).toBe(9);
		});

		it('Mundane: 0 Drain Resist', () => {
			startNewCharacter('test-user', 'bp');
			const char = get(character)!;
			expect(calculateDrainResist(char)).toBe(0);
		});
	});
});

describe('SR4 Parity - Complete Character Builds', () => {
	/**
	 * Verify a complete Street Samurai build matches expected values
	 */
	describe('Street Samurai Archetype', () => {
		beforeEach(() => {
			startNewCharacter('test-user', 'bp');
			setMetatype(SR4_METATYPES, 'Human');
			setAttribute('bod', 5);
			setAttribute('agi', 5);
			setAttribute('rea', 5);
			setAttribute('str', 4);
			setAttribute('cha', 2);
			setAttribute('int', 4);
			setAttribute('log', 3);
			setAttribute('wil', 3);
			setAttribute('edg', 3);
			setResourcesBP(50);
		});

		it('Condition monitors match expected values', () => {
			const char = get(character)!;
			expect(calculatePhysicalCM(char)).toBe(11); // ceil(5/2) + 8 = 3 + 8
			expect(calculateStunCM(char)).toBe(10);     // ceil(3/2) + 8 = 2 + 8
		});

		it('Initiative matches expected values', () => {
			const char = get(character)!;
			expect(calculateInitiative(char)).toBe(9);  // REA 5 + INT 4
			expect(calculateInitiativeDice(char)).toBe(1); // No augmentation
		});

		it('With Wired Reflexes 2 has correct Initiative', () => {
			const wr2: GameCyberware = {
				name: 'Wired Reflexes 2',
				category: 'Bodyware',
				ess: 3.0,
				capacity: '0',
				avail: '12R',
				cost: 32000,
				source: 'SR4',
				page: 339,
				rating: 2,
				minRating: 2,
				maxRating: 2
			};
			addCyberware(wr2, 'Standard');

			const char = get(character)!;
			const calcs = calculateAll(char);

			expect(calcs.initiative).toBe(11);      // 9 + 2 bonus
			expect(calcs.initiativeDice).toBe(3);   // 1 + 2 passes
			expect(get(currentEssence)).toBeCloseTo(3.0); // 6 - 3
		});

		it('Movement rates are correct', () => {
			const char = get(character)!;
			expect(calculateWalkSpeed(char)).toBe(10); // AGI 5 × 2
			expect(calculateRunSpeed(char)).toBe(20);  // AGI 5 × 4
		});

		it('Limits are calculated correctly', () => {
			const char = get(character)!;
			// Physical: ceil((4×2 + 5 + 5) / 3) = ceil(18/3) = 6
			expect(calculatePhysicalLimit(char)).toBe(6);
			// Mental: ceil((3×2 + 4 + 3) / 3) = ceil(13/3) = 5
			expect(calculateMentalLimit(char)).toBe(5);
			// Social: ceil((2×2 + 3 + 6) / 3) = ceil(13/3) = 5
			expect(calculateSocialLimit(char)).toBe(5);
		});
	});

	/**
	 * Verify a complete Hermetic Mage build matches expected values
	 */
	describe('Hermetic Mage Archetype', () => {
		beforeEach(() => {
			startNewCharacter('test-user', 'bp');
			setMetatype(SR4_METATYPES, 'Elf');
			addQuality('Magician', 'Positive', 15);
			initializeMagic('Hermetic');
			setAttribute('bod', 2);
			setAttribute('agi', 3);
			setAttribute('rea', 3);
			setAttribute('str', 2);
			setAttribute('cha', 4);
			setAttribute('int', 5);
			setAttribute('log', 6);
			setAttribute('wil', 5);
			setAttribute('edg', 2);
		});

		it('Has full Essence (no cyberware)', () => {
			expect(get(currentEssence)).toBe(6.0);
		});

		it('Drain Resistance is WIL + LOG', () => {
			const char = get(character)!;
			expect(calculateDrainResist(char)).toBe(11); // WIL 5 + LOG 6
		});

		it('Mental Limit is high', () => {
			const char = get(character)!;
			// Mental: ceil((6×2 + 5 + 5) / 3) = ceil(22/3) = 8
			expect(calculateMentalLimit(char)).toBe(8);
		});

		it('Social Limit benefits from Elf CHA bonus', () => {
			const char = get(character)!;
			// Social: ceil((4×2 + 5 + 6) / 3) = ceil(19/3) = 7
			expect(calculateSocialLimit(char)).toBe(7);
		});
	});
});

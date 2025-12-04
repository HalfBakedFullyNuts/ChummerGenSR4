/**
 * Calculations Engine Tests
 * =========================
 * Comprehensive tests for SR4 character calculations.
 */

import { describe, it, expect } from 'vitest';
import {
	getAttributeTotal,
	getMagicTotal,
	getResonanceTotal,
	getEssence,
	calculatePhysicalCM,
	calculateStunCM,
	calculateOverflow,
	getWoundModifier,
	calculateInitiative,
	calculateInitiativeDice,
	calculateInitiativeBonus,
	calculateWalkSpeed,
	calculateRunSpeed,
	calculateSprintBonus,
	calculatePhysicalLimit,
	calculateMentalLimit,
	calculateSocialLimit,
	calculateDicePool,
	calculateComposure,
	calculateJudgeIntentions,
	calculateMemory,
	calculateLiftCarry,
	calculateDefense,
	calculateArmorBallistic,
	calculateArmorImpact,
	calculateArmorEncumbrance,
	calculateArmorTotals,
	calculateDrainResist,
	calculateAstralInitiative,
	calculateAstralInitiativeDice,
	calculateFadingResist,
	calculateMatrixInitiative,
	calculateMatrixInitiativeDice,
	calculateAll
} from '../calculations';
import type { Character } from '$types';
import { createEmptyCharacter } from '$lib/types/character';

/** Create a test character with specified attributes. */
function createTestCharacter(overrides: Partial<{
	bod: number;
	agi: number;
	rea: number;
	str: number;
	cha: number;
	int: number;
	log: number;
	wil: number;
	edg: number;
	mag: number | null;
	res: number | null;
	ess: number;
}>): Character {
	const char = createEmptyCharacter('test-id', 'test-user');
	return {
		...char,
		attributes: {
			bod: { base: overrides.bod ?? 3, bonus: 0, karma: 0 },
			agi: { base: overrides.agi ?? 3, bonus: 0, karma: 0 },
			rea: { base: overrides.rea ?? 3, bonus: 0, karma: 0 },
			str: { base: overrides.str ?? 3, bonus: 0, karma: 0 },
			cha: { base: overrides.cha ?? 3, bonus: 0, karma: 0 },
			int: { base: overrides.int ?? 3, bonus: 0, karma: 0 },
			log: { base: overrides.log ?? 3, bonus: 0, karma: 0 },
			wil: { base: overrides.wil ?? 3, bonus: 0, karma: 0 },
			edg: { base: overrides.edg ?? 2, bonus: 0, karma: 0 },
			mag: overrides.mag !== undefined
				? (overrides.mag !== null ? { base: overrides.mag, bonus: 0, karma: 0 } : null)
				: null,
			res: overrides.res !== undefined
				? (overrides.res !== null ? { base: overrides.res, bonus: 0, karma: 0 } : null)
				: null,
			ess: overrides.ess ?? 6.0
		}
	};
}

describe('Calculations Engine', () => {
	describe('Attribute Helpers', () => {
		it('should get total attribute value', () => {
			const char = createTestCharacter({ bod: 4, agi: 5 });
			expect(getAttributeTotal(char, 'bod')).toBe(4);
			expect(getAttributeTotal(char, 'agi')).toBe(5);
		});

		it('should include bonus in attribute total', () => {
			const char = createTestCharacter({ str: 4 });
			char.attributes.str.bonus = 2;
			expect(getAttributeTotal(char, 'str')).toBe(6);
		});

		it('should return 0 for Magic if mundane', () => {
			const char = createTestCharacter({ mag: null });
			expect(getMagicTotal(char)).toBe(0);
		});

		it('should get Magic total for awakened', () => {
			const char = createTestCharacter({ mag: 5 });
			expect(getMagicTotal(char)).toBe(5);
		});

		it('should return 0 for Resonance if not technomancer', () => {
			const char = createTestCharacter({ res: null });
			expect(getResonanceTotal(char)).toBe(0);
		});

		it('should get Resonance total for technomancer', () => {
			const char = createTestCharacter({ res: 4 });
			expect(getResonanceTotal(char)).toBe(4);
		});

		it('should get current Essence', () => {
			const char = createTestCharacter({ ess: 5.5 });
			expect(getEssence(char)).toBe(5.5);
		});
	});

	describe('Condition Monitors', () => {
		it('should calculate Physical CM as ceil(BOD/2) + 8', () => {
			expect(calculatePhysicalCM(createTestCharacter({ bod: 3 }))).toBe(10); // ceil(3/2) + 8 = 2 + 8
			expect(calculatePhysicalCM(createTestCharacter({ bod: 4 }))).toBe(10); // ceil(4/2) + 8 = 2 + 8
			expect(calculatePhysicalCM(createTestCharacter({ bod: 5 }))).toBe(11); // ceil(5/2) + 8 = 3 + 8
			expect(calculatePhysicalCM(createTestCharacter({ bod: 6 }))).toBe(11); // ceil(6/2) + 8 = 3 + 8
		});

		it('should calculate Stun CM as ceil(WIL/2) + 8', () => {
			expect(calculateStunCM(createTestCharacter({ wil: 3 }))).toBe(10);
			expect(calculateStunCM(createTestCharacter({ wil: 6 }))).toBe(11);
		});

		it('should calculate Overflow as BOD', () => {
			const char = createTestCharacter({ bod: 5 });
			expect(calculateOverflow(char)).toBe(5);
		});

		it('should calculate wound modifier from damage', () => {
			const char = createTestCharacter({ bod: 4, wil: 4 });
			// No damage - use toBeCloseTo to handle -0 vs 0
			expect(getWoundModifier(char)).toBeCloseTo(0);

			// 3 physical damage = -1
			char.condition.physicalCurrent = 3;
			expect(getWoundModifier(char)).toBe(-1);

			// 6 physical + 3 stun = -3
			char.condition.physicalCurrent = 6;
			char.condition.stunCurrent = 3;
			expect(getWoundModifier(char)).toBe(-3);
		});
	});

	describe('Initiative', () => {
		it('should calculate base Initiative as REA + INT', () => {
			const char = createTestCharacter({ rea: 4, int: 5 });
			expect(calculateInitiative(char)).toBe(9);
		});

		it('should calculate Initiative Dice as 1 by default', () => {
			const char = createTestCharacter({});
			expect(calculateInitiativeDice(char)).toBe(1);
		});

		it('should add Initiative Dice for Wired Reflexes', () => {
			const char = createTestCharacter({});
			char.equipment.cyberware = [
				{ id: 'wr2', name: 'Wired Reflexes 2', rating: 2, essenceCost: 3, grade: 'Standard', equipped: true, notes: '' }
			];
			expect(calculateInitiativeDice(char)).toBe(3); // rating + 1
		});

		it('should add Initiative Dice for Synaptic Booster', () => {
			const char = createTestCharacter({});
			char.equipment.cyberware = [
				{ id: 'sb1', name: 'Synaptic Booster', rating: 1, essenceCost: 0.5, grade: 'Standard', equipped: true, notes: '' }
			];
			expect(calculateInitiativeDice(char)).toBe(2);
		});

		it('should add Initiative Dice for Improved Reflexes power', () => {
			const char = createTestCharacter({ mag: 4 });
			char.magic = {
				tradition: 'Hermetic',
				mentor: null,
				initiateGrade: 0,
				powerPoints: 4,
				powerPointsUsed: 2,
				spells: [],
				powers: [{ id: 'ir2', name: 'Improved Reflexes', points: 2, level: 2, notes: '' }],
				spirits: [],
				foci: [],
				metamagics: []
			};
			expect(calculateInitiativeDice(char)).toBe(3);
		});

		it('should calculate Initiative bonus from augmentations', () => {
			const char = createTestCharacter({});
			char.equipment.cyberware = [
				{ id: 'wr2', name: 'Wired Reflexes 2', rating: 2, essenceCost: 3, grade: 'Standard', equipped: true, notes: '' }
			];
			expect(calculateInitiativeBonus(char)).toBe(2);
		});
	});

	describe('Movement', () => {
		it('should calculate Walk speed as AGI * 2', () => {
			const char = createTestCharacter({ agi: 4 });
			expect(calculateWalkSpeed(char)).toBe(8);
		});

		it('should calculate Run speed as AGI * 4', () => {
			const char = createTestCharacter({ agi: 4 });
			expect(calculateRunSpeed(char)).toBe(16);
		});

		it('should give sprint bonus for Elf', () => {
			const char = createTestCharacter({});
			char.identity.metatype = 'Elf';
			expect(calculateSprintBonus(char)).toBe(1);
		});

		it('should give no sprint bonus for Human', () => {
			const char = createTestCharacter({});
			char.identity.metatype = 'Human';
			expect(calculateSprintBonus(char)).toBe(0);
		});
	});

	describe('Limits', () => {
		it('should calculate Physical Limit', () => {
			// Physical Limit = ceil((STR*2 + BOD + REA) / 3)
			const char = createTestCharacter({ str: 4, bod: 4, rea: 4 });
			// (4*2 + 4 + 4) / 3 = 16/3 = 5.33, ceil = 6
			expect(calculatePhysicalLimit(char)).toBe(6);
		});

		it('should calculate Mental Limit', () => {
			// Mental Limit = ceil((LOG*2 + INT + WIL) / 3)
			const char = createTestCharacter({ log: 5, int: 4, wil: 4 });
			// (5*2 + 4 + 4) / 3 = 18/3 = 6
			expect(calculateMentalLimit(char)).toBe(6);
		});

		it('should calculate Social Limit', () => {
			// Social Limit = ceil((CHA*2 + WIL + ESS) / 3)
			const char = createTestCharacter({ cha: 4, wil: 4, ess: 6 });
			// (4*2 + 4 + 6) / 3 = 18/3 = 6
			expect(calculateSocialLimit(char)).toBe(6);
		});

		it('should reduce Social Limit with low Essence', () => {
			const char = createTestCharacter({ cha: 4, wil: 4, ess: 3.5 });
			// (4*2 + 4 + 3) / 3 = 15/3 = 5
			expect(calculateSocialLimit(char)).toBe(5);
		});
	});

	describe('Dice Pools', () => {
		it('should calculate skill + attribute dice pool', () => {
			const char = createTestCharacter({ agi: 4 });
			char.skills = [
				{ id: 's1', name: 'Pistols', rating: 4, specialization: null, bonus: 0, group: 'Firearms' }
			];
			expect(calculateDicePool(char, 'Pistols', 'agi')).toBe(8);
		});

		it('should default when skill is missing', () => {
			const char = createTestCharacter({ agi: 4 });
			// Defaulting = attribute - 1
			expect(calculateDicePool(char, 'Pistols', 'agi')).toBe(3);
		});

		it('should include skill bonus in pool', () => {
			const char = createTestCharacter({ agi: 4 });
			char.skills = [
				{ id: 's1', name: 'Pistols', rating: 4, specialization: null, bonus: 2, group: 'Firearms' }
			];
			expect(calculateDicePool(char, 'Pistols', 'agi')).toBe(10);
		});

		it('should apply wound modifier to dice pool', () => {
			const char = createTestCharacter({ agi: 4 });
			char.skills = [
				{ id: 's1', name: 'Pistols', rating: 4, specialization: null, bonus: 0, group: 'Firearms' }
			];
			char.condition.physicalCurrent = 6; // -2 wound modifier
			expect(calculateDicePool(char, 'Pistols', 'agi')).toBe(6);
		});

		it('should calculate Composure as CHA + WIL', () => {
			const char = createTestCharacter({ cha: 4, wil: 5 });
			expect(calculateComposure(char)).toBe(9);
		});

		it('should calculate Judge Intentions as CHA + INT', () => {
			const char = createTestCharacter({ cha: 4, int: 5 });
			expect(calculateJudgeIntentions(char)).toBe(9);
		});

		it('should calculate Memory as LOG + WIL', () => {
			const char = createTestCharacter({ log: 4, wil: 5 });
			expect(calculateMemory(char)).toBe(9);
		});

		it('should calculate Lift/Carry as BOD + STR', () => {
			const char = createTestCharacter({ bod: 4, str: 5 });
			expect(calculateLiftCarry(char)).toBe(9);
		});
	});

	describe('Combat Values', () => {
		it('should calculate Defense as REA + INT', () => {
			const char = createTestCharacter({ rea: 4, int: 5 });
			expect(calculateDefense(char)).toBe(9);
		});

		it('should calculate armor ballistic from equipped armor', () => {
			const char = createTestCharacter({});
			char.equipment.armor = [
				{ id: 'a1', name: 'Armor Jacket', ballistic: 8, impact: 6, capacity: 8, equipped: true, modifications: [], notes: '' }
			];
			expect(calculateArmorBallistic(char)).toBe(8);
		});

		it('should stack armor with half secondary', () => {
			const char = createTestCharacter({});
			char.equipment.armor = [
				{ id: 'a1', name: 'Armor Jacket', ballistic: 8, impact: 6, capacity: 8, equipped: true, modifications: [], notes: '' },
				{ id: 'a2', name: 'Armor Vest', ballistic: 4, impact: 3, capacity: 4, equipped: true, modifications: [], notes: '' }
			];
			// 8 + floor(4/2) = 8 + 2 = 10
			expect(calculateArmorBallistic(char)).toBe(10);
		});

		it('should not count unequipped armor', () => {
			const char = createTestCharacter({});
			char.equipment.armor = [
				{ id: 'a1', name: 'Armor Jacket', ballistic: 8, impact: 6, capacity: 8, equipped: false, modifications: [], notes: '' }
			];
			expect(calculateArmorBallistic(char)).toBe(0);
		});

		it('should calculate armor encumbrance when exceeding BOD', () => {
			const char = createTestCharacter({ bod: 3 });
			char.equipment.armor = [
				{ id: 'a1', name: 'Heavy Armor', ballistic: 12, impact: 10, capacity: 12, equipped: true, modifications: [], notes: '' }
			];
			// Encumbrance = 12 - 3 = 9
			expect(calculateArmorEncumbrance(char)).toBe(9);
		});

		it('should have no encumbrance when armor <= BOD', () => {
			const char = createTestCharacter({ bod: 5 });
			char.equipment.armor = [
				{ id: 'a1', name: 'Armor Vest', ballistic: 4, impact: 3, capacity: 4, equipped: true, modifications: [], notes: '' }
			];
			expect(calculateArmorEncumbrance(char)).toBe(0);
		});

		it('should calculate all armor totals', () => {
			const char = createTestCharacter({ bod: 4 });
			char.equipment.armor = [
				{ id: 'a1', name: 'Armor Jacket', ballistic: 8, impact: 6, capacity: 8, equipped: true, modifications: [], notes: '' }
			];
			const totals = calculateArmorTotals(char);
			expect(totals.ballistic).toBe(8);
			expect(totals.impact).toBe(6);
			expect(totals.encumbrance).toBe(4); // 8 - 4
		});
	});

	describe('Magic Values', () => {
		it('should calculate Drain Resist for Hermetic as WIL + LOG', () => {
			const char = createTestCharacter({ wil: 4, log: 5, mag: 4 });
			char.magic = {
				tradition: 'Hermetic',
				mentor: null,
				initiateGrade: 0,
				powerPoints: 0,
				powerPointsUsed: 0,
				spells: [],
				powers: [],
				spirits: [],
				foci: [],
				metamagics: []
			};
			expect(calculateDrainResist(char)).toBe(9);
		});

		it('should calculate Drain Resist for Shamanic as WIL + CHA', () => {
			const char = createTestCharacter({ wil: 4, cha: 5, mag: 4 });
			char.magic = {
				tradition: 'Shamanic',
				mentor: null,
				initiateGrade: 0,
				powerPoints: 0,
				powerPointsUsed: 0,
				spells: [],
				powers: [],
				spirits: [],
				foci: [],
				metamagics: []
			};
			expect(calculateDrainResist(char)).toBe(9);
		});

		it('should return 0 Drain Resist for mundane', () => {
			const char = createTestCharacter({});
			expect(calculateDrainResist(char)).toBe(0);
		});

		it('should calculate Astral Initiative as INT * 2', () => {
			const char = createTestCharacter({ int: 5 });
			expect(calculateAstralInitiative(char)).toBe(10);
		});

		it('should return 2 Astral Initiative Dice', () => {
			expect(calculateAstralInitiativeDice()).toBe(2);
		});
	});

	describe('Matrix Values', () => {
		it('should calculate Fading Resist as RES + WIL', () => {
			const char = createTestCharacter({ wil: 4, res: 5 });
			char.resonance = {
				stream: 'Technoshaman',
				submersionGrade: 0,
				complexForms: [],
				sprites: [],
				echoes: []
			};
			expect(calculateFadingResist(char)).toBe(9);
		});

		it('should return 0 Fading Resist for non-technomancer', () => {
			const char = createTestCharacter({});
			expect(calculateFadingResist(char)).toBe(0);
		});

		it('should calculate Matrix Initiative as INT + RES', () => {
			const char = createTestCharacter({ int: 5, res: 4 });
			expect(calculateMatrixInitiative(char)).toBe(9);
		});

		it('should return 3 Matrix Initiative Dice', () => {
			expect(calculateMatrixInitiativeDice()).toBe(3);
		});
	});

	describe('calculateAll', () => {
		it('should calculate all derived values', () => {
			const char = createTestCharacter({
				bod: 4, agi: 4, rea: 4, str: 4,
				cha: 3, int: 4, log: 4, wil: 4,
				edg: 3, mag: null, res: null, ess: 6
			});

			const calcs = calculateAll(char);

			// Verify all properties exist and are numbers
			expect(calcs.physicalCM).toBe(10); // ceil(4/2) + 8
			expect(calcs.stunCM).toBe(10); // ceil(4/2) + 8
			expect(calcs.overflow).toBe(4);
			expect(calcs.initiative).toBeGreaterThanOrEqual(8); // REA + INT + bonus
			expect(calcs.initiativeDice).toBeGreaterThanOrEqual(1);
			expect(calcs.walkSpeed).toBe(8); // AGI * 2
			expect(calcs.runSpeed).toBe(16); // AGI * 4
			expect(calcs.defense).toBe(8); // REA + INT
			expect(calcs.composure).toBe(7); // CHA + WIL
			expect(calcs.judgeIntentions).toBe(7); // CHA + INT
			expect(calcs.memory).toBe(8); // LOG + WIL
			expect(calcs.liftCarry).toBe(8); // BOD + STR
		});
	});
});

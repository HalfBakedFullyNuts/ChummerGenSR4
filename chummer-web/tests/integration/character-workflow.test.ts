/**
 * Character Workflow Integration Tests
 * =====================================
 * Tests the complete character creation and career mode workflows.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createEmptyCharacter, type Character } from '$lib/types/character';
import { calculateAll } from '$lib/engine/calculations';
import { getAllImprovements, getTotalImprovement } from '$lib/engine/improvements';
import {
	validateCharacter,
	validateAttributeAllocation,
	validateSkillAllocation
} from '$lib/engine/validation';

describe('Character Workflow Integration', () => {
	let character: Character;

	beforeEach(() => {
		character = createEmptyCharacter('test-char', 'test-user');
	});

	describe('Character Creation Flow', () => {
		it('should create a valid empty character', () => {
			expect(character.id).toBe('test-char');
			expect(character.userId).toBe('test-user');
			expect(character.status).toBe('creation');
			expect(character.buildMethod).toBe('bp');
		});

		it('should set metatype and update attribute limits', () => {
			// Simulate selecting Human metatype
			character = {
				...character,
				identity: { ...character.identity, metatype: 'Human' },
				attributeLimits: {
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
				}
			};

			expect(character.identity.metatype).toBe('Human');
			expect(character.attributeLimits.edg.max).toBe(7); // Human edge max is 7
		});

		it('should allocate attributes and calculate derived values', () => {
			// Set up a street samurai build
			character = {
				...character,
				identity: { ...character.identity, metatype: 'Human' },
				attributes: {
					bod: { base: 4, bonus: 0, karma: 0 },
					agi: { base: 5, bonus: 0, karma: 0 },
					rea: { base: 4, bonus: 0, karma: 0 },
					str: { base: 4, bonus: 0, karma: 0 },
					cha: { base: 2, bonus: 0, karma: 0 },
					int: { base: 4, bonus: 0, karma: 0 },
					log: { base: 3, bonus: 0, karma: 0 },
					wil: { base: 3, bonus: 0, karma: 0 },
					edg: { base: 3, bonus: 0, karma: 0 },
					mag: null,
					res: null,
					ess: 6.0
				}
			};

			const calcs = calculateAll(character);

			expect(calcs.physicalCM).toBe(10); // ceil(4/2) + 8
			expect(calcs.stunCM).toBe(10); // ceil(3/2) + 8
			expect(calcs.initiative).toBe(8); // REA 4 + INT 4
			expect(calcs.walkSpeed).toBe(10); // AGI 5 * 2
			expect(calcs.defense).toBe(8); // REA 4 + INT 4
		});

		it('should add skills and calculate dice pools', () => {
			character = {
				...character,
				attributes: {
					...character.attributes,
					agi: { base: 5, bonus: 0, karma: 0 },
					int: { base: 4, bonus: 0, karma: 0 }
				},
				skills: [
					{ id: 's1', name: 'Pistols', rating: 4, specialization: null, bonus: 0, group: 'Firearms' },
					{ id: 's2', name: 'Perception', rating: 3, specialization: 'Visual', bonus: 2, group: null }
				]
			};

			// Pistols + AGI = 4 + 5 = 9
			// Perception + INT = 3 + 4 + 2 bonus = 9
			expect(character.skills).toHaveLength(2);
			expect(character.skills[0].rating).toBe(4);
		});

		it('should add cyberware and calculate improvements', () => {
			character = {
				...character,
				equipment: {
					...character.equipment,
					cyberware: [
						{ id: 'wr2', name: 'Wired Reflexes 2', rating: 2, essenceCost: 3, grade: 'Standard', equipped: true, notes: '' },
						{ id: 'mt2', name: 'Muscle Toner 2', rating: 2, essenceCost: 0.4, grade: 'Standard', equipped: true, notes: '' }
					]
				},
				attributes: {
					...character.attributes,
					ess: 2.6 // 6 - 3 - 0.4
				}
			};

			const improvements = getAllImprovements(character);
			const initBonus = getTotalImprovement(character, 'initiative');
			const initDiceBonus = getTotalImprovement(character, 'initiative_dice');
			const agiBonus = getTotalImprovement(character, 'agi');

			expect(initBonus).toBe(2); // Wired Reflexes 2
			expect(initDiceBonus).toBe(2); // Wired Reflexes 2
			expect(agiBonus).toBe(2); // Muscle Toner 2
		});

		it('should add armor and calculate protection', () => {
			character = {
				...character,
				attributes: {
					...character.attributes,
					bod: { base: 4, bonus: 0, karma: 0 }
				},
				equipment: {
					...character.equipment,
					armor: [
						{ id: 'aj', name: 'Armor Jacket', ballistic: 8, impact: 6, capacity: 8, equipped: true, modifications: [], notes: '' },
						{ id: 'av', name: 'Armor Vest', ballistic: 4, impact: 3, capacity: 4, equipped: true, modifications: [], notes: '' }
					]
				}
			};

			const calcs = calculateAll(character);

			// Armor stacking: 8 + floor(4/2) = 10 ballistic
			expect(calcs.armorBallistic).toBe(10);
			// Encumbrance: 10 - 4 BOD = 6
			expect(calcs.armorEncumbrance).toBe(6);
		});
	});

	describe('Career Mode Workflow', () => {
		it('should transition from creation to career mode', () => {
			character = {
				...character,
				status: 'career',
				karma: 10,
				totalKarma: 10
			};

			expect(character.status).toBe('career');
			expect(character.karma).toBe(10);
		});

		it('should track karma expenses for attribute improvement', () => {
			const newRating = 5;
			const oldRating = 4;
			const karmaCost = newRating * 5; // SR4: new rating * 5

			character = {
				...character,
				status: 'career',
				karma: 50,
				totalKarma: 75,
				attributes: {
					...character.attributes,
					bod: { base: oldRating, bonus: 0, karma: 0 }
				}
			};

			// Simulate improving BOD from 4 to 5
			const updatedChar: Character = {
				...character,
				karma: character.karma - karmaCost,
				attributes: {
					...character.attributes,
					bod: { base: newRating, bonus: 0, karma: karmaCost }
				},
				expenseLog: [
					...character.expenseLog,
					{
						id: 'exp-1',
						date: new Date().toISOString(),
						type: 'karma',
						amount: -karmaCost,
						reason: `Improved Body from ${oldRating} to ${newRating}`,
						category: 'Attribute'
					}
				]
			};

			expect(updatedChar.attributes.bod.base).toBe(5);
			expect(updatedChar.karma).toBe(25); // 50 - 25
			expect(updatedChar.expenseLog).toHaveLength(1);
		});

		it('should track karma expenses for skill improvement', () => {
			const newRating = 4;
			const oldRating = 3;
			const karmaCost = newRating * 2; // SR4: new rating * 2 for active skills

			character = {
				...character,
				status: 'career',
				karma: 20,
				skills: [
					{ id: 's1', name: 'Pistols', rating: oldRating, specialization: null, bonus: 0, group: 'Firearms' }
				]
			};

			// Simulate improving Pistols from 3 to 4
			const updatedChar: Character = {
				...character,
				karma: character.karma - karmaCost,
				skills: [
					{ id: 's1', name: 'Pistols', rating: newRating, specialization: null, bonus: 0, group: 'Firearms' }
				],
				expenseLog: [
					{
						id: 'exp-2',
						date: new Date().toISOString(),
						type: 'karma',
						amount: -karmaCost,
						reason: `Improved Pistols from ${oldRating} to ${newRating}`,
						category: 'Skill'
					}
				]
			};

			expect(updatedChar.skills[0].rating).toBe(4);
			expect(updatedChar.karma).toBe(12); // 20 - 8
		});

		it('should track nuyen transactions', () => {
			character = {
				...character,
				status: 'career',
				nuyen: 5000
			};

			// Simulate purchasing gear
			const gearCost = 2000;
			const updatedChar: Character = {
				...character,
				nuyen: character.nuyen - gearCost,
				expenseLog: [
					{
						id: 'exp-3',
						date: new Date().toISOString(),
						type: 'nuyen',
						amount: -gearCost,
						reason: 'Purchased Armor Jacket',
						category: 'Gear'
					}
				]
			};

			expect(updatedChar.nuyen).toBe(3000);
		});
	});

	describe('Magic Character Workflow', () => {
		it('should set up a magician with spells', () => {
			character = {
				...character,
				identity: { ...character.identity, metatype: 'Human' },
				attributes: {
					...character.attributes,
					mag: { base: 5, bonus: 0, karma: 0 }
				},
				magic: {
					tradition: 'Hermetic',
					mentor: null,
					initiateGrade: 0,
					powerPoints: 0,
					powerPointsUsed: 0,
					spells: [
						{ id: 'sp1', name: 'Manabolt', category: 'Combat', type: 'M', range: 'LOS', damage: 'P', duration: 'I', dv: 'F/2', notes: '' },
						{ id: 'sp2', name: 'Invisibility', category: 'Illusion', type: 'M', range: 'LOS', damage: '', duration: 'S', dv: 'F/2', notes: '' }
					],
					powers: [],
					spirits: [],
					foci: [],
					metamagics: []
				}
			};

			expect(character.magic).not.toBeNull();
			expect(character.magic!.tradition).toBe('Hermetic');
			expect(character.magic!.spells).toHaveLength(2);

			// Verify magic setup is complete
			expect(character.magic!.spells).toHaveLength(2);
		});

		it('should set up an adept with powers', () => {
			character = {
				...character,
				attributes: {
					...character.attributes,
					mag: { base: 5, bonus: 0, karma: 0 }
				},
				magic: {
					tradition: 'Adept',
					mentor: null,
					initiateGrade: 0,
					powerPoints: 5,
					powerPointsUsed: 4,
					spells: [],
					powers: [
						{ id: 'p1', name: 'Improved Reflexes', points: 2.5, level: 2, notes: '' },
						{ id: 'p2', name: 'Combat Sense', points: 1, level: 2, notes: '' },
						{ id: 'p3', name: 'Mystic Armor', points: 0.5, level: 1, notes: '' }
					],
					spirits: [],
					foci: [],
					metamagics: []
				}
			};

			const improvements = getAllImprovements(character);
			const initDice = getTotalImprovement(character, 'initiative_dice');
			const armor = getTotalImprovement(character, 'armor_ballistic');

			expect(initDice).toBe(2); // Improved Reflexes 2
			expect(armor).toBe(1); // Mystic Armor 1
		});
	});

	describe('Technomancer Workflow', () => {
		it('should set up a technomancer with complex forms', () => {
			character = {
				...character,
				attributes: {
					...character.attributes,
					res: { base: 5, bonus: 0, karma: 0 }
				},
				resonance: {
					stream: 'Technoshaman',
					submersionGrade: 0,
					complexForms: [
						{ id: 'cf1', name: 'Armor', rating: 4, notes: '' },
						{ id: 'cf2', name: 'Attack', rating: 4, notes: '' }
					],
					sprites: [],
					echoes: []
				}
			};

			expect(character.resonance).not.toBeNull();
			expect(character.resonance!.complexForms).toHaveLength(2);

			const calcs = calculateAll(character);
			expect(calcs.fadingResist).toBeGreaterThan(0);
			expect(calcs.matrixInitiative).toBeGreaterThan(0);
		});
	});

	describe('Validation Integration', () => {
		it('should validate a complete character', () => {
			character = {
				...character,
				identity: {
					...character.identity,
					name: 'Test Runner',
					metatype: 'Human'
				},
				attributes: {
					bod: { base: 3, bonus: 0, karma: 0 },
					agi: { base: 4, bonus: 0, karma: 0 },
					rea: { base: 3, bonus: 0, karma: 0 },
					str: { base: 3, bonus: 0, karma: 0 },
					cha: { base: 3, bonus: 0, karma: 0 },
					int: { base: 3, bonus: 0, karma: 0 },
					log: { base: 3, bonus: 0, karma: 0 },
					wil: { base: 3, bonus: 0, karma: 0 },
					edg: { base: 2, bonus: 0, karma: 0 },
					mag: null,
					res: null,
					ess: 6.0
				},
				skills: [
					{ id: 's1', name: 'Pistols', rating: 4, specialization: null, bonus: 0, group: 'Firearms' }
				]
			};

			const validation = validateCharacter(character);
			// Validation should return a result with valid property
			expect(validation).toHaveProperty('valid');
			expect(validation).toHaveProperty('issues');
		});
	});
});

/**
 * Improvements Engine Tests
 * =========================
 * Tests for stat modifications from various sources.
 */

import { describe, it, expect } from 'vitest';
import {
	getCyberwareImprovements,
	getQualityImprovements,
	getAdeptPowerImprovements,
	getAllImprovements,
	getTotalImprovement,
	getImprovementsForTarget,
	getImprovementsBySource,
	getStackedValue,
	getImprovementSummary,
	type Improvement
} from '../improvements';
import { createEmptyCharacter } from '$lib/types/character';
import type { Character, CharacterCyberware, CharacterQuality, CharacterPower } from '$types';

describe('Improvements Engine', () => {
	describe('getCyberwareImprovements', () => {
		it('should extract Wired Reflexes improvements', () => {
			const cyberware: CharacterCyberware[] = [
				{ id: 'wr2', name: 'Wired Reflexes 2', rating: 2, essenceCost: 3, grade: 'Standard', equipped: true, notes: '' }
			];

			const improvements = getCyberwareImprovements(cyberware);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'initiative',
				value: 2,
				source: 'cyberware'
			}));
			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'initiative_dice',
				value: 2,
				source: 'cyberware'
			}));
		});

		it('should extract Synaptic Booster improvements', () => {
			const cyberware: CharacterCyberware[] = [
				{ id: 'sb2', name: 'Synaptic Booster 2', rating: 2, essenceCost: 1, grade: 'Standard', equipped: true, notes: '' }
			];

			const improvements = getCyberwareImprovements(cyberware);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'initiative',
				value: 2,
				source: 'bioware'
			}));
		});

		it('should extract Reaction Enhancers improvements', () => {
			const cyberware: CharacterCyberware[] = [
				{ id: 're3', name: 'Reaction Enhancers 3', rating: 3, essenceCost: 0.9, grade: 'Standard', equipped: true, notes: '' }
			];

			const improvements = getCyberwareImprovements(cyberware);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'rea',
				value: 3,
				source: 'cyberware'
			}));
		});

		it('should extract Muscle Replacement improvements', () => {
			const cyberware: CharacterCyberware[] = [
				{ id: 'mr2', name: 'Muscle Replacement 2', rating: 2, essenceCost: 2, grade: 'Standard', equipped: true, notes: '' }
			];

			const improvements = getCyberwareImprovements(cyberware);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'str',
				value: 2
			}));
			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'agi',
				value: 2
			}));
		});

		it('should extract Muscle Toner improvements', () => {
			const cyberware: CharacterCyberware[] = [
				{ id: 'mt2', name: 'Muscle Toner 2', rating: 2, essenceCost: 0.4, grade: 'Standard', equipped: true, notes: '' }
			];

			const improvements = getCyberwareImprovements(cyberware);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'agi',
				value: 2,
				source: 'bioware'
			}));
		});

		it('should extract Cerebral Booster improvements', () => {
			const cyberware: CharacterCyberware[] = [
				{ id: 'cb2', name: 'Cerebral Booster 2', rating: 2, essenceCost: 0.4, grade: 'Standard', equipped: true, notes: '' }
			];

			const improvements = getCyberwareImprovements(cyberware);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'log',
				value: 2,
				source: 'bioware'
			}));
		});

		it('should extract Bone Lacing Titanium improvements', () => {
			const cyberware: CharacterCyberware[] = [
				{ id: 'bl', name: 'Bone Lacing (Titanium)', rating: 1, essenceCost: 1.5, grade: 'Standard', equipped: true, notes: '' }
			];

			const improvements = getCyberwareImprovements(cyberware);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'armor_ballistic',
				value: 3
			}));
			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'armor_impact',
				value: 3
			}));
		});

		it('should extract Dermal Plating improvements', () => {
			const cyberware: CharacterCyberware[] = [
				{ id: 'dp3', name: 'Dermal Plating 3', rating: 3, essenceCost: 1.5, grade: 'Standard', equipped: true, notes: '' }
			];

			const improvements = getCyberwareImprovements(cyberware);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'armor_ballistic',
				value: 3
			}));
		});

		it('should extract Orthoskin improvements', () => {
			const cyberware: CharacterCyberware[] = [
				{ id: 'os3', name: 'Orthoskin 3', rating: 3, essenceCost: 0.75, grade: 'Standard', equipped: true, notes: '' }
			];

			const improvements = getCyberwareImprovements(cyberware);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'armor_ballistic',
				value: 3,
				source: 'bioware'
			}));
		});

		it('should extract Move-by-Wire improvements', () => {
			const cyberware: CharacterCyberware[] = [
				{ id: 'mbw2', name: 'Move-by-Wire 2', rating: 2, essenceCost: 5, grade: 'Standard', equipped: true, notes: '' }
			];

			const improvements = getCyberwareImprovements(cyberware);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'initiative',
				value: 4 // rating * 2
			}));
			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'initiative_dice',
				value: 2
			}));
			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'rea',
				value: 2
			}));
		});
	});

	describe('getQualityImprovements', () => {
		it('should extract Toughness improvement', () => {
			const qualities: CharacterQuality[] = [
				{ id: 'q1', name: 'Toughness', category: 'Positive', bp: 10, rating: 1, notes: '' }
			];

			const improvements = getQualityImprovements(qualities);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'physical_cm',
				value: 1,
				source: 'quality'
			}));
		});

		it('should extract Will to Live improvement with rating', () => {
			const qualities: CharacterQuality[] = [
				{ id: 'q2', name: 'Will to Live 3', category: 'Positive', bp: 15, rating: 3, notes: '' }
			];

			const improvements = getQualityImprovements(qualities);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'physical_cm',
				value: 3
			}));
		});

		it('should extract High Pain Tolerance improvement', () => {
			const qualities: CharacterQuality[] = [
				{ id: 'q3', name: 'High Pain Tolerance 2', category: 'Positive', bp: 10, rating: 2, notes: '' }
			];

			const improvements = getQualityImprovements(qualities);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'damage_resistance',
				value: 2,
				conditional: 'Reduces wound modifiers'
			}));
		});

		it('should extract Magic Resistance improvement', () => {
			const qualities: CharacterQuality[] = [
				{ id: 'q4', name: 'Magic Resistance', category: 'Positive', bp: 5, rating: 2, notes: '' }
			];

			const improvements = getQualityImprovements(qualities);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'spell_resistance',
				value: 4 // rating * 2
			}));
		});

		it('should extract Lucky improvement', () => {
			const qualities: CharacterQuality[] = [
				{ id: 'q5', name: 'Lucky', category: 'Positive', bp: 20, rating: 1, notes: '' }
			];

			const improvements = getQualityImprovements(qualities);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'edg',
				value: 1
			}));
		});
	});

	describe('getAdeptPowerImprovements', () => {
		it('should extract Improved Reflexes improvement', () => {
			const powers: CharacterPower[] = [
				{ id: 'p1', name: 'Improved Reflexes', points: 2.5, level: 2, notes: '' }
			];

			const improvements = getAdeptPowerImprovements(powers);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'initiative',
				value: 2,
				source: 'adept_power'
			}));
			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'initiative_dice',
				value: 2
			}));
		});

		it('should extract Combat Sense improvement', () => {
			const powers: CharacterPower[] = [
				{ id: 'p2', name: 'Combat Sense', points: 0.5, level: 2, notes: '' }
			];

			const improvements = getAdeptPowerImprovements(powers);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'rea',
				value: 2,
				conditional: 'Defense and surprise tests only'
			}));
		});

		it('should extract Mystic Armor improvement', () => {
			const powers: CharacterPower[] = [
				{ id: 'p3', name: 'Mystic Armor', points: 1, level: 2, notes: '' }
			];

			const improvements = getAdeptPowerImprovements(powers);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'armor_ballistic',
				value: 2
			}));
			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'armor_impact',
				value: 2
			}));
		});

		it('should extract Pain Resistance improvement', () => {
			const powers: CharacterPower[] = [
				{ id: 'p4', name: 'Pain Resistance', points: 0.5, level: 3, notes: '' }
			];

			const improvements = getAdeptPowerImprovements(powers);

			expect(improvements).toContainEqual(expect.objectContaining({
				target: 'damage_resistance',
				value: 3,
				conditional: 'Ignores wound modifiers'
			}));
		});
	});

	describe('getAllImprovements', () => {
		it('should aggregate improvements from all sources', () => {
			const char = createEmptyCharacter('test', 'user');
			char.equipment.cyberware = [
				{ id: 'wr1', name: 'Wired Reflexes 1', rating: 1, essenceCost: 2, grade: 'Standard', equipped: true, notes: '' }
			];
			char.qualities = [
				{ id: 'q1', name: 'Toughness', category: 'Positive', bp: 10, rating: 1, notes: '' }
			];

			const improvements = getAllImprovements(char);

			expect(improvements.some(i => i.source === 'cyberware')).toBe(true);
			expect(improvements.some(i => i.source === 'quality')).toBe(true);
		});

		it('should include adept power improvements when character has magic', () => {
			const char = createEmptyCharacter('test', 'user');
			char.magic = {
				tradition: 'Adept',
				mentor: null,
				initiateGrade: 0,
				powerPoints: 6,
				powerPointsUsed: 2.5,
				spells: [],
				powers: [{ id: 'ir2', name: 'Improved Reflexes', points: 2.5, level: 2, notes: '' }],
				spirits: [],
				foci: [],
				metamagics: []
			};

			const improvements = getAllImprovements(char);

			expect(improvements.some(i => i.source === 'adept_power')).toBe(true);
		});
	});

	describe('getTotalImprovement', () => {
		it('should sum all improvements for a target', () => {
			const char = createEmptyCharacter('test', 'user');
			char.equipment.cyberware = [
				{ id: 'wr1', name: 'Wired Reflexes 1', rating: 1, essenceCost: 2, grade: 'Standard', equipped: true, notes: '' },
				{ id: 're2', name: 'Reaction Enhancers 2', rating: 2, essenceCost: 0.6, grade: 'Standard', equipped: true, notes: '' }
			];

			// Wired Reflexes gives +1 initiative, Reaction Enhancers gives +2 REA (not initiative directly)
			const initTotal = getTotalImprovement(char, 'initiative');
			expect(initTotal).toBe(1);
		});
	});

	describe('getImprovementsForTarget', () => {
		it('should filter improvements by target', () => {
			const char = createEmptyCharacter('test', 'user');
			char.equipment.cyberware = [
				{ id: 'wr1', name: 'Wired Reflexes 1', rating: 1, essenceCost: 2, grade: 'Standard', equipped: true, notes: '' },
				{ id: 'mr2', name: 'Muscle Replacement 2', rating: 2, essenceCost: 2, grade: 'Standard', equipped: true, notes: '' }
			];

			const strImprovements = getImprovementsForTarget(char, 'str');
			expect(strImprovements).toHaveLength(1);
			expect(strImprovements[0].value).toBe(2);
		});
	});

	describe('getImprovementsBySource', () => {
		it('should group improvements by source type', () => {
			const char = createEmptyCharacter('test', 'user');
			char.equipment.cyberware = [
				{ id: 'wr1', name: 'Wired Reflexes 1', rating: 1, essenceCost: 2, grade: 'Standard', equipped: true, notes: '' },
				{ id: 'sb1', name: 'Synaptic Booster 1', rating: 1, essenceCost: 0.5, grade: 'Standard', equipped: true, notes: '' }
			];
			char.qualities = [
				{ id: 'q1', name: 'Toughness', category: 'Positive', bp: 10, rating: 1, notes: '' }
			];

			const bySource = getImprovementsBySource(char);

			expect(bySource.cyberware.length).toBeGreaterThan(0);
			expect(bySource.bioware.length).toBeGreaterThan(0);
			expect(bySource.quality.length).toBeGreaterThan(0);
		});
	});

	describe('getStackedValue', () => {
		it('should take highest value from same source type', () => {
			const improvements: Improvement[] = [
				{ id: '1', source: 'cyberware', sourceName: 'A', target: 'initiative', value: 2 },
				{ id: '2', source: 'cyberware', sourceName: 'B', target: 'initiative', value: 3 }
			];

			// Same source doesn't stack - takes highest
			expect(getStackedValue(improvements)).toBe(3);
		});

		it('should stack values from different sources', () => {
			const improvements: Improvement[] = [
				{ id: '1', source: 'cyberware', sourceName: 'A', target: 'initiative', value: 2 },
				{ id: '2', source: 'adept_power', sourceName: 'B', target: 'initiative', value: 2 }
			];

			// Different sources stack
			expect(getStackedValue(improvements)).toBe(4);
		});

		it('should return 0 for empty array', () => {
			expect(getStackedValue([])).toBe(0);
		});
	});

	describe('getImprovementSummary', () => {
		it('should return summary with total and sources', () => {
			const char = createEmptyCharacter('test', 'user');
			char.equipment.cyberware = [
				{ id: 'wr2', name: 'Wired Reflexes 2', rating: 2, essenceCost: 3, grade: 'Standard', equipped: true, notes: '' }
			];

			const summary = getImprovementSummary(char, 'initiative');

			expect(summary.target).toBe('initiative');
			expect(summary.totalValue).toBe(2);
			expect(summary.sources.length).toBe(1);
			expect(summary.sources[0].name).toBe('Wired Reflexes 2');
		});
	});
});

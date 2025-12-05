/**
 * Skill Type Tests
 * =================
 * Validates skill BP cost calculations match desktop Chummer.
 */

import { describe, it, expect } from 'vitest';
import {
	calculateSkillBpCost,
	MAX_SKILL_RATING_CREATION,
	MAX_SKILL_GROUP_RATING
} from '../skills';

describe('Skill BP Costs', () => {
	/**
	 * SR4 Core Rulebook p.84 - Skill Costs
	 * Active Skills: 4 BP per rating point
	 * Knowledge Skills: 2 BP per rating point (or use free points)
	 * Specialization: +2 BP (handled separately)
	 */
	describe('Active Skills', () => {
		it('should cost 4 BP per rating point for active skills', () => {
			expect(calculateSkillBpCost(1, true)).toBe(4);
			expect(calculateSkillBpCost(2, true)).toBe(8);
			expect(calculateSkillBpCost(3, true)).toBe(12);
			expect(calculateSkillBpCost(4, true)).toBe(16);
			expect(calculateSkillBpCost(5, true)).toBe(20);
			expect(calculateSkillBpCost(6, true)).toBe(24);
		});

		it('should return 0 for rating 0', () => {
			expect(calculateSkillBpCost(0, true)).toBe(0);
		});
	});

	describe('Knowledge Skills', () => {
		it('should cost 2 BP per rating point for knowledge skills', () => {
			expect(calculateSkillBpCost(1, false)).toBe(2);
			expect(calculateSkillBpCost(2, false)).toBe(4);
			expect(calculateSkillBpCost(3, false)).toBe(6);
			expect(calculateSkillBpCost(6, false)).toBe(12);
		});
	});

	describe('Specialization Costs', () => {
		/**
		 * Note: Specializations cost +2 BP and are handled separately.
		 * This is a documentation test to ensure we track this rule.
		 */
		it('should document that specializations cost 2 BP', () => {
			const SPECIALIZATION_BP_COST = 2;
			expect(SPECIALIZATION_BP_COST).toBe(2);
		});
	});
});

describe('Skill Maximums', () => {
	/**
	 * SR4 Core Rulebook p.84
	 * Maximum skill rating during creation: 6
	 * Maximum skill group rating: 4
	 */
	it('should have max skill rating of 6 during creation', () => {
		expect(MAX_SKILL_RATING_CREATION).toBe(6);
	});

	it('should have max skill group rating of 4', () => {
		expect(MAX_SKILL_GROUP_RATING).toBe(4);
	});
});

describe('Skill Group BP Costs', () => {
	/**
	 * SR4 Core Rulebook p.84 - Skill Group Costs
	 * Skill Groups: 10 BP per rating point
	 */
	it('should document that skill groups cost 10 BP per rating', () => {
		// This is a documentation test - the actual implementation
		// is in the character store. Skill groups cost 10 BP per rating.
		const SKILL_GROUP_BP_PER_RATING = 10;

		expect(SKILL_GROUP_BP_PER_RATING * 1).toBe(10);
		expect(SKILL_GROUP_BP_PER_RATING * 2).toBe(20);
		expect(SKILL_GROUP_BP_PER_RATING * 3).toBe(30);
		expect(SKILL_GROUP_BP_PER_RATING * 4).toBe(40); // Max during creation
	});
});

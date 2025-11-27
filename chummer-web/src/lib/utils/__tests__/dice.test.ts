import { describe, it, expect, vi } from 'vitest';
import {
	rollD6,
	rollDicePool,
	calculateHitProbability,
	expectedHits,
	glitchProbability,
	type RollResult
} from '../dice';

describe('Dice Rolling Utilities', () => {
	describe('rollD6', () => {
		it('should return values between 1 and 6', () => {
			// Test with deterministic RNG
			expect(rollD6(() => 0)).toBe(1);
			expect(rollD6(() => 0.99)).toBe(6);
			expect(rollD6(() => 0.5)).toBe(4);
		});

		it('should use Math.random by default', () => {
			const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);
			const result = rollD6();
			expect(result).toBe(4);
			expect(mockRandom).toHaveBeenCalled();
			mockRandom.mockRestore();
		});
	});

	describe('rollDicePool', () => {
		it('should roll the specified number of dice', () => {
			const result = rollDicePool({
				pool: 5,
				rng: () => 0.5 // All 4s
			});

			expect(result.dice).toHaveLength(5);
			expect(result.pool).toBe(5);
		});

		it('should count hits correctly with default threshold', () => {
			// Create RNG that returns specific values
			const values = [0.1, 0.3, 0.6, 0.8, 0.99]; // 1, 2, 4, 5, 6
			let index = 0;
			const rng = () => values[index++];

			const result = rollDicePool({ pool: 5, rng });

			expect(result.dice).toEqual([1, 2, 4, 5, 6]);
			expect(result.hits).toBe(2); // 5 and 6 are hits
		});

		it('should count ones correctly', () => {
			// All 1s
			const result = rollDicePool({
				pool: 4,
				rng: () => 0 // All 1s
			});

			expect(result.ones).toBe(4);
		});

		it('should detect glitch when more than half are 1s', () => {
			// 3 out of 5 are 1s
			const values = [0, 0, 0, 0.5, 0.5]; // 1, 1, 1, 4, 4
			let index = 0;

			const result = rollDicePool({
				pool: 5,
				rng: () => values[index++]
			});

			expect(result.isGlitch).toBe(true);
			expect(result.isCriticalGlitch).toBe(true); // No hits
		});

		it('should detect critical glitch with zero hits', () => {
			// All 1s = glitch + no hits = critical
			const result = rollDicePool({
				pool: 3,
				rng: () => 0
			});

			expect(result.isGlitch).toBe(true);
			expect(result.isCriticalGlitch).toBe(true);
			expect(result.hits).toBe(0);
		});

		it('should not be critical glitch if there are hits', () => {
			// 2 ones, 1 six out of 3
			const values = [0, 0, 0.99]; // 1, 1, 6
			let index = 0;

			const result = rollDicePool({
				pool: 3,
				rng: () => values[index++]
			});

			expect(result.isGlitch).toBe(true);
			expect(result.isCriticalGlitch).toBe(false);
			expect(result.hits).toBe(1);
		});

		it('should support custom threshold', () => {
			// With threshold 4, 4+ is a hit
			const values = [0.4, 0.5, 0.6]; // 3, 4, 4
			let index = 0;

			const result = rollDicePool({
				pool: 3,
				threshold: 4,
				rng: () => values[index++]
			});

			expect(result.hits).toBe(2); // Two 4s
		});

		it('should explode 6s when using Edge', () => {
			// 6, 6, 3 -> explode to 6, 6, 3, (explosion)4, (explosion)2
			const values = [0.99, 0.99, 0.4, 0.5, 0.2]; // 6, 6, 3, 4, 2
			let index = 0;

			const result = rollDicePool({
				pool: 3,
				edge: true,
				rng: () => values[index++]
			});

			expect(result.dice).toEqual([6, 6, 3, 4, 2]);
			expect(result.dice).toHaveLength(5); // 3 initial + 2 explosions
			expect(result.hits).toBe(2); // Two 6s
			expect(result.edgeUsed).toBe(true);
		});

		it('should chain explosions with Edge', () => {
			// 6 -> explodes to 6 -> explodes to 3
			const values = [0.99, 0.99, 0.4]; // 6, 6, 3
			let index = 0;

			const result = rollDicePool({
				pool: 1,
				edge: true,
				rng: () => values[index++]
			});

			expect(result.dice).toEqual([6, 6, 3]);
			expect(result.hits).toBe(2);
		});

		it('should not explode when Edge is not used', () => {
			const result = rollDicePool({
				pool: 3,
				edge: false,
				rng: () => 0.99 // All 6s
			});

			expect(result.dice).toHaveLength(3); // No explosions
		});

		it('should handle empty pool', () => {
			const result = rollDicePool({
				pool: 0,
				rng: () => 0.5
			});

			expect(result.dice).toHaveLength(0);
			expect(result.hits).toBe(0);
			expect(result.isGlitch).toBe(false); // 0 > 0/2 is false
		});

		it('should handle single die', () => {
			const result = rollDicePool({
				pool: 1,
				rng: () => 0.99
			});

			expect(result.dice).toHaveLength(1);
			expect(result.hits).toBe(1);
		});

		it('should handle large pools', () => {
			const result = rollDicePool({
				pool: 20,
				rng: () => 0.7 // All 5s
			});

			expect(result.dice).toHaveLength(20);
			expect(result.hits).toBe(20);
		});
	});

	describe('calculateHitProbability', () => {
		it('should calculate probability for 0 hits correctly', () => {
			// With 1 die, P(0 hits) = 4/6 = 0.667
			const prob = calculateHitProbability(1, 0);
			expect(prob).toBeCloseTo(1, 5); // 100% chance of at least 0 hits
		});

		it('should calculate probability for 1 hit on 1 die', () => {
			// P(hit) = 2/6 = 0.333
			const prob = calculateHitProbability(1, 1);
			expect(prob).toBeCloseTo(1 / 3, 5);
		});

		it('should calculate probability for 2 hits on 2 dice', () => {
			// P(both hit) = (1/3)^2 = 1/9
			const prob = calculateHitProbability(2, 2);
			expect(prob).toBeCloseTo(1 / 9, 5);
		});

		it('should return 0 for impossible results', () => {
			// Can't get 5 hits on 3 dice
			const prob = calculateHitProbability(3, 5);
			expect(prob).toBe(0);
		});

		it('should use custom threshold', () => {
			// With threshold 6, only 6s are hits (1/6 prob)
			const prob = calculateHitProbability(1, 1, 6);
			expect(prob).toBeCloseTo(1 / 6, 5);
		});

		it('should calculate reasonable probabilities for typical pools', () => {
			// 6 dice, need at least 2 hits
			const prob = calculateHitProbability(6, 2);
			expect(prob).toBeGreaterThan(0.5);
			expect(prob).toBeLessThan(1);
		});
	});

	describe('expectedHits', () => {
		it('should calculate expected hits correctly', () => {
			// 6 dice * (2/6) = 2 expected hits
			expect(expectedHits(6)).toBe(2);
		});

		it('should handle different pool sizes', () => {
			expect(expectedHits(1)).toBeCloseTo(1 / 3, 5);
			expect(expectedHits(3)).toBe(1);
			expect(expectedHits(12)).toBe(4);
		});

		it('should use custom threshold', () => {
			// Threshold 4: 4+ is hit (3/6 = 0.5)
			expect(expectedHits(6, 4)).toBe(3);
		});
	});

	describe('glitchProbability', () => {
		it('should calculate glitch probability for small pools', () => {
			// 1 die: need more than 0.5 ones, so 1 one glitches (1/6)
			const prob1 = glitchProbability(1);
			expect(prob1).toBeCloseTo(1 / 6, 5);

			// 2 dice: need more than 1 one (2 ones), (1/6)^2
			const prob2 = glitchProbability(2);
			expect(prob2).toBeCloseTo(1 / 36, 5);
		});

		it('should return low probability for larger pools', () => {
			// 6 dice: need 4+ ones (very unlikely)
			const prob = glitchProbability(6);
			expect(prob).toBeLessThan(0.02);
			expect(prob).toBeGreaterThan(0);
		});

		it('should be higher for smaller pools', () => {
			const prob2 = glitchProbability(2);
			const prob6 = glitchProbability(6);
			expect(prob2).toBeGreaterThan(prob6);
		});
	});

	describe('Edge cases and integration', () => {
		it('should produce consistent results with seeded RNG', () => {
			const fixedRng = () => 0.6;
			const result1 = rollDicePool({ pool: 5, rng: fixedRng });
			const result2 = rollDicePool({ pool: 5, rng: fixedRng });

			expect(result1.dice).toEqual(result2.dice);
			expect(result1.hits).toBe(result2.hits);
		});

		it('should handle maximum threshold (only 6s hit)', () => {
			const values = [0.7, 0.8, 0.99]; // 5, 5, 6
			let index = 0;

			const result = rollDicePool({
				pool: 3,
				threshold: 6,
				rng: () => values[index++]
			});

			expect(result.hits).toBe(1); // Only the 6
		});

		it('should handle minimum threshold (everything hits)', () => {
			const result = rollDicePool({
				pool: 4,
				threshold: 1,
				rng: () => 0.5
			});

			expect(result.hits).toBe(4); // Everything is a hit
		});
	});
});

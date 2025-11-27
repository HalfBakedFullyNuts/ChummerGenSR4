import { describe, it, expect, vi } from 'vitest';
import {
	rollD6,
	rollDicePool,
	calculateHitProbability,
	expectedHits,
	glitchProbability,
	rollInitiative,
	getInitiativeForPass,
	getWeaponSkill,
	parseDamage,
	parseAP,
	parseFireModes,
	calculateRecoilPenalty,
	calculateArmorStacking,
	calculateCombatModifier,
	canSuppressiveFire,
	getSuppressiveFireInfo,
	calculateMatrixPool,
	calculateMatrixDefense,
	calculateBiofeedbackDamage,
	calculateThreadingPool,
	calculateFadingValue,
	calculateFadingResistance,
	isFadingPhysical,
	calculateCompilingSpritePool,
	calculateSpriteResistance,
	calculateSpriteTasks,
	calculateRegisteringSpritePool,
	calculateVehicleControlPool,
	calculateGunneryPool,
	calculateRammingDamage,
	calculateCrashDamage,
	calculateVehicleModifiers,
	calculateAutopilotPool,
	getVCRBonus,
	calculateSensorTargetingPool,
	WEAPON_SKILL_MAP,
	FIRING_MODES,
	COMBAT_MODIFIERS,
	CALLED_SHOTS,
	MATRIX_ACTIONS,
	SPRITE_TYPES,
	VEHICLE_TESTS,
	VEHICLE_SPEED_MODIFIERS,
	VEHICLE_TERRAIN_MODIFIERS,
	ASTRAL_ACTIONS,
	MAGIC_TRADITIONS,
	calculateAstralAttackPool,
	calculateAstralDefensePool,
	calculateAssensingPool,
	calculateSummoningPool,
	calculateSpiritResistance,
	calculateSpiritServices,
	calculateSummoningDrain,
	calculateDrainResistancePool,
	isDrainPhysical,
	calculateCounterspellingPool,
	calculateSpellDefenseDice,
	calculateBanishingPool,
	calculateBindingPool,
	calculateSpellcastingPool,
	calculateSpellResistancePool,
	calculateSpellDrain,
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

	describe('rollInitiative', () => {
		it('should roll initiative with base value', () => {
			const result = rollInitiative({
				base: 10,
				rng: () => 0.5 // Roll a 4
			});

			expect(result.base).toBe(10);
			expect(result.dice).toEqual([4]);
			expect(result.total).toBe(14);
		});

		it('should roll multiple initiative dice', () => {
			const values = [0.5, 0.7]; // 4, 5
			let index = 0;

			const result = rollInitiative({
				base: 8,
				dice: 2,
				rng: () => values[index++]
			});

			expect(result.dice).toHaveLength(2);
			expect(result.dice).toEqual([4, 5]);
			expect(result.total).toBe(17); // 8 + 4 + 5
		});

		it('should calculate initiative passes correctly', () => {
			// 1-10 = 1 pass
			expect(rollInitiative({ base: 5, rng: () => 0.1 }).passes).toBe(1); // 5 + 1 = 6

			// 11-20 = 2 passes
			expect(rollInitiative({ base: 8, rng: () => 0.5 }).passes).toBe(2); // 8 + 4 = 12

			// 21-30 = 3 passes
			expect(rollInitiative({ base: 15, rng: () => 0.99 }).passes).toBe(3); // 15 + 6 = 21

			// 31+ = 4 passes (maximum)
			const values = [0.99, 0.99, 0.99]; // All 6s
			let index = 0;
			const result = rollInitiative({
				base: 20,
				dice: 3,
				rng: () => values[index++]
			});
			expect(result.total).toBe(38); // 20 + 18
			expect(result.passes).toBe(4); // Max 4 passes
		});

		it('should default to 1 initiative die', () => {
			const result = rollInitiative({
				base: 10,
				rng: () => 0.5
			});

			expect(result.dice).toHaveLength(1);
		});

		it('should handle minimum initiative', () => {
			const result = rollInitiative({
				base: 1,
				rng: () => 0 // Roll a 1
			});

			expect(result.total).toBe(2);
			expect(result.passes).toBe(1);
		});
	});

	describe('getInitiativeForPass', () => {
		it('should return full initiative for pass 1', () => {
			expect(getInitiativeForPass(15, 1)).toBe(15);
			expect(getInitiativeForPass(25, 1)).toBe(25);
		});

		it('should reduce initiative by 10 for each subsequent pass', () => {
			expect(getInitiativeForPass(25, 2)).toBe(15); // 25 - 10
			expect(getInitiativeForPass(25, 3)).toBe(5);  // 25 - 20
			expect(getInitiativeForPass(35, 4)).toBe(5);  // 35 - 30
		});

		it('should return 0 when initiative is too low for pass', () => {
			expect(getInitiativeForPass(10, 2)).toBe(0); // 10 - 10 = 0
			expect(getInitiativeForPass(15, 3)).toBe(0); // 15 - 20 = -5, clamped to 0
			expect(getInitiativeForPass(5, 2)).toBe(0);
		});

		it('should never return negative values', () => {
			expect(getInitiativeForPass(1, 4)).toBe(0);
			expect(getInitiativeForPass(0, 1)).toBe(0);
		});
	});

	describe('getWeaponSkill', () => {
		it('should map melee weapon categories to correct skills', () => {
			expect(getWeaponSkill('Blades')).toBe('Blades');
			expect(getWeaponSkill('Clubs')).toBe('Clubs');
			expect(getWeaponSkill('Unarmed')).toBe('Unarmed Combat');
		});

		it('should map pistol categories to Pistols skill', () => {
			expect(getWeaponSkill('Holdouts')).toBe('Pistols');
			expect(getWeaponSkill('Light Pistols')).toBe('Pistols');
			expect(getWeaponSkill('Heavy Pistols')).toBe('Pistols');
			expect(getWeaponSkill('Machine Pistols')).toBe('Pistols');
		});

		it('should map automatic weapons to Automatics skill', () => {
			expect(getWeaponSkill('Submachine Guns')).toBe('Automatics');
			expect(getWeaponSkill('Assault Rifles')).toBe('Automatics');
		});

		it('should map longarms to Longarms skill', () => {
			expect(getWeaponSkill('Shotguns')).toBe('Longarms');
			expect(getWeaponSkill('Sniper Rifles')).toBe('Longarms');
			expect(getWeaponSkill('Sports Rifles')).toBe('Longarms');
		});

		it('should map heavy weapons correctly', () => {
			expect(getWeaponSkill('Light Machine Guns')).toBe('Heavy Weapons');
			expect(getWeaponSkill('Assault Cannons')).toBe('Heavy Weapons');
			expect(getWeaponSkill('Missile Launchers')).toBe('Heavy Weapons');
		});

		it('should return category as fallback for unknown categories', () => {
			expect(getWeaponSkill('Unknown Category')).toBe('Unknown Category');
		});
	});

	describe('parseDamage', () => {
		it('should parse simple physical damage', () => {
			const result = parseDamage('6P');
			expect(result.value).toBe(6);
			expect(result.type).toBe('P');
		});

		it('should parse simple stun damage', () => {
			const result = parseDamage('5S');
			expect(result.value).toBe(5);
			expect(result.type).toBe('S');
		});

		it('should parse damage with special modifiers', () => {
			const result = parseDamage('8P(f)');
			expect(result.value).toBe(8);
			expect(result.type).toBe('P');
			expect(result.special).toContain('(f)');
		});

		it('should handle strength-based damage', () => {
			// "(STR+2)P" style
			const result = parseDamage('(STR+2)P');
			expect(result.type).toBe('P');
		});

		it('should default to physical for ambiguous strings', () => {
			const result = parseDamage('10');
			expect(result.value).toBe(10);
			expect(result.type).toBe('P');
		});
	});

	describe('parseAP', () => {
		it('should parse negative AP values', () => {
			expect(parseAP('-2')).toBe(-2);
			expect(parseAP('-5')).toBe(-5);
		});

		it('should return 0 for no AP', () => {
			expect(parseAP('-')).toBe(0);
			expect(parseAP('—')).toBe(0);
			expect(parseAP('')).toBe(0);
		});

		it('should handle positive AP', () => {
			expect(parseAP('+1')).toBe(1);
		});

		it('should return 0 for non-numeric AP', () => {
			expect(parseAP('-half')).toBe(0);
		});
	});

	describe('parseFireModes', () => {
		it('should parse single mode', () => {
			const modes = parseFireModes('SA');
			expect(modes).toHaveLength(1);
			expect(modes[0].code).toBe('SA');
		});

		it('should parse multiple modes', () => {
			const modes = parseFireModes('SA/BF/FA');
			expect(modes).toHaveLength(3);
			expect(modes.map(m => m.code)).toEqual(['SA', 'BF', 'FA']);
		});

		it('should return empty for invalid modes', () => {
			expect(parseFireModes('')).toHaveLength(0);
			expect(parseFireModes('-')).toHaveLength(0);
		});

		it('should have correct ammo consumption', () => {
			expect(FIRING_MODES.SA.ammoPerShot).toBe(1);
			expect(FIRING_MODES.BF.ammoPerShot).toBe(3);
			expect(FIRING_MODES.FA.ammoPerShot).toBe(6);
		});

		it('should have correct damage modifiers', () => {
			expect(FIRING_MODES.SA.damageMod).toBe(0);
			expect(FIRING_MODES.BF.damageMod).toBe(2);
			expect(FIRING_MODES.FA.damageMod).toBe(5);
		});
	});

	describe('calculateRecoilPenalty', () => {
		it('should return 0 for single shot with any RC', () => {
			// SS has 0 recoil, so no penalty
			expect(calculateRecoilPenalty(0, 0, FIRING_MODES.SS)).toBe(0);
		});

		it('should return 0 when recoil is compensated', () => {
			// SA has 1 recoil, RC 2 covers it (2 + 1 = 3 free shots)
			// Cumulative = 0 + 1 = 1, RC + 1 = 3, uncompensated = max(0, 1-3) = 0
			expect(calculateRecoilPenalty(2, 0, FIRING_MODES.SA)).toBe(0);
		});

		it('should return penalty when recoil exceeds compensation', () => {
			// RC 0, no previous shots, firing SA (1 recoil)
			// Cumulative = 0 + 1 = 1, RC + 1 = 1, uncompensated = max(0, 1-1) = 0
			expect(calculateRecoilPenalty(0, 0, FIRING_MODES.SA)).toBe(0);

			// RC 0, 1 previous shot, firing SA (1 more recoil)
			// Cumulative = 1 + 1 = 2, RC + 1 = 1, uncompensated = max(0, 2-1) = 1
			expect(calculateRecoilPenalty(0, 1, FIRING_MODES.SA)).toBe(-1);
		});

		it('should handle burst fire recoil', () => {
			// RC 2, no previous shots, firing BF (3 recoil)
			// Cumulative = 0 + 3 = 3, RC + 1 = 3, uncompensated = max(0, 3-3) = 0
			expect(calculateRecoilPenalty(2, 0, FIRING_MODES.BF)).toBe(0);

			// RC 0, no previous shots, firing BF (3 recoil)
			// Cumulative = 0 + 3 = 3, RC + 1 = 1, uncompensated = max(0, 3-1) = 2
			expect(calculateRecoilPenalty(0, 0, FIRING_MODES.BF)).toBe(-2);
		});
	});
});

describe('Armor Stacking', () => {
	describe('calculateArmorStacking', () => {
		it('should return zeros for no armor', () => {
			const result = calculateArmorStacking([], 5);
			expect(result.ballistic).toBe(0);
			expect(result.impact).toBe(0);
			expect(result.encumbrancePenalty).toBe(0);
			expect(result.hasArmor).toBe(false);
		});

		it('should return zeros for no equipped armor', () => {
			const armor = [
				{ name: 'Jacket', ballistic: 8, impact: 6, equipped: false }
			];
			const result = calculateArmorStacking(armor, 5);
			expect(result.ballistic).toBe(0);
			expect(result.impact).toBe(0);
			expect(result.hasArmor).toBe(false);
		});

		it('should use single armor values directly', () => {
			const armor = [
				{ name: 'Armor Jacket', ballistic: 8, impact: 6, equipped: true }
			];
			const result = calculateArmorStacking(armor, 5);
			expect(result.ballistic).toBe(8);
			expect(result.impact).toBe(6);
			expect(result.hasArmor).toBe(true);
		});

		it('should stack multiple armors (highest + half of others)', () => {
			// Jacket (8/6) + Vest (6/4)
			// Ballistic: 8 + 3 = 11
			// Impact: 6 + 2 = 8
			const armor = [
				{ name: 'Armor Jacket', ballistic: 8, impact: 6, equipped: true },
				{ name: 'Armor Vest', ballistic: 6, impact: 4, equipped: true }
			];
			const result = calculateArmorStacking(armor, 5);
			expect(result.ballistic).toBe(11); // 8 + floor(6/2)
			expect(result.impact).toBe(8); // 6 + floor(4/2)
		});

		it('should stack three armors correctly', () => {
			// Jacket (8/6) + Vest (6/4) + Helmet (2/2)
			// Ballistic: 8 + 3 + 1 = 12
			// Impact: 6 + 2 + 1 = 9
			const armor = [
				{ name: 'Armor Jacket', ballistic: 8, impact: 6, equipped: true },
				{ name: 'Armor Vest', ballistic: 6, impact: 4, equipped: true },
				{ name: 'Helmet', ballistic: 2, impact: 2, equipped: true }
			];
			const result = calculateArmorStacking(armor, 5);
			expect(result.ballistic).toBe(12); // 8 + 3 + 1
			expect(result.impact).toBe(9); // 6 + 2 + 1
		});

		it('should calculate encumbrance penalty when armor exceeds Body', () => {
			const armor = [
				{ name: 'Armor Jacket', ballistic: 8, impact: 6, equipped: true }
			];
			// Body 5, armor 8 = -3 penalty
			const result = calculateArmorStacking(armor, 5);
			expect(result.encumbrancePenalty).toBe(-3);
		});

		it('should have no encumbrance when armor equals Body', () => {
			const armor = [
				{ name: 'Armor Jacket', ballistic: 5, impact: 4, equipped: true }
			];
			// Body 5, armor 5 = no penalty
			const result = calculateArmorStacking(armor, 5);
			expect(result.encumbrancePenalty).toBe(0);
		});

		it('should have no encumbrance when armor is below Body', () => {
			const armor = [
				{ name: 'Light Armor', ballistic: 3, impact: 2, equipped: true }
			];
			// Body 5, armor 3 = no penalty
			const result = calculateArmorStacking(armor, 5);
			expect(result.encumbrancePenalty).toBe(0);
		});

		it('should only count equipped armor', () => {
			const armor = [
				{ name: 'Armor Jacket', ballistic: 8, impact: 6, equipped: true },
				{ name: 'Full Body Armor', ballistic: 14, impact: 10, equipped: false } // not equipped
			];
			const result = calculateArmorStacking(armor, 5);
			expect(result.ballistic).toBe(8);
			expect(result.impact).toBe(6);
		});

		it('should round down secondary armor contributions', () => {
			// Jacket (8/6) + Vest (5/3)
			// Ballistic: 8 + floor(5/2) = 8 + 2 = 10
			// Impact: 6 + floor(3/2) = 6 + 1 = 7
			const armor = [
				{ name: 'Armor Jacket', ballistic: 8, impact: 6, equipped: true },
				{ name: 'Armor Vest', ballistic: 5, impact: 3, equipped: true }
			];
			const result = calculateArmorStacking(armor, 10);
			expect(result.ballistic).toBe(10);
			expect(result.impact).toBe(7);
		});
	});
});

describe('Combat Modifiers', () => {
	describe('COMBAT_MODIFIERS', () => {
		it('should have visibility modifiers', () => {
			expect(COMBAT_MODIFIERS.light_rain.modifier).toBe(-1);
			expect(COMBAT_MODIFIERS.moderate_rain.modifier).toBe(-3);
			expect(COMBAT_MODIFIERS.heavy_rain.modifier).toBe(-6);
			expect(COMBAT_MODIFIERS.blind_fire.modifier).toBe(-6);
		});

		it('should have range modifiers', () => {
			expect(COMBAT_MODIFIERS.short_range.modifier).toBe(0);
			expect(COMBAT_MODIFIERS.medium_range.modifier).toBe(-1);
			expect(COMBAT_MODIFIERS.long_range.modifier).toBe(-3);
			expect(COMBAT_MODIFIERS.extreme_range.modifier).toBe(-6);
		});

		it('should have cover modifiers', () => {
			expect(COMBAT_MODIFIERS.partial_cover.modifier).toBe(-2);
			expect(COMBAT_MODIFIERS.good_cover.modifier).toBe(-4);
		});

		it('should have position modifiers', () => {
			expect(COMBAT_MODIFIERS.attacker_running.modifier).toBe(-2);
			expect(COMBAT_MODIFIERS.superior_position.modifier).toBe(2);
			expect(COMBAT_MODIFIERS.touch_attack.modifier).toBe(2);
		});
	});

	describe('CALLED_SHOTS', () => {
		it('should have standard called shots', () => {
			expect(CALLED_SHOTS.vitals.modifier).toBe(-4);
			expect(CALLED_SHOTS.head.modifier).toBe(-4);
			expect(CALLED_SHOTS.weak_point.modifier).toBe(-6);
			expect(CALLED_SHOTS.called_shot_simple.modifier).toBe(-2);
		});

		it('should have melee-specific called shots', () => {
			expect(CALLED_SHOTS.disarm.requiresMelee).toBe(true);
			expect(CALLED_SHOTS.knock_down.requiresMelee).toBe(true);
		});

		it('should have ranged-specific called shots', () => {
			expect(CALLED_SHOTS.shooting_hand.requiresRanged).toBe(true);
			expect(CALLED_SHOTS.engine_block.requiresRanged).toBe(true);
		});
	});

	describe('calculateCombatModifier', () => {
		it('should return 0 for no modifiers', () => {
			expect(calculateCombatModifier([])).toBe(0);
		});

		it('should sum multiple modifiers', () => {
			// medium range (-1) + partial cover (-2) = -3
			expect(calculateCombatModifier(['medium_range', 'partial_cover'])).toBe(-3);
		});

		it('should handle mixed positive and negative', () => {
			// superior position (+2) + attacker running (-2) = 0
			expect(calculateCombatModifier(['superior_position', 'attacker_running'])).toBe(0);
		});

		it('should include called shot modifier', () => {
			// medium range (-1) + vitals (-4) = -5
			expect(calculateCombatModifier(['medium_range'], 'vitals')).toBe(-5);
		});

		it('should ignore invalid modifiers', () => {
			expect(calculateCombatModifier(['invalid_modifier', 'medium_range'])).toBe(-1);
		});
	});
});

describe('Suppressive Fire', () => {
	describe('canSuppressiveFire', () => {
		it('should allow with FA mode and enough ammo', () => {
			const modes = [FIRING_MODES.SA, FIRING_MODES.FA];
			expect(canSuppressiveFire(modes, 20)).toBe(true);
			expect(canSuppressiveFire(modes, 30)).toBe(true);
		});

		it('should allow with BF mode and enough ammo', () => {
			const modes = [FIRING_MODES.SA, FIRING_MODES.BF];
			expect(canSuppressiveFire(modes, 20)).toBe(true);
		});

		it('should not allow with insufficient ammo', () => {
			const modes = [FIRING_MODES.SA, FIRING_MODES.FA];
			expect(canSuppressiveFire(modes, 19)).toBe(false);
		});

		it('should not allow with only SS/SA modes', () => {
			const modes = [FIRING_MODES.SS, FIRING_MODES.SA];
			expect(canSuppressiveFire(modes, 100)).toBe(false);
		});

		it('should not allow with no modes', () => {
			expect(canSuppressiveFire([], 50)).toBe(false);
		});
	});

	describe('getSuppressiveFireInfo', () => {
		it('should return suppressive fire details', () => {
			const info = getSuppressiveFireInfo('6P');
			expect(info.damage).toBe('6P');
			expect(info.threshold).toBe(3);
			expect(info.description).toContain('REA + EDGE');
			expect(info.description).toContain('6P');
		});

		it('should handle stun damage', () => {
			const info = getSuppressiveFireInfo('8S');
			expect(info.description).toContain('8S');
		});
	});
});

describe('Matrix / Hacking', () => {
	describe('MATRIX_ACTIONS', () => {
		it('should have hacking actions with correct skills', () => {
			expect(MATRIX_ACTIONS.hack_on_the_fly.skill).toBe('Hacking');
			expect(MATRIX_ACTIONS.hack_on_the_fly.attribute).toBe('log');
			expect(MATRIX_ACTIONS.hack_on_the_fly.opposed).toBe(true);
		});

		it('should have cybercombat actions', () => {
			expect(MATRIX_ACTIONS.brute_force.skill).toBe('Cybercombat');
			expect(MATRIX_ACTIONS.crash_program.skill).toBe('Cybercombat');
		});

		it('should have electronic warfare actions', () => {
			expect(MATRIX_ACTIONS.decrypt.skill).toBe('Electronic Warfare');
			expect(MATRIX_ACTIONS.intercept_traffic.skill).toBe('Electronic Warfare');
		});

		it('should have computer actions', () => {
			expect(MATRIX_ACTIONS.edit.skill).toBe('Computer');
			expect(MATRIX_ACTIONS.matrix_perception.skill).toBe('Computer');
		});

		it('should specify opposing pools for opposed tests', () => {
			expect(MATRIX_ACTIONS.hack_on_the_fly.opposedBy).toBe('Firewall + Analyze');
			expect(MATRIX_ACTIONS.brute_force.opposedBy).toBe('Firewall + Response');
			expect(MATRIX_ACTIONS.decrypt.opposedBy).toBe('Encryption rating x 2');
		});

		it('should have program associations', () => {
			expect(MATRIX_ACTIONS.hack_on_the_fly.program).toBe('Exploit');
			expect(MATRIX_ACTIONS.brute_force.program).toBe('Attack');
			expect(MATRIX_ACTIONS.decrypt.program).toBe('Decrypt');
		});
	});

	describe('calculateMatrixPool', () => {
		it('should calculate basic pool without program', () => {
			// Hacking 4 + LOG 5 = 9
			expect(calculateMatrixPool('hack_on_the_fly', 4, 5)).toBe(9);
		});

		it('should add program rating when action uses it', () => {
			// Hacking 4 + LOG 5 + Exploit 3 = 12
			expect(calculateMatrixPool('hack_on_the_fly', 4, 5, 3)).toBe(12);
		});

		it('should handle zero skill', () => {
			// 0 + LOG 5 + Exploit 3 = 8 (defaulting)
			expect(calculateMatrixPool('hack_on_the_fly', 0, 5, 3)).toBe(8);
		});

		it('should not go negative', () => {
			expect(calculateMatrixPool('edit', 0, 0, 0)).toBe(0);
		});

		it('should work for non-opposed actions', () => {
			// Browse: Data Search 3 + LOG 4 + Browse 2 = 9
			expect(calculateMatrixPool('browse', 3, 4, 2)).toBe(9);
		});
	});

	describe('calculateMatrixDefense', () => {
		it('should calculate basic firewall defense', () => {
			expect(calculateMatrixDefense(4)).toBe(4);
		});

		it('should add defense program', () => {
			// Firewall 4 + Analyze 3 = 7
			expect(calculateMatrixDefense(4, 3)).toBe(7);
		});

		it('should use higher of program or response', () => {
			// Firewall 4 + max(Analyze 2, Response 4) = 8
			expect(calculateMatrixDefense(4, 2, 4)).toBe(8);
			// Firewall 4 + max(Analyze 5, Response 3) = 9
			expect(calculateMatrixDefense(4, 5, 3)).toBe(9);
		});
	});

	describe('calculateBiofeedbackDamage', () => {
		it('should calculate stun damage for normal biofeedback', () => {
			const result = calculateBiofeedbackDamage(4, 2, false);
			expect(result.damage).toBe(2);
			expect(result.type).toBe('S');
		});

		it('should calculate physical damage for Black IC', () => {
			const result = calculateBiofeedbackDamage(5, 3, true);
			expect(result.damage).toBe(3);
			expect(result.type).toBe('P');
		});

		it('should not go negative on damage', () => {
			const result = calculateBiofeedbackDamage(2, -1, false);
			expect(result.damage).toBe(0);
		});
	});
});

describe('Technomancer Actions', () => {
	describe('SPRITE_TYPES', () => {
		it('should have all sprite types', () => {
			expect(SPRITE_TYPES.Courier).toBeDefined();
			expect(SPRITE_TYPES.Crack).toBeDefined();
			expect(SPRITE_TYPES.Data).toBeDefined();
			expect(SPRITE_TYPES.Fault).toBeDefined();
			expect(SPRITE_TYPES.Machine).toBeDefined();
			expect(SPRITE_TYPES.Paladin).toBeDefined();
			expect(SPRITE_TYPES.Probe).toBeDefined();
		});

		it('should have abilities for each type', () => {
			expect(SPRITE_TYPES.Crack.abilities.length).toBeGreaterThan(0);
			expect(SPRITE_TYPES.Crack.abilities[0].name).toBe('Suppress Alert');
		});
	});

	describe('calculateThreadingPool', () => {
		it('should calculate threading pool', () => {
			// Resonance 5 + Software 4 = 9
			expect(calculateThreadingPool(5, 4)).toBe(9);
		});

		it('should not go negative', () => {
			expect(calculateThreadingPool(0, 0)).toBe(0);
		});
	});

	describe('calculateFadingValue', () => {
		it('should calculate fading based on rating and resonance', () => {
			// Rating 4, Resonance 5 = (4*2) - 5 = 3
			expect(calculateFadingValue(4, 5)).toBe(3);
		});

		it('should have minimum fading of 1', () => {
			// Rating 2, Resonance 6 = (2*2) - 6 = -2, minimum 1
			expect(calculateFadingValue(2, 6)).toBe(1);
		});

		it('should handle high rating complex forms', () => {
			// Rating 6, Resonance 4 = (6*2) - 4 = 8
			expect(calculateFadingValue(6, 4)).toBe(8);
		});
	});

	describe('calculateFadingResistance', () => {
		it('should calculate fading resistance', () => {
			// Resonance 5 + Willpower 4 = 9
			expect(calculateFadingResistance(5, 4)).toBe(9);
		});

		it('should not go negative', () => {
			expect(calculateFadingResistance(0, 0)).toBe(0);
		});
	});

	describe('isFadingPhysical', () => {
		it('should be stun when fading <= resonance', () => {
			expect(isFadingPhysical(4, 5)).toBe(false); // 4 <= 5
			expect(isFadingPhysical(5, 5)).toBe(false); // 5 <= 5
		});

		it('should be physical when fading > resonance', () => {
			expect(isFadingPhysical(6, 5)).toBe(true); // 6 > 5
			expect(isFadingPhysical(10, 4)).toBe(true); // 10 > 4
		});
	});

	describe('calculateCompilingSpritePool', () => {
		it('should calculate compilation pool', () => {
			// Resonance 5 + Compiling 4 = 9
			expect(calculateCompilingSpritePool(5, 4)).toBe(9);
		});

		it('should not go negative', () => {
			expect(calculateCompilingSpritePool(0, 0)).toBe(0);
		});
	});

	describe('calculateSpriteResistance', () => {
		it('should calculate sprite resistance as rating x 2', () => {
			expect(calculateSpriteResistance(3)).toBe(6);
			expect(calculateSpriteResistance(5)).toBe(10);
		});

		it('should handle rating 1', () => {
			expect(calculateSpriteResistance(1)).toBe(2);
		});
	});

	describe('calculateSpriteTasks', () => {
		it('should calculate tasks as net hits', () => {
			// 5 hits vs 3 hits = 2 tasks
			expect(calculateSpriteTasks(5, 3)).toBe(2);
		});

		it('should return 0 when sprite wins', () => {
			expect(calculateSpriteTasks(3, 5)).toBe(0);
		});

		it('should return 0 on tie', () => {
			expect(calculateSpriteTasks(4, 4)).toBe(0);
		});
	});

	describe('calculateRegisteringSpritePool', () => {
		it('should calculate registration pool', () => {
			// Resonance 5 + Registering 3 = 8
			expect(calculateRegisteringSpritePool(5, 3)).toBe(8);
		});

		it('should not go negative', () => {
			expect(calculateRegisteringSpritePool(0, 0)).toBe(0);
		});
	});
});

describe('Vehicle Combat', () => {
	describe('VEHICLE_TESTS', () => {
		it('should have standard vehicle tests', () => {
			expect(VEHICLE_TESTS.control_vehicle).toBeDefined();
			expect(VEHICLE_TESTS.crash_test).toBeDefined();
			expect(VEHICLE_TESTS.ram).toBeDefined();
			expect(VEHICLE_TESTS.stunt).toBeDefined();
		});

		it('should have opposed chase tests', () => {
			expect(VEHICLE_TESTS.catch_up.opposed).toBe(true);
			expect(VEHICLE_TESTS.cut_off.opposed).toBe(true);
			expect(VEHICLE_TESTS.ram.opposed).toBe(true);
		});

		it('should have non-opposed control tests', () => {
			expect(VEHICLE_TESTS.control_vehicle.opposed).toBe(false);
			expect(VEHICLE_TESTS.crash_test.opposed).toBe(false);
		});
	});

	describe('VEHICLE_SPEED_MODIFIERS', () => {
		it('should have speed categories', () => {
			expect(VEHICLE_SPEED_MODIFIERS.idle.modifier).toBe(0);
			expect(VEHICLE_SPEED_MODIFIERS.cruising.modifier).toBe(-1);
			expect(VEHICLE_SPEED_MODIFIERS.fast.modifier).toBe(-3);
			expect(VEHICLE_SPEED_MODIFIERS.very_fast.modifier).toBe(-6);
		});
	});

	describe('VEHICLE_TERRAIN_MODIFIERS', () => {
		it('should have terrain modifiers', () => {
			expect(VEHICLE_TERRAIN_MODIFIERS.paved.modifier).toBe(0);
			expect(VEHICLE_TERRAIN_MODIFIERS.gravel.modifier).toBe(-1);
			expect(VEHICLE_TERRAIN_MODIFIERS.ice.modifier).toBe(-4);
			expect(VEHICLE_TERRAIN_MODIFIERS.off_road.modifier).toBe(-3);
		});
	});

	describe('calculateVehicleControlPool', () => {
		it('should calculate control pool', () => {
			// Pilot 4 + REA 4 + Handling +1 = 9
			expect(calculateVehicleControlPool(4, 4, 1)).toBe(9);
		});

		it('should handle negative handling', () => {
			// Pilot 3 + REA 3 + Handling -2 = 4
			expect(calculateVehicleControlPool(3, 3, -2)).toBe(4);
		});

		it('should not go negative', () => {
			expect(calculateVehicleControlPool(1, 1, -5)).toBe(0);
		});
	});

	describe('calculateGunneryPool', () => {
		it('should calculate basic gunnery pool', () => {
			// Gunnery 4 + AGI 4 = 8
			expect(calculateGunneryPool(4, 4)).toBe(8);
		});

		it('should add targeting system', () => {
			// Gunnery 4 + AGI 4 + Targeting 2 = 10
			expect(calculateGunneryPool(4, 4, 2)).toBe(10);
		});

		it('should work with sensor-guided attacks', () => {
			// Gunnery 3 + Sensor 5 = 8
			expect(calculateGunneryPool(3, 5)).toBe(8);
		});
	});

	describe('calculateRammingDamage', () => {
		it('should calculate ramming damage', () => {
			// 100% speed (10) + Body 10, divided by 2 = 10
			expect(calculateRammingDamage(100, 10)).toBe(10);
		});

		it('should scale with speed', () => {
			// 50% speed (5) + Body 8, divided by 2 = 6
			expect(calculateRammingDamage(50, 8)).toBe(6);
		});

		it('should handle low speed', () => {
			// 10% speed (1) + Body 6, divided by 2 = 3
			expect(calculateRammingDamage(10, 6)).toBe(3);
		});
	});

	describe('calculateCrashDamage', () => {
		it('should calculate crash damage at idle', () => {
			// Body 8 + 0 (idle) = 8
			expect(calculateCrashDamage(8, 'idle')).toBe(8);
		});

		it('should increase damage at higher speeds', () => {
			// Body 8 + 4 (cruising) = 12
			expect(calculateCrashDamage(8, 'cruising')).toBe(12);
			// Body 8 + 8 (very_fast) = 16
			expect(calculateCrashDamage(8, 'very_fast')).toBe(16);
		});

		it('should handle exceeding speed', () => {
			// Body 8 + 12 (exceeding) = 20
			expect(calculateCrashDamage(8, 'exceeding')).toBe(20);
		});
	});

	describe('calculateVehicleModifiers', () => {
		it('should return 0 for no modifiers', () => {
			expect(calculateVehicleModifiers([], [])).toBe(0);
		});

		it('should sum speed modifiers', () => {
			// fast (-3) + very_fast doesn't stack normally, but if selected...
			expect(calculateVehicleModifiers(['fast'], [])).toBe(-3);
		});

		it('should sum terrain modifiers', () => {
			// gravel (-1) + light_debris (-2) = -3
			expect(calculateVehicleModifiers([], ['gravel', 'light_debris'])).toBe(-3);
		});

		it('should combine speed and terrain', () => {
			// cruising (-1) + ice (-4) = -5
			expect(calculateVehicleModifiers(['cruising'], ['ice'])).toBe(-5);
		});
	});

	describe('calculateAutopilotPool', () => {
		it('should calculate autopilot pool', () => {
			// Pilot 3 + Autosoft 4 = 7
			expect(calculateAutopilotPool(3, 4)).toBe(7);
		});

		it('should not go negative', () => {
			expect(calculateAutopilotPool(0, 0)).toBe(0);
		});
	});

	describe('getVCRBonus', () => {
		it('should return VCR rating as bonus', () => {
			expect(getVCRBonus(1)).toBe(1);
			expect(getVCRBonus(2)).toBe(2);
			expect(getVCRBonus(3)).toBe(3);
		});

		it('should cap at 3', () => {
			expect(getVCRBonus(5)).toBe(3);
		});

		it('should not go negative', () => {
			expect(getVCRBonus(-1)).toBe(0);
			expect(getVCRBonus(0)).toBe(0);
		});
	});

	describe('calculateSensorTargetingPool', () => {
		it('should calculate sensor targeting pool', () => {
			// Sensor 4 + Targeting 3 = 7
			expect(calculateSensorTargetingPool(4, 3)).toBe(7);
		});

		it('should not go negative', () => {
			expect(calculateSensorTargetingPool(0, 0)).toBe(0);
		});
	});
});

describe('Astral Combat & Magic', () => {
	describe('ASTRAL_ACTIONS', () => {
		it('should have astral combat actions', () => {
			expect(ASTRAL_ACTIONS.astral_attack).toBeDefined();
			expect(ASTRAL_ACTIONS.astral_attack.skill).toBe('Astral Combat');
			expect(ASTRAL_ACTIONS.astral_attack.opposed).toBe(true);
		});

		it('should have summoning/conjuring actions', () => {
			expect(ASTRAL_ACTIONS.summoning.skill).toBe('Summoning');
			expect(ASTRAL_ACTIONS.binding.skill).toBe('Binding');
			expect(ASTRAL_ACTIONS.banishing.skill).toBe('Banishing');
		});

		it('should have spell-related actions', () => {
			expect(ASTRAL_ACTIONS.counterspelling.skill).toBe('Counterspelling');
			expect(ASTRAL_ACTIONS.dispelling.skill).toBe('Counterspelling');
		});

		it('should have assensing actions', () => {
			expect(ASTRAL_ACTIONS.assensing.skill).toBe('Assensing');
			expect(ASTRAL_ACTIONS.astral_perception.skill).toBe('Assensing');
		});
	});

	describe('MAGIC_TRADITIONS', () => {
		it('should have hermetic tradition', () => {
			expect(MAGIC_TRADITIONS.hermetic.drainAttribute).toBe('log');
		});

		it('should have shamanic tradition', () => {
			expect(MAGIC_TRADITIONS.shamanic.drainAttribute).toBe('cha');
		});

		it('should have multiple traditions', () => {
			expect(Object.keys(MAGIC_TRADITIONS).length).toBeGreaterThan(5);
		});
	});

	describe('calculateAstralAttackPool', () => {
		it('should calculate astral attack pool', () => {
			// WIL 5 + Astral Combat 4 = 9
			expect(calculateAstralAttackPool(5, 4)).toBe(9);
		});

		it('should not go negative', () => {
			expect(calculateAstralAttackPool(0, 0)).toBe(0);
		});
	});

	describe('calculateAstralDefensePool', () => {
		it('should calculate astral defense pool', () => {
			// WIL 5 + INT 4 = 9
			expect(calculateAstralDefensePool(5, 4)).toBe(9);
		});

		it('should not go negative', () => {
			expect(calculateAstralDefensePool(0, 0)).toBe(0);
		});
	});

	describe('calculateAssensingPool', () => {
		it('should calculate assensing pool', () => {
			// Assensing 4 + INT 5 = 9
			expect(calculateAssensingPool(4, 5)).toBe(9);
		});

		it('should not go negative', () => {
			expect(calculateAssensingPool(0, 0)).toBe(0);
		});
	});

	describe('calculateSummoningPool', () => {
		it('should calculate summoning pool', () => {
			// Summoning 5 + MAG 5 = 10
			expect(calculateSummoningPool(5, 5)).toBe(10);
		});

		it('should not go negative', () => {
			expect(calculateSummoningPool(0, 0)).toBe(0);
		});
	});

	describe('calculateSpiritResistance', () => {
		it('should calculate spirit resistance as force x 2', () => {
			expect(calculateSpiritResistance(4)).toBe(8);
			expect(calculateSpiritResistance(6)).toBe(12);
		});
	});

	describe('calculateSpiritServices', () => {
		it('should calculate services as net hits', () => {
			// 5 hits vs 3 hits = 2 services
			expect(calculateSpiritServices(5, 3)).toBe(2);
		});

		it('should return 0 when spirit wins', () => {
			expect(calculateSpiritServices(3, 5)).toBe(0);
		});

		it('should return 0 on tie', () => {
			expect(calculateSpiritServices(4, 4)).toBe(0);
		});
	});

	describe('calculateSummoningDrain', () => {
		it('should use spirit hits as drain', () => {
			expect(calculateSummoningDrain(4, 3)).toBe(3);
			expect(calculateSummoningDrain(5, 5)).toBe(5);
		});

		it('should have minimum drain of 2', () => {
			expect(calculateSummoningDrain(4, 1)).toBe(2);
			expect(calculateSummoningDrain(3, 0)).toBe(2);
		});
	});

	describe('calculateDrainResistancePool', () => {
		it('should calculate drain resistance pool', () => {
			// WIL 5 + CHA 4 (shaman) = 9
			expect(calculateDrainResistancePool(5, 4)).toBe(9);
		});

		it('should not go negative', () => {
			expect(calculateDrainResistancePool(0, 0)).toBe(0);
		});
	});

	describe('isDrainPhysical', () => {
		it('should be stun when drain <= magic', () => {
			expect(isDrainPhysical(4, 5)).toBe(false); // 4 <= 5
			expect(isDrainPhysical(5, 5)).toBe(false); // 5 <= 5
		});

		it('should be physical when drain > magic', () => {
			expect(isDrainPhysical(6, 5)).toBe(true); // 6 > 5
			expect(isDrainPhysical(10, 4)).toBe(true); // 10 > 4
		});
	});

	describe('calculateCounterspellingPool', () => {
		it('should calculate counterspelling pool', () => {
			// Counterspelling 4 + MAG 5 = 9
			expect(calculateCounterspellingPool(4, 5)).toBe(9);
		});

		it('should not go negative', () => {
			expect(calculateCounterspellingPool(0, 0)).toBe(0);
		});
	});

	describe('calculateSpellDefenseDice', () => {
		it('should split dice among protected targets', () => {
			// 6 dice, 3 people = 2 each
			expect(calculateSpellDefenseDice(6, 3)).toBe(2);
		});

		it('should round down when splitting', () => {
			// 5 dice, 2 people = 2 each (floor)
			expect(calculateSpellDefenseDice(5, 2)).toBe(2);
		});

		it('should return 0 for no targets', () => {
			expect(calculateSpellDefenseDice(6, 0)).toBe(0);
		});

		it('should give full dice to single target', () => {
			expect(calculateSpellDefenseDice(6, 1)).toBe(6);
		});
	});

	describe('calculateBanishingPool', () => {
		it('should calculate banishing pool', () => {
			// Banishing 4 + MAG 5 = 9
			expect(calculateBanishingPool(4, 5)).toBe(9);
		});

		it('should not go negative', () => {
			expect(calculateBanishingPool(0, 0)).toBe(0);
		});
	});

	describe('calculateBindingPool', () => {
		it('should calculate binding pool', () => {
			// Binding 4 + MAG 5 = 9
			expect(calculateBindingPool(4, 5)).toBe(9);
		});

		it('should not go negative', () => {
			expect(calculateBindingPool(0, 0)).toBe(0);
		});
	});

	describe('calculateSpellcastingPool', () => {
		it('should calculate spellcasting pool', () => {
			// Spellcasting 5 + MAG 6 = 11
			expect(calculateSpellcastingPool(5, 6)).toBe(11);
		});

		it('should not go negative', () => {
			expect(calculateSpellcastingPool(0, 0)).toBe(0);
		});
	});

	describe('calculateSpellResistancePool', () => {
		it('should calculate basic spell resistance', () => {
			// WIL 5
			expect(calculateSpellResistancePool(5)).toBe(5);
		});

		it('should add counterspelling dice', () => {
			// WIL 5 + 2 counterspelling = 7
			expect(calculateSpellResistancePool(5, 2)).toBe(7);
		});

		it('should not go negative', () => {
			expect(calculateSpellResistancePool(0, 0)).toBe(0);
		});
	});

	describe('calculateSpellDrain', () => {
		it('should calculate drain with divided force', () => {
			// Force 6, mod +2, divide = floor(6/2) + 2 = 5
			expect(calculateSpellDrain(6, 2, true)).toBe(5);
		});

		it('should calculate drain without divided force', () => {
			// Force 4, mod +1, no divide = 4 + 1 = 5
			expect(calculateSpellDrain(4, 1, false)).toBe(5);
		});

		it('should handle odd force values', () => {
			// Force 5, mod +2, divide = floor(5/2) + 2 = 4
			expect(calculateSpellDrain(5, 2, true)).toBe(4);
		});

		it('should have minimum drain of 1', () => {
			// Force 2, mod -5, divide = floor(2/2) - 5 = -4, min 1
			expect(calculateSpellDrain(2, -5, true)).toBe(1);
		});
	});
});

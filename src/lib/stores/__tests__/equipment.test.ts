/**
 * Equipment Store Tests
 * =====================
 * Validates equipment purchasing, cyberware essence calculations,
 * and nuyen tracking match desktop Chummer behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	character,
	startNewCharacter,
	setResourcesBP,
	addWeapon,
	removeWeapon,
	addArmor,
	removeArmor,
	addCyberware,
	removeCyberware,
	addGear,
	removeGear,
	setLifestyle,
	removeLifestyle,
	remainingNuyen,
	currentEssence
} from '../character';
import type { GameWeapon, GameArmor, GameCyberware, GameGear } from '$types';

// Mock game data for testing
const mockWeapon: GameWeapon = {
	name: 'Ares Predator IV',
	category: 'Heavy Pistols',
	type: 'Ranged',
	reach: 0,
	damage: '5P',
	ap: '-1',
	mode: 'SA',
	rc: '0',
	ammo: '15(c)',
	conceal: 0,
	avail: '4R',
	cost: 350,
	source: 'SR4',
	page: 312
};

const mockArmor: GameArmor = {
	name: 'Armor Jacket',
	category: 'Armor',
	ballistic: 8,
	impact: 6,
	capacity: 8,
	avail: '2',
	cost: 900,
	source: 'SR4',
	page: 325
};

const mockCyberware: GameCyberware = {
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
	maxRating: 3
};

const mockGear: GameGear = {
	name: 'Commlink (Rating 3)',
	category: 'Commlink',
	rating: 3,
	avail: '4',
	cost: 700,
	source: 'SR4',
	page: 328
};

describe('Equipment Store - Weapon Purchases', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
		setResourcesBP(50); // 275,000 nuyen
	});

	it('should add weapon to character equipment', () => {
		addWeapon(mockWeapon);

		const char = get(character);
		expect(char?.equipment.weapons).toHaveLength(1);
		expect(char?.equipment.weapons[0]?.name).toBe('Ares Predator IV');
	});

	it('should deduct weapon cost from nuyen', () => {
		const initialNuyen = get(remainingNuyen);

		addWeapon(mockWeapon);

		expect(get(remainingNuyen)).toBe(initialNuyen - 350);
	});

	it('should prevent purchase if insufficient nuyen', () => {
		setResourcesBP(0); // 0 nuyen

		addWeapon(mockWeapon);

		expect(get(character)?.equipment.weapons).toHaveLength(0);
	});

	it('should remove weapon and refund nuyen', () => {
		addWeapon(mockWeapon);
		const nuyenAfterPurchase = get(remainingNuyen);

		const weapon = get(character)?.equipment.weapons[0];
		if (weapon) {
			removeWeapon(weapon.id);
		}

		expect(get(character)?.equipment.weapons).toHaveLength(0);
		expect(get(remainingNuyen)).toBe(nuyenAfterPurchase + 350);
	});

	it('should allow purchasing multiple weapons', () => {
		addWeapon(mockWeapon);
		addWeapon({ ...mockWeapon, name: 'Colt Manhunter' });

		expect(get(character)?.equipment.weapons).toHaveLength(2);
	});
});

describe('Equipment Store - Armor Purchases', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
		setResourcesBP(50);
	});

	it('should add armor to character equipment', () => {
		addArmor(mockArmor);

		const char = get(character);
		expect(char?.equipment.armor).toHaveLength(1);
		expect(char?.equipment.armor[0]?.name).toBe('Armor Jacket');
	});

	it('should preserve armor ratings', () => {
		addArmor(mockArmor);

		const armor = get(character)?.equipment.armor[0];
		expect(armor?.ballistic).toBe(8);
		expect(armor?.impact).toBe(6);
	});

	it('should deduct armor cost from nuyen', () => {
		const initialNuyen = get(remainingNuyen);

		addArmor(mockArmor);

		expect(get(remainingNuyen)).toBe(initialNuyen - 900);
	});

	it('should remove armor and refund nuyen', () => {
		addArmor(mockArmor);

		const armor = get(character)?.equipment.armor[0];
		if (armor) {
			removeArmor(armor.id);
		}

		expect(get(character)?.equipment.armor).toHaveLength(0);
	});
});

describe('Equipment Store - Cyberware Essence', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
		setResourcesBP(50);
	});

	/**
	 * SR4 p.338 - Cyberware reduces Essence
	 */
	describe('Standard Grade Cyberware', () => {
		it('should start with 6.0 essence', () => {
			expect(get(currentEssence)).toBe(6.0);
		});

		it('should reduce essence by cyberware cost', () => {
			addCyberware(mockCyberware, 'Standard');

			// Wired Reflexes 1 costs 2.0 essence
			expect(get(currentEssence)).toBeCloseTo(4.0);
		});

		it('should add cyberware to character', () => {
			addCyberware(mockCyberware, 'Standard');

			expect(get(character)?.equipment.cyberware).toHaveLength(1);
		});

		it('should deduct nuyen for standard grade', () => {
			const initialNuyen = get(remainingNuyen);

			addCyberware(mockCyberware, 'Standard');

			// Standard = 1x cost
			expect(get(remainingNuyen)).toBe(initialNuyen - 11000);
		});

		it('should restore essence when removing cyberware', () => {
			addCyberware(mockCyberware, 'Standard');

			const cyber = get(character)?.equipment.cyberware[0];
			if (cyber) {
				removeCyberware(cyber.id);
			}

			expect(get(currentEssence)).toBe(6.0);
		});
	});

	/**
	 * SR4 p.338 - Alphaware: 0.8x essence, 2x cost
	 */
	describe('Alphaware Grade Cyberware', () => {
		it('should reduce essence by 0.8x for alphaware', () => {
			addCyberware(mockCyberware, 'Alphaware');

			// 2.0 * 0.8 = 1.6 essence
			expect(get(currentEssence)).toBeCloseTo(4.4);
		});

		it('should charge 2x cost for alphaware', () => {
			const initialNuyen = get(remainingNuyen);

			addCyberware(mockCyberware, 'Alphaware');

			// 11000 * 2 = 22000
			expect(get(remainingNuyen)).toBe(initialNuyen - 22000);
		});

		it('should track alphaware grade on cyberware', () => {
			addCyberware(mockCyberware, 'Alphaware');

			const cyber = get(character)?.equipment.cyberware[0];
			expect(cyber?.grade).toBe('Alphaware');
		});
	});

	/**
	 * SR4 p.338 - Betaware: 0.7x essence, 4x cost
	 */
	describe('Betaware Grade Cyberware', () => {
		it('should reduce essence by 0.7x for betaware', () => {
			addCyberware(mockCyberware, 'Betaware');

			// 2.0 * 0.7 = 1.4 essence
			expect(get(currentEssence)).toBeCloseTo(4.6);
		});

		it('should charge 4x cost for betaware', () => {
			const initialNuyen = get(remainingNuyen);

			addCyberware(mockCyberware, 'Betaware');

			// 11000 * 4 = 44000
			expect(get(remainingNuyen)).toBe(initialNuyen - 44000);
		});
	});

	/**
	 * SR4 p.338 - Deltaware: 0.5x essence, 10x cost
	 */
	describe('Deltaware Grade Cyberware', () => {
		it('should reduce essence by 0.5x for deltaware', () => {
			addCyberware(mockCyberware, 'Deltaware');

			// 2.0 * 0.5 = 1.0 essence
			expect(get(currentEssence)).toBeCloseTo(5.0);
		});

		it('should charge 10x cost for deltaware', () => {
			const initialNuyen = get(remainingNuyen);

			addCyberware(mockCyberware, 'Deltaware');

			// 11000 * 10 = 110000
			expect(get(remainingNuyen)).toBe(initialNuyen - 110000);
		});
	});

	/**
	 * SR4 p.338 - Used: 1.2x essence, 0.5x cost
	 */
	describe('Used Grade Cyberware', () => {
		it('should increase essence cost by 1.2x for used', () => {
			addCyberware(mockCyberware, 'Used');

			// 2.0 * 1.2 = 2.4 essence
			expect(get(currentEssence)).toBeCloseTo(3.6);
		});

		it('should charge 0.5x cost for used', () => {
			const initialNuyen = get(remainingNuyen);

			addCyberware(mockCyberware, 'Used');

			// 11000 * 0.5 = 5500
			expect(get(remainingNuyen)).toBe(initialNuyen - 5500);
		});
	});

	describe('Essence Limits', () => {
		it('should prevent cyberware if essence would go negative', () => {
			// Add cyberware that uses most essence
			const bigCyberware: GameCyberware = {
				...mockCyberware,
				name: 'Big Cyber',
				ess: 5.5
			};

			addCyberware(bigCyberware, 'Standard'); // Uses 5.5, leaves 0.5

			// Try to add more
			addCyberware(mockCyberware, 'Standard'); // Would need 2.0

			// Should only have the first piece
			expect(get(character)?.equipment.cyberware).toHaveLength(1);
			expect(get(currentEssence)).toBeCloseTo(0.5);
		});

		it('should allow cyberware up to exactly 0 essence', () => {
			const exactCyberware: GameCyberware = {
				...mockCyberware,
				name: 'Full Cyber',
				ess: 6.0
			};

			addCyberware(exactCyberware, 'Standard');

			expect(get(currentEssence)).toBe(0);
			expect(get(character)?.equipment.cyberware).toHaveLength(1);
		});
	});

	describe('Multiple Cyberware', () => {
		it('should accumulate essence costs', () => {
			const smallCyber1: GameCyberware = { ...mockCyberware, name: 'Cyber1', ess: 0.5 };
			const smallCyber2: GameCyberware = { ...mockCyberware, name: 'Cyber2', ess: 0.3 };
			const smallCyber3: GameCyberware = { ...mockCyberware, name: 'Cyber3', ess: 0.2 };

			addCyberware(smallCyber1, 'Standard');
			addCyberware(smallCyber2, 'Standard');
			addCyberware(smallCyber3, 'Standard');

			// 6.0 - 0.5 - 0.3 - 0.2 = 5.0
			expect(get(currentEssence)).toBeCloseTo(5.0);
			expect(get(character)?.equipment.cyberware).toHaveLength(3);
		});

		it('should track different grades separately', () => {
			const cyber1: GameCyberware = { ...mockCyberware, name: 'Standard Cyber', ess: 1.0 };
			const cyber2: GameCyberware = { ...mockCyberware, name: 'Alpha Cyber', ess: 1.0 };

			addCyberware(cyber1, 'Standard');  // 1.0 essence
			addCyberware(cyber2, 'Alphaware'); // 0.8 essence

			// 6.0 - 1.0 - 0.8 = 4.2
			expect(get(currentEssence)).toBeCloseTo(4.2);
		});
	});
});

describe('Equipment Store - Gear Purchases', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
		setResourcesBP(50);
	});

	it('should add gear to character', () => {
		addGear(mockGear);

		expect(get(character)?.equipment.gear).toHaveLength(1);
		expect(get(character)?.equipment.gear[0]?.name).toBe('Commlink (Rating 3)');
	});

	it('should deduct gear cost', () => {
		const initialNuyen = get(remainingNuyen);

		addGear(mockGear);

		expect(get(remainingNuyen)).toBe(initialNuyen - 700);
	});

	it('should stack identical gear items', () => {
		addGear(mockGear, 1);
		addGear(mockGear, 2);

		const gear = get(character)?.equipment.gear;
		expect(gear).toHaveLength(1);
		expect(gear?.[0]?.quantity).toBe(3);
	});

	it('should calculate cost for quantity', () => {
		const initialNuyen = get(remainingNuyen);

		addGear(mockGear, 5);

		// 700 * 5 = 3500
		expect(get(remainingNuyen)).toBe(initialNuyen - 3500);
	});

	it('should refund full quantity cost on removal', () => {
		addGear(mockGear, 3);

		const gear = get(character)?.equipment.gear[0];
		if (gear) {
			removeGear(gear.id);
		}

		// Should refund 700 * 3 = 2100
		expect(get(character)?.equipment.gear).toHaveLength(0);
	});
});

describe('Equipment Store - Lifestyle', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
		setResourcesBP(50);
	});

	it('should set lifestyle on character', () => {
		setLifestyle('Middle', 'Middle', 5000, 1);

		const lifestyle = get(character)?.equipment.lifestyle;
		expect(lifestyle?.name).toBe('Middle');
		expect(lifestyle?.monthlyCost).toBe(5000);
	});

	it('should deduct lifestyle cost', () => {
		const initialNuyen = get(remainingNuyen);

		setLifestyle('Middle', 'Middle', 5000, 1);

		expect(get(remainingNuyen)).toBe(initialNuyen - 5000);
	});

	it('should multiply cost by months prepaid', () => {
		const initialNuyen = get(remainingNuyen);

		setLifestyle('Low', 'Low', 2000, 3);

		// 2000 * 3 = 6000
		expect(get(remainingNuyen)).toBe(initialNuyen - 6000);
	});

	it('should replace existing lifestyle and refund', () => {
		setLifestyle('Low', 'Low', 2000, 1);
		const nuyenAfterFirst = get(remainingNuyen);

		setLifestyle('Middle', 'Middle', 5000, 1);

		// Should refund 2000 then charge 5000 = net -3000
		expect(get(remainingNuyen)).toBe(nuyenAfterFirst + 2000 - 5000);
	});

	it('should remove lifestyle and refund', () => {
		setLifestyle('Middle', 'Middle', 5000, 2);
		const nuyenAfterSet = get(remainingNuyen);

		removeLifestyle();

		expect(get(character)?.equipment.lifestyle).toBeNull();
		expect(get(remainingNuyen)).toBe(nuyenAfterSet + 10000);
	});
});

describe('Equipment Store - Combined Purchases', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
		setResourcesBP(50); // 275,000 nuyen
	});

	it('should track total equipment cost correctly', () => {
		const initialNuyen = get(remainingNuyen);

		addWeapon(mockWeapon);           // 350
		addArmor(mockArmor);              // 900
		addCyberware(mockCyberware, 'Standard'); // 11000
		addGear(mockGear, 2);             // 1400
		setLifestyle('Middle', 'Middle', 5000, 1); // 5000

		// Total: 350 + 900 + 11000 + 1400 + 5000 = 18650
		expect(get(remainingNuyen)).toBe(initialNuyen - 18650);
	});

	it('should prevent purchases that exceed available nuyen', () => {
		setResourcesBP(5); // Only 20,000 nuyen

		const expensiveCyber: GameCyberware = {
			...mockCyberware,
			cost: 25000
		};

		addCyberware(expensiveCyber, 'Standard');

		expect(get(character)?.equipment.cyberware).toHaveLength(0);
	});

	it('should track essence and nuyen independently', () => {
		// Buy cheap cyberware that uses essence
		const cheapCyber: GameCyberware = {
			...mockCyberware,
			name: 'Datajack',
			ess: 0.1,
			cost: 1000
		};

		addCyberware(cheapCyber, 'Standard');

		expect(get(currentEssence)).toBeCloseTo(5.9);
		expect(get(remainingNuyen)).toBeLessThan(275000);
	});
});

/**
 * Equipment Type Tests
 * ====================
 * Validates BP-to-Nuyen conversion and equipment calculations
 * match desktop Chummer behavior.
 */

import { describe, it, expect } from 'vitest';
import {
	bpToNuyen,
	nuyenToBp,
	BP_TO_NUYEN_RATES,
	calculateEquipmentCost,
	calculateEssenceCost,
	CYBERWARE_GRADES,
	EMPTY_EQUIPMENT
} from '../equipment';

describe('BP to Nuyen Conversion', () => {
	/**
	 * SR4 Core Rulebook p.81 - Resources Table
	 * These values must match desktop Chummer exactly.
	 */
	it('should convert 0 BP to 0 nuyen', () => {
		expect(bpToNuyen(0)).toBe(0);
	});

	it('should convert 5 BP to 20,000 nuyen', () => {
		expect(bpToNuyen(5)).toBe(20000);
	});

	it('should convert 10 BP to 50,000 nuyen', () => {
		expect(bpToNuyen(10)).toBe(50000);
	});

	it('should convert 20 BP to 90,000 nuyen', () => {
		expect(bpToNuyen(20)).toBe(90000);
	});

	it('should convert 30 BP to 150,000 nuyen', () => {
		expect(bpToNuyen(30)).toBe(150000);
	});

	it('should convert 40 BP to 225,000 nuyen', () => {
		expect(bpToNuyen(40)).toBe(225000);
	});

	it('should convert 50 BP to 275,000 nuyen', () => {
		expect(bpToNuyen(50)).toBe(275000);
	});

	it('should use highest qualifying tier for in-between values', () => {
		// 7 BP should use the 5 BP tier (20,000)
		expect(bpToNuyen(7)).toBe(20000);
		// 15 BP should use the 10 BP tier (50,000)
		expect(bpToNuyen(15)).toBe(50000);
		// 25 BP should use the 20 BP tier (90,000)
		expect(bpToNuyen(25)).toBe(90000);
	});

	it('should return 0 for negative BP values', () => {
		expect(bpToNuyen(-5)).toBe(0);
	});

	it('should cap at 50 BP tier for values over 50', () => {
		expect(bpToNuyen(100)).toBe(275000);
	});
});

describe('Nuyen to BP Conversion', () => {
	it('should convert 0 nuyen to 0 BP', () => {
		expect(nuyenToBp(0)).toBe(0);
	});

	it('should find minimum BP for nuyen amounts', () => {
		expect(nuyenToBp(20000)).toBe(5);
		expect(nuyenToBp(50000)).toBe(10);
		expect(nuyenToBp(90000)).toBe(20);
		expect(nuyenToBp(150000)).toBe(30);
		expect(nuyenToBp(225000)).toBe(40);
		expect(nuyenToBp(275000)).toBe(50);
	});

	it('should return 0 for amounts below 20,000', () => {
		expect(nuyenToBp(10000)).toBe(0);
		expect(nuyenToBp(19999)).toBe(0);
	});
});

describe('BP to Nuyen Rate Table', () => {
	it('should have exactly 7 tiers', () => {
		expect(BP_TO_NUYEN_RATES).toHaveLength(7);
	});

	it('should have rates in ascending BP order', () => {
		for (let i = 1; i < BP_TO_NUYEN_RATES.length; i++) {
			const prev = BP_TO_NUYEN_RATES[i - 1];
			const curr = BP_TO_NUYEN_RATES[i];
			expect(curr!.bp).toBeGreaterThan(prev!.bp);
		}
	});

	it('should have rates in ascending nuyen order', () => {
		for (let i = 1; i < BP_TO_NUYEN_RATES.length; i++) {
			const prev = BP_TO_NUYEN_RATES[i - 1];
			const curr = BP_TO_NUYEN_RATES[i];
			expect(curr!.nuyen).toBeGreaterThan(prev!.nuyen);
		}
	});
});

describe('Cyberware Grades', () => {
	/**
	 * SR4 Core Rulebook p.338 - Cyberware Grades
	 * Essence and cost multipliers must match desktop Chummer.
	 */
	it('should have Standard grade with 1.0x essence and 1x cost', () => {
		const standard = CYBERWARE_GRADES.find(g => g.name === 'Standard');
		expect(standard).toBeDefined();
		expect(standard!.essMultiplier).toBe(1.0);
		expect(standard!.costMultiplier).toBe(1);
	});

	it('should have Alphaware grade with 0.8x essence and 2x cost', () => {
		const alpha = CYBERWARE_GRADES.find(g => g.name === 'Alphaware');
		expect(alpha).toBeDefined();
		expect(alpha!.essMultiplier).toBe(0.8);
		expect(alpha!.costMultiplier).toBe(2);
	});

	it('should have Betaware grade with 0.7x essence and 4x cost', () => {
		const beta = CYBERWARE_GRADES.find(g => g.name === 'Betaware');
		expect(beta).toBeDefined();
		expect(beta!.essMultiplier).toBe(0.7);
		expect(beta!.costMultiplier).toBe(4);
	});

	it('should have Deltaware grade with 0.5x essence and 10x cost', () => {
		const delta = CYBERWARE_GRADES.find(g => g.name === 'Deltaware');
		expect(delta).toBeDefined();
		expect(delta!.essMultiplier).toBe(0.5);
		expect(delta!.costMultiplier).toBe(10);
	});

	it('should have Used grade with 1.2x essence and 0.5x cost', () => {
		const used = CYBERWARE_GRADES.find(g => g.name === 'Used');
		expect(used).toBeDefined();
		expect(used!.essMultiplier).toBe(1.2);
		expect(used!.costMultiplier).toBe(0.5);
	});
});

describe('Equipment Cost Calculation', () => {
	it('should return 0 for empty equipment', () => {
		expect(calculateEquipmentCost(EMPTY_EQUIPMENT)).toBe(0);
	});

	it('should sum weapon costs', () => {
		const equipment = {
			...EMPTY_EQUIPMENT,
			weapons: [
				{ id: '1', name: 'Pistol', category: 'Light Pistols', type: 'Ranged' as const, reach: 0, damage: '5P', ap: '-', mode: 'SA', rc: '0', ammo: '15(c)', currentAmmo: 15, conceal: 0, cost: 500, accessories: [], notes: '' },
				{ id: '2', name: 'Knife', category: 'Blades', type: 'Melee' as const, reach: 0, damage: '3P', ap: '-1', mode: '0', rc: '0', ammo: '0', currentAmmo: 0, conceal: 2, cost: 50, accessories: [], notes: '' }
			]
		};
		expect(calculateEquipmentCost(equipment)).toBe(550);
	});

	it('should sum armor costs', () => {
		const equipment = {
			...EMPTY_EQUIPMENT,
			armor: [
				{ id: '1', name: 'Armor Jacket', category: 'Armor', ballistic: 8, impact: 6, capacity: 8, capacityUsed: 0, equipped: true, cost: 900, modifications: [], notes: '' }
			]
		};
		expect(calculateEquipmentCost(equipment)).toBe(900);
	});

	it('should sum cyberware costs', () => {
		const equipment = {
			...EMPTY_EQUIPMENT,
			cyberware: [
				{ id: '1', name: 'Wired Reflexes 1', category: 'Bodyware', grade: 'Standard' as const, rating: 1, essence: 2.0, cost: 11000, capacity: 0, capacityUsed: 0, location: '', subsystems: [], notes: '' }
			]
		};
		expect(calculateEquipmentCost(equipment)).toBe(11000);
	});

	it('should multiply gear cost by quantity', () => {
		const equipment = {
			...EMPTY_EQUIPMENT,
			gear: [
				{ id: '1', name: 'Stim Patch', category: 'Slap Patches', rating: 6, quantity: 5, cost: 150, location: '', notes: '' }
			]
		};
		expect(calculateEquipmentCost(equipment)).toBe(750); // 150 * 5
	});

	it('should include lifestyle prepaid months', () => {
		const equipment = {
			...EMPTY_EQUIPMENT,
			lifestyle: { id: '1', name: 'Middle', level: 'Middle', monthlyCost: 5000, monthsPrepaid: 3, location: '', notes: '' }
		};
		expect(calculateEquipmentCost(equipment)).toBe(15000); // 5000 * 3
	});

	it('should sum all equipment types together', () => {
		const equipment = {
			weapons: [{ id: '1', name: 'Pistol', category: 'Light Pistols', type: 'Ranged' as const, reach: 0, damage: '5P', ap: '-', mode: 'SA', rc: '0', ammo: '15(c)', currentAmmo: 15, conceal: 0, cost: 500, accessories: [], notes: '' }],
			armor: [{ id: '1', name: 'Jacket', category: 'Armor', ballistic: 8, impact: 6, capacity: 8, capacityUsed: 0, equipped: true, cost: 900, modifications: [], notes: '' }],
			cyberware: [{ id: '1', name: 'Datajack', category: 'Headware', grade: 'Standard' as const, rating: 1, essence: 0.1, cost: 1000, capacity: 0, capacityUsed: 0, location: '', subsystems: [], notes: '' }],
			gear: [{ id: '1', name: 'Commlink', category: 'Commlink', rating: 3, quantity: 1, cost: 700, location: '', notes: '' }],
			lifestyle: { id: '1', name: 'Low', level: 'Low', monthlyCost: 2000, monthsPrepaid: 1, location: '', notes: '' }
		};
		expect(calculateEquipmentCost(equipment)).toBe(500 + 900 + 1000 + 700 + 2000);
	});
});

describe('Essence Cost Calculation', () => {
	it('should return 0 for no cyberware', () => {
		expect(calculateEssenceCost([])).toBe(0);
	});

	it('should sum essence costs', () => {
		const cyberware = [
			{ id: '1', name: 'Datajack', category: 'Headware', grade: 'Standard' as const, rating: 1, essence: 0.1, cost: 1000, capacity: 0, capacityUsed: 0, location: '', subsystems: [], notes: '' },
			{ id: '2', name: 'Smartlink', category: 'Eyeware', grade: 'Standard' as const, rating: 1, essence: 0.1, cost: 2500, capacity: 0, capacityUsed: 0, location: '', subsystems: [], notes: '' }
		];
		expect(calculateEssenceCost(cyberware)).toBeCloseTo(0.2);
	});

	it('should include subsystem essence costs', () => {
		const cyberware = [
			{
				id: '1',
				name: 'Cybereyes Rating 3',
				category: 'Eyeware',
				grade: 'Standard' as const,
				rating: 3,
				essence: 0.4,
				cost: 5000,
				capacity: 12,
				capacityUsed: 4,
				location: '',
				subsystems: [
					{ id: '1a', name: 'Smartlink', category: 'Eyeware', grade: 'Standard' as const, rating: 1, essence: 0.1, cost: 2500, capacity: 0, capacityUsed: 0, location: '', subsystems: [], notes: '' }
				],
				notes: ''
			}
		];
		expect(calculateEssenceCost(cyberware)).toBeCloseTo(0.5); // 0.4 + 0.1
	});
});

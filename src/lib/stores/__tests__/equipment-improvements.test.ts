/**
 * Equipment → Improvement wiring tests (issue #62c)
 * ===================================================
 * addCyberware/addBioware/addGear/addChildCyberware/addArmor must create
 * improvements from the item's bonus data (sourceName = the character
 * item's own id, mirroring desktop's InternalId), and remove* must clean
 * them up — including a parent's descendant tree.
 *
 * NOTE: uniqueName assignment (hardcoded 'initiativepass' for InitiativePass,
 * 'precedence0'/'precedence1' derived from the specificattribute precedence
 * attribute) is #63b/#64's job, not this issue's — these tests assert the
 * improvement exists with the correct type/value/rating, not its uniqueName.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { character, startNewCharacter, addQuality } from '../character';
import {
	addCyberware,
	removeCyberware,
	addChildCyberware,
	addBioware,
	removeBioware,
	addArmor,
	removeArmor,
	addGear,
	removeGear,
	setResourcesBP
} from '../equipment';
import { setGameDataForTesting } from '../gamedata';
import type { GameCyberware, GameBioware, GameArmor, GameGear } from '$types';

const WIRED_REFLEXES: GameCyberware = {
	name: 'Wired Reflexes',
	category: 'Bodyware',
	ess: 2, // FixedValues(2,3,5) resolved at rating 2 by the converter → base ess 2 in JSON... using rating-scaled bonus below
	capacity: '0',
	avail: 'FixedValues(8R,12R,20R)',
	cost: 11000,
	source: 'SR4',
	page: 342,
	rating: 3,
	minRating: 1,
	maxRating: 3,
	bonus: {
		initiativepass: 'Rating',
		specificattribute: [{ name: 'REA', precedence: '1', val: 'Rating' }]
	}
};

const REACTION_ENHANCERS: GameCyberware = {
	name: 'Reaction Enhancers',
	category: 'Bodyware',
	ess: 0.5,
	capacity: '0',
	avail: '6',
	cost: 24000,
	source: 'SR4',
	page: 344,
	rating: 3,
	minRating: 1,
	maxRating: 3,
	bonus: { specificattribute: [{ name: 'REA', val: 'Rating' }] }
};

const PLAIN_GEAR: GameGear = {
	name: 'Plain Gear',
	category: 'Tools',
	rating: 0,
	avail: '0',
	cost: 10,
	source: 'SR4',
	page: 1
};

// Uses currently-parser-supported bonus keys (matrixinitiative/matrixinitiativepass
// aren't wired yet — that's #68's job); initiativepass IS supported today.
const SIM_MODULE: GameGear = {
	name: 'Sim Module (Hot)',
	category: 'Commlink Accessories',
	rating: 0,
	avail: '4F',
	cost: 250,
	source: 'SR4',
	page: 328,
	bonus: { initiativepass: 2 }
};

const NONCONDUCTIVITY: GameArmor = {
	name: 'Nonconductivity Armor',
	category: 'Full Body Armor',
	ballistic: 4,
	impact: 3,
	capacity: 8,
	avail: '10',
	cost: 1500,
	source: 'SR4',
	page: 45,
	bonus: { drainresist: 1 }
};

const CULTURED_BIOWARE: GameBioware = {
	name: 'Synaptic Booster',
	category: 'Basic',
	rating: 1,
	ess: 1,
	capacity: 0,
	avail: '12R',
	cost: 100000,
	source: 'SR4',
	page: 349,
	bonus: { initiativepass: 'Rating' }
};

describe('Equipment improvement wiring (issue #62c)', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
		setResourcesBP(50); // fund the character so purchases succeed
	});

	it('addCyberware creates typed improvements from bonus data at the item rating', () => {
		addCyberware(WIRED_REFLEXES, 'Standard');

		const char = get(character)!;
		const cyberId = char.equipment.cyberware[0]!.id;
		expect(char.improvements).toHaveLength(2);
		const initPass = char.improvements.find((i) => i.type === 'InitiativePass');
		const rea = char.improvements.find((i) => i.type === 'Attribute');
		expect(initPass).toMatchObject({ val: 3, source: 'Cyberware', sourceName: cyberId });
		expect(rea).toMatchObject({ improvedName: 'rea', val: 3, source: 'Cyberware', sourceName: cyberId });
	});

	it('removeCyberware cleans up its improvements and restores essence', () => {
		addCyberware(WIRED_REFLEXES, 'Standard');
		const cyberId = get(character)!.equipment.cyberware[0]!.id;
		const essenceBefore = get(character)!.attributes.ess;

		removeCyberware(cyberId);

		const char = get(character)!;
		expect(char.improvements).toHaveLength(0);
		expect(char.attributes.ess).toBeGreaterThan(essenceBefore);
	});

	it('two identical items create independent improvements keyed by their own id', () => {
		addCyberware(REACTION_ENHANCERS, 'Standard');
		addCyberware(REACTION_ENHANCERS, 'Standard');

		let char = get(character)!;
		expect(char.improvements).toHaveLength(2);
		const [first, second] = char.equipment.cyberware;
		expect(first!.id).not.toBe(second!.id);

		removeCyberware(first!.id);
		char = get(character)!;
		expect(char.improvements).toHaveLength(1);
		expect(char.improvements[0]!.sourceName).toBe(second!.id);
	});

	it('child cyberware improvements are removed when the parent is removed', () => {
		addCyberware(WIRED_REFLEXES, 'Standard');
		const parentId = get(character)!.equipment.cyberware[0]!.id;
		addChildCyberware(parentId, REACTION_ENHANCERS, 'Standard');

		let char = get(character)!;
		expect(char.improvements).toHaveLength(3); // 2 from parent (Wired Reflexes) + 1 from child (Reaction Enhancers)

		removeCyberware(parentId);
		char = get(character)!;
		expect(char.improvements).toHaveLength(0);
	});

	it('addBioware creates improvements scaled by the purchased rating', () => {
		addBioware(CULTURED_BIOWARE, 'Standard', 2);

		const char = get(character)!;
		const bioId = char.equipment.bioware[0]!.id;
		expect(char.improvements).toHaveLength(1);
		expect(char.improvements[0]).toMatchObject({ type: 'InitiativePass', val: 2, source: 'Bioware', sourceName: bioId });

		removeBioware(bioId);
		expect(get(character)!.improvements).toHaveLength(0);
	});

	it('addArmor creates improvements from its bonus data', () => {
		addArmor(NONCONDUCTIVITY);

		const char = get(character)!;
		const armorId = char.equipment.armor[0]!.id;
		expect(char.improvements).toEqual([
			expect.objectContaining({ type: 'DrainResistance', val: 1, source: 'Armor', sourceName: armorId })
		]);

		removeArmor(armorId);
		expect(get(character)!.improvements).toHaveLength(0);
	});

	it('addGear creates improvements from its bonus data (e.g. Sim Module initiative pass)', () => {
		addGear(SIM_MODULE);

		const char = get(character)!;
		const gearId = char.equipment.gear[0]!.id;
		expect(char.improvements).toEqual([
			expect.objectContaining({ type: 'InitiativePass', val: 2, source: 'Gear', sourceName: gearId })
		]);

		removeGear(gearId);
		expect(get(character)!.improvements).toHaveLength(0);
	});

	it('a no-bonus item creates no improvements', () => {
		addGear(PLAIN_GEAR);
		expect(get(character)!.improvements).toHaveLength(0);
	});

	it('stacking an existing gear item (same name, no container) does not duplicate improvements', () => {
		addGear(SIM_MODULE);
		addGear(SIM_MODULE); // stacks onto the same item (quantity += 1), not a new id
		const char = get(character)!;
		expect(char.equipment.gear).toHaveLength(1);
		expect(char.equipment.gear[0]!.quantity).toBe(2);
		expect(char.improvements).toHaveLength(1); // still just the original item's improvements
	});
});

describe('Essence-multiplier improvements (issue #64)', () => {
	const DATAJACK: GameCyberware = {
		name: 'Datajack',
		category: 'Headware',
		ess: 0.1,
		capacity: '0',
		avail: '2',
		cost: 500,
		source: 'SR4',
		page: 347,
		rating: 1,
		minRating: 1,
		maxRating: 1
	};

	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
		setResourcesBP(10);
	});

	it('Biocompatability (Cyberware) reduces essence cost by its multiplier', () => {
		setGameDataForTesting({
			qualities: [
				{
					name: 'Biocompatability (Cyberware)',
					category: 'Positive',
					bp: 5,
					mutant: false,
					limit: false,
					bonus: { cyberwareessmultiplier: 90 },
					source: 'SR4',
					page: 88
				}
			]
		});
		addQuality('Biocompatability (Cyberware)', 'Positive', 5);
		const essenceBefore = get(character)!.attributes.ess;

		addCyberware(DATAJACK, 'Standard');

		const char = get(character)!;
		// 0.1 * 0.9 = 0.09
		expect(char.equipment.cyberware[0]!.essence).toBeCloseTo(0.09);
		expect(char.attributes.ess).toBeCloseTo(essenceBefore - 0.09);
	});

	it('Sensitive System doubles cyberware essence cost', () => {
		setGameDataForTesting({
			qualities: [
				{
					name: 'Sensitive System',
					category: 'Negative',
					bp: -15,
					mutant: false,
					limit: false,
					bonus: { sensitivesystem: true },
					source: 'SR4',
					page: 95
				}
			]
		});
		addQuality('Sensitive System', 'Negative', -15);

		addCyberware(DATAJACK, 'Standard');

		// 0.1 * 2 = 0.2
		expect(get(character)!.equipment.cyberware[0]!.essence).toBeCloseTo(0.2);
	});

	it('with no essence-multiplier qualities, essence cost is unaffected', () => {
		addCyberware(DATAJACK, 'Standard');
		expect(get(character)!.equipment.cyberware[0]!.essence).toBeCloseTo(0.1);
	});
});

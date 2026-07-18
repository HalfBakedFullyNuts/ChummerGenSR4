/**
 * Golden character integration suite (issue #71)
 * =================================================
 * Store mutation → improvement creation → changed calculation, exercised
 * end to end through the real store API (no direct characterStore.set)
 * against the real shipped static/data/*.json — not fixtures. Every value
 * below is *computed* from the verified formulas landed across Epic 16 and
 * the real game data (grep'd and printed at write-time), not recorded from
 * a live desktop run — there is no desktop instance available in this
 * environment. Treat any future mismatch against a real desktop screenshot
 * as a defect to investigate, per the issue's own risk note.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
	character,
	startNewCharacter,
	setCustomBuildPoints,
	addQuality,
	removeQuality,
	initializeMagic,
	addPower,
	initializeResonance,
	learnEcho,
	removeCyberware,
	setArmorEquipped
} from '../../stores';
import { setAttribute } from '../attributes';
import { setMetatype } from '../creation';
import { addCyberware, addArmor, setResourcesBP, removeArmor } from '../equipment';
import { setGameDataForTesting, type GameData, type GamePower, type GameEcho } from '../gamedata';
import { calculateAll } from '../../engine/calculations';
import type { GameCyberware, GameArmor } from '$types';

import metatypesJson from '../../../../static/data/metatypes.json';
import skillsJson from '../../../../static/data/skills.json';
import qualitiesJson from '../../../../static/data/qualities.json';
import spellsJson from '../../../../static/data/spells.json';
import powersJson from '../../../../static/data/powers.json';
import traditionsJson from '../../../../static/data/traditions.json';
import mentorsJson from '../../../../static/data/mentors.json';
import lifestylesJson from '../../../../static/data/lifestyles.json';
import programsJson from '../../../../static/data/programs.json';
import weaponsJson from '../../../../static/data/weapons.json';
import armorJson from '../../../../static/data/armor.json';
import cyberwareJson from '../../../../static/data/cyberware.json';
import gearJson from '../../../../static/data/gear.json';
import biowareJson from '../../../../static/data/bioware.json';
import vehiclesJson from '../../../../static/data/vehicles.json';
import martialArtsJson from '../../../../static/data/martialarts.json';
import echoesJson from '../../../../static/data/echoes.json';
import streamsJson from '../../../../static/data/streams.json';
import metamagicJson from '../../../../static/data/metamagic.json';
import booksJson from '../../../../static/data/books.json';
import rangesJson from '../../../../static/data/ranges.json';

let realGameData: GameData;

beforeAll(() => {
	realGameData = {
		metatypes: metatypesJson.metatypes as GameData['metatypes'],
		metatypeCategories: metatypesJson.categories,
		skills: skillsJson.skills as GameData['skills'],
		skillGroups: skillsJson.skillGroups,
		skillCategories: skillsJson.categories as GameData['skillCategories'],
		qualities: qualitiesJson.qualities as GameData['qualities'],
		qualityCategories: qualitiesJson.categories,
		spells: spellsJson.spells as GameData['spells'],
		spellCategories: spellsJson.categories,
		powers: powersJson.powers as GameData['powers'],
		traditions: traditionsJson.traditions as GameData['traditions'],
		mentors: mentorsJson.mentors as GameData['mentors'],
		lifestyles: lifestylesJson.lifestyles as GameData['lifestyles'],
		programs: programsJson.programs as GameData['programs'],
		programCategories: programsJson.categories,
		weapons: weaponsJson.weapons as GameData['weapons'],
		weaponCategories: weaponsJson.categories,
		armor: armorJson.armor as GameData['armor'],
		armorCategories: armorJson.categories,
		cyberware: cyberwareJson.cyberware as unknown as GameData['cyberware'],
		cyberwareCategories: cyberwareJson.categories.filter(
			(c): c is string => typeof c === 'string'
		),
		cyberwareGrades: cyberwareJson.grades as GameData['cyberwareGrades'],
		gear: gearJson.gear as GameData['gear'],
		gearCategories: gearJson.categories,
		bioware: biowareJson.biowares as GameData['bioware'],
		biowareCategories: biowareJson.categories,
		vehicles: vehiclesJson.vehicles as GameData['vehicles'],
		vehicleCategories: vehiclesJson.categories,
		martialArts: martialArtsJson.styles as GameData['martialArts'],
		echoes: echoesJson.echoes as GameData['echoes'],
		streams: streamsJson.streams as GameData['streams'],
		metamagics: metamagicJson.metamagics as GameData['metamagics'],
		books: booksJson.books,
		ranges: rangesJson.ranges as GameData['ranges']
	};
});

beforeEach(() => {
	setGameDataForTesting(realGameData);
});

function findCyberware(name: string): GameCyberware {
	const item = realGameData.cyberware.find((c) => c.name === name);
	if (!item) throw new Error(`Fixture cyberware "${name}" not found in shipped data`);
	return item;
}

function findArmor(name: string): GameArmor {
	const item = realGameData.armor.find((a) => a.name === name);
	if (!item) throw new Error(`Fixture armor "${name}" not found in shipped data`);
	return item;
}

function findPower(name: string): GamePower {
	const item = realGameData.powers.find((p) => p.name === name);
	if (!item) throw new Error(`Fixture power "${name}" not found in shipped data`);
	return item;
}

describe('a trivial sanity check finds real data', () => {
	it('Wired Reflexes exists in the loaded cyberware data', () => {
		expect(findCyberware('Wired Reflexes').bonus).toBeDefined();
	});
});

describe('GOLDEN 1: Street Samurai (Human, Toughness, Wired Reflexes 2, worn Armor Jacket)', () => {
	/**
	 * Recipe: startNewCharacter('bp') → setMetatype(Human) → BOD 4 AGI 4 REA 4
	 * STR 3 CHA 2 INT 3 LOG 2 WIL 3 → addQuality(Toughness, 10 BP) →
	 * addCyberware(Wired Reflexes, Standard, rating 2) →
	 * addArmor(Armor Jacket) + setArmorEquipped(true)
	 *
	 * Computed (not desktop-screenshot-verified):
	 *  - Wired Reflexes rating 2: essByRating[1] = 3 essence; bonus gives
	 *    InitiativePass val 2 (uniqueName 'initiativepass') and Attribute/rea
	 *    val 2 (uniqueName 'precedence1').
	 *  - Essence 6.0 - 3.0 = 3.0
	 *  - REA 4 + 2 (precedence1 sum) = 6
	 *  - Initiative = REA(6) + INT(3) = 9
	 *  - InitiativeDice = 1 + InitiativePass(2) = 3
	 *  - PhysicalCM = ceil(BOD/2) + 8 = ceil(4/2)+8 = 10 (Toughness is
	 *    DamageResistance, not a PhysicalCM improvement)
	 *  - DamageSoakBallistic = BOD(4) + ArmorBallistic(8, Armor Jacket worn,
	 *    single piece, no layering) + DamageResistance(1, Toughness) = 13
	 */
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
		setCustomBuildPoints(800); // headroom so BP validation never blocks the recipe
		setMetatype(realGameData, 'Human');
		setAttribute('bod', 4);
		setAttribute('agi', 4);
		setAttribute('rea', 4);
		setAttribute('str', 3);
		setAttribute('cha', 2);
		setAttribute('int', 3);
		setAttribute('log', 2);
		setAttribute('wil', 3);
		setResourcesBP(50); // fund the cyberware/armor purchases
	});

	function buildSamurai(): void {
		addQuality('Toughness', 'Positive', 10);
		addCyberware(findCyberware('Wired Reflexes'), 'Standard', 2);
		addArmor(findArmor('Armor Jacket'));
		const armorId = get(character)!.equipment.armor[0]!.id;
		setArmorEquipped(armorId, true);
	}

	it('produces zero unhandled-bonus-key warnings while building', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		buildSamurai();
		const unhandled = warnSpy.mock.calls.filter(
			([msg]) => typeof msg === 'string' && msg.includes('unhandled bonus key')
		);
		expect(unhandled).toEqual([]);
		warnSpy.mockRestore();
	});

	it('matches every computed derived stat', () => {
		buildSamurai();
		const char = get(character)!;
		const calc = calculateAll(char);

		expect(char.attributes.ess).toBeCloseTo(3.0);
		expect(calc.physicalCM).toBe(10);
		expect(calc.initiative).toBe(9);
		expect(calc.initiativeDice).toBe(3);
		expect(calc.damageSoakBallistic).toBe(13);
	});

	it('removal round-trip: removing Wired Reflexes restores baseline and clears its improvements', () => {
		buildSamurai();
		const cyberId = get(character)!.equipment.cyberware[0]!.id;

		removeCyberware(cyberId);

		const char = get(character)!;
		const calc = calculateAll(char);
		expect(char.attributes.ess).toBeCloseTo(6.0);
		expect(calc.initiativeDice).toBe(1);
		expect(char.improvements.some((i) => i.source === 'Cyberware')).toBe(false);
	});

	it('every Cyberware-sourced improvement sourceName matches an existing equipment id', () => {
		buildSamurai();
		const char = get(character)!;
		const equipmentIds = new Set(char.equipment.cyberware.map((c) => c.id));
		const cyberImps = char.improvements.filter((i) => i.source === 'Cyberware');
		expect(cyberImps.length).toBeGreaterThan(0);
		for (const imp of cyberImps) {
			expect(equipmentIds.has(imp.sourceName)).toBe(true);
		}
	});

	it('no orphaned improvements after removing every source', () => {
		buildSamurai();
		const cyberId = get(character)!.equipment.cyberware[0]!.id;
		const armorIdBefore = get(character)!.equipment.armor[0]!.id;
		const qualityId = get(character)!.qualities.find((q) => q.name === 'Toughness')!.id;

		removeCyberware(cyberId);
		removeQuality(qualityId);
		removeArmor(armorIdBefore);

		expect(get(character)!.improvements).toEqual([]);
	});

	it('calculateAll produces only finite numbers (no NaN leaks from string bonus values)', () => {
		buildSamurai();
		const calc = calculateAll(get(character)!);
		for (const [key, value] of Object.entries(calc)) {
			expect(Number.isFinite(value), `${key} should be finite, got ${value}`).toBe(true);
		}
	});
});

describe('GOLDEN 2: Adept (Improved Reflexes 2)', () => {
	/**
	 * Recipe: startNewCharacter('bp') → setMetatype(Human) → addQuality(Adept) →
	 * initializeMagic → REA 4 INT 3 → addPower(Improved Reflexes 2, 2.5 PP)
	 *
	 * Computed:
	 *  - addattribute MAG stores val 0 (desktop parity, #68) — contributes
	 *    nothing to getMagicTotal; MAG total = base 1 (set by addQuality) only.
	 *  - Improved Reflexes 2 bonus: InitiativePass val 2 (uniqueName
	 *    'initiativepass'), Attribute/rea val 2 (uniqueName 'precedence0').
	 *  - REA 4 + 2 (precedence0, overrides) = 6
	 *  - Initiative = REA(6) + INT(3) = 9; InitiativeDice = 1 + 2 = 3
	 *  - powerPointsUsed = 2.5
	 */
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
		setCustomBuildPoints(800);
		setMetatype(realGameData, 'Human');
		addQuality('Adept', 'Positive', 5);
		initializeMagic('');
		setAttribute('rea', 4);
		setAttribute('int', 3);
	});

	function buildAdept(): void {
		const ir2 = findPower('Improved Reflexes 2');
		addPower({ name: ir2.name, points: ir2.points, level: 1, ...(ir2.bonus ? { bonus: ir2.bonus } : {}) });
	}

	it('MAG total is base 1 only — addattribute contributes val 0', () => {
		buildAdept();
		const char = get(character)!;
		expect(char.attributes.mag?.base).toBe(1);
		const magImprovement = char.improvements.find(
			(i) => i.type === 'Attribute' && i.improvedName === 'mag'
		);
		expect(magImprovement?.val).toBe(0);
		expect(magImprovement?.uniqueName).toBe('enableattribute');
	});

	it('matches every computed derived stat', () => {
		buildAdept();
		const char = get(character)!;
		const calc = calculateAll(char);

		expect(calc.initiative).toBe(9);
		expect(calc.initiativeDice).toBe(3);
		expect(char.magic?.powerPointsUsed).toBe(2.5);
	});
});

describe('GOLDEN 3: Samurai + adept stacking probe (illegal build, legal precedence probe)', () => {
	/**
	 * Golden 1's cyberware plus Improved Reflexes 2 stacked on the same
	 * character — desktop's precedence0/precedence1 rule means the adept
	 * power's REA bonus (precedence0) overrides the cyberware's (precedence1)
	 * entirely, and both hardcode uniqueName 'initiativepass' so dice never
	 * exceed the higher single source.
	 */
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
		setCustomBuildPoints(800);
		setMetatype(realGameData, 'Human');
		setAttribute('rea', 4);
		setAttribute('int', 3);
		setResourcesBP(50);
		addQuality('Adept', 'Positive', 5);
		initializeMagic('');
	});

	it('precedence0 (adept) overrides precedence1 (cyberware) for REA; dice never stack', () => {
		addCyberware(findCyberware('Wired Reflexes'), 'Standard', 2);
		const ir2 = findPower('Improved Reflexes 2');
		addPower({ name: ir2.name, points: ir2.points, level: 1, ...(ir2.bonus ? { bonus: ir2.bonus } : {}) });

		const char = get(character)!;
		const calc = calculateAll(char);

		// REA bonus is precedence0 (val 2) only, not precedence1(2) + precedence0(2)
		expect(char.attributes.rea.base + 2).toBe(6); // base 4 + precedence0's 2
		// dice = 1 + max(initiativepass group) = 1 + 2 = 3, never 1 + 2 + 2 = 5
		expect(calc.initiativeDice).toBe(3);
	});
});

describe('GOLDEN 4: Troll bruiser (metatype bonus, overflow, cost doubling, movement)', () => {
	/**
	 * Recipe: startNewCharacter('bp') → setMetatype(Troll) → BOD 6 WIL 3 →
	 * addQuality(Will to Live (Rating 1)) → addQuality(Uneducated) →
	 * setSkill(Hacking, 4) + setSkill(Pistols, 4)
	 *
	 * Computed:
	 *  - Troll metatype bonus: {armor:{b:1,i:1}, reach:1} → BallisticArmor 1,
	 *    ImpactArmor 1, Reach 1, all sourced 'Metatype'/'Troll'.
	 *  - Troll movement "15/35, Swim 7" → walkSpeed 15, runSpeed 35.
	 *  - Will to Live (Rating 1): conditionmonitor.overflow 1 → CMOverflow 1.
	 *    overflow = BOD(6) + 1 = 7.
	 *  - Uneducated doubles Technical Active (Hacking) skill BP, not Combat
	 *    Active (Pistols): 4*4*2 + 4*4 = 48.
	 */
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
		setCustomBuildPoints(800);
		setMetatype(realGameData, 'Troll');
		setAttribute('bod', 6);
		setAttribute('wil', 3);
	});

	it('applies the Troll metatype armor/reach bonus with no worn armor', () => {
		const char = get(character)!;
		const calc = calculateAll(char);
		expect(calc.armorBallistic).toBe(1);
		expect(calc.armorImpact).toBe(1);
		expect(char.improvements).toContainEqual(
			expect.objectContaining({ type: 'Reach', val: 1, source: 'Metatype', sourceName: 'Troll' })
		);
	});

	it('uses the Troll movement string', () => {
		const calc = calculateAll(get(character)!);
		expect(calc.walkSpeed).toBe(15);
		expect(calc.runSpeed).toBe(35);
	});

	it('Will to Live adds to condition monitor overflow', () => {
		addQuality('Will to Live (Rating 1)', 'Positive', 5);
		const calc = calculateAll(get(character)!);
		expect(calc.overflow).toBe(7);
	});

	it('Uneducated doubles Technical Active skill BP, leaves Combat Active flat', async () => {
		const { setSkill } = await import('../skills');
		addQuality('Uneducated', 'Negative', -20);
		setSkill('Hacking', 4);
		setSkill('Pistols', 4);

		const char = get(character)!;
		expect(char.buildPointsSpent.skills).toBe(4 * 4 * 2 + 4 * 4); // 48
	});
});

describe('GOLDEN 5: Technomancer (addattribute RES, echo/livingpersona)', () => {
	/**
	 * Recipe: startNewCharacter('bp') → setMetatype(Human) → addQuality(Technomancer) →
	 * RES 5 WIL 4 INT 4 → initializeResonance → learnEcho with a livingpersona.response bonus.
	 *
	 * No shipped echo currently carries a `livingpersona.response` bonus (surveyed
	 * at write-time: only "Natural Hardening" quality has `livingpersona.biofeedback`,
	 * which #68 deliberately does not produce an improvement for). This golden
	 * injects one synthetic echo via setGameDataForTesting to exercise the
	 * LivingPersonaResponse wiring — everything else uses real data.
	 *
	 * calculateMatrixInitiative still reads INT + RES (not desktop's technomancer-
	 * specific (INT×2)+1+ValueOf(LivingPersonaResponse) formula, clsCharacter.cs:3823) —
	 * that rewrite is explicitly deferred to issue #79 (see #68's commit). This
	 * golden asserts the CURRENT formula's result and documents the divergence
	 * rather than asserting the desktop-correct value.
	 */
	const SYNTHETIC_ECHO: GameEcho = {
		name: 'Test Echo (Living Persona Response)',
		source: 'SR4',
		page: 0,
		limit: 1,
		bonusText: '',
		bonus: { livingpersona: { response: 1 } }
	};

	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
		setCustomBuildPoints(800);
		setMetatype(realGameData, 'Human');
		addQuality('Technomancer', 'Positive', 5);
		// initializeResonance resets attributes.res to its base:1 default, so it
		// must run before setAttribute raises it — otherwise setAttribute's value
		// is clobbered (this ordering bit us once while writing this suite).
		initializeResonance('');
		setAttribute('res', 5);
		setAttribute('wil', 4);
		setAttribute('int', 4);
		setGameDataForTesting({ ...realGameData, echoes: [SYNTHETIC_ECHO] });
	});

	it('addattribute contributes val 0 to the RES improvement (the base value itself comes from setAttribute)', () => {
		const char = get(character)!;
		expect(char.attributes.res?.base).toBe(5);
		const resImprovement = char.improvements.find(
			(i) => i.type === 'Attribute' && i.improvedName === 'res'
		);
		expect(resImprovement?.val).toBe(0);
	});

	it('fading resistance is RES + WIL', () => {
		const calc = calculateAll(get(character)!);
		expect(calc.fadingResist).toBe(5 + 4);
	});

	it('learnEcho with livingpersona.response produces a LivingPersonaResponse improvement', async () => {
		const { submerge, awardKarma, enterCareerMode } = await import('../../stores');
		enterCareerMode();
		awardKarma(100, 'Test karma');
		const submergeResult = submerge();
		expect(submergeResult.success).toBe(true);

		const learnResult = learnEcho('Test Echo (Living Persona Response)');
		expect(learnResult.success).toBe(true);

		const improvement = get(character)!.improvements.find((i) => i.type === 'LivingPersonaResponse');
		expect(improvement?.val).toBe(1);
	});

	it('matrix initiative uses the current INT+RES formula (documented divergence from desktop, see #79)', () => {
		const calc = calculateAll(get(character)!);
		// desktop technomancer formula would be (INT*2)+1+LivingPersonaResponse = (4*2)+1+? ;
		// current web formula is INT + RES = 4 + 5 = 9 — divergence tracked in #79.
		expect(calc.matrixInitiative).toBe(9);
	});
});

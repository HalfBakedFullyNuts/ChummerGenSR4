import { describe, it, expect, beforeEach } from 'vitest';
import * as calculations from '../calculations';
import { createEmptyCharacter, type Character } from '$types';

// Let's create a helper to build a default character for tests
function createBaseCharacter(): Character {
	const char = createEmptyCharacter('test-char', 'test-user', 'bp');

	return {
		...char,
		identity: {
			...char.identity,
			name: 'Test Character',
			metatype: 'Human',
			age: '25',
			sex: 'Male',
			height: '180cm',
			weight: '80kg'
		},
		attributes: {
			bod: { base: 3, bonus: 0, karma: 0 },
			agi: { base: 3, bonus: 0, karma: 0 },
			rea: { base: 3, bonus: 0, karma: 0 },
			str: { base: 3, bonus: 0, karma: 0 },
			cha: { base: 3, bonus: 0, karma: 0 },
			int: { base: 3, bonus: 0, karma: 0 },
			log: { base: 3, bonus: 0, karma: 0 },
			wil: { base: 3, bonus: 0, karma: 0 },
			edg: { base: 3, bonus: 0, karma: 0 },
			mag: { base: 0, bonus: 0, karma: 0 },
			res: { base: 0, bonus: 0, karma: 0 },
			ess: 6.0
		},
		magic: {
			tradition: '',
			mentor: null,
			initiateGrade: 0,
			powerPoints: 0,
			powerPointsUsed: 0,
			spells: [],
			powers: [],
			spirits: [],
			metamagics: []
		},
		equipment: {
			weapons: [],
			armor: [],
			cyberware: [],
			bioware: [],
			gear: [],
			vehicles: [],
			lifestyle: {
				id: 'lifestyle-1',
				name: 'Low',
				level: 'Low',
				monthlyCost: 2000,
				monthsPrepaid: 0,
				location: '',
				notes: ''
			},
			martialArts: [],
			foci: []
		},
		condition: {
			physicalMax: 10,
			physicalCurrent: 0,
			stunMax: 10,
			stunCurrent: 0,
			overflow: 0,
			edgeCurrent: 0
		},
		buildPoints: 400
	};
}

describe('calculations engine', () => {
    let char: any;

    beforeEach(() => {
        char = createBaseCharacter();
    });

    describe('Attribute Helpers', () => {
        it('getAttributeTotal calculates base + bonus + improvements', () => {
            char.attributes.agi = { base: 4, bonus: 1, karma: 0 };
            char.improvements = [{
                id: 'imp-1',
                type: 'Attribute',
                improvedName: 'agi',
                source: 'Cyberware',
                sourceName: 'Muscle Toner',
                val: 2,
                min: 0, max: 0, aug: 0, augMax: 0, rating: 2,
                exclude: '', uniqueName: '', addToRating: false, enabled: true
            }];

            expect(calculations.getAttributeTotal(char, 'agi')).toBe(7); // 4 + 1 + 2
        });

        it('getMagicTotal returns 0 if mundane, or correct value', () => {
            expect(calculations.getMagicTotal(char)).toBe(0);

            char.attributes.mag = { base: 3, bonus: 1, karma: 0 };
            expect(calculations.getMagicTotal(char)).toBe(4);
        });

        it('getResonanceTotal returns 0 if not technomancer, or correct value', () => {
            expect(calculations.getResonanceTotal(char)).toBe(0);

            char.attributes.res = { base: 4, bonus: 0, karma: 0 };
            expect(calculations.getResonanceTotal(char)).toBe(4);
        });

        it('getEssence returns essence', () => {
            char.attributes.ess = 4.5;
            expect(calculations.getEssence(char)).toBe(4.5);
        });

        it('getAttributeNaturalMax is metatype max plus Attribute "max" improvements (issue #66)', () => {
            expect(calculations.getAttributeNaturalMax(char, 'bod')).toBe(6); // human default
            char.improvements = [{
                id: 'imp-1', type: 'Attribute', improvedName: 'bod', source: 'Quality', sourceName: 'Exceptional Attribute',
                val: 0, min: 0, max: 1, aug: 0, augMax: 0, rating: 1,
                exclude: '', uniqueName: '', addToRating: false, enabled: true
            }];
            expect(calculations.getAttributeNaturalMax(char, 'bod')).toBe(7);
        });

        it('getAttributeAugmentedMax uses the metatype-provided aug cap, not a floor(max*1.5) formula (issue #66)', () => {
            // Human default: bod aug=9 (does follow 1.5x by coincidence), mag aug=6 (does NOT — no augmentation multiplier for MAG in SR4)
            expect(calculations.getAttributeAugmentedMax(char, 'bod')).toBe(9);
            expect(calculations.getAttributeAugmentedMax(char, 'mag')).toBe(6);
        });

        it('getAttributeTotal clamps to augmented max, not natural max x improvements (issue #66)', () => {
            char.attributes.bod.base = 6; // at natural max already
            char.improvements = [{
                id: 'imp-1', type: 'Attribute', improvedName: 'bod', source: 'Cyberware', sourceName: 'Bone Lacing',
                val: 5, min: 0, max: 0, aug: 0, augMax: 0, rating: 1,
                exclude: '', uniqueName: '', addToRating: false, enabled: true
            }];
            // 6 base + 5 improvement = 11, but augmented max is 9 -> clamps to 9
            expect(calculations.getAttributeTotal(char, 'bod')).toBe(9);
        });
    });

    describe('Condition Monitors', () => {
        it('calculatePhysicalCM equals ceil(bod/2) + 8 + bonus', () => {
            char.attributes.bod.base = 5; // ceil(5/2) = 3; 3+8 = 11
            expect(calculations.calculatePhysicalCM(char)).toBe(11);

            char.improvements = [{
                id: 'imp-1', type: 'PhysicalCM', improvedName: '', source: 'Quality', sourceName: 'Toughness',
                val: 1, min: 0, max: 0, aug: 0, augMax: 0, rating: 1,
                exclude: '', uniqueName: '', addToRating: false, enabled: true
            }];
            expect(calculations.calculatePhysicalCM(char)).toBe(12);
        });

        it('calculateStunCM equals ceil(wil/2) + 8 + bonus', () => {
            char.attributes.wil.base = 4; // ceil(4/2) = 2; 2+8 = 10
            expect(calculations.calculateStunCM(char)).toBe(10);
        });

        it('calculateOverflow equals bod + bonus', () => {
            char.attributes.bod.base = 6;
            expect(calculations.calculateOverflow(char)).toBe(6);

            char.improvements = [
                { id: '1', type: 'CMOverflow', improvedName: '', source: 'Quality', sourceName: 'Test', val: 2, min: 0, max: 0, aug: 0, augMax: 0, rating: 1, exclude: '', uniqueName: '', addToRating: false, enabled: true },
                { id: '2', type: 'PhysicalCM', improvedName: '', source: 'Quality', sourceName: 'Test2', val: 1, min: 0, max: 0, aug: 0, augMax: 0, rating: 1, exclude: '', uniqueName: '', addToRating: false, enabled: true }
            ];
            expect(calculations.calculateOverflow(char)).toBe(9);
        });

        it('getWoundModifier calculates -1 per 3 boxes total damage? Wait, the logic in code might be subtracting both?', () => {
            char.condition.physicalCurrent = 4; // flor(4/3) = 1
            char.condition.stunCurrent = 2; // floor(2/3) = 0
            expect(calculations.getWoundModifier(char)).toBe(-1); // from physical

            char.condition.physicalCurrent = 3; // 1
            char.condition.stunCurrent = 3; // 1
            // Actually looking at code: `return -(physicalMod + stunMod);` So -2.
            expect(calculations.getWoundModifier(char)).toBe(-2);
        });
    });

    describe('Initiative and Movement', () => {
        it('calculateInitiative returns rea + int + bonus', () => {
            char.attributes.rea.base = 4;
            char.attributes.int.base = 3;
            expect(calculations.calculateInitiative(char)).toBe(7);
        });

        it('calculateInitiativeDice takes the highest InitiativePass improvement (cyberware and adept powers no longer stack, #63b)', () => {
            expect(calculations.calculateInitiativeDice(char)).toBe(1);

            // Simulates what addCyberware('Wired Reflexes', rating 2) creates (#62c)
            char.improvements = [{
                id: 'imp-1', type: 'InitiativePass', improvedName: '', source: 'Cyberware', sourceName: 'cyber-1',
                val: 2, min: 0, max: 0, aug: 0, augMax: 0, rating: 2,
                exclude: '', uniqueName: 'initiativepass', addToRating: false, enabled: true
            }];
            expect(calculations.calculateInitiativeDice(char)).toBe(3); // 1 + 2

            // Simulates what addPower('Improved Reflexes 2') creates (#63b) — same
            // hardcoded uniqueName as cyberware, so desktop's InitiativePass sources
            // never stack: highest wins, not sum.
            char.improvements = [
                ...char.improvements,
                {
                    id: 'imp-2', type: 'InitiativePass', improvedName: '', source: 'Power', sourceName: 'p1',
                    val: 2, min: 0, max: 0, aug: 0, augMax: 0, rating: 1,
                    exclude: '', uniqueName: 'initiativepass', addToRating: false, enabled: true
                }
            ];
            expect(calculations.calculateInitiativeDice(char)).toBe(3); // 1 + max(2, 2)
        });

        it('cyberware REA bonus flows through getAttributeTotal via the Attribute improvement, not name-matching (#62c)', () => {
            char.attributes.rea.base = 3;
            char.improvements = [{
                id: 'imp-1', type: 'Attribute', improvedName: 'rea', source: 'Cyberware', sourceName: 'cyber-1',
                val: 2, min: 0, max: 0, aug: 0, augMax: 0, rating: 2,
                exclude: '', uniqueName: 'precedence1', addToRating: false, enabled: true
            }];
            expect(calculations.getAttributeTotal(char, 'rea')).toBe(5); // 3 base + 2 improvement
        });

        it('calculateWalkSpeed and calculateRunSpeed', () => {
            char.attributes.agi.base = 5;
            expect(calculations.calculateWalkSpeed(char)).toBe(10);
            expect(calculations.calculateRunSpeed(char)).toBe(20);
        });

        it('calculateSprintBonus based on metatype', () => {
            char.identity.metatype = 'Elf';
            expect(calculations.calculateSprintBonus(char)).toBe(1);
        });
    });

    describe('Limits', () => {
        it('calculatePhysicalLimit', () => {
            char.attributes.str.base = 4;
            char.attributes.bod.base = 3;
            char.attributes.rea.base = 5;
            // (4*2 + 3 + 5) / 3 = 16 / 3 = 5.33 => 6
            expect(calculations.calculatePhysicalLimit(char)).toBe(6);
        });

        it('calculateMentalLimit', () => {
            char.attributes.log.base = 2;
            char.attributes.int.base = 4;
            char.attributes.wil.base = 4;
            // (2*2 + 4 + 4) / 3 = 12 / 3 = 4
            expect(calculations.calculateMentalLimit(char)).toBe(4);
        });
        it('calculateSocialLimit', () => {
            char.attributes.cha.base = 5;
            char.attributes.wil.base = 4;
            char.attributes.ess = 5.5;
            // (5*2 + 4 + 5) / 3 = 19 / 3 = 6.33 => 7
            expect(calculations.calculateSocialLimit(char)).toBe(7);
        });
    });

    describe('Dice Pools and Special Attributes', () => {
        it('calculateDicePool with skill', () => {
            char.attributes.agi.base = 4;
            char.skills = [{
                id: 's1', name: 'Pistols', rating: 3, bonus: 1, base: 3, karma: 0,
                isKnowledge: false, isLanguage: false,
                skillgroup: '', category: '', default: true, specs: []
            }];
            char.condition.physicalCurrent = 3; // -1 modifier

            // skill.bonus (deprecated, issue #65) no longer counts — improvements are
            // the sole source of skill bonuses now: 4 (AGI) + 3 (Rating) - 1 (Wound) = 6
            expect(calculations.calculateDicePool(char, 'Pistols', 'agi')).toBe(6);
        });

        it('calculateDicePool applies Skill/SkillGroup/SkillCategory improvements (issue #65)', () => {
            char.attributes.agi.base = 4;
            char.skills = [{
                id: 's1', name: 'Pistols', rating: 3, bonus: 0, base: 3, karma: 0,
                isKnowledge: false, isLanguage: false,
                skillgroup: 'Firearms', category: 'Combat Active', default: true, specs: [],
                group: 'Firearms'
            }];
            char.improvements = [
                {
                    id: 'i1', type: 'Skill', improvedName: 'Pistols', source: 'Quality', sourceName: 'Aptitude',
                    val: 2, min: 0, max: 0, aug: 0, augMax: 0, rating: 1,
                    exclude: '', uniqueName: '', addToRating: false, enabled: true
                },
                {
                    id: 'i2', type: 'SkillCategory', improvedName: 'Combat Active', source: 'Quality', sourceName: 'Glamour',
                    val: 3, min: 0, max: 0, aug: 0, augMax: 0, rating: 1,
                    exclude: 'Dodge', uniqueName: '', addToRating: false, enabled: true
                }
            ];
            // 4 (AGI) + 3 (Rating) + 2 (Skill bonus) + 3 (Category bonus, not excluded) = 12
            expect(calculations.calculateDicePool(char, 'Pistols', 'agi')).toBe(12);
        });

        it('calculateDicePool honors SkillCategory exclude', () => {
            char.attributes.agi.base = 4;
            char.skills = [{
                id: 's1', name: 'Dodge', rating: 2, bonus: 0, base: 2, karma: 0,
                isKnowledge: false, isLanguage: false,
                skillgroup: '', category: 'Combat Active', default: true, specs: [],
                group: ''
            }];
            char.improvements = [{
                id: 'i1', type: 'SkillCategory', improvedName: 'Combat Active', source: 'Quality', sourceName: 'Glamour',
                val: 3, min: 0, max: 0, aug: 0, augMax: 0, rating: 1,
                exclude: 'Dodge', uniqueName: '', addToRating: false, enabled: true
            }];
            // Dodge is on the exclude list, so the Combat Active bonus does not apply: 4 (AGI) + 2 (Rating) = 6
            expect(calculations.calculateDicePool(char, 'Dodge', 'agi')).toBe(6);
        });

        it('calculateDicePool addToRating improvements raise effective rating, not the pool bonus directly', () => {
            char.attributes.agi.base = 4;
            char.skills = [{
                id: 's1', name: 'Pistols', rating: 3, bonus: 0, base: 3, karma: 0,
                isKnowledge: false, isLanguage: false,
                skillgroup: '', category: '', default: true, specs: [], group: ''
            }];
            char.improvements = [{
                id: 'i1', type: 'Skill', improvedName: 'Pistols', source: 'Quality', sourceName: 'Aptitude (Pistols)',
                val: 1, min: 0, max: 0, aug: 0, augMax: 0, rating: 1,
                exclude: '', uniqueName: '', addToRating: true, enabled: true
            }];
            // effective rating 3+1=4; pool = 4 (AGI) + 4 (effective rating) = 8
            expect(calculations.calculateDicePool(char, 'Pistols', 'agi')).toBe(8);
        });

        it('calculateDicePool without skill allowing default', () => {
            char.attributes.agi.base = 4;
            char.skills = []; // No skill
            char.condition.physicalCurrent = 0; // 0 modifier

            // Defaults to attr - 1: 4 - 1 = 3
            expect(calculations.calculateDicePool(char, 'Pistols', 'agi')).toBe(3);
        });

        it('no defaulting on Technical Active skills when Uneducated (issue #67)', () => {
            char.attributes.log.base = 4;
            char.skills = []; // no Hacking skill
            char.improvements = [{
                id: 'f', type: 'Uneducated', improvedName: '', source: 'Quality', sourceName: 'Uneducated',
                val: 1, min: 0, max: 0, aug: 0, augMax: 0, rating: 1,
                exclude: '', uniqueName: '', addToRating: false, enabled: true
            }];

            expect(calculations.calculateDicePool(char, 'Hacking', 'log', 'Technical Active')).toBe(0);
        });

        it('no defaultCategory means defaulting behaves as before, even when Uneducated', () => {
            char.attributes.log.base = 4;
            char.skills = [];
            char.improvements = [{
                id: 'f', type: 'Uneducated', improvedName: '', source: 'Quality', sourceName: 'Uneducated',
                val: 1, min: 0, max: 0, aug: 0, augMax: 0, rating: 1,
                exclude: '', uniqueName: '', addToRating: false, enabled: true
            }];

            expect(calculations.calculateDicePool(char, 'Hacking', 'log')).toBe(3); // 4 - 1
        });

        it('calculateComposure calculates CHA + WIL + improvement', () => {
            char.attributes.cha.base = 3;
            char.attributes.wil.base = 4;
            expect(calculations.calculateComposure(char)).toBe(7);
        });

        it('calculateJudgeIntentions calculates CHA + INT + improvement', () => {
            char.attributes.cha.base = 3;
            char.attributes.int.base = 5;
            expect(calculations.calculateJudgeIntentions(char)).toBe(8);
        });

        it('calculateMemory calculates LOG + WIL + improvement', () => {
            char.attributes.log.base = 4;
            char.attributes.wil.base = 3;
            expect(calculations.calculateMemory(char)).toBe(7);
        });

        it('calculateLiftCarry calculates BOD + STR + improvement', () => {
            char.attributes.bod.base = 5;
            char.attributes.str.base = 5;
            expect(calculations.calculateLiftCarry(char)).toBe(10);
        });
    });

    describe('Combat Values', () => {
        it('calculateDefense is REA + INT', () => {
            char.attributes.rea.base = 4;
            char.attributes.int.base = 3;
            expect(calculations.calculateDefense(char)).toBe(7);
        });

        it('calculateDodge is REA + Dodge skill + modifiers', () => {
            char.attributes.rea.base = 4;
            char.skills = [{
                id: 's1', name: 'Dodge', rating: 3, bonus: 0, base: 3, karma: 0,
                isKnowledge: false, isLanguage: false,
                skillgroup: '', category: '', default: true, specs: []
            }];
            expect(calculations.calculateDodge(char)).toBe(7);
        });

        it('calculateArmorBallistic calculates highest + half of remainder + bonus', () => {
            char.equipment.armor = [
                { id: 'a1', name: 'Jacket', ballistic: 4, impact: 2, capacity: 0, cost: 0, equipable: true, equipped: true, armorCapacity: 0 },
                { id: 'a2', name: 'Vest', ballistic: 2, impact: 3, capacity: 0, cost: 0, equipable: true, equipped: true, armorCapacity: 0 }
            ];
            // highest 4 + Math.floor(2/2) = 5
            expect(calculations.calculateArmorBallistic(char)).toBe(5);
        });

        it('calculateArmorImpact calculates highest + half of remainder + bonus', () => {
            char.equipment.armor = [
                { id: 'a1', name: 'Jacket', ballistic: 4, impact: 2, capacity: 0, cost: 0, equipable: true, equipped: true, armorCapacity: 0 },
                { id: 'a2', name: 'Vest', ballistic: 2, impact: 5, capacity: 0, cost: 0, equipable: true, equipped: true, armorCapacity: 0 }
            ];
            // highest 5 + Math.floor(2/2) = 6
            expect(calculations.calculateArmorImpact(char)).toBe(6);
        });

        it('Toughness (DamageResistance) adds to damage soak, not condition monitor (issue #64)', () => {
            char.attributes.bod.base = 4;
            char.equipment.armor = [
                { id: 'a1', name: 'Jacket', ballistic: 8, impact: 6, capacity: 0, cost: 0, equipable: true, equipped: true, armorCapacity: 0 }
            ];
            char.improvements = [{
                id: 'imp-1', type: 'DamageResistance', improvedName: '', source: 'Quality', sourceName: 'Toughness',
                val: 1, min: 0, max: 0, aug: 0, augMax: 0, rating: 1,
                exclude: '', uniqueName: '', addToRating: false, enabled: true
            }];
            // BOD 4 + ballistic 8 + DamageResistance 1 = 13
            expect(calculations.calculateDamageSoakBallistic(char)).toBe(13);
            // Toughness does not touch the physical condition monitor
            expect(calculations.calculatePhysicalCM(char)).toBe(10); // ceil(4/2) + 8, no bonus
        });
    });

    describe('Magic and Matrix', () => {
        it('calculateDrainResist calculates based on tradition', () => {
            char.magic!.tradition = 'Hermetic';
            char.attributes.wil.base = 4;
            char.attributes.log.base = 5;
            char.attributes.cha.base = 2; // Shouldn't be used
            expect(calculations.calculateDrainResist(char)).toBe(9);

            char.magic!.tradition = 'Shamanic'; // Default fallback
            expect(calculations.calculateDrainResist(char)).toBe(6); // WIL + CHA
        });

        it('calculateAstralInitiative is INT * 2', () => {
            char.attributes.int.base = 4;
            expect(calculations.calculateAstralInitiative(char)).toBe(8);
            expect(calculations.calculateAstralInitiativeDice()).toBe(2);
        });

        it('calculateFadingResist is RES + WIL if resonant', () => {
            // No resonance
            expect(calculations.calculateFadingResist(char)).toBe(0);

            // With resonance
            char.resonance = { programs: [], complexForms: [], forms: [] };
            char.attributes.res = { base: 4, bonus: 0, karma: 0 };
            char.attributes.wil.base = 5;
            expect(calculations.calculateFadingResist(char)).toBe(9);
        });

        it('calculateMatrixInitiative is INT + RES', () => {
            char.attributes.int.base = 4;
            char.attributes.res = { base: 4, bonus: 0, karma: 0 };
            expect(calculations.calculateMatrixInitiative(char)).toBe(8);
            expect(calculations.calculateMatrixInitiativeDice(char)).toBe(3);
        });
    });

    describe('calculateAll', () => {
        it('returns an object wrapping all calculation functions', () => {
            const results = calculations.calculateAll(char);
            expect(results).toHaveProperty('physicalCM');
            expect(results).toHaveProperty('defense');
            expect(results).toHaveProperty('drainResist');
            expect(results.initiativeDice).toBeGreaterThanOrEqual(1);
        });
    });

});

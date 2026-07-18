import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    valueOf,
    removeImprovements,
    createImprovementsFromBonus,
    resolveBonusValue
} from '../improvementManager';
import type { Improvement } from '$types';

describe('ImprovementManager', () => {
    let mockImprovements: Improvement[];

    beforeEach(() => {
        mockImprovements = [
            {
                id: 'imp-1',
                type: 'PhysicalCM',
                source: 'Quality',
                sourceName: 'Toughness',
                improvedName: 'PhysicalCM',
                val: 1,
                min: 0,
                max: 0,
                aug: 0,
                augMax: 0,
                rating: 1,
                exclude: '',
                uniqueName: '',
                addToRating: false,
                enabled: true
            },
            {
                id: 'imp-2',
                type: 'Reaction',
                source: 'Cyberware',
                sourceName: 'Wired Reflexes 2',
                improvedName: 'Reaction',
                val: 2,
                min: 0,
                max: 0,
                aug: 2,
                augMax: 0,
                rating: 2,
                exclude: '',
                uniqueName: 'Wired Reflexes Bonus',
                addToRating: false,
                enabled: true
            },
            {
                id: 'imp-3',
                type: 'Reaction',
                source: 'Spell',
                sourceName: 'Increase Reflexes',
                improvedName: 'Reaction',
                val: 3,
                min: 0,
                max: 0,
                aug: 3,
                augMax: 0,
                rating: 1,
                exclude: '',
                uniqueName: 'Wired Reflexes Bonus', // Overlaps uniqueness
                addToRating: false,
                enabled: true
            },
            {
                id: 'imp-4',
                type: 'Skill',
                source: 'Quality',
                sourceName: 'Aptitude (Pistols)',
                improvedName: 'Pistols',
                val: 1,
                min: 0,
                max: 1,
                aug: 0,
                augMax: 0,
                rating: 1,
                exclude: '',
                uniqueName: '',
                addToRating: true,
                enabled: true
            },
            {
                id: 'imp-5',
                type: 'PhysicalCM',
                source: 'Quality',
                sourceName: 'Fragile',
                improvedName: 'PhysicalCM',
                val: -1,
                min: 0,
                max: 0,
                aug: 0,
                augMax: 0,
                rating: 1,
                exclude: '',
                uniqueName: '',
                addToRating: false,
                enabled: false // Disabled
            }
        ];
    });

    it('calculates flat sum of values', () => {
        expect(valueOf(mockImprovements, 'PhysicalCM')).toBe(1);
    });

    it('ignores disabled improvements', () => {
        mockImprovements[0]!.enabled = false;
        expect(valueOf(mockImprovements, 'PhysicalCM')).toBe(0);
    });

    it('respects uniqueName grouping by taking the highest', () => {
        // Both imp-2 (val 2) and imp-3 (val 3) have same uniqueName.
        // Value should be highest: 3
        expect(valueOf(mockImprovements, 'Reaction')).toBe(3);
    });

    it('filters by improvedName successfully', () => {
        expect(valueOf(mockImprovements, 'Skill', 'Pistols')).toBe(1);
        expect(valueOf(mockImprovements, 'Skill', 'Longarms')).toBe(0);
    });

    it('removes improvements by source and sourceName successfully', () => {
        const filtered = removeImprovements(mockImprovements, 'Cyberware', 'Wired Reflexes 2');
        expect(filtered.length).toBe(mockImprovements.length - 1);
        expect(filtered.find(i => i.id === 'imp-2')).toBeUndefined();
    });

    describe('valueOf precedence0/precedence1 (issue #63b)', () => {
        const attr = (overrides: Partial<Improvement>): Improvement => ({
            id: overrides.id ?? 'imp',
            type: 'Attribute',
            source: 'Cyberware',
            sourceName: 'src',
            improvedName: 'rea',
            val: 0,
            min: 0,
            max: 0,
            aug: 0,
            augMax: 0,
            rating: 1,
            exclude: '',
            uniqueName: '',
            addToRating: false,
            enabled: true,
            ...overrides
        });

        it('precedence1 sums and overrides plain', () => {
            const imps = [
                attr({ id: 'plain', val: 1, uniqueName: '' }),
                attr({ id: 'p1a', val: 2, uniqueName: 'precedence1' }),
                attr({ id: 'p1b', val: 1, uniqueName: 'precedence1' })
            ];
            // plain +1 ignored once precedence1 entries are present; 2 + 1 = 3
            expect(valueOf(imps, 'Attribute', 'rea')).toBe(3);
        });

        it('precedence0 overrides all', () => {
            const imps = [
                attr({ id: 'plain', val: 1, uniqueName: '' }),
                attr({ id: 'p1a', val: 2, uniqueName: 'precedence1' }),
                attr({ id: 'p1b', val: 1, uniqueName: 'precedence1' }),
                attr({ id: 'p0', val: 2, uniqueName: 'precedence0' })
            ];
            expect(valueOf(imps, 'Attribute', 'rea')).toBe(2);
        });

        it('precedence0 takes only the highest among multiple precedence0 entries', () => {
            const imps = [
                attr({ id: 'p0a', val: 2, uniqueName: 'precedence0' }),
                attr({ id: 'p0b', val: 5, uniqueName: 'precedence0' })
            ];
            expect(valueOf(imps, 'Attribute', 'rea')).toBe(5);
        });
    });

    describe('createImprovementsFromBonus', () => {
        it('handles undefined bonusData gracefully', () => {
            const imps = createImprovementsFromBonus('Quality', 'Test', null as any);
            expect(imps).toEqual([]);
        });

        it('parses specificattribute bonuses', () => {
            const bonusData = {
                specificattribute: [
                    { name: 'Strength', val: 2, aug: 0, min: 0, max: 0 }
                ]
            };
            const imps = createImprovementsFromBonus('Quality', 'Test', bonusData);
            expect(imps.length).toBe(1);
            expect(imps[0]!.type).toBe('Attribute');
            expect(imps[0]!.improvedName).toBe('strength');
            expect(imps[0]!.val).toBe(2);
        });

        it('parses selectattribute with user selection', () => {
            const bonusData = {
                selectattribute: { val: 1, min: 0, max: 0 }
            };
            const imps = createImprovementsFromBonus('Quality', 'Test', bonusData, 1, undefined, 'Agility');
            expect(imps.length).toBe(1);
            expect(imps[0]!.type).toBe('Attribute');
            expect(imps[0]!.improvedName).toBe('agility');
            expect(imps[0]!.val).toBe(1);
        });

        it('parses specificskill and selectskill', () => {
            const bonusData = {
                specificskill: [
                    { name: 'Pistols', bonus: 2, max: 0 }
                ],
                selectskill: { bonus: 1, max: 0 }
            };
            const imps = createImprovementsFromBonus('Quality', 'Test', bonusData, 1, 'Longarms');
            expect(imps.length).toBe(2);
            expect(imps[0]!.type).toBe('Skill');
            expect(imps[0]!.improvedName).toBe('Pistols');
            expect(imps[0]!.val).toBe(2);
            expect(imps[1]!.type).toBe('Skill');
            expect(imps[1]!.improvedName).toBe('Longarms');
            expect(imps[1]!.val).toBe(1);
        });

        it('parses skillgroup and skillcategory', () => {
            const bonusData = {
                skillgroup: [
                    { name: 'Firearms', bonus: 1 }
                ],
                skillcategory: [
                    { name: 'Combat', bonus: 1 }
                ]
            };
            const imps = createImprovementsFromBonus('Quality', 'Test', bonusData);
            expect(imps.length).toBe(2);
            expect(imps[0]!.type).toBe('SkillGroup');
            expect(imps[0]!.improvedName).toBe('Firearms');
            expect(imps[1]!.type).toBe('SkillCategory');
            expect(imps[1]!.improvedName).toBe('Combat');
        });

        it('parses prop mappings', () => {
            const bonusData = {
                initiative: 1,
                initiativepass: 2,
                cyberwareessmultiplier: 0.8
            };
            const imps = createImprovementsFromBonus('Quality', 'Test', bonusData);
            expect(imps.length).toBe(3);
            expect(imps.find(i => i.type === 'Initiative')!.val).toBe(1);
            expect(imps.find(i => i.type === 'InitiativePass')!.val).toBe(2);
            expect(imps.find(i => i.type === 'CyberwareEssCost')!.val).toBe(0.8);
        });

        it('parses flags and special tabs', () => {
            const bonusData = {
                uneducated: 1,
                enabletab: 'Magician'
            };
            const imps = createImprovementsFromBonus('Quality', 'Test', bonusData);
            expect(imps.length).toBe(2);
            expect(imps.find(i => i.type === 'Uneducated')!.val).toBe(1);
            expect(imps.find(i => i.type === 'SpecialTab')!.improvedName).toBe('Magician');
        });

        it('resolves Rating-based bonus strings using the item rating (issue #66)', () => {
            const bonusData = {
                initiativepass: 'Rating',
                specificattribute: [{ name: 'REA', precedence: '1', val: 'Rating' }]
            };
            const imps = createImprovementsFromBonus('Cyberware', 'Wired Reflexes', bonusData, 2);
            const initPass = imps.find(i => i.type === 'InitiativePass')!;
            expect(initPass.val).toBe(2);
            // desktop hardcodes uniqueName "initiativepass" on every InitiativePass improvement (#63b)
            expect(initPass.uniqueName).toBe('initiativepass');
            const rea = imps.find(i => i.type === 'Attribute');
            expect(rea!.improvedName).toBe('rea');
            expect(rea!.val).toBe(2);
            // <name precedence="1"> emits uniqueName "precedence1" (#63b)
            expect(rea!.uniqueName).toBe('precedence1');
        });

        it('specificattribute without a precedence attribute gets no uniqueName', () => {
            const bonusData = {
                specificattribute: [{ name: 'REA', val: 1 }]
            };
            const imps = createImprovementsFromBonus('Cyberware', 'Reaction Enhancers', bonusData);
            expect(imps[0]!.uniqueName).toBe('');
        });

        it('parses conditionmonitor.overflow (issue #64, Will to Live)', () => {
            const bonusData = { conditionmonitor: { overflow: 1 } };
            const imps = createImprovementsFromBonus('Quality', 'Will to Live (Rating 1)', bonusData);
            expect(imps).toEqual([
                expect.objectContaining({ type: 'CMOverflow', val: 1, uniqueName: '' })
            ]);
        });

        it('parses conditionmonitor.thresholdoffset with a precedence attribute (issue #64, High Pain Tolerance)', () => {
            const bonusData = {
                conditionmonitor: { thresholdoffset: { value: 1, precedence: '0' } }
            };
            const imps = createImprovementsFromBonus('Quality', 'High Pain Tolerance (Rating 1)', bonusData);
            expect(imps).toEqual([
                expect.objectContaining({ type: 'CMThresholdOffset', val: 1, uniqueName: 'precedence0' })
            ]);
        });

        it('parses conditionmonitor.physical/stun/threshold', () => {
            const bonusData = { conditionmonitor: { physical: 2, stun: 1, threshold: -1 } };
            const imps = createImprovementsFromBonus('Quality', 'Test', bonusData);
            expect(imps.find(i => i.type === 'PhysicalCM')!.val).toBe(2);
            expect(imps.find(i => i.type === 'StunCM')!.val).toBe(1);
            expect(imps.find(i => i.type === 'CMThreshold')!.val).toBe(-1);
        });

        it('parses armor bonus into BallisticArmor/ImpactArmor (issue #64, Troll metatype)', () => {
            const bonusData = { armor: { b: 1, i: 1 } };
            const imps = createImprovementsFromBonus('Metatype', 'Troll', bonusData);
            expect(imps).toEqual([
                expect.objectContaining({ type: 'BallisticArmor', val: 1 }),
                expect.objectContaining({ type: 'ImpactArmor', val: 1 })
            ]);
        });

        it('parses memory and fadingresist prop mappings (issue #64)', () => {
            const bonusData = { memory: 1, fadingresist: 2 };
            const imps = createImprovementsFromBonus('Quality', 'Test', bonusData);
            expect(imps.find(i => i.type === 'Memory')!.val).toBe(1);
            expect(imps.find(i => i.type === 'FadingResistance')!.val).toBe(2);
        });

        it('no longer produces the dead ConditionMonitor type', () => {
            const bonusData = { conditionmonitor: { overflow: 1 } };
            const imps = createImprovementsFromBonus('Quality', 'Test', bonusData);
            expect(imps.some(i => (i.type as string) === 'ConditionMonitor')).toBe(false);
        });

        it('rating upgrade is remove-then-recreate, never in-place mutation', () => {
            const bonusData = { initiativepass: 'Rating' };
            const rating2 = createImprovementsFromBonus('Cyberware', 'Wired Reflexes', bonusData, 2);
            expect(rating2[0]!.val).toBe(2);
            const afterRemoval = removeImprovements(rating2, 'Cyberware', 'Wired Reflexes');
            expect(afterRemoval).toEqual([]);
            const rating3 = createImprovementsFromBonus('Cyberware', 'Wired Reflexes', bonusData, 3);
            expect(rating3[0]!.val).toBe(3);
        });

        it('maps specificattribute aug to augMax, not aug (issue #66 desktop field-mapping fix)', () => {
            const bonusData = {
                specificattribute: [{ name: 'BOD', min: 1, max: 6, val: 1, aug: 6 }]
            };
            const imps = createImprovementsFromBonus('Quality', 'Test', bonusData);
            expect(imps[0]).toMatchObject({ min: 1, max: 6, val: 1, augMax: 6, aug: 0 });
        });
    });

    describe('resolveBonusValue (issue #66)', () => {
        it('resolves the documented value table', () => {
            expect(resolveBonusValue(3, 2)).toBe(3);
            expect(resolveBonusValue('Rating', 2)).toBe(2);
            expect(resolveBonusValue('-Rating', 3)).toBe(-3);
            expect(resolveBonusValue('Rating * 2', 2)).toBe(4);
            expect(resolveBonusValue('FixedValues(2,3,5)', 3)).toBe(5);
            expect(resolveBonusValue('FixedValues(2,3,5)', 9)).toBe(5); // clamped to last entry
        });

        it('warns and returns undefined for an unresolvable attribute-name expression', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            expect(resolveBonusValue('BOD + 2', 1)).toBeUndefined();
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });

        it('passes numbers through unchanged and undefined through unchanged', () => {
            expect(resolveBonusValue(0, 5)).toBe(0);
            expect(resolveBonusValue(undefined, 5)).toBeUndefined();
        });

        it('clamps FixedValues rating <= 0 to the first entry with a warning', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            expect(resolveBonusValue('FixedValues(2,3,5)', 0)).toBe(2);
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });
    });

    describe('valueOf exact-name matching and propertyToSum (issue #66)', () => {
        it('does not fall back to empty-improvedName improvements for a named query', () => {
            const imps: Improvement[] = [
                { id: '1', type: 'Attribute', source: 'Quality', sourceName: 'A', improvedName: '', val: 2, min: 0, max: 0, aug: 0, augMax: 0, rating: 1, exclude: '', uniqueName: '', addToRating: false, enabled: true },
                { id: '2', type: 'Attribute', source: 'Quality', sourceName: 'B', improvedName: 'rea', val: 1, min: 0, max: 0, aug: 0, augMax: 0, rating: 1, exclude: '', uniqueName: '', addToRating: false, enabled: true }
            ];
            expect(valueOf(imps, 'Attribute', 'rea')).toBe(1);
            expect(valueOf(imps, 'Attribute')).toBe(3);
        });

        it('sums each propertyToSum variant independently', () => {
            const imps: Improvement[] = [
                { id: '1', type: 'Attribute', source: 'Quality', sourceName: 'A', improvedName: 'bod', val: 1, min: 2, max: 3, aug: 0, augMax: 4, rating: 1, exclude: '', uniqueName: '', addToRating: false, enabled: true }
            ];
            expect(valueOf(imps, 'Attribute', 'bod', 'val')).toBe(1);
            expect(valueOf(imps, 'Attribute', 'bod', 'min')).toBe(2);
            expect(valueOf(imps, 'Attribute', 'bod', 'max')).toBe(3);
            expect(valueOf(imps, 'Attribute', 'bod', 'augMax')).toBe(4);
        });
    });
});

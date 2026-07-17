import { describe, it, expect, beforeEach } from 'vitest';
import {
    valueOf,
    removeImprovements,
    createImprovementsFromBonus
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
    });
});

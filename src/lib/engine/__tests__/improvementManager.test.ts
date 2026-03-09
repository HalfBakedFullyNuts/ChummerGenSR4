import { describe, it, expect, beforeEach } from 'vitest';
import {
    valueOf,
    removeImprovements,
    createImprovementsFromBonus,
    type Improvement,
    type ImprovementType,
    type ImprovementSource
} from '../improvementManager';

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
        mockImprovements[0].enabled = false;
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
});

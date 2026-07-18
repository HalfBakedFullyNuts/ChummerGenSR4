import { describe, it, expect, beforeEach } from 'vitest';
import { validateCharacter, isCharacterComplete, getValidationErrors, getValidationWarnings } from '../validation';

function createValidCharacter(): any {
    return {
        id: 'test-char',
        userId: 'test-user',
        status: 'creation',
        buildPoints: 400,
        buildPointsSpent: {
            metatype: 0,
            attributes: 0,
            skills: 0,
            qualities: 0,
            magic: 0,
            resources: 0,
            contacts: 0
        },
        identity: { name: 'Test Runner', metatype: 'Human' },
        attributes: {
            bod: { base: 3, bonus: 0 },
            agi: { base: 3, bonus: 0 },
            rea: { base: 3, bonus: 0 },
            str: { base: 3, bonus: 0 },
            cha: { base: 3, bonus: 0 },
            int: { base: 3, bonus: 0 },
            log: { base: 3, bonus: 0 },
            wil: { base: 3, bonus: 0 },
            edg: { base: 3, bonus: 0 },
            ess: 6.0
        },
        attributeLimits: {
            bod: { min: 1, max: 6, aug: 9 },
            agi: { min: 1, max: 6, aug: 9 },
            rea: { min: 1, max: 6, aug: 9 },
            str: { min: 1, max: 6, aug: 9 },
            cha: { min: 1, max: 6, aug: 9 },
            int: { min: 1, max: 6, aug: 9 },
            log: { min: 1, max: 6, aug: 9 },
            wil: { min: 1, max: 6, aug: 9 },
            edg: { min: 2, max: 7, aug: 7 },
            ess: { min: 0, max: 6, aug: 6 }
        },
        skills: [
            { name: 'Perception', rating: 2 }
        ],
        qualities: [],
        equipment: {
            weapons: [{ id: 'w1', name: 'Pistol' }],
            armor: [{ id: 'a1', name: 'Jacket' }],
            gear: [],
            lifestyle: { level: 'Low' }
        },
        contacts: [
            { name: 'Fixer', loyalty: 2, connection: 3 }
        ],
        nuyen: 1000,
        improvements: []
    };
}

describe('Validation Engine', () => {
    let char: any;

    beforeEach(() => {
        char = createValidCharacter();
    });

    it('validates a correct baseline character without errors', () => {
        const result = validateCharacter(char);
        expect(result.valid).toBe(true);
        expect(result.summary.errors).toBe(0);
    });

    describe('BP Limits', () => {
        it('catches BP overspend', () => {
            char.buildPointsSpent.attributes = 450;
            const result = validateCharacter(char);
            expect(result.valid).toBe(false);
            expect(result.issues.some(i => i.code === 'BP_OVERSPENT')).toBe(true);
        });

        it('catches positive qualities exceeding limit', () => {
            char.qualities = [
                { name: 'Good 1', category: 'Positive', bp: 20 },
                { name: 'Good 2', category: 'Positive', bp: 20 }
            ];
            const errors = getValidationErrors(char);
            expect(errors.some(i => i.code === 'POSITIVE_QUALITY_CAP')).toBe(true);
        });

        it('catches negative qualities exceeding limit', () => {
            char.qualities = [
                { name: 'Bad 1', category: 'Negative', bp: -20 },
                { name: 'Bad 2', category: 'Negative', bp: -20 }
            ];
            const errors = getValidationErrors(char);
            expect(errors.some(i => i.code === 'NEGATIVE_QUALITY_CAP')).toBe(true);
        });

        it('catches resources exceeding limit', () => {
            char.buildPointsSpent.resources = 55;
            const errors = getValidationErrors(char);
            expect(errors.some(i => i.code === 'RESOURCES_CAP')).toBe(true);
        });
    });

    describe('Attributes', () => {
        it('catches attributes below minimum', () => {
            char.attributes.str.base = 0;
            const errors = getValidationErrors(char);
            expect(errors.some(i => i.code === 'ATTR_BELOW_MIN' && i.message.includes('STR'))).toBe(true);
        });

        it('catches attributes above natural maximum', () => {
            char.attributes.agi.base = 7;
            const errors = getValidationErrors(char);
            expect(errors.some(i => i.code === 'ATTR_ABOVE_MAX' && i.message.includes('AGI'))).toBe(true);
        });

        it('catches negative essence', () => {
            char.attributes.ess = -0.5;
            const errors = getValidationErrors(char);
            expect(errors.some(i => i.code === 'ESSENCE_NEGATIVE')).toBe(true);
        });

        it('catches magic exceeding essence', () => {
            char.attributes.mag = { base: 6, bonus: 0 };
            char.attributeLimits.mag = { min: 1, max: 6, aug: 6 };
            char.attributes.ess = 4.5;
            const errors = getValidationErrors(char);
            expect(errors.some(i => i.code === 'MAG_EXCEEDS_ESSENCE')).toBe(true);
        });
    });

    describe('Skills', () => {
        it('catches skills above max rating at creation', () => {
            char.status = 'creation';
            char.skills.push({ name: 'Pistols', rating: 7 });
            const errors = getValidationErrors(char);
            expect(errors.some(i => i.code === 'SKILL_ABOVE_MAX')).toBe(true);
        });

        it('warns if no perception skill', () => {
            char.skills = []; // Remove perception
            const warnings = getValidationWarnings(char);
            expect(warnings.some(i => i.code === 'NO_PERCEPTION')).toBe(true);
        });
    });

    describe('Qualities', () => {
        it('catches mutually exclusive qualities', () => {
            char.qualities = [
                { name: 'Magician' },
                { name: 'Technomancer' }
            ];
            const errors = getValidationErrors(char);
            expect(errors.some(i => i.code === 'QUALITY_EXCLUSIVE')).toBe(true);
        });

        it('warns if awakened but no magic tradition', () => {
            char.qualities = [{ name: 'Adept' }];
            char.attributes.mag = null;
            const warnings = getValidationWarnings(char);
            expect(warnings.some(i => i.code === 'MAGIC_NOT_INITIALIZED')).toBe(true);
        });
    });

    describe('Magic and Resonance', () => {
        it('warns if tradition is missing from magic', () => {
            char.magic = { tradition: '', powerPoints: 0, powerPointsUsed: 0, powers: [], metamagics: [], initiateGrade: 0, spirits: [] };
            const warnings = getValidationWarnings(char);
            expect(warnings.some(i => i.code === 'NO_TRADITION')).toBe(true);
        });

        it('catches overspent power points', () => {
            char.magic = { powerPoints: 2, powerPointsUsed: 3, tradition: 'Hermetic', spirits: [], powers: [], metamagics: [] };
            const errors = getValidationErrors(char);
            expect(errors.some(i => i.code === 'POWER_POINTS_OVERSPENT')).toBe(true);
        });

        it('catches too many metamagics compared to initiation', () => {
            char.magic = { initiateGrade: 1, metamagics: [{ name: 'Centering' }, { name: 'Shielding' }], spirits: [] };
            const errors = getValidationErrors(char);
            expect(errors.some(i => i.code === 'TOO_MANY_METAMAGICS')).toBe(true);
        });
    });

    describe('Equipment', () => {
        it('catches negative nuyen', () => {
            char.nuyen = -50;
            const errors = getValidationErrors(char);
            expect(errors.some(i => i.code === 'NEGATIVE_NUYEN')).toBe(true);
        });
    });

    describe('Identity', () => {
        it('catches missing metatype', () => {
            char.identity.metatype = '';
            const errors = getValidationErrors(char);
            expect(errors.some(i => i.code === 'NO_METATYPE')).toBe(true);
        });
    });

    describe('isCharacterComplete', () => {
        it('returns true if valid', () => {
            expect(isCharacterComplete(char)).toBe(true);
        });

        it('returns false if invalid', () => {
            char.buildPointsSpent.attributes = 900;
            expect(isCharacterComplete(char)).toBe(false);
        });
    });
});

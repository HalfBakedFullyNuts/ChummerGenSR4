/**
 * Skills Store — category/group denormalization (issue #65)
 * ===========================================================
 * setSkill populates CharacterSkill.category/group from the loaded
 * SkillDefinition so calculateDicePool can apply Skill/SkillGroup/
 * SkillCategory improvements without a gamedata store lookup.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { character, startNewCharacter, addQuality, removeQuality } from '../character';
import { setSkill, skillCostMultiplier, calculateSkillsBP } from '../skills';
import { setGameDataForTesting } from '../gamedata';
import type { SkillDefinition } from '$types';

const PISTOLS: SkillDefinition = {
    name: 'Pistols',
    attribute: 'agi',
    category: 'Combat Active',
    default: true,
    skillgroup: 'Firearms',
    specializations: [],
    source: 'SR4',
    page: 122
};

const HACKING: SkillDefinition = {
    name: 'Hacking',
    attribute: 'log',
    category: 'Technical Active',
    default: false,
    skillgroup: 'Cracking',
    specializations: [],
    source: 'SR4',
    page: 128
};

describe('Skills Store - category/group denormalization (issue #65)', () => {
    beforeEach(() => {
        startNewCharacter('test-user', 'bp');
        setGameDataForTesting({ skills: [PISTOLS] });
    });

    it('setSkill populates category and group from the loaded skill definition', () => {
        setSkill('Pistols', 3);

        const skill = get(character)!.skills.find((s) => s.name === 'Pistols');
        expect(skill).toMatchObject({ category: 'Combat Active', group: 'Firearms' });
    });

    it('setSkill on an unknown skill name leaves category/group unset', () => {
        setSkill('Not A Real Skill', 1);

        const skill = get(character)!.skills.find((s) => s.name === 'Not A Real Skill');
        expect(skill?.category).toBeUndefined();
        expect(skill?.group).toBeUndefined();
    });

    it('updating an existing skill rating does not clobber its category/group', () => {
        setSkill('Pistols', 2);
        setSkill('Pistols', 4);

        const skill = get(character)!.skills.find((s) => s.name === 'Pistols');
        expect(skill).toMatchObject({ rating: 4, category: 'Combat Active', group: 'Firearms' });
    });
});

describe('skillCostMultiplier / calculateSkillsBP doubling (issue #67)', () => {
    const flagImp = (type: 'Uneducated' | 'Uncouth' | 'Infirm') => ({
        id: 'f', type, source: 'Quality' as const, sourceName: 'src', improvedName: '',
        val: 1, min: 0, max: 0, aug: 0, augMax: 0, rating: 1,
        exclude: '', uniqueName: '', addToRating: false, enabled: true
    });

    it('skillCostMultiplier doubles only the matching category', () => {
        const imps = [flagImp('Uneducated')];
        expect(skillCostMultiplier(imps, 'Technical Active')).toBe(2);
        expect(skillCostMultiplier(imps, 'Combat Active')).toBe(1);
        expect(skillCostMultiplier(imps, undefined)).toBe(1);
    });

    it('Uneducated doubles Technical Active BP, leaves other categories flat', () => {
        const skills = [
            { name: 'Hacking', rating: 3, specialization: null, bonus: 0, karmaSpent: 0, category: 'Technical Active' as const, group: 'Cracking' },
            { name: 'Pistols', rating: 3, specialization: null, bonus: 0, karmaSpent: 0, category: 'Combat Active' as const, group: 'Firearms' }
        ];
        const bp = calculateSkillsBP(skills, [flagImp('Uneducated')]);
        expect(bp).toBe(3 * 4 * 2 + 3 * 4); // 36
    });

    it('Uncouth doubles Social Active BP', () => {
        const skills = [
            { name: 'Negotiation', rating: 2, specialization: null, bonus: 0, karmaSpent: 0, category: 'Social Active' as const, group: 'Influence' },
            { name: 'Pistols', rating: 2, specialization: null, bonus: 0, karmaSpent: 0, category: 'Combat Active' as const, group: 'Firearms' }
        ];
        const bp = calculateSkillsBP(skills, [flagImp('Uncouth')]);
        expect(bp).toBe(2 * 4 * 2 + 2 * 4); // 24
    });

    it('Infirm doubles Physical Active BP', () => {
        const skills = [
            { name: 'Running', rating: 2, specialization: null, bonus: 0, karmaSpent: 0, category: 'Physical Active' as const, group: 'Athletics' }
        ];
        const bp = calculateSkillsBP(skills, [flagImp('Infirm')]);
        expect(bp).toBe(16);
    });

    it('addQuality/removeQuality reprice skills BP immediately (issue #67)', () => {
        startNewCharacter('test-user', 'bp');
        setGameDataForTesting({
            skills: [HACKING],
            qualities: [
                { name: 'Uneducated', category: 'Negative', bp: -20, mutant: false, limit: false, bonus: { uneducated: true }, source: 'SR4', page: 94 }
            ]
        });
        setSkill('Hacking', 3);
        expect(get(character)!.buildPointsSpent.skills).toBe(12); // flat, no quality yet

        addQuality('Uneducated', 'Negative', -20);
        expect(get(character)!.buildPointsSpent.skills).toBe(24); // doubled immediately

        const qualityId = get(character)!.qualities.find((q) => q.name === 'Uneducated')!.id;
        removeQuality(qualityId);
        expect(get(character)!.buildPointsSpent.skills).toBe(12); // back to flat
    });
});

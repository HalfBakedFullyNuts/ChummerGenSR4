/**
 * Skills Store — category/group denormalization (issue #65)
 * ===========================================================
 * setSkill populates CharacterSkill.category/group from the loaded
 * SkillDefinition so calculateDicePool can apply Skill/SkillGroup/
 * SkillCategory improvements without a gamedata store lookup.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { character, startNewCharacter } from '../character';
import { setSkill } from '../skills';
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

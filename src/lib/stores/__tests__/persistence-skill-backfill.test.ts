/**
 * backfillSkillMeta (issue #65)
 * ==============================
 * Saves persisted before issue #65 lack CharacterSkill.category/group;
 * backfillSkillMeta name-looks-up the loaded game data at load time so
 * calculateDicePool's Skill/SkillGroup/SkillCategory improvements apply
 * to characters loaded from Firestore/XML without a re-save.
 */
import { describe, it, expect } from 'vitest';
import { backfillSkillMeta } from '../persistence';
import { createEmptyCharacter } from '$types';
import type { GameData } from '../gamedata';
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

const EMPTY_GAME_DATA: GameData = {
    metatypes: [],
    metatypeCategories: [],
    skills: [PISTOLS],
    skillGroups: [],
    skillCategories: [],
    qualities: [],
    qualityCategories: [],
    spells: [],
    spellCategories: [],
    powers: [],
    traditions: [],
    mentors: [],
    lifestyles: [],
    programs: [],
    programCategories: [],
    weapons: [],
    weaponCategories: [],
    armor: [],
    armorCategories: [],
    cyberware: [],
    cyberwareCategories: [],
    cyberwareGrades: [],
    gear: [],
    gearCategories: [],
    bioware: [],
    biowareCategories: [],
    vehicles: [],
    vehicleCategories: [],
    martialArts: [],
    echoes: [],
    streams: [],
    metamagics: [],
    books: [],
    ranges: []
};

describe('backfillSkillMeta (issue #65)', () => {
    it('backfills category/group for a skill saved before issue #65', () => {
        const char = createEmptyCharacter('c1', 'u1', 'bp');
        const withOldSkill = {
            ...char,
            skills: [{ name: 'Pistols', rating: 3, specialization: null, bonus: 0, karmaSpent: 0 }]
        };

        const backfilled = backfillSkillMeta(withOldSkill, EMPTY_GAME_DATA);

        expect(backfilled.skills[0]).toMatchObject({ category: 'Combat Active', group: 'Firearms' });
    });

    it('is a no-op when every skill already has category/group', () => {
        const char = createEmptyCharacter('c1', 'u1', 'bp');
        const withNewSkill = {
            ...char,
            skills: [
                { name: 'Pistols', rating: 3, specialization: null, bonus: 0, karmaSpent: 0, category: 'Combat Active' as const, group: 'Firearms' }
            ]
        };

        const result = backfillSkillMeta(withNewSkill, EMPTY_GAME_DATA);

        expect(result).toBe(withNewSkill); // same reference: no unnecessary copy
    });

    it('leaves an unknown skill name unbackfilled (no matching definition)', () => {
        const char = createEmptyCharacter('c1', 'u1', 'bp');
        const withUnknownSkill = {
            ...char,
            skills: [{ name: 'Made Up Skill', rating: 1, specialization: null, bonus: 0, karmaSpent: 0 }]
        };

        const result = backfillSkillMeta(withUnknownSkill, EMPTY_GAME_DATA);

        expect(result.skills[0]?.category).toBeUndefined();
        expect(result.skills[0]?.group).toBeUndefined();
    });
});

/**
 * backfillMovement (issue #70)
 * =============================
 * Saves persisted before issue #70 lack CharacterIdentity.movement (or, for
 * data written straight to Firestore outside the TS type system, may have
 * it as `undefined` at runtime despite the type declaring it required).
 * backfillMovement name-looks-up the loaded metatype at load time, falling
 * back to the human default when the metatype is unknown.
 */
import { describe, it, expect } from 'vitest';
import { backfillMovement } from '../persistence';
import { DEFAULT_MOVEMENT } from '../../engine/calculations';
import { createEmptyCharacter } from '$types';
import type { Metatype } from '$types';
import type { GameData } from '../gamedata';

const TROLL: Metatype = {
    name: 'Troll',
    category: 'Metahuman',
    bp: 40,
    attributes: {
        bod: { min: 5, max: 10, aug: 15 },
        agi: { min: 1, max: 5, aug: 7 },
        rea: { min: 1, max: 6, aug: 9 },
        str: { min: 5, max: 10, aug: 15 },
        cha: { min: 1, max: 4, aug: 6 },
        int: { min: 1, max: 5, aug: 7 },
        log: { min: 1, max: 5, aug: 7 },
        wil: { min: 1, max: 6, aug: 9 },
        ini: { min: 2, max: 11, aug: 16 },
        edg: { min: 1, max: 6, aug: 6 },
        mag: { min: 1, max: 6, aug: 6 },
        res: { min: 1, max: 6, aug: 6 },
        ess: { min: 0, max: 6, aug: 6 }
    },
    movement: '15/35, Swim 7',
    qualities: { positive: [], negative: [] },
    source: 'SR4',
    page: 66,
    metavariants: []
};

const EMPTY_GAME_DATA: GameData = {
    metatypes: [TROLL],
    metatypeCategories: [],
    skills: [],
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

describe('backfillMovement (issue #70)', () => {
    it('backfills identity.movement from the character\'s metatype', () => {
        const char = createEmptyCharacter('c1', 'u1', 'bp');
        const withOldSave = {
            ...char,
            identity: { ...char.identity, metatype: 'Troll', movement: undefined as unknown as string }
        };

        const backfilled = backfillMovement(withOldSave, EMPTY_GAME_DATA);

        expect(backfilled.identity.movement).toBe('15/35, Swim 7');
    });

    it('falls back to the human default when the metatype is unknown', () => {
        const char = createEmptyCharacter('c1', 'u1', 'bp');
        const withUnknownMetatype = {
            ...char,
            identity: { ...char.identity, metatype: 'Not A Real Metatype', movement: '' }
        };

        const backfilled = backfillMovement(withUnknownMetatype, EMPTY_GAME_DATA);

        expect(backfilled.identity.movement).toBe(DEFAULT_MOVEMENT);
    });

    it('is a no-op when movement is already populated', () => {
        const char = createEmptyCharacter('c1', 'u1', 'bp');
        const withMovement = { ...char, identity: { ...char.identity, movement: '15/35, Swim 7' } };

        const result = backfillMovement(withMovement, EMPTY_GAME_DATA);

        expect(result).toBe(withMovement); // same reference: no unnecessary copy
    });
});

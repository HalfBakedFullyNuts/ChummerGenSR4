/**
 * Bonus key exhaustiveness gate (issue #68)
 * ===========================================
 * Runs every shipped item's `bonus` block through createImprovementsFromBonus
 * and asserts the parser never warns about an unrecognized key. A PR that
 * regenerates data (#62b) or ships a new item with an unhandled bonus key
 * must fail this test, not silently drop mechanics — see
 * `scripts/survey-bonus-keys.mjs` for the companion frequency report.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createImprovementsFromBonus, __resetUnknownBonusKeyWarnings } from '../improvementManager';

import qualitiesData from '../../../../static/data/qualities.json';
import cyberwareData from '../../../../static/data/cyberware.json';
import biowareData from '../../../../static/data/bioware.json';
import gearData from '../../../../static/data/gear.json';
import armorData from '../../../../static/data/armor.json';
import powersData from '../../../../static/data/powers.json';
import metamagicData from '../../../../static/data/metamagic.json';
import echoesData from '../../../../static/data/echoes.json';
import metatypesData from '../../../../static/data/metatypes.json';

interface BonusBearing {
    readonly name: string;
    readonly bonus?: Record<string, unknown>;
}

/** Collect every bonus-bearing item across the shipped data files, including nested metavariants. */
function collectAllBonuses(): readonly Record<string, unknown>[] {
    const bonuses: Record<string, unknown>[] = [];
    const collections: readonly (readonly BonusBearing[])[] = [
        qualitiesData.qualities as BonusBearing[],
        cyberwareData.cyberware as BonusBearing[],
        biowareData.biowares as BonusBearing[],
        gearData.gear as BonusBearing[],
        armorData.armor as BonusBearing[],
        powersData.powers as BonusBearing[],
        metamagicData.metamagics as BonusBearing[],
        echoesData.echoes as BonusBearing[]
    ];
    for (const collection of collections) {
        for (const item of collection) {
            if (item.bonus) bonuses.push(item.bonus);
        }
    }
    for (const mt of metatypesData.metatypes as Array<BonusBearing & { metavariants?: readonly BonusBearing[] }>) {
        if (mt.bonus) bonuses.push(mt.bonus);
        for (const variant of mt.metavariants ?? []) {
            if (variant.bonus) bonuses.push(variant.bonus);
        }
    }
    return bonuses;
}

describe('Bonus key exhaustiveness (issue #68)', () => {
    beforeEach(() => {
        __resetUnknownBonusKeyWarnings();
    });

    it('every shipped bonus block parses with zero unhandled-key warnings', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const allBonuses = collectAllBonuses();
        expect(allBonuses.length).toBeGreaterThan(0); // sanity: the data actually loaded

        for (const bonus of allBonuses) {
            createImprovementsFromBonus('Quality', 'survey', bonus, 1, 'SelectedSkill', 'SelectedAttribute', 'SelectedText');
        }

        const unhandledKeyWarnings = warnSpy.mock.calls.filter(([msg]) =>
            typeof msg === 'string' && msg.includes('unhandled bonus key')
        );
        expect(unhandledKeyWarnings).toEqual([]);

        warnSpy.mockRestore();
    });

    it('an unknown key warns exactly once per key, never throws', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        expect(() => createImprovementsFromBonus('Quality', 'Test', { bogus: 1 })).not.toThrow();
        createImprovementsFromBonus('Quality', 'Test', { bogus: 1 });

        const bogusWarnings = warnSpy.mock.calls.filter(([msg]) =>
            typeof msg === 'string' && msg.includes('"bogus"')
        );
        expect(bogusWarnings).toHaveLength(1);

        warnSpy.mockRestore();
    });
});

/**
 * Producer/consumer drift guard (issue #64)
 * ==========================================
 * `PRODUCIBLE_TYPES` (improvementManager.ts) is a hand-maintained list of
 * every ImprovementType the parser can emit. This test fails if a type is
 * produced but neither consumed anywhere (calculations.ts / stores /
 * components) nor explicitly marked as deferred to a future issue — a PR
 * that adds a new producer must update one of the two lists below.
 */
import { describe, it, expect } from 'vitest';
import { PRODUCIBLE_TYPES } from '../improvementManager';
import type { ImprovementType } from '$types';

/** Every type actually read via valueOf(...)/skillPoolBonus(...) today (calculations.ts, equipment.ts, AttributeAllocator.svelte). */
const CONSUMED: readonly ImprovementType[] = [
    'Attribute',
    'PhysicalCM',
    'StunCM',
    'CMOverflow',
    'Initiative',
    'InitiativePass',
    'InitiativePassAdd',
    'Composure',
    'JudgeIntentions',
    'Memory',
    'LiftAndCarry',
    'BallisticArmor',
    'ImpactArmor',
    'DamageResistance',
    'DrainResistance',
    'FadingResistance',
    'MatrixInitiative',
    'MatrixInitiativePass',
    'MatrixInitiativePassAdd',
    'SpecialTab',
    'CyberwareEssCost',
    'BiowareEssCost',
    'SensitiveSystem',
    // wired in issue #65 via calculateDicePool/skillPoolBonus:
    'Skill',
    'SkillGroup',
    'SkillCategory'
];

/** Types produced but not yet consumed, with the issue (or follow-up note) tracking the remaining wiring. */
const DEFERRED: Partial<Record<ImprovementType, string>> = {
    CMThreshold: '#64-followup', // condition-monitor threshold modifiers: no consumer yet
    CMThresholdOffset: '#64-followup',
    Notoriety: '#90',
    LifestyleCost: '#91',
    Reach: '#64-followup', // combat display surface doesn't exist yet
    UnarmedDV: '#22', // tracked in docs/issues/22-content-depth.md as a follow-up
    MovementPercent: '#70',
    SwimPercent: '#70',
    FlySpeed: '#70',
    RestrictedItemCount: '#93',
    NuyenMaxBP: '#64-followup',
    FreePositiveQualities: '#64-followup',
    FreeNegativeQualities: '#64-followup',
    Skillwire: '#64-followup',
    Uneducated: '#67',
    Uncouth: '#67',
    Infirm: '#67',
    BlackMarketDiscount: '#96',
    // issue #68 additions — parser now produces these, none have a consuming
    // calculation/UI surface yet:
    SkillAttribute: '#68-followup', // dice-pool consumption noted as a #65 follow-up
    WeaponCategoryDV: '#72', // weapon accessories / combat epic (Epic 17)
    SpellCategory: '#68-followup', // spell casting surface (Epic 19)
    LivingPersonaResponse: '#79', // calculateMatrixInitiative technomancer-branch rewrite (Epic C2)
    Smartlink: '#68-followup',
    BasicBiowareEssCost: '#68-followup',
    CyborgEssence: '#68-followup',
    QuickeningMetamagic: '#68-followup',
    FreeSpiritPowerPoints: '#68-followup',
    AdeptPowerPoints: '#68-followup',
    BasicLifestyleCost: '#68-followup',
    UnarmedAP: '#68-followup',
    ThrowRange: '#68-followup',
    ThrowSTR: '#68-followup',
    GenetechCostMultiplier: '#68-followup',
    TransgenicsBiowareCost: '#68-followup',
    SkillsoftAccess: '#68-followup',
    Nuyen: '#68-followup', // BP validation surface
    Concealability: '#68-followup',
    UnarmedDVPhysical: '#68-followup',
    AdeptLinguistics: '#68-followup',
    SwapSkillAttribute: '#68-followup',
    Text: '#68-followup', // selecttext/selectside/selectmentorspirit/selectparagon placeholders — no display surface yet
    Restricted: '#68-followup'
};

describe('Improvement producer/consumer matrix (issue #64)', () => {
    it('every produced type is consumed or explicitly deferred', () => {
        const unaccounted = PRODUCIBLE_TYPES.filter(
            (t) => !CONSUMED.includes(t) && !(t in DEFERRED)
        );
        expect(unaccounted).toEqual([]);
    });

    it('CONSUMED and DEFERRED do not overlap (a type is either wired or explicitly deferred, not both)', () => {
        const overlap = CONSUMED.filter((t) => t in DEFERRED);
        expect(overlap).toEqual([]);
    });
});

/**
 * Improvement Manager
 * ===================
 * A central system for applying and calculating bonuses (Improvements)
 * granted by qualities, cyberware, bioware, magic, and other sources.
 * It matches the Desktop's ImprovementManager logic.
 */

import type { Character } from '$types';

/**
 * All 89 improvement types ported from the desktop app structure.
 */
export type ImprovementType =
    | 'Skill'
    | 'Attribute'
    | 'Text'
    | 'BallisticArmor'
    | 'ImpactArmor'
    | 'Reach'
    | 'Nuyen'
    | 'Essence'
    | 'Reaction'
    | 'PhysicalCM'
    | 'StunCM'
    | 'UnarmedDV'
    | 'SkillGroup'
    | 'SkillCategory'
    | 'SkillAttribute'
    | 'InitiativePass'
    | 'MatrixInitiative'
    | 'MatrixInitiativePass'
    | 'LifestyleCost'
    | 'CMThreshold'
    | 'EnhancedArticulation'
    | 'WeaponCategoryDV'
    | 'CyberwareEssCost'
    | 'SpecialTab'
    | 'Initiative'
    | 'Uneducated'
    | 'LivingPersonaResponse'
    | 'LivingPersonaSignal'
    | 'LivingPersonaFirewall'
    | 'LivingPersonaSystem'
    | 'LivingPersonaBiofeedback'
    | 'Smartlink'
    | 'BiowareEssCost'
    | 'GenetechCostMultiplier'
    | 'BasicBiowareEssCost'
    | 'TransgenicsBiowareCost'
    | 'SoftWeave'
    | 'SensitiveSystem'
    | 'ConditionMonitor'
    | 'UnarmedDVPhysical'
    | 'MovementPercent'
    | 'Adapsin'
    | 'FreePositiveQualities'
    | 'FreeNegativeQualities'
    | 'NuyenMaxBP'
    | 'CMOverflow'
    | 'FreeSpiritPowerPoints'
    | 'AdeptPowerPoints'
    | 'ArmorEncumbrancePenalty'
    | 'Uncouth'
    | 'Initiation'
    | 'Submersion'
    | 'Infirm'
    | 'Skillwire'
    | 'DamageResistance'
    | 'RestrictedItemCount'
    | 'AdeptLinguistics'
    | 'SwimPercent'
    | 'FlyPercent'
    | 'FlySpeed'
    | 'JudgeIntentions'
    | 'LiftAndCarry'
    | 'Memory'
    | 'Concealability'
    | 'SwapSkillAttribute'
    | 'DrainResistance'
    | 'FadingResistance'
    | 'MatrixInitiativePassAdd'
    | 'InitiativePassAdd'
    | 'Composure'
    | 'UnarmedAP'
    | 'CMThresholdOffset'
    | 'Restricted'
    | 'Notoriety'
    | 'SpellCategory'
    | 'ThrowRange'
    | 'SkillsoftAccess'
    | 'AddSprite'
    | 'BlackMarketDiscount'
    | 'SelectWeapon'
    | 'ComplexFormLimit'
    | 'SpellLimit'
    | 'QuickeningMetamagic'
    | 'BasicLifestyleCost'
    | 'ThrowSTR'
    | 'IgnoreCMPenaltyStun'
    | 'IgnoreCMPenaltyPhysical'
    | 'CyborgEssence'
    | 'EssenceMax';

/**
 * Sources that can grant an improvement.
 */
export type ImprovementSource =
    | 'Quality'
    | 'Power'
    | 'Metatype'
    | 'Cyberware'
    | 'Metavariant'
    | 'Bioware'
    | 'Nanotech'
    | 'Genetech'
    | 'ArmorEncumbrance'
    | 'Gear'
    | 'Spell'
    | 'MartialArtAdvantage'
    | 'Initiation'
    | 'Submersion'
    | 'Metamagic'
    | 'Echo'
    | 'Armor'
    | 'ArmorMod'
    | 'EssenceLoss'
    | 'ConditionMonitor'
    | 'CritterPower'
    | 'ComplexForm'
    | 'EdgeUse'
    | 'MutantCritter'
    | 'Cyberzombie'
    | 'StackedFocus'
    | 'AttributeLoss'
    | 'Custom';

/**
 * An individual Improvement modifying stats, calculations, or unlocking capabilities.
 */
export interface Improvement {
    /** Unique internal ID for tracking array entries. */
    id: string;
    /** The specific stat or target being improved (e.g. 'Reaction', 'Firearms', etc). */
    improvedName: string;
    /** The name of the item/quality providing the bonus. */
    sourceName: string;
    /** The category of bonus being applied. */
    type: ImprovementType;
    /** The category of item providing the improvement. */
    source: ImprovementSource;

    /* Numeric modifiers */
    /** Minimum value modifier. */
    min: number;
    /** Natural Maximum value modifier. */
    max: number;
    /** Augmented bonus. */
    aug: number;
    /** Augmented Maximum value modifier. */
    augMax: number;
    /** Base value modifier (often flat bonus). */
    val: number;
    /** The Rating of the source item, which sometimes multiplies the effect. */
    rating: number;

    /* Logic fields */
    /** Comma or space separated list of strings this improvement should selectively ignore. */
    exclude: string;
    /** For stacking rules: only the single highest value matching the UniqueName is applied. */
    uniqueName: string;
    /** True if flat add to skill rating vs dice pool */
    addToRating: boolean;
    /** If false, this improvement is temporarily suppressed/inactive. */
    enabled: boolean;

    /* Custom metadata */
    custom?: boolean;
    customName?: string;
    customId?: string;
    customGroup?: string;
    notes?: string;
}

/**
 * Get the total value of all enabled improvements matching the specified type.
 * Respects uniqueName stacking limitations (only highest applied in group).
 * Optionally filter by improvedName (e.g., getting bonuses for a specific skill).
 */
export function valueOf(
    improvements: readonly Improvement[] | undefined,
    type: ImprovementType,
    improvedName?: string,
    propertyToSum: 'val' | 'min' | 'max' | 'aug' | 'augMax' = 'val'
): number {
    if (!improvements || improvements.length === 0) {
        return 0;
    }

    let activeImprovements = improvements.filter((imp) => imp.enabled && imp.type === type);

    if (improvedName !== undefined) {
        // e.g. `type: 'Skill', improvedName: 'Pistols'`
        activeImprovements = activeImprovements.filter(
            (imp) => imp.improvedName === improvedName || imp.improvedName === ''
        );
    }

    // For standard summation
    let total = 0;

    // Keep track of largest uniqueName groupings so we only take the highest.
    const uniqueGroups = new Map<string, number>();

    for (const imp of activeImprovements) {
        const value = imp[propertyToSum] * imp.rating; // Value is usually `val` multiplied by `rating` depending on implementation
        // Actually, standard Chummer ValueOf sometimes multiplies by Rating or sometimes leaves it unmultiplied.
        // For our base implementation, we assume `val * rating`. However, many xml items bake the rating directly into their raw XML value, so we might need to adjust this logic later as we parse XML nodes. Flat `val` is safest for now if parsed correctly.
        // Let's use `val` directly unless it's a rating-based item.

        // Wait, Chummer applies Rating during CreateImprovement. `valueOf` usually just sums the stored `val`.
        // We'll just sum `val` here, assuming `createImprovementsFromBonus` calculates the final resolved value.
        const rawValue = imp[propertyToSum];

        if (imp.uniqueName) {
            const currentHighest = uniqueGroups.get(imp.uniqueName) || 0;
            if (rawValue > currentHighest) {
                uniqueGroups.set(imp.uniqueName, rawValue);
            }
        } else {
            total += rawValue;
        }
    }

    // Add the highest from each unique group
    for (const highest of uniqueGroups.values()) {
        total += highest;
    }

    return total;
}

/**
 * Filter out all improvements provided by a specific source.
 * Used when unequipping an item, removing a quality, dropping a spell, etc.
 */
export function removeImprovements(
    improvements: readonly Improvement[],
    source: ImprovementSource,
    sourceName: string
): Improvement[] {
    if (!improvements) return [];
    return improvements.filter(
        (imp) => !(imp.source === source && imp.sourceName === sourceName)
    );
}

/**
 * Generate a unique improvement ID.
 */
function generateImprovementId(): string {
    return `imp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Extract improvements from parsed bonus block data.
 * @param source The general category of item providing it
 * @param sourceName The specific name of the item
 * @param bonusData Any type representing the xml node's bonus section
 * @param rating Optional rating if the item scales with it
 */
export function createImprovementsFromBonus(
    source: ImprovementSource,
    sourceName: string,
    bonusData: any, // Raw JSON object mimicking XML node children
    rating: number = 1
): Improvement[] {
    if (!bonusData) return [];

    const results: Improvement[] = [];

    // This is a placeholder for the large factory switch that will parse
    // different keys out of \`bonusData\` and generate Improvement objects.

    // Example parsed data shape logic to be fleshed out:
    // if (bonusData.specificattribute) {
    //    createAttributeImprovement(bonusData.specificattribute, results);
    // }

    return results;
}

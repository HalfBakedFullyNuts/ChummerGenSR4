/**
 * Improvement Manager
 * ===================
 * A central system for applying and calculating bonuses (Improvements)
 * granted by qualities, cyberware, bioware, magic, and other sources.
 * It matches the Desktop's ImprovementManager logic.
 */



import type { Improvement, ImprovementType, ImprovementSource } from '$types';

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
 * @param selectedSkill User-selected skill (if applicable)
 * @param selectedAttribute User-selected attribute (if applicable)
 */
export function createImprovementsFromBonus(
    source: ImprovementSource,
    sourceName: string,
    bonusData: any, // Raw JSON object mirroring QualityBonus or similar
    rating: number = 1,
    selectedSkill?: string,
    selectedAttribute?: string
): Improvement[] {
    if (!bonusData) return [];

    const results: Improvement[] = [];

    // Helper to create an improvement template
    const b = (type: ImprovementType, improvedName: string, overrides: Partial<Improvement> = {}) => {
        const base: Improvement = {
            id: generateImprovementId(),
            improvedName,
            sourceName,
            type,
            source,
            min: 0,
            max: 0,
            aug: 0,
            augMax: 0,
            val: 0,
            rating,
            exclude: '',
            uniqueName: '',
            addToRating: false,
            enabled: true,
            ...overrides
        };
        results.push(base);
    };

    // Arrays of specific targets
    if (bonusData.specificattribute) {
        for (const attr of bonusData.specificattribute) {
            b('Attribute', attr.name.toLowerCase(), {
                val: attr.val ?? 0,
                min: attr.min ?? 0,
                max: attr.max ?? 0,
                aug: attr.aug ?? 0
            });
        }
    }
    if (bonusData.selectattribute && selectedAttribute) {
        b('Attribute', selectedAttribute.toLowerCase(), {
            val: bonusData.selectattribute.val ?? 0,
            min: bonusData.selectattribute.min ?? 0, // In Chummer, min to max often means reducing limit
            max: bonusData.selectattribute.max ?? 0
        });
    }
    if (bonusData.specificskill) {
        for (const skill of bonusData.specificskill) {
            b('Skill', skill.name, {
                val: skill.bonus ?? 0,
                max: skill.max ?? 0
            });
        }
    }
    if (bonusData.selectskill && selectedSkill) {
        b('Skill', selectedSkill, {
            val: bonusData.selectskill.bonus ?? 0,
            max: bonusData.selectskill.max ?? 0
        });
    }
    if (bonusData.skillgroup) {
        for (const group of bonusData.skillgroup) {
            b('SkillGroup', group.name, {
                val: group.bonus ?? 0
            });
        }
    }
    if (bonusData.skillcategory) {
        for (const cat of bonusData.skillcategory) {
            b('SkillCategory', cat.name, {
                val: cat.bonus ?? 0
            });
        }
    }

    // Simple numeric properties
    const propMappings: Record<string, ImprovementType> = {
        initiative: 'Initiative',
        initiativepass: 'InitiativePass',
        conditionmonitor: 'ConditionMonitor',
        composure: 'Composure',
        judgeintentions: 'JudgeIntentions',
        damageresistance: 'DamageResistance',
        drainresist: 'DrainResistance',
        notoriety: 'Notoriety',
        lifestylecost: 'LifestyleCost',
        reach: 'Reach',
        unarmeddv: 'UnarmedDV',
        movementpercent: 'MovementPercent',
        swimpercent: 'SwimPercent',
        flyspeed: 'FlySpeed',
        restricteditemcount: 'RestrictedItemCount',
        nuyenmaxbp: 'NuyenMaxBP',
        freepositivequalities: 'FreePositiveQualities',
        freenegativequalities: 'FreeNegativeQualities',
        skillwire: 'Skillwire',
        cyberwareessmultiplier: 'CyberwareEssCost',
        biowareessmultiplier: 'BiowareEssCost'
    };

    for (const [key, impType] of Object.entries(propMappings)) {
        if (bonusData[key] !== undefined) {
            b(impType, '', { val: bonusData[key] });
        }
    }

    // Boolean flags (represented as flat value 1 or stored in Custom logic)
    // For now, representing them by their specific string Improvements or 'Text'
    if (bonusData.uneducated) b('Uneducated', '', { val: 1 });
    if (bonusData.uncouth) b('Uncouth', '', { val: 1 });
    if (bonusData.infirm) b('Infirm', '', { val: 1 });
    if (bonusData.sensitivesystem) b('SensitiveSystem', '', { val: 1 });
    if (bonusData.blackmarketdiscount) b('BlackMarketDiscount', '', { val: 1 });

    // enabletab grants access to new sections like adept, magician, technomancer
    if (bonusData.enabletab) {
        b('SpecialTab', bonusData.enabletab, { val: 1 });
    }

    return results;
}

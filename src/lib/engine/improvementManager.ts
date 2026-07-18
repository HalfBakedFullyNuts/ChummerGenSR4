/**
 * Improvement Manager
 * ===================
 * A central system for applying and calculating bonuses (Improvements)
 * granted by qualities, cyberware, bioware, magic, and other sources.
 * It matches the Desktop's ImprovementManager logic.
 */



import type { Improvement, ImprovementType, ImprovementSource, BonusValue } from '$types';

/**
 * Tokenize an arithmetic expression (post "Rating" substitution) into
 * numbers, `+ - * /`, and parens. Returns undefined on any unrecognized
 * character so the caller can warn-and-skip rather than crash.
 */
function tokenizeArithmetic(expr: string): string[] | undefined {
    const tokens: string[] = [];
    let i = 0;
    while (i < expr.length) {
        const ch = expr[i]!;
        if (ch === ' ') {
            i++;
            continue;
        }
        if ('+-*/()'.includes(ch)) {
            tokens.push(ch);
            i++;
            continue;
        }
        if (/[0-9.]/.test(ch)) {
            let j = i;
            while (j < expr.length && /[0-9.]/.test(expr[j]!)) j++;
            tokens.push(expr.slice(i, j));
            i = j;
            continue;
        }
        return undefined;
    }
    return tokens;
}

/** Recursive-descent parser over arithmetic tokens. Mutates `pos.i` as it consumes tokens. */
function parseFactor(tokens: string[], pos: { i: number }): number | undefined {
    const tok = tokens[pos.i];
    if (tok === '-') {
        pos.i++;
        const inner = parseFactor(tokens, pos);
        return inner === undefined ? undefined : -inner;
    }
    if (tok === '(') {
        pos.i++;
        const inner = parseExpr(tokens, pos);
        if (tokens[pos.i] !== ')') return undefined;
        pos.i++;
        return inner;
    }
    if (tok !== undefined && /^[0-9.]+$/.test(tok)) {
        pos.i++;
        return Number(tok);
    }
    return undefined;
}

/** `term (('*' | '/') term)*` */
function parseTerm(tokens: string[], pos: { i: number }): number | undefined {
    let value = parseFactor(tokens, pos);
    if (value === undefined) return undefined;
    while (tokens[pos.i] === '*' || tokens[pos.i] === '/') {
        const op = tokens[pos.i];
        pos.i++;
        const rhs = parseFactor(tokens, pos);
        if (rhs === undefined) return undefined;
        value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
}

/** `factor (('+' | '-') factor)*` */
function parseExpr(tokens: string[], pos: { i: number }): number | undefined {
    let value = parseTerm(tokens, pos);
    if (value === undefined) return undefined;
    while (tokens[pos.i] === '+' || tokens[pos.i] === '-') {
        const op = tokens[pos.i];
        pos.i++;
        const rhs = parseTerm(tokens, pos);
        if (rhs === undefined) return undefined;
        value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
}

/**
 * Resolve a bonus value to a number, matching desktop's ValueToInt
 * (clsImprovement.cs:1058-1101) minus attribute-name substitution:
 *  - numbers pass through unchanged
 *  - "Rating"-based arithmetic ("Rating", "-Rating", "Rating x 2", ...):
 *    substitute the numeric rating for "Rating", evaluate the arithmetic
 *    expression (add, subtract, multiply, divide, parens), then floor it
 *  - "FixedValues(a,b,c,...)": pick entry [rating-1] (clamped to the last
 *    entry; rating <= 0 clamps to the first, both cases warn)
 *  - anything else (e.g. an attribute-name substitution the parser doesn't
 *    support) warns and returns undefined — callers must skip, never NaN
 */
export function resolveBonusValue(raw: BonusValue | undefined, rating: number): number | undefined {
    if (raw === undefined) return undefined;
    if (typeof raw === 'number') return raw;

    const fixedMatch = raw.match(/^FixedValues\(([^)]+)\)$/i);
    if (fixedMatch) {
        const values = fixedMatch[1]!.split(',').map((v) => Number(v.trim()));
        if (values.some((v) => Number.isNaN(v))) {
            console.warn(`resolveBonusValue: malformed FixedValues "${raw}"`);
            return undefined;
        }
        if (rating < 1) {
            console.warn(`resolveBonusValue: FixedValues rating ${rating} < 1, clamping to first entry`);
            return values[0];
        }
        const index = Math.min(rating, values.length) - 1;
        if (rating > values.length) {
            console.warn(`resolveBonusValue: FixedValues rating ${rating} exceeds ${values.length} entries, clamping`);
        }
        return values[index];
    }

    const substituted = raw.replace(/Rating/g, String(rating));
    const tokens = tokenizeArithmetic(substituted);
    if (!tokens) {
        console.warn(`resolveBonusValue: cannot resolve bonus expression "${raw}"`);
        return undefined;
    }
    const pos = { i: 0 };
    const result = parseExpr(tokens, pos);
    if (result === undefined || pos.i !== tokens.length) {
        console.warn(`resolveBonusValue: cannot resolve bonus expression "${raw}"`);
        return undefined;
    }
    return Math.floor(result);
}

/**
 * Get the total value of all enabled improvements matching the specified type.
 * Respects uniqueName stacking limitations (only highest applied in group).
 * Optionally filter by improvedName (e.g., getting bonuses for a specific skill).
 * Matches exactly (desktop clsImprovement.cs:911-916) — an improvement with an
 * empty improvedName is never a fallback match for a named query.
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
        activeImprovements = activeImprovements.filter((imp) => imp.improvedName === improvedName);
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
 * Remove improvements granted by any of the given item ids — a parent item
 * plus its nested children (e.g. removing a cyberlimb removes the plugins
 * installed inside it too). Reused by Epic 17's deep equipment nesting (#75).
 */
export function removeImprovementsForTree(
    improvements: readonly Improvement[],
    source: ImprovementSource,
    itemIds: readonly string[]
): Improvement[] {
    if (!improvements) return [];
    const idSet = new Set(itemIds);
    return improvements.filter((imp) => !(imp.source === source && idSet.has(imp.sourceName)));
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

    /** Resolve a raw bonus value at this call's rating; undefined stays undefined (never NaN/0). */
    const r = (raw: BonusValue | undefined): number | undefined => resolveBonusValue(raw, rating);

    // Arrays of specific targets
    if (bonusData.specificattribute) {
        for (const attr of bonusData.specificattribute) {
            b('Attribute', String(attr.name).toLowerCase(), {
                val: r(attr.val) ?? 0,
                min: r(attr.min) ?? 0,
                max: r(attr.max) ?? 0,
                // desktop: XML `aug` means augmented-maximum, not "augmented bonus" (clsImprovement.cs:1575-1608)
                augMax: r(attr.aug) ?? 0
            });
        }
    }
    if (bonusData.selectattribute && selectedAttribute) {
        b('Attribute', selectedAttribute.toLowerCase(), {
            val: r(bonusData.selectattribute.val) ?? 0,
            min: r(bonusData.selectattribute.min) ?? 0, // In Chummer, min to max often means reducing limit
            max: r(bonusData.selectattribute.max) ?? 0,
            augMax: r(bonusData.selectattribute.aug) ?? 0
        });
    }
    if (bonusData.specificskill) {
        for (const skill of bonusData.specificskill) {
            b('Skill', skill.name, {
                val: r(skill.bonus) ?? 0,
                max: r(skill.max) ?? 0
            });
        }
    }
    if (bonusData.selectskill && selectedSkill) {
        b('Skill', selectedSkill, {
            val: r(bonusData.selectskill.bonus) ?? 0,
            max: r(bonusData.selectskill.max) ?? 0
        });
    }
    if (bonusData.skillgroup) {
        for (const group of bonusData.skillgroup) {
            b('SkillGroup', group.name, {
                val: r(group.bonus) ?? 0
            });
        }
    }
    if (bonusData.skillcategory) {
        for (const cat of bonusData.skillcategory) {
            b('SkillCategory', cat.name, {
                val: r(cat.bonus) ?? 0
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
            const resolved = r(bonusData[key]);
            if (resolved !== undefined) b(impType, '', { val: resolved });
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

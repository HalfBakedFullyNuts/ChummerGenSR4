/**
 * Improvement Manager
 * ===================
 * A central system for applying and calculating bonuses (Improvements)
 * granted by qualities, cyberware, bioware, magic, and other sources.
 * It matches the Desktop's ImprovementManager logic.
 */



import type {
    Improvement,
    ImprovementType,
    ImprovementSource,
    BonusValue,
    ConditionMonitorBonus,
    ArmorBonus
} from '$types';

/** Signature of the `b(...)` improvement-builder closure inside createImprovementsFromBonus. */
type ImprovementBuilder = (type: ImprovementType, improvedName: string, overrides?: Partial<Improvement>) => void;

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
 * Sum plain (no-uniqueName) improvements, plus the highest value from each
 * uniqueName group. The precedence0/precedence1 override cases are handled
 * by the caller before falling back to this standard grouping.
 */
function sumWithUniqueNameGrouping(
    activeImprovements: readonly Improvement[],
    propertyToSum: 'val' | 'min' | 'max' | 'aug' | 'augMax'
): number {
    let total = 0;
    const uniqueGroups = new Map<string, number>();

    for (const imp of activeImprovements) {
        const rawValue = imp[propertyToSum];

        if (imp.uniqueName) {
            const currentHighest = uniqueGroups.get(imp.uniqueName) ?? 0;
            if (rawValue > currentHighest) {
                uniqueGroups.set(imp.uniqueName, rawValue);
            }
        } else {
            total += rawValue;
        }
    }

    for (const highest of uniqueGroups.values()) {
        total += highest;
    }

    return total;
}

/**
 * Get the total value of all enabled improvements matching the specified type.
 * Respects uniqueName stacking limitations (only highest applied in group),
 * plus desktop's precedence0/precedence1 override rules (clsImprovement.cs
 * ValueOf) used for initiative-enhancer stacking exclusivity:
 *  - if any active improvement has uniqueName 'precedence0', the result is
 *    ONLY the highest precedence0 value — everything else is discarded
 *    (e.g. adept Improved Reflexes overrides all other REA sources).
 *  - else if any has uniqueName 'precedence1', the result is the SUM of
 *    every precedence1 entry — everything else is discarded (e.g. Wired
 *    Reflexes + Reaction Enhancers stack with each other, but exclude any
 *    plain bonus).
 * Optionally filter by improvedName (e.g., getting bonuses for a specific skill).
 * Matches exactly (desktop clsImprovement.cs:911-916) — an improvement with an
 * empty improvedName is never a fallback match for a named query.
 * `addToRating` (desktop `ValueOf(type, blnAddToRating, improvedName)`): pool
 * bonuses and rating bonuses are disjoint query modes — an improvement whose
 * `addToRating` doesn't match the requested mode is excluded entirely.
 */
export function valueOf(
    improvements: readonly Improvement[] | undefined,
    type: ImprovementType,
    improvedName?: string,
    propertyToSum: 'val' | 'min' | 'max' | 'aug' | 'augMax' = 'val',
    addToRating = false
): number {
    if (!improvements || improvements.length === 0) {
        return 0;
    }

    let activeImprovements = improvements.filter(
        (imp) => imp.enabled && imp.type === type && imp.addToRating === addToRating
    );

    if (improvedName !== undefined) {
        // e.g. `type: 'Skill', improvedName: 'Pistols'`
        activeImprovements = activeImprovements.filter((imp) => imp.improvedName === improvedName);
    }

    const precedence0 = activeImprovements.filter((imp) => imp.uniqueName === 'precedence0');
    if (precedence0.length > 0) {
        return Math.max(...precedence0.map((imp) => imp[propertyToSum]));
    }

    const precedence1 = activeImprovements.filter((imp) => imp.uniqueName === 'precedence1');
    if (precedence1.length > 0) {
        return precedence1.reduce((sum, imp) => sum + imp[propertyToSum], 0);
    }

    return sumWithUniqueNameGrouping(activeImprovements, propertyToSum);
}

/**
 * Whether a boolean-flag improvement type (Uneducated, Uncouth, Infirm,
 * SensitiveSystem, BlackMarketDiscount) is active. Desktop caches these as
 * character-level booleans set/cleared by the improvement engine
 * (clsImprovement.cs:1899-1903, :2653+); the web derives them on demand
 * instead of maintaining a separate cached field.
 */
export function hasFlag(
    improvements: readonly Improvement[] | undefined,
    type: 'Uneducated' | 'Uncouth' | 'Infirm' | 'SensitiveSystem' | 'BlackMarketDiscount'
): boolean {
    return valueOf(improvements, type) > 0;
}

/** Does an improvement's `exclude` list (comma/space-separated skill names) cover this skill? */
function excludesSkill(imp: Improvement, skillName: string): boolean {
    if (!imp.exclude) return false;
    return imp.exclude
        .split(',')
        .map((s) => s.trim())
        .includes(skillName);
}

/** Sum a SkillGroup/SkillCategory improvement group, honoring desktop's per-skill `exclude` list. */
function sumExcludableSkillBonus(
    improvements: readonly Improvement[],
    type: 'SkillGroup' | 'SkillCategory',
    improvedName: string,
    skillName: string,
    addToRating: boolean
): number {
    const active = improvements.filter(
        (imp) =>
            imp.enabled &&
            imp.type === type &&
            imp.improvedName === improvedName &&
            imp.addToRating === addToRating &&
            !excludesSkill(imp, skillName)
    );
    return sumWithUniqueNameGrouping(active, 'val');
}

/**
 * Total dice-pool (or rating, if `addToRating`) bonus for a skill from its
 * Skill + SkillGroup + SkillCategory improvements, honoring `exclude` (desktop:
 * an improvement whose exclude list names this skill is skipped for group/
 * category bonuses — e.g. Glamour's Social Active +3 excluding Intimidation).
 */
export function skillPoolBonus(
    improvements: readonly Improvement[] | undefined,
    skill: { name: string; group?: string; category?: string },
    addToRating = false
): number {
    if (!improvements || improvements.length === 0) return 0;

    let total = valueOf(improvements, 'Skill', skill.name, 'val', addToRating);

    if (skill.group !== undefined && skill.group !== '') {
        total += sumExcludableSkillBonus(improvements, 'SkillGroup', skill.group, skill.name, addToRating);
    }
    if (skill.category !== undefined && skill.category !== '') {
        total += sumExcludableSkillBonus(improvements, 'SkillCategory', skill.category, skill.name, addToRating);
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

/** Resolve a plain-or-precedence-carrying condition-monitor value, e.g. Will to Live's
 * plain `overflow: 1` vs High Pain Tolerance's `thresholdoffset: { value: 1, precedence: '0' }`. */
function resolveConditionMonitorEntry(
    raw: BonusValue | { value: BonusValue; precedence?: string } | undefined,
    r: (raw: BonusValue | undefined) => number | undefined
): { val: number; uniqueName: string } | undefined {
    if (raw === undefined) return undefined;
    if (typeof raw === 'object') {
        const val = r(raw.value);
        return val === undefined
            ? undefined
            : { val, uniqueName: raw.precedence !== undefined ? `precedence${raw.precedence}` : '' };
    }
    const val = r(raw);
    return val === undefined ? undefined : { val, uniqueName: '' };
}

/**
 * Desktop `<conditionmonitor>` (clsImprovement.cs:1628-1663) — physical/stun/overflow
 * are plain numeric add-ons; threshold/thresholdoffset can carry a `precedence`
 * attribute (e.g. High Pain Tolerance) driving valueOf's precedence0/1 stacking.
 */
function applyConditionMonitorBonus(
    cm: ConditionMonitorBonus,
    r: (raw: BonusValue | undefined) => number | undefined,
    b: ImprovementBuilder
): void {
    const physical = r(cm.physical);
    if (physical !== undefined) b('PhysicalCM', '', { val: physical });

    const stun = r(cm.stun);
    if (stun !== undefined) b('StunCM', '', { val: stun });

    const overflow = r(cm.overflow);
    if (overflow !== undefined) b('CMOverflow', '', { val: overflow });

    const threshold = resolveConditionMonitorEntry(cm.threshold, r);
    if (threshold) b('CMThreshold', '', { val: threshold.val, uniqueName: threshold.uniqueName });

    const thresholdOffset = resolveConditionMonitorEntry(cm.thresholdoffset, r);
    if (thresholdOffset) b('CMThresholdOffset', '', { val: thresholdOffset.val, uniqueName: thresholdOffset.uniqueName });
}

/** Desktop `<armor><b>N</b><i>N</i></armor>` (clsImprovement.cs:1785-1795) — flat armor add-on. */
function applyArmorBonus(
    armor: ArmorBonus,
    r: (raw: BonusValue | undefined) => number | undefined,
    b: ImprovementBuilder
): void {
    const ballistic = r(armor.b);
    if (ballistic !== undefined) b('BallisticArmor', '', { val: ballistic });

    const impact = r(armor.i);
    if (impact !== undefined) b('ImpactArmor', '', { val: impact });
}

/**
 * Every ImprovementType that `createImprovementsFromBonus` can currently emit.
 * Maintained by hand alongside the parser (not derived by reflection) so a
 * PR that adds a new producer must also update this list — the drift guard
 * in `engine/__tests__/improvement-matrix.test.ts` fails otherwise (issue #64).
 */
export const PRODUCIBLE_TYPES: readonly ImprovementType[] = [
    'Attribute',
    'Skill',
    'SkillGroup',
    'SkillCategory',
    'PhysicalCM',
    'StunCM',
    'CMOverflow',
    'CMThreshold',
    'CMThresholdOffset',
    'BallisticArmor',
    'ImpactArmor',
    'Initiative',
    'InitiativePass',
    'Composure',
    'JudgeIntentions',
    'DamageResistance',
    'DrainResistance',
    'FadingResistance',
    'Notoriety',
    'LifestyleCost',
    'Reach',
    'UnarmedDV',
    'MovementPercent',
    'SwimPercent',
    'FlySpeed',
    'RestrictedItemCount',
    'NuyenMaxBP',
    'FreePositiveQualities',
    'FreeNegativeQualities',
    'Skillwire',
    'Memory',
    'CyberwareEssCost',
    'BiowareEssCost',
    'Uneducated',
    'Uncouth',
    'Infirm',
    'SensitiveSystem',
    'BlackMarketDiscount',
    'SpecialTab'
];

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
                augMax: r(attr.aug) ?? 0,
                // desktop: <name precedence="N"> drives valueOf's precedence0/precedence1
                // stacking exclusivity (e.g. Improved Reflexes vs Wired Reflexes on REA)
                uniqueName: attr.precedence !== undefined ? `precedence${attr.precedence}` : ''
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
                max: r(skill.max) ?? 0,
                // desktop: <applytorating>yes</applytorating> routes the bonus to skill
                // rating instead of the dice pool (clsImprovement.cs:1690-1712)
                addToRating: skill.applytorating === 'yes'
            });
        }
    }
    if (bonusData.selectskill && selectedSkill) {
        b('Skill', selectedSkill, {
            val: r(bonusData.selectskill.bonus) ?? 0,
            max: r(bonusData.selectskill.max) ?? 0,
            addToRating: bonusData.selectskill.applytorating === 'yes'
        });
    }
    if (bonusData.skillgroup) {
        for (const group of bonusData.skillgroup) {
            b('SkillGroup', group.name, {
                val: r(group.bonus) ?? 0,
                exclude: group.exclude ?? ''
            });
        }
    }
    if (bonusData.skillcategory) {
        for (const cat of bonusData.skillcategory) {
            b('SkillCategory', cat.name, {
                val: r(cat.bonus) ?? 0,
                exclude: cat.exclude ?? ''
            });
        }
    }

    if (bonusData.conditionmonitor) applyConditionMonitorBonus(bonusData.conditionmonitor, r, b);
    if (bonusData.armor) applyArmorBonus(bonusData.armor, r, b);

    // Simple numeric properties
    const propMappings: Record<string, ImprovementType> = {
        initiative: 'Initiative',
        initiativepass: 'InitiativePass',
        composure: 'Composure',
        judgeintentions: 'JudgeIntentions',
        damageresistance: 'DamageResistance',
        drainresist: 'DrainResistance',
        fadingresist: 'FadingResistance',
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
        memory: 'Memory',
        cyberwareessmultiplier: 'CyberwareEssCost',
        biowareessmultiplier: 'BiowareEssCost'
    };

    for (const [key, impType] of Object.entries(propMappings)) {
        if (bonusData[key] !== undefined) {
            const resolved = r(bonusData[key]);
            if (resolved !== undefined) {
                // desktop hardcodes uniqueName "initiativepass" on every InitiativePass
                // improvement (clsImprovement.cs:1830) so e.g. Improved Reflexes and Wired
                // Reflexes don't stack extra initiative passes with each other.
                const uniqueName = key === 'initiativepass' ? 'initiativepass' : '';
                b(impType, '', { val: resolved, uniqueName });
            }
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

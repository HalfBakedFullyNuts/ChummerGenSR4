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
    ArmorBonus,
    NameEntry,
    SkillAttributeBonus,
    WeaponCategoryDVBonus,
    SpellCategoryBonus,
    LivingPersonaBonus
} from '$types';
import { getEnabledTabs } from '$lib/utils/qualities';

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

/** Resolve a plain-or-precedence-carrying bonus value, e.g. Will to Live's plain
 * `overflow: 1` vs High Pain Tolerance's `thresholdoffset: { value: 1, precedence: '0' }`
 * vs Boosted Reflexes' `initiative: { value: 'Rating', precedence: '1' }`. */
function resolvePrecedenceEntry(
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

    const threshold = resolvePrecedenceEntry(cm.threshold, r);
    if (threshold) b('CMThreshold', '', { val: threshold.val, uniqueName: threshold.uniqueName });

    const thresholdOffset = resolvePrecedenceEntry(cm.thresholdoffset, r);
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
 * Unwrap a `<name>` entry the XML parser's global isArray list force-wraps
 * into a one-element array even when non-repeating, resolving the
 * `{ value, precedence }` shape produced when the element carries an XML
 * attribute (e.g. `<name precedence="0">Combat</name>`).
 */
function resolveNameEntry(entry: NameEntry | readonly NameEntry[] | undefined): { name: string; precedence?: string } | undefined {
    const first = Array.isArray(entry) ? entry[0] : entry;
    if (typeof first === 'string') return { name: first };
    if (first !== undefined && typeof first === 'object') return { name: first.value, precedence: first.precedence };
    return undefined;
}

/** Desktop `<skillattribute>` (cyberware/bioware/gear/qualities) — a named attribute-linked skill bonus. */
function applySkillAttributeBonus(
    data: SkillAttributeBonus,
    r: (raw: BonusValue | undefined) => number | undefined,
    b: ImprovementBuilder
): void {
    const resolved = resolveNameEntry(data.name);
    const val = r(data.bonus);
    if (resolved && val !== undefined) b('SkillAttribute', resolved.name, { val });
}

/** Desktop `<weaponcategorydv>` (powers/martial arts) — flat DV bonus for a weapon category. */
function applyWeaponCategoryDVBonus(
    data: WeaponCategoryDVBonus,
    r: (raw: BonusValue | undefined) => number | undefined,
    b: ImprovementBuilder
): void {
    const resolved = resolveNameEntry(data.name);
    const val = r(data.bonus);
    if (resolved && val !== undefined) b('WeaponCategoryDV', resolved.name, { val });
}

/** Desktop `<spellcategory>` (gear/mentors) — bonus dice/force for a spell category, may carry precedence. */
function applySpellCategoryBonus(
    data: SpellCategoryBonus,
    r: (raw: BonusValue | undefined) => number | undefined,
    b: ImprovementBuilder
): void {
    const resolved = resolveNameEntry(data.name);
    const val = r(data.val);
    if (resolved && val !== undefined) {
        b('SpellCategory', resolved.name, {
            val,
            uniqueName: resolved.precedence !== undefined ? `precedence${resolved.precedence}` : ''
        });
    }
}

/**
 * Desktop `<livingpersona>` (echoes/qualities) — only `response` is produced
 * here (issue #68 Tier 1); signal/firewall/system/biofeedback feed the
 * Matrix/persona surface owned by a later epic (see #64 DEFERRED).
 */
function applyLivingPersonaBonus(
    data: LivingPersonaBonus,
    r: (raw: BonusValue | undefined) => number | undefined,
    b: ImprovementBuilder
): void {
    const response = r(data.response);
    if (response !== undefined) b('LivingPersonaResponse', '', { val: response });
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
    'SpecialTab',
    // issue #68 additions:
    'MatrixInitiative',
    'MatrixInitiativePass',
    'MatrixInitiativePassAdd',
    'SkillAttribute',
    'WeaponCategoryDV',
    'SpellCategory',
    'LivingPersonaResponse',
    'Smartlink',
    'BasicBiowareEssCost',
    'CyborgEssence',
    'QuickeningMetamagic',
    'FreeSpiritPowerPoints',
    'AdeptPowerPoints',
    'BasicLifestyleCost',
    'UnarmedAP',
    'ThrowRange',
    'ThrowSTR',
    'GenetechCostMultiplier',
    'TransgenicsBiowareCost',
    'SkillsoftAccess',
    'Nuyen',
    'Concealability',
    'UnarmedDVPhysical',
    'AdeptLinguistics',
    'SwapSkillAttribute',
    'Text',
    'Restricted'
];

/**
 * Every top-level `<bonus>` child key `createImprovementsFromBonus` recognizes
 * (issue #68). Kept in sync by hand — `warnUnknownBonusKeys` uses this to
 * flag data keys the parser doesn't yet handle, so new game-data keys never
 * silently disappear (`scripts/survey-bonus-keys.mjs` + the exhaustiveness
 * test in `__tests__/improvement-matrix.test.ts` verify this against shipped data).
 */
const KNOWN_BONUS_KEYS = new Set([
    'addattribute', 'specificattribute', 'selectattribute', 'enabletab',
    'specificskill', 'selectskill', 'skillgroup', 'skillcategory',
    'conditionmonitor', 'armor', 'skillattribute', 'weaponcategorydv', 'spellcategory', 'livingpersona',
    'initiative', 'initiativepass', 'composure', 'judgeintentions', 'damageresistance', 'drainresist',
    'fadingresist', 'notoriety', 'lifestylecost', 'reach', 'unarmeddv', 'movementpercent', 'swimpercent',
    'flyspeed', 'restricteditemcount', 'nuyenmaxbp', 'freepositivequalities', 'freenegativequalities',
    'skillwire', 'memory', 'cyberwareessmultiplier', 'biowareessmultiplier',
    'matrixinitiative', 'matrixinitiativepass', 'matrixinitiativepassadd', 'basicbiowareessmultiplier',
    'freespiritpowerpoints', 'adeptpowerpoints', 'basiclifestylecost', 'unarmedap', 'throwrange', 'throwstr',
    'genetechcostmultiplier', 'transgenicsgenetechcost', 'nuyenamt', 'concealability',
    'uneducated', 'uncouth', 'infirm', 'sensitivesystem', 'blackmarketdiscount', 'smartlink',
    'cyborgessence', 'quickeningmetamagic', 'unarmeddvphysical', 'adeptlinguistics', 'swapskillattribute',
    'skillsoftaccess',
    'selecttext', 'selectside', 'selectrestricted', 'selectmentorspirit', 'selectparagon'
]);

const warnedUnknownBonusKeys = new Set<string>();

/** Test-only: reset the per-session unknown-bonus-key warning dedup set. */
export function __resetUnknownBonusKeyWarnings(): void {
    warnedUnknownBonusKeys.clear();
}

/** Warn once per unknown key per session (never throw) — issue #68 warning policy. */
function warnUnknownBonusKeys(bonusData: Record<string, unknown>, sourceName: string): void {
    for (const key of Object.keys(bonusData)) {
        if (KNOWN_BONUS_KEYS.has(key) || warnedUnknownBonusKeys.has(key)) continue;
        warnedUnknownBonusKeys.add(key);
        console.warn(`[improvements] unhandled bonus key "${key}" on ${sourceName}`);
    }
}

/**
 * Extract improvements from parsed bonus block data.
 * @param source The general category of item providing it
 * @param sourceName The specific name of the item
 * @param bonusData Any type representing the xml node's bonus section
 * @param rating Optional rating if the item scales with it
 * @param selectedSkill User-selected skill (if applicable)
 * @param selectedAttribute User-selected attribute (if applicable)
 * @param selectedText User-entered text (if applicable, e.g. Allergy's "gluten" — `<selecttext>`)
 */
export function createImprovementsFromBonus(
    source: ImprovementSource,
    sourceName: string,
    bonusData: any, // Raw JSON object mirroring QualityBonus or similar
    rating: number = 1,
    selectedSkill?: string,
    selectedAttribute?: string,
    selectedText?: string
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
    if (bonusData.addattribute) {
        // desktop clsImprovement.cs:1200-1212 — reads only the attribute name and
        // stores value/rating 0, ignoring the XML min/max/val/aug children entirely.
        // uniqueName 'enableattribute' marks the attribute as unlocked (MAG/RES);
        // the actual base-1 initialization still goes through the hardcoded
        // MAGIC_QUALITIES/RESONANCE_QUALITIES gate in stores/character.ts (#63b
        // risk note) — wiring that gate to this improvement is a follow-up.
        for (const attr of bonusData.addattribute) {
            b('Attribute', String(attr.name).toLowerCase(), { val: 0, uniqueName: 'enableattribute' });
        }
    }
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
    if (bonusData.skillattribute) applySkillAttributeBonus(bonusData.skillattribute, r, b);
    if (bonusData.weaponcategorydv) applyWeaponCategoryDVBonus(bonusData.weaponcategorydv, r, b);
    if (bonusData.spellcategory) applySpellCategoryBonus(bonusData.spellcategory, r, b);
    if (bonusData.livingpersona) applyLivingPersonaBonus(bonusData.livingpersona, r, b);

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
        biowareessmultiplier: 'BiowareEssCost',
        matrixinitiative: 'MatrixInitiative',
        matrixinitiativepass: 'MatrixInitiativePass',
        matrixinitiativepassadd: 'MatrixInitiativePassAdd',
        basicbiowareessmultiplier: 'BasicBiowareEssCost',
        freespiritpowerpoints: 'FreeSpiritPowerPoints',
        adeptpowerpoints: 'AdeptPowerPoints',
        basiclifestylecost: 'BasicLifestyleCost',
        unarmedap: 'UnarmedAP',
        throwrange: 'ThrowRange',
        throwstr: 'ThrowSTR',
        genetechcostmultiplier: 'GenetechCostMultiplier',
        transgenicsgenetechcost: 'TransgenicsBiowareCost',
        nuyenamt: 'Nuyen',
        concealability: 'Concealability'
    };

    // desktop hardcodes these uniqueNames so same-type improvements from different
    // sources don't stack extra initiative passes with each other (clsImprovement.cs:1830, 1846).
    const HARDCODED_UNIQUE_NAMES: Record<string, string> = {
        initiativepass: 'initiativepass',
        matrixinitiativepass: 'matrixinitiativepass'
    };

    for (const [key, impType] of Object.entries(propMappings)) {
        if (bonusData[key] !== undefined) {
            // Most flat keys are a plain BonusValue, but some (e.g. Boosted Reflexes'
            // initiative) carry a precedence attribute like conditionmonitor's
            // threshold/thresholdoffset: { value: 'Rating', precedence: '1' }.
            const resolved = resolvePrecedenceEntry(bonusData[key], r);
            if (resolved !== undefined) {
                b(impType, '', {
                    val: resolved.val,
                    uniqueName: HARDCODED_UNIQUE_NAMES[key] ?? resolved.uniqueName
                });
            }
        }
    }

    // Boolean flags (represented as flat value 1 or stored in Custom logic)
    const flagMappings: Record<string, ImprovementType> = {
        uneducated: 'Uneducated',
        uncouth: 'Uncouth',
        infirm: 'Infirm',
        sensitivesystem: 'SensitiveSystem',
        blackmarketdiscount: 'BlackMarketDiscount',
        cyborgessence: 'CyborgEssence',
        quickeningmetamagic: 'QuickeningMetamagic',
        unarmeddvphysical: 'UnarmedDVPhysical',
        adeptlinguistics: 'AdeptLinguistics',
        swapskillattribute: 'SwapSkillAttribute',
        skillsoftaccess: 'SkillsoftAccess'
    };
    for (const [key, impType] of Object.entries(flagMappings)) {
        if (bonusData[key]) b(impType, '', { val: 1 });
    }

    if (bonusData.smartlink) {
        // smartlink is usually a presence-only flag (`true`), but can carry a rating number.
        const smartlinkVal = typeof bonusData.smartlink === 'boolean' ? undefined : r(bonusData.smartlink);
        b('Smartlink', '', { val: smartlinkVal ?? 1 });
    }

    // enabletab grants access to new sections like adept, magician, technomancer
    // (a quality can enable more than one tab, e.g. Mystic Adept: magician + adept)
    for (const tab of getEnabledTabs(bonusData.enabletab)) {
        b('SpecialTab', tab, { val: 1 });
    }

    // Selection-prompt keys (issue #68 Tier 2): no consuming UI exists yet for
    // most of these, so we emit a presence-only placeholder improvement rather
    // than warn — real selection wiring is a follow-up once the UI exists.
    if (bonusData.selecttext) b('Text', selectedText ?? '', { val: 1 });
    if (bonusData.selectrestricted) b('Restricted', '', { val: 1 });
    // cyberlimb side / mentor / paragon: label only, no gameplay effect (mentor/paragon
    // are modeled separately via char.magic.mentor)
    for (const key of ['selectside', 'selectmentorspirit', 'selectparagon']) {
        if (bonusData[key]) b('Text', '', { val: 1 });
    }

    warnUnknownBonusKeys(bonusData, sourceName);

    return results;
}

/**
 * Improvement Data Types
 * ======================
 * Represents the 89 mechanical enhancements and penalties parsed from game data
 * that affect a character's attributes, skills, and calculations.
 */

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
    | 'Focus'
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
 * A bonus value as carried from XML: either a resolved number, or an
 * unresolved expression string ("Rating", "-Rating", "FixedValues(2,3,5)")
 * that the parser resolves at creation time (see engine/improvementManager.ts).
 */
export type BonusValue = number | string;

/** Attribute modifier entry (`<specificattribute>` / `<addattribute>`). */
export interface AttributeBonusEntry {
    readonly name: string;
    /** Desktop `precedence` attribute on `<name>` — drives ValueOf's precedence0/precedence1 stacking rules. */
    readonly precedence?: string;
    readonly min?: BonusValue;
    readonly max?: BonusValue;
    readonly val?: BonusValue;
    readonly aug?: BonusValue;
}

/** Skill modifier entry (`<specificskill>`). */
export interface SkillBonusEntry {
    readonly name: string;
    readonly bonus?: BonusValue;
    readonly max?: BonusValue;
    /** `<applytorating>yes</applytorating>` — the bonus adds to skill rating, not the dice pool. */
    readonly applytorating?: string;
}

/** Skill group modifier entry (`<skillgroup>`). */
export interface SkillGroupBonusEntry {
    readonly name: string;
    readonly bonus?: BonusValue;
    /** Comma/space-separated skill names this group bonus does not apply to. */
    readonly exclude?: string;
}

/** Skill category modifier entry (`<skillcategory>`). */
export interface SkillCategoryBonusEntry {
    readonly name: string;
    readonly bonus?: BonusValue;
    /** Comma/space-separated skill names this category bonus does not apply to. */
    readonly exclude?: string;
}

/** A bonus value carrying a `precedence` attribute (e.g. `<thresholdoffset precedence="0">1</thresholdoffset>`). */
export interface PrecedenceBonusValue {
    readonly value: BonusValue;
    readonly precedence?: string;
}

/** Condition monitor bonus (`<conditionmonitor>`) — physical/stun/threshold/overflow boxes. */
export interface ConditionMonitorBonus {
    readonly physical?: BonusValue;
    readonly stun?: BonusValue;
    readonly threshold?: BonusValue | PrecedenceBonusValue;
    readonly thresholdoffset?: BonusValue | PrecedenceBonusValue;
    readonly overflow?: BonusValue;
}

/** Armor bonus (`<armor><b>N</b><i>N</i></armor>`) — flat ballistic/impact armor add. */
export interface ArmorBonus {
    readonly b?: BonusValue;
    readonly i?: BonusValue;
}

/**
 * A `<name>` entry that the XML parser's global isArray list force-wraps into
 * a one-element array even when non-repeating (`skillattribute`,
 * `weaponcategorydv`), optionally carrying `{ value, precedence }` when the
 * name element itself has attributes (`spellcategory`).
 */
export type NameEntry = string | { readonly value: string; readonly precedence?: string };

/** `<skillattribute>` (cyberware/bioware/gear/qualities) — a named attribute-linked skill bonus. */
export interface SkillAttributeBonus {
    readonly name: NameEntry | readonly NameEntry[];
    readonly bonus?: BonusValue;
}

/** `<weaponcategorydv>` (powers/martial arts) — flat DV bonus for a weapon category. */
export interface WeaponCategoryDVBonus {
    readonly name: NameEntry | readonly NameEntry[];
    readonly bonus?: BonusValue;
}

/** `<spellcategory>` (gear/mentors) — bonus dice/force for a spell category, may carry precedence. */
export interface SpellCategoryBonus {
    readonly name: NameEntry | readonly NameEntry[];
    readonly val?: BonusValue;
}

/**
 * `<livingpersona>` (echoes/qualities) — technomancer Living Persona attribute
 * overrides. Only `response` is consumed today (issue #68 Tier 1; the other
 * four feed the Matrix/persona surface in a later epic).
 */
export interface LivingPersonaBonus {
    readonly response?: BonusValue;
    readonly signal?: BonusValue;
    readonly firewall?: BonusValue;
    readonly system?: BonusValue;
    readonly biofeedback?: BonusValue;
}

/**
 * Structured `<bonus>` data carried from game-data XML into JSON.
 * Renamed and extended from the former `QualityBonus` (values widened to
 * `BonusValue` so unresolved "Rating"/"FixedValues(...)" expressions survive
 * conversion). `createImprovementsFromBonus` (engine/improvementManager.ts)
 * resolves these into typed Improvements; the index signature lets the
 * converter carry forward bonus keys the parser doesn't handle yet (#68)
 * without dropping them.
 */
export interface BonusData {
    readonly addattribute?: readonly AttributeBonusEntry[];
    readonly specificattribute?: readonly AttributeBonusEntry[];
    readonly enabletab?: string;
    readonly specificskill?: readonly SkillBonusEntry[];
    readonly skillgroup?: readonly SkillGroupBonusEntry[];
    readonly skillcategory?: readonly SkillCategoryBonusEntry[];
    readonly selectskill?: { readonly max?: BonusValue; readonly bonus?: BonusValue };
    readonly selectattribute?: { readonly min?: BonusValue; readonly max?: BonusValue; readonly val?: BonusValue };
    readonly initiative?: BonusValue;
    readonly initiativepass?: BonusValue;
    readonly conditionmonitor?: ConditionMonitorBonus;
    readonly armor?: ArmorBonus;
    readonly memory?: BonusValue;
    readonly fadingresist?: BonusValue;
    readonly notoriety?: BonusValue;
    readonly composure?: BonusValue;
    readonly judgeintentions?: BonusValue;
    readonly damageresistance?: BonusValue;
    readonly drainresist?: BonusValue;
    readonly lifestylecost?: BonusValue;
    readonly cyberwareessmultiplier?: BonusValue;
    readonly biowareessmultiplier?: BonusValue;
    readonly reach?: BonusValue;
    readonly unarmeddv?: BonusValue;
    readonly movementpercent?: BonusValue;
    readonly swimpercent?: BonusValue;
    readonly flyspeed?: BonusValue;
    readonly restricteditemcount?: BonusValue;
    readonly nuyenmaxbp?: BonusValue;
    readonly freepositivequalities?: BonusValue;
    readonly freenegativequalities?: BonusValue;
    readonly skillwire?: BonusValue;
    readonly uneducated?: boolean;
    readonly uncouth?: boolean;
    readonly infirm?: boolean;
    readonly sensitivesystem?: boolean;
    readonly blackmarketdiscount?: boolean;
    /** Matrix/Living Persona initiative (issue #68). */
    readonly matrixinitiative?: BonusValue;
    readonly matrixinitiativepass?: BonusValue;
    readonly matrixinitiativepassadd?: BonusValue;
    readonly skillattribute?: SkillAttributeBonus;
    readonly weaponcategorydv?: WeaponCategoryDVBonus;
    readonly spellcategory?: SpellCategoryBonus;
    readonly livingpersona?: LivingPersonaBonus;
    readonly smartlink?: BonusValue | boolean;
    readonly basicbiowareessmultiplier?: BonusValue;
    readonly cyborgessence?: boolean;
    readonly quickeningmetamagic?: boolean;
    readonly freespiritpowerpoints?: BonusValue;
    readonly adeptpowerpoints?: BonusValue;
    readonly basiclifestylecost?: BonusValue;
    readonly unarmeddvphysical?: boolean;
    readonly adeptlinguistics?: boolean;
    readonly swapskillattribute?: boolean;
    readonly unarmedap?: BonusValue;
    readonly throwrange?: BonusValue;
    readonly throwstr?: BonusValue;
    readonly genetechcostmultiplier?: BonusValue;
    readonly transgenicsgenetechcost?: BonusValue;
    readonly skillsoftaccess?: boolean;
    readonly nuyenamt?: BonusValue;
    readonly concealability?: BonusValue;
    /** Selection-prompt keys (issue #68 Tier 2) — presence-only today; no consuming UI yet. */
    readonly selecttext?: boolean;
    readonly selectside?: boolean;
    readonly selectrestricted?: boolean;
    readonly selectmentorspirit?: boolean;
    readonly selectparagon?: boolean;
    /** Tolerate bonus keys the parser doesn't resolve yet — never silently drop unrecognized data. */
    readonly [key: string]: unknown;
}

/** @deprecated Use {@link BonusData} — kept so existing `QualityBonus` imports keep working. */
export type QualityBonus = BonusData;

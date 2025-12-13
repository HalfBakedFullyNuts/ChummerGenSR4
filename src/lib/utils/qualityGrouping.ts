/**
 * Quality Grouping Utilities
 * ==========================
 * Groups related qualities (variants and grades) into single selectable items.
 *
 * Patterns detected:
 * - Parentheses variants: "Animal Pelage (Quills)", "Animal Pelage (Camo Fur)"
 * - Grade variants: "Changeling (Class I SURGE)", "Changeling (Class II SURGE)"
 * - Numbered variants: "Deep Cover (1 Trigger Known)", "Deep Cover (2 Triggers Known)"
 * - Colon variants: "Code of Conduct: Bushido", "Code of Conduct: Mercenary Credo"
 */

import type { GameQuality } from '$stores/gamedata';

/**
 * Metatype restrictions for Infected qualities.
 * Based on HMHVV strain compatibility from SR4 Runner's Companion.
 *
 * HMHVV-I (Vampire strain): Metatype-specific variants
 * HMHVV-II (Ghoul strain): Any metatype
 * HMHVV-III (Loup-Garou strain): Typically Human/Elf
 * Krieger strain (Wendigo): Human only
 */
export const INFECTED_METATYPE_RESTRICTIONS: Record<string, string[]> = {
    // HMHVV-I variants (Vampire strain) - metatype specific
    'Infected: Vampire': ['Human'],
    'Infected: Nosferatu': ['Human'],
    'Infected: Banshee': ['Elf'],
    'Infected: Goblin': ['Dwarf', 'Ork'],
    'Infected: Dzoo-Noo-Qua': ['Troll'],
    'Infected: Fomóraig': ['Troll'],

    // HMHVV-II variants (Ghoul strain) - any metatype
    'Infected: Ghoul': [], // Empty = any metatype
    'Infected: Gaki': [], // Regional ghoul variant
    'Infected: Penanggalan': [], // Regional ghoul variant
    'Infected: Sasobonsam': [], // Regional ghoul variant
    'Infected: Busaw': [], // Regional ghoul variant
    'Infected: Abat': [], // Regional ghoul variant

    // HMHVV-III variants (Loup-Garou strain)
    'Infected: Loup-Garou': ['Human'],
    'Infected: Amalanhig': ['Human'], // Regional variant
    'Infected: Sukuyan': ['Human'], // Regional variant

    // Krieger strain
    'Infected: Wendigo': ['Human'],

    // Bandersnatch - Elf only (from Running Wild)
    'Infected: Bandersnatch': ['Elf']
};

/**
 * Base metatype mapping for metavariants.
 * Maps metavariant names to their base metatype.
 */
const METAVARIANT_BASE_MAP: Record<string, string> = {
    // Dwarf metavariants
    'Gnome': 'Dwarf',
    'Haruman': 'Dwarf',
    'Koborokuru': 'Dwarf',
    'Menehune': 'Dwarf',

    // Elf metavariants
    'Dryad': 'Elf',
    'Night One': 'Elf',
    'Wakyambi': 'Elf',
    'Xapiri Thëpë': 'Elf',

    // Ork metavariants
    'Hobgoblin': 'Ork',
    'Ogre': 'Ork',
    'Oni': 'Ork',
    'Satyr': 'Ork',

    // Troll metavariants
    'Cyclops': 'Troll',
    'Fomori': 'Troll',
    'Giant': 'Troll',
    'Minotaur': 'Troll',

    // Human metavariants
    'Nartaki': 'Human'
};

/**
 * Get the base metatype for a given metatype/metavariant.
 * Returns the metatype itself if it's already a base type.
 */
export function getBaseMetatype(metatype: string): string {
    return METAVARIANT_BASE_MAP[metatype] ?? metatype;
}

/**
 * Check if a quality is available for a given metatype.
 * Returns true if:
 * - The quality has no metatype restrictions
 * - The quality's restrictions include the character's base metatype
 */
export function isQualityAvailableForMetatype(qualityName: string, metatype: string): boolean {
    const restrictions = INFECTED_METATYPE_RESTRICTIONS[qualityName];

    // Not an infected quality or no restrictions defined = available
    if (restrictions === undefined) {
        return true;
    }

    // Empty array = any metatype allowed
    if (restrictions.length === 0) {
        return true;
    }

    // Check if character's base metatype is in allowed list
    const baseMetatype = getBaseMetatype(metatype);
    return restrictions.includes(baseMetatype);
}

/**
 * Filter qualities based on metatype restrictions.
 * Removes qualities that are not available for the given metatype.
 */
export function filterQualitiesByMetatype(
    qualities: readonly GameQuality[],
    metatype: string | undefined
): GameQuality[] {
    if (!metatype) {
        return [...qualities];
    }

    return qualities.filter(q => isQualityAvailableForMetatype(q.name, metatype));
}

/** A grouped quality that may contain variants. */
export interface GroupedQuality {
    /** The base name of the quality (e.g., "Animal Pelage") */
    baseName: string;
    /** Display name - same as baseName for groups, full name for singles */
    displayName: string;
    /** Whether this represents a group of variants */
    isGroup: boolean;
    /** The individual quality variants in this group */
    variants: GameQuality[];
    /** Representative quality data (first variant's data for groups) */
    representative: GameQuality;
    /** Category inherited from representative */
    category: 'Positive' | 'Negative';
    /** Source/page from representative */
    source: string;
    page: number;
}

/** Patterns for detecting quality variants. */
const PARENTHESES_PATTERN = /^(.+?)\s*\(([^)]+)\)$/;
const COLON_PATTERN = /^(.+?):\s*(.+)$/;
const GRADE_PATTERNS = [
    /Class\s+(I{1,3}|IV|V)/i,  // Roman numerals
    /\((\d+)\s+trigger/i,       // Numbered triggers
    /Level\s+(\d+)/i,           // Numbered levels
    /Rating\s+(\d+)/i,          // Numbered ratings
    /Grade\s+(I{1,3}|IV|V|\d+)/i // Grade variants
];

/**
 * Parse a quality name to extract base name and variant.
 * Returns null if no variant pattern is detected.
 */
export function parseQualityName(name: string): { baseName: string; variant: string } | null {
    // Check parentheses pattern first (most common)
    const parenMatch = name.match(PARENTHESES_PATTERN);
    if (parenMatch && parenMatch[1] && parenMatch[2]) {
        return {
            baseName: parenMatch[1].trim(),
            variant: parenMatch[2].trim()
        };
    }

    // Check colon pattern (e.g., "Code of Conduct: Bushido")
    const colonMatch = name.match(COLON_PATTERN);
    if (colonMatch && colonMatch[1] && colonMatch[2]) {
        return {
            baseName: colonMatch[1].trim(),
            variant: colonMatch[2].trim()
        };
    }

    return null;
}

/**
 * Check if a variant string indicates a grade-based variant.
 * Grade variants typically have Roman numerals or level numbers.
 */
export function isGradeVariant(variant: string): boolean {
    return GRADE_PATTERNS.some(pattern => pattern.test(variant));
}

/**
 * Group an array of qualities by their base name.
 * Individual qualities without variants are returned as single-item groups.
 */
export function groupQualities(qualities: readonly GameQuality[]): GroupedQuality[] {
    const groupMap = new Map<string, GameQuality[]>();
    const ungrouped: GameQuality[] = [];

    // First pass: categorize qualities
    for (const quality of qualities) {
        const parsed = parseQualityName(quality.name);

        if (parsed) {
            const key = parsed.baseName.toLowerCase();
            if (!groupMap.has(key)) {
                groupMap.set(key, []);
            }
            groupMap.get(key)!.push(quality);
        } else {
            ungrouped.push(quality);
        }
    }

    const result: GroupedQuality[] = [];

    // Process grouped qualities
    for (const [_key, variants] of groupMap) {
        if (variants.length === 1) {
            // Only one variant - treat as ungrouped but keep full name
            const quality = variants[0]!;
            result.push({
                baseName: quality.name,
                displayName: quality.name,
                isGroup: false,
                variants: [quality],
                representative: quality,
                category: quality.category as 'Positive' | 'Negative',
                source: quality.source,
                page: quality.page
            });
        } else {
            // Multiple variants - create a group
            const firstVariant = variants[0]!;
            const parsed = parseQualityName(firstVariant.name);
            const baseName = parsed?.baseName ?? firstVariant.name;

            // Sort variants by name for consistent ordering
            variants.sort((a, b) => a.name.localeCompare(b.name));

            result.push({
                baseName,
                displayName: baseName,
                isGroup: true,
                variants,
                representative: firstVariant,
                category: firstVariant.category as 'Positive' | 'Negative',
                source: firstVariant.source,
                page: firstVariant.page
            });
        }
    }

    // Add ungrouped qualities
    for (const quality of ungrouped) {
        result.push({
            baseName: quality.name,
            displayName: quality.name,
            isGroup: false,
            variants: [quality],
            representative: quality,
            category: quality.category as 'Positive' | 'Negative',
            source: quality.source,
            page: quality.page
        });
    }

    // Sort by display name
    result.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return result;
}

/**
 * Get the minimum and maximum BP cost for a group.
 * For single qualities, min and max are the same.
 */
export function getGroupBPRange(group: GroupedQuality): { min: number; max: number } {
    const costs = group.variants.map(v => Math.abs(v.bp));
    return {
        min: Math.min(...costs),
        max: Math.max(...costs)
    };
}

/**
 * Format a BP range for display.
 * Shows single value if all variants have same cost.
 */
export function formatBPRange(group: GroupedQuality): string {
    const range = getGroupBPRange(group);
    if (range.min === range.max) {
        return `${range.min} BP`;
    }
    return `${range.min}-${range.max} BP`;
}

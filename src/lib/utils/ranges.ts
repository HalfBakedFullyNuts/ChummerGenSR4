import type { Character } from '$types';
import type { GameRange } from '$stores/gamedata';

export interface ComputedRange {
    min: number;
    short: number;
    medium: number;
    long: number;
    extreme: number;
}

/**
 * Calculates the range for a given weapon category based on the character's attributes.
 */
export function calculateWeaponRange(
    category: string,
    char: Character | null,
    ranges: GameRange[]
): ComputedRange | null {
    const rangeData = ranges.find((r) => r.category === category);
    if (!rangeData) return null;

    const str = char ? char.attributes.str.base + char.attributes.str.bonus : 1;
    // Wait, is BOD used? Let's get BOD too.
    const bod = char ? char.attributes.bod.base + char.attributes.bod.bonus : 1;

    const parseValue = (val: string): number => {
        if (!val) return 0;
        if (val.includes('STR*')) {
            const mult = parseInt(val.replace('STR*', ''), 10);
            return str * mult;
        }
        if (val.includes('BOD*')) {
            const mult = parseInt(val.replace('BOD*', ''), 10);
            return bod * mult;
        }
        if (val === 'STR') return str;
        if (val === 'BOD') return bod;

        return parseInt(val, 10) || 0;
    };

    // Some ranges have MIN value, but ranges usually go Short, Medium, Long, Extreme
    return {
        min: parseValue(rangeData.min),
        short: parseValue(rangeData.short),
        medium: parseValue(rangeData.medium),
        long: parseValue(rangeData.long),
        extreme: parseValue(rangeData.extreme)
    };
}

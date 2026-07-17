/**
 * Magic Store Module
 * ==================
 * Magic type detection, initialization, traditions, mentors,
 * creation-time spell/power management, spirit management,
 * and metamagic management.
 *
 * Career-mode magic advancement (learnSpell, initiate) lives in career.ts
 * since they depend on karma spending.
 */

import { get, derived, type Readable } from 'svelte/store';
import {
	type Character,
	type CharacterMagic,
	type CharacterSpell,
	type CharacterPower,
	type BoundSpirit
} from '$types';
import { characterStore, generateId, isCareerMode } from './character';

/* ============================================
 * Magic Type Detection
 * ============================================ */

/** Technomancer quality names. */
const TECHNOMANCER_QUALITIES = ['Technomancer', 'Latent Technomancer'] as const;

/** Magic type based on qualities. */
export type MagicType =
	| 'mundane'
	| 'magician'
	| 'adept'
	| 'mystic_adept'
	| 'aspected'
	| 'technomancer';

/** Determine character's magic type from qualities. */
export function getMagicType(char: Character | null): MagicType {
	if (!char) return 'mundane';

	const qualityNames = char.qualities.map((q) => q.name);

	if (qualityNames.includes('Magician')) return 'magician';
	if (qualityNames.includes('Mystic Adept')) return 'mystic_adept';
	if (qualityNames.includes('Adept')) return 'adept';
	if (qualityNames.some((n) => n.startsWith('Aspected Magician'))) return 'aspected';
	if (
		qualityNames.some((n) =>
			TECHNOMANCER_QUALITIES.includes(n as (typeof TECHNOMANCER_QUALITIES)[number])
		)
	) {
		return 'technomancer';
	}

	return 'mundane';
}

/** Derived store for character's magic type. */
export const magicType: Readable<MagicType> = derived(
	{ subscribe: characterStore.subscribe } as Readable<Character | null>,
	($char) => getMagicType($char)
);

/* ============================================
 * Magic Initialization & Configuration
 * ============================================ */

/** Initialize magic for a character. Sets up magic attribute and tradition. */
export function initializeMagic(tradition: string): void {
	const char = get(characterStore);
	if (!char) return;

	const type = getMagicType(char);
	if (type === 'mundane') return;

	const magicData: CharacterMagic = {
		tradition,
		mentor: null,
		initiateGrade: 0,
		powerPoints: type === 'adept' || type === 'mystic_adept' ? 6 : 0,
		powerPointsUsed: 0,
		spells: [],
		powers: [],
		spirits: [],
		metamagics: []
	};

	const updated: Character = {
		...char,
		magic: magicData,
		attributes: {
			...char.attributes,
			mag: { base: 1, bonus: 0, karma: 0 }
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Set the magic tradition. */
export function setTradition(tradition: string): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	const updated: Character = {
		...char,
		magic: { ...char.magic, tradition },
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Set the character's mentor spirit. Costs 5 BP during creation. */
export function setMentor(mentorName: string | null): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	const newMentorBP = mentorName !== null ? 5 : 0;

	const totalSpent = Object.values(char.buildPointsSpent).reduce((a, b) => a + b, 0);
	const bpDiff = newMentorBP - char.buildPointsSpent.mentor;
	if (totalSpent + bpDiff > char.buildPoints) return;

	const updated: Character = {
		...char,
		magic: { ...char.magic, mentor: mentorName },
		buildPointsSpent: {
			...char.buildPointsSpent,
			mentor: newMentorBP
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/* ============================================
 * Creation-time Spell & Power Management
 * ============================================ */

/** Add a spell to the character. Costs 5 BP per spell during creation. */
export function addSpell(spell: {
	name: string;
	category: string;
	type: string;
	range: string;
	damage: string;
	duration: string;
	dv: string;
}): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	if (char.magic.spells.some((s) => s.name === spell.name)) return;

	const newSpell: CharacterSpell = {
		id: generateId(),
		...spell,
		notes: ''
	};

	const updated: Character = {
		...char,
		magic: {
			...char.magic,
			spells: [...char.magic.spells, newSpell]
		},
		buildPointsSpent: {
			...char.buildPointsSpent,
			spells: char.buildPointsSpent.spells + 5
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Remove a spell from the character. */
export function removeSpell(spellId: string): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	const updated: Character = {
		...char,
		magic: {
			...char.magic,
			spells: char.magic.spells.filter((s) => s.id !== spellId)
		},
		buildPointsSpent: {
			...char.buildPointsSpent,
			spells: char.buildPointsSpent.spells - 5
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Add an adept power to the character. */
export function addPower(power: { name: string; points: number; level: number }): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	const newUsed = char.magic.powerPointsUsed + power.points;
	if (newUsed > char.magic.powerPoints) return;

	const newPower: CharacterPower = {
		id: generateId(),
		name: power.name,
		points: power.points,
		level: power.level,
		notes: ''
	};

	const updated: Character = {
		...char,
		magic: {
			...char.magic,
			powers: [...char.magic.powers, newPower],
			powerPointsUsed: newUsed
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Remove an adept power from the character. */
export function removePower(powerId: string): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	const power = char.magic.powers.find((p) => p.id === powerId);
	if (!power) return;

	const updated: Character = {
		...char,
		magic: {
			...char.magic,
			powers: char.magic.powers.filter((p) => p.id !== powerId),
			powerPointsUsed: char.magic.powerPointsUsed - power.points
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/* ============================================
 * Spirit Management
 * ============================================ */

/** Add a bound spirit to the character. */
export function addSpirit(
	spiritType: string,
	force: number,
	services: number,
	bound: boolean = false
): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (!char.magic) return { success: false, error: 'Character is not awakened' };

	const newSpirit: BoundSpirit = {
		id: generateId(),
		type: spiritType,
		force: Math.max(1, Math.min(12, force)),
		services: Math.max(0, services),
		bound
	};

	characterStore.update((c) => {
		if (!c || !c.magic) return c;
		return {
			...c,
			magic: {
				...c.magic,
				spirits: [...c.magic.spirits, newSpirit]
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Remove a spirit from the character. */
export function removeSpirit(spiritId: string): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	characterStore.update((c) => {
		if (!c || !c.magic) return c;
		return {
			...c,
			magic: {
				...c.magic,
				spirits: c.magic.spirits.filter((s) => s.id !== spiritId)
			},
			updatedAt: new Date().toISOString()
		};
	});
}

/** Use a service from a spirit. */
export function useSpiritService(spiritId: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char || !char.magic) return { success: false, error: 'No character or magic' };

	const spirit = char.magic.spirits.find((s) => s.id === spiritId);
	if (!spirit) return { success: false, error: 'Spirit not found' };
	if (spirit.services <= 0) return { success: false, error: 'No services remaining' };

	characterStore.update((c) => {
		if (!c || !c.magic) return c;
		return {
			...c,
			magic: {
				...c.magic,
				spirits: c.magic.spirits.map((s) =>
					s.id === spiritId ? { ...s, services: s.services - 1 } : s
				)
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Update spirit services (for adding more via binding). */
export function updateSpiritServices(spiritId: string, services: number): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	characterStore.update((c) => {
		if (!c || !c.magic) return c;
		return {
			...c,
			magic: {
				...c.magic,
				spirits: c.magic.spirits.map((s) =>
					s.id === spiritId ? { ...s, services: Math.max(0, services) } : s
				)
			},
			updatedAt: new Date().toISOString()
		};
	});
}

/* ============================================
 * Metamagic Management
 * ============================================ */

/** Learn a metamagic ability (requires initiation). */
export function learnMetamagic(metamagicName: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (!char.magic) return { success: false, error: 'Character is not awakened' };

	if (char.magic.metamagics.includes(metamagicName)) {
		return { success: false, error: 'Metamagic already known' };
	}

	const availableSlots = char.magic.initiateGrade;
	const usedSlots = char.magic.metamagics.length;

	if (usedSlots >= availableSlots) {
		return { success: false, error: 'No metamagic slots available (need to initiate)' };
	}

	characterStore.update((c) => {
		if (!c || !c.magic) return c;
		return {
			...c,
			magic: {
				...c.magic,
				metamagics: [...c.magic.metamagics, metamagicName]
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Remove a metamagic ability. */
export function removeMetamagic(metamagicName: string): void {
	const char = get(characterStore);
	if (!char || !char.magic) return;

	characterStore.update((c) => {
		if (!c || !c.magic) return c;
		return {
			...c,
			magic: {
				...c.magic,
				metamagics: c.magic.metamagics.filter((m) => m !== metamagicName)
			},
			updatedAt: new Date().toISOString()
		};
	});
}

/* ============================================
 * Foci Bonding
 * ============================================ */

/** Calculate Karma/BP cost to bond a focus based on its type and force. */
export function getFocusKarmaCost(name: string, category: string, force: number): number {
	if (name.includes('Power Focus')) return force * 4;
	if (name.includes('Weapon Focus') || category === 'Metamagic Foci') return force * 3;
	if (name.includes('Sustaining Focus')) return force * 1;
	// Default for Spellcasting, Counterspelling, Summoning, Banishing, Binding
	return force * 2;
}

/** Bond a focus. */
export function bondFocus(focusId: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character' };
	if (!char.magic) return { success: false, error: 'Not awakened' };

	const isCareer = get(isCareerMode);

	const fociList = char.equipment.foci || [];
	const focusIndex = fociList.findIndex(f => f.id === focusId);
	if (focusIndex === -1) return { success: false, error: 'Focus not found' };

	const focus = fociList[focusIndex];
	if (!focus) return { success: false, error: 'Focus is missing' };
	if (focus.bonded) return { success: false, error: 'Already bonded' };

	const cost = getFocusKarmaCost(focus.name, focus.category, focus.force);

	// Needs sufficient Karma (or BP in creation)
	if (isCareer) {
		if (char.karma < cost) return { success: false, error: `Need ${cost} Karma to bond.` };
	}

	characterStore.update((c) => {
		if (!c) return c;
		const cloneFoci = [...(c.equipment.foci || [])];
		cloneFoci[focusIndex] = { ...focus, bonded: true };

		return {
			...c,
			equipment: { ...c.equipment, foci: cloneFoci },
			karma: isCareer ? c.karma - cost : c.karma,
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Unbond a focus. */
export function unbondFocus(focusId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const isCareer = get(isCareerMode);

	const fociList = char.equipment.foci || [];
	const focusIndex = fociList.findIndex(f => f.id === focusId);
	if (focusIndex === -1) return;
	const focus = fociList[focusIndex];
	if (!focus || !focus.bonded) return;

	const cost = getFocusKarmaCost(focus.name, focus.category, focus.force);

	characterStore.update((c) => {
		if (!c) return c;
		const cloneFoci = [...(c.equipment.foci || [])];
		cloneFoci[focusIndex] = { ...focus, bonded: false };

		return {
			...c,
			equipment: { ...c.equipment, foci: cloneFoci },
			karma: !isCareer ? c.karma + cost : c.karma,
			updatedAt: new Date().toISOString()
		};
	});
}

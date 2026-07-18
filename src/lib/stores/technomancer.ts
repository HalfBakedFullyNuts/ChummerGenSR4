/**
 * Technomancer Store Module
 * =========================
 * Resonance initialization, complex form creation CRUD,
 * echo management, and sprite management.
 *
 * Career-mode functions (submerge, learnComplexForm) are in career.ts.
 */

import { get } from 'svelte/store';
import { type Character, type CharacterResonance, type CompiledSprite } from '$types';
import { characterStore, generateId } from './character';
import { createImprovementsFromBonus, removeImprovements } from '../engine/improvementManager';
import { echoes as gameEchoes } from './gamedata';

/** Initialize technomancer resonance. */
export function initializeResonance(stream: string): void {
	const char = get(characterStore);
	if (!char) return;

	const resonanceData: CharacterResonance = {
		stream,
		submersionGrade: 0,
		complexForms: [],
		sprites: [],
		echoes: []
	};

	const updated: Character = {
		...char,
		resonance: resonanceData,
		attributes: {
			...char.attributes,
			res: { base: 1, bonus: 0, karma: 0 }
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Add a complex form (creation mode). Costs 5 BP. */
export function addComplexForm(form: {
	name: string;
	target: string;
	duration: string;
	fv: string;
}): void {
	const char = get(characterStore);
	if (!char || !char.resonance) return;

	if (char.resonance.complexForms.some((f) => f.name === form.name)) return;

	const newForm = {
		id: generateId(),
		...form,
		rating: 1,
		notes: ''
	};

	const updated: Character = {
		...char,
		resonance: {
			...char.resonance,
			complexForms: [...char.resonance.complexForms, newForm]
		},
		buildPointsSpent: {
			...char.buildPointsSpent,
			complexForms: char.buildPointsSpent.complexForms + 5
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Remove a complex form. */
export function removeComplexForm(formId: string): void {
	const char = get(characterStore);
	if (!char || !char.resonance) return;

	const updated: Character = {
		...char,
		resonance: {
			...char.resonance,
			complexForms: char.resonance.complexForms.filter((f) => f.id !== formId)
		},
		buildPointsSpent: {
			...char.buildPointsSpent,
			complexForms: char.buildPointsSpent.complexForms - 5
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/* ============================================
 * Echo Management
 * ============================================ */

/** Learn an echo (requires submersion). Each submersion grade grants one echo. */
export function learnEcho(echoName: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (!char.resonance) return { success: false, error: 'Character is not a technomancer' };

	if (char.resonance.echoes.includes(echoName)) {
		return { success: false, error: 'Echo already known' };
	}

	const availableSlots = char.resonance.submersionGrade;
	const usedSlots = char.resonance.echoes.length;

	if (usedSlots >= availableSlots) {
		return { success: false, error: 'No echo slots available (need to submerge)' };
	}

	const gameEcho = get(gameEchoes).find((e) => e.name === echoName);
	const echoImps = gameEcho?.bonus
		? createImprovementsFromBonus('Echo', echoName, gameEcho.bonus, 1)
		: [];

	characterStore.update((c) => {
		if (!c || !c.resonance) return c;
		return {
			...c,
			resonance: {
				...c.resonance,
				echoes: [...c.resonance.echoes, echoName]
			},
			improvements: [...c.improvements, ...echoImps],
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Remove an echo. */
export function removeEcho(echoName: string): void {
	const char = get(characterStore);
	if (!char || !char.resonance) return;

	if (!char.resonance.echoes.includes(echoName)) return;

	characterStore.update((c) => {
		if (!c || !c.resonance) return c;
		return {
			...c,
			resonance: {
				...c.resonance,
				echoes: c.resonance.echoes.filter((e) => e !== echoName)
			},
			improvements: removeImprovements(c.improvements, 'Echo', echoName),
			updatedAt: new Date().toISOString()
		};
	});
}

/* ============================================
 * Sprite Management
 * ============================================ */

/** Add a compiled sprite. */
export function addSprite(
	spriteType: string,
	rating: number,
	tasks: number,
	registered: boolean = false
): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char) return { success: false, error: 'No character loaded' };
	if (!char.resonance) return { success: false, error: 'Character is not a technomancer' };

	const newSprite: CompiledSprite = {
		id: generateId(),
		type: spriteType,
		rating: Math.max(1, Math.min(12, rating)),
		tasks: Math.max(0, tasks),
		registered
	};

	characterStore.update((c) => {
		if (!c || !c.resonance) return c;
		return {
			...c,
			resonance: {
				...c.resonance,
				sprites: [...c.resonance.sprites, newSprite]
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Remove a sprite. */
export function removeSprite(spriteId: string): void {
	const char = get(characterStore);
	if (!char || !char.resonance) return;

	characterStore.update((c) => {
		if (!c || !c.resonance) return c;
		return {
			...c,
			resonance: {
				...c.resonance,
				sprites: c.resonance.sprites.filter((s) => s.id !== spriteId)
			},
			updatedAt: new Date().toISOString()
		};
	});
}

/** Use a task from a sprite. */
export function useSpriteTask(spriteId: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char || !char.resonance) return { success: false, error: 'No character or resonance' };

	const sprite = char.resonance.sprites.find((s) => s.id === spriteId);
	if (!sprite) return { success: false, error: 'Sprite not found' };
	if (sprite.tasks <= 0) return { success: false, error: 'No tasks remaining' };

	characterStore.update((c) => {
		if (!c || !c.resonance) return c;
		return {
			...c,
			resonance: {
				...c.resonance,
				sprites: c.resonance.sprites.map((s) =>
					s.id === spriteId ? { ...s, tasks: s.tasks - 1 } : s
				)
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Register a sprite (makes it permanent). */
export function registerSprite(spriteId: string): { success: boolean; error?: string } {
	const char = get(characterStore);
	if (!char || !char.resonance) return { success: false, error: 'No character or resonance' };

	const sprite = char.resonance.sprites.find((s) => s.id === spriteId);
	if (!sprite) return { success: false, error: 'Sprite not found' };
	if (sprite.registered) return { success: false, error: 'Sprite already registered' };

	characterStore.update((c) => {
		if (!c || !c.resonance) return c;
		return {
			...c,
			resonance: {
				...c.resonance,
				sprites: c.resonance.sprites.map((s) =>
					s.id === spriteId ? { ...s, registered: true } : s
				)
			},
			updatedAt: new Date().toISOString()
		};
	});

	return { success: true };
}

/** Update sprite tasks. */
export function updateSpriteTasks(spriteId: string, tasks: number): void {
	const char = get(characterStore);
	if (!char || !char.resonance) return;

	characterStore.update((c) => {
		if (!c || !c.resonance) return c;
		return {
			...c,
			resonance: {
				...c.resonance,
				sprites: c.resonance.sprites.map((s) =>
					s.id === spriteId ? { ...s, tasks: Math.max(0, tasks) } : s
				)
			},
			updatedAt: new Date().toISOString()
		};
	});
}

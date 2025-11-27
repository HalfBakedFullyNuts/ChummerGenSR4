/**
 * Game Data Store
 * ================
 * Manages loading and caching of game data from JSON files.
 * Provides reactive stores for metatypes, skills, qualities, etc.
 */

import { writable, derived, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import type { Metatype, SkillDefinition } from '$types';

/* Maximum items to load per category (safety bound) */
const MAX_ITEMS = 10000;

/** Loading state for async operations. */
interface LoadingState {
	loading: boolean;
	error: string | null;
}

/** Quality from game data. */
export interface GameQuality {
	name: string;
	bp: number;
	category: 'Positive' | 'Negative';
	source: string;
	page: number;
	mutant: boolean;
	limit: boolean;
}

/** Spell from game data. */
export interface GameSpell {
	name: string;
	category: string;
	type: string;
	range: string;
	damage: string;
	duration: string;
	dv: string;
	descriptor: string;
	source: string;
	page: number;
}

/** Adept power from game data. */
export interface GamePower {
	name: string;
	points: number;
	levels: boolean;
	maxlevels: number;
	action: string;
	source: string;
	page: number;
}

/** Tradition from game data. */
export interface GameTradition {
	name: string;
	drain: string;
	spirits: string[];
	source: string;
	page: number;
}

/** Mentor spirit from game data. */
export interface GameMentor {
	name: string;
	advantage: string;
	disadvantage: string;
	source: string;
	page: number;
}

/** Lifestyle from game data. */
export interface GameLifestyle {
	name: string;
	cost: number;
	dice: number;
	multiplier: number;
	source: string;
	page: number;
}

/** Program from game data. */
export interface GameProgram {
	name: string;
	category: string;
	source: string;
	page: number;
}

/** Skill category with type. */
export interface SkillCategoryDef {
	name: string;
	type: 'active' | 'knowledge';
}

/** All game data combined. */
export interface GameData {
	metatypes: Metatype[];
	metatypeCategories: string[];
	skills: SkillDefinition[];
	skillGroups: string[];
	skillCategories: SkillCategoryDef[];
	qualities: GameQuality[];
	qualityCategories: string[];
	spells: GameSpell[];
	spellCategories: string[];
	powers: GamePower[];
	traditions: GameTradition[];
	mentors: GameMentor[];
	lifestyles: GameLifestyle[];
	programs: GameProgram[];
	programCategories: string[];
}

/** Empty game data for initial state. */
const EMPTY_GAME_DATA: GameData = {
	metatypes: [],
	metatypeCategories: [],
	skills: [],
	skillGroups: [],
	skillCategories: [],
	qualities: [],
	qualityCategories: [],
	spells: [],
	spellCategories: [],
	powers: [],
	traditions: [],
	mentors: [],
	lifestyles: [],
	programs: [],
	programCategories: []
};

/* Internal stores */
const gameDataStore = writable<GameData>(EMPTY_GAME_DATA);
const loadingStore = writable<LoadingState>({ loading: false, error: null });
let dataLoaded = false;

/**
 * Fetch JSON data file from static directory.
 * Returns parsed data or null on error.
 */
async function fetchDataFile<T>(filename: string): Promise<T | null> {
	try {
		const response = await fetch(`/data/${filename}`);
		if (!response.ok) {
			console.error(`Failed to load ${filename}: ${response.status}`);
			return null;
		}
		const data = await response.json();
		return data as T;
	} catch (err) {
		console.error(`Error loading ${filename}:`, err);
		return null;
	}
}

/**
 * Limit array to MAX_ITEMS for safety.
 * Prevents excessive memory usage.
 */
function limitArray<T>(arr: T[] | undefined): T[] {
	if (!arr) return [];
	return arr.slice(0, MAX_ITEMS);
}

/**
 * Load all game data files.
 * Fetches all JSON files in parallel and combines them.
 */
export async function loadGameData(): Promise<void> {
	if (dataLoaded || !browser) {
		return;
	}

	loadingStore.set({ loading: true, error: null });

	try {
		/* Fetch all data files in parallel */
		const [
			metatypesData,
			skillsData,
			qualitiesData,
			spellsData,
			powersData,
			traditionsData,
			mentorsData,
			lifestylesData,
			programsData
		] = await Promise.all([
			fetchDataFile<{ categories: string[]; metatypes: Metatype[] }>('metatypes.json'),
			fetchDataFile<{ skillGroups: string[]; categories: SkillCategoryDef[]; skills: SkillDefinition[] }>('skills.json'),
			fetchDataFile<{ categories: string[]; qualities: GameQuality[] }>('qualities.json'),
			fetchDataFile<{ categories: string[]; spells: GameSpell[] }>('spells.json'),
			fetchDataFile<{ powers: GamePower[] }>('powers.json'),
			fetchDataFile<{ traditions: GameTradition[] }>('traditions.json'),
			fetchDataFile<{ mentors: GameMentor[] }>('mentors.json'),
			fetchDataFile<{ lifestyles: GameLifestyle[] }>('lifestyles.json'),
			fetchDataFile<{ categories: string[]; programs: GameProgram[] }>('programs.json')
		]);

		/* Combine into single game data object */
		const data: GameData = {
			metatypes: limitArray(metatypesData?.metatypes),
			metatypeCategories: limitArray(metatypesData?.categories),
			skills: limitArray(skillsData?.skills),
			skillGroups: limitArray(skillsData?.skillGroups),
			skillCategories: limitArray(skillsData?.categories),
			qualities: limitArray(qualitiesData?.qualities),
			qualityCategories: limitArray(qualitiesData?.categories),
			spells: limitArray(spellsData?.spells),
			spellCategories: limitArray(spellsData?.categories),
			powers: limitArray(powersData?.powers),
			traditions: limitArray(traditionsData?.traditions),
			mentors: limitArray(mentorsData?.mentors),
			lifestyles: limitArray(lifestylesData?.lifestyles),
			programs: limitArray(programsData?.programs),
			programCategories: limitArray(programsData?.categories)
		};

		gameDataStore.set(data);
		dataLoaded = true;
		loadingStore.set({ loading: false, error: null });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		loadingStore.set({ loading: false, error: message });
	}
}

/** Readable store for all game data. */
export const gameData: Readable<GameData> = { subscribe: gameDataStore.subscribe };

/** Readable store for loading state. */
export const gameDataLoading: Readable<LoadingState> = { subscribe: loadingStore.subscribe };

/** Derived store for metatypes only. */
export const metatypes: Readable<Metatype[]> = derived(
	gameData,
	($data) => $data.metatypes
);

/** Derived store for skills only. */
export const skills: Readable<SkillDefinition[]> = derived(
	gameData,
	($data) => $data.skills
);

/** Derived store for qualities only. */
export const qualities: Readable<GameQuality[]> = derived(
	gameData,
	($data) => $data.qualities
);

/** Derived store for positive qualities. */
export const positiveQualities: Readable<GameQuality[]> = derived(
	gameData,
	($data) => $data.qualities.filter((q) => q.category === 'Positive')
);

/** Derived store for negative qualities. */
export const negativeQualities: Readable<GameQuality[]> = derived(
	gameData,
	($data) => $data.qualities.filter((q) => q.category === 'Negative')
);

/** Derived store for spells only. */
export const spells: Readable<GameSpell[]> = derived(
	gameData,
	($data) => $data.spells
);

/** Derived store for powers only. */
export const powers: Readable<GamePower[]> = derived(
	gameData,
	($data) => $data.powers
);

/** Derived store for traditions only. */
export const traditions: Readable<GameTradition[]> = derived(
	gameData,
	($data) => $data.traditions
);

/**
 * Find metatype by name.
 * Returns undefined if not found.
 */
export function findMetatype(
	data: GameData,
	name: string
): Metatype | undefined {
	/* Assert: name should not be empty */
	if (!name) {
		return undefined;
	}
	return data.metatypes.find((m) => m.name === name);
}

/**
 * Find skill by name.
 * Returns undefined if not found.
 */
export function findSkill(
	data: GameData,
	name: string
): SkillDefinition | undefined {
	/* Assert: name should not be empty */
	if (!name) {
		return undefined;
	}
	return data.skills.find((s) => s.name === name);
}

/**
 * Find quality by name.
 * Returns undefined if not found.
 */
export function findQuality(
	data: GameData,
	name: string
): GameQuality | undefined {
	/* Assert: name should not be empty */
	if (!name) {
		return undefined;
	}
	return data.qualities.find((q) => q.name === name);
}

/**
 * Filter skills by category.
 * Returns skills matching the given category.
 */
export function filterSkillsByCategory(
	data: GameData,
	category: string
): SkillDefinition[] {
	return data.skills.filter((s) => s.category === category);
}

/**
 * Filter skills by skill group.
 * Returns skills belonging to the given group.
 */
export function filterSkillsByGroup(
	data: GameData,
	group: string
): SkillDefinition[] {
	return data.skills.filter((s) => s.skillgroup === group);
}

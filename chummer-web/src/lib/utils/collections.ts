/**
 * Generic collection utilities.
 * Provides DRY implementations for common find/filter operations.
 */

/**
 * Interface for items with a name property.
 */
export interface Named {
	readonly name: string;
}

/**
 * Interface for items with a category property.
 */
export interface Categorized {
	readonly category: string;
}

/**
 * Interface for items with an id property.
 */
export interface Identifiable {
	readonly id: string;
}

/**
 * Find an item by name in a collection.
 * Returns undefined if name is empty or item not found.
 */
export function findByName<T extends Named>(
	items: readonly T[],
	name: string
): T | undefined {
	if (!name) return undefined;
	const lowerName = name.toLowerCase();
	return items.find((item) => item.name.toLowerCase() === lowerName);
}

/**
 * Find an item by exact name match (case-sensitive).
 */
export function findByExactName<T extends Named>(
	items: readonly T[],
	name: string
): T | undefined {
	if (!name) return undefined;
	return items.find((item) => item.name === name);
}

/**
 * Find an item by id in a collection.
 */
export function findById<T extends Identifiable>(
	items: readonly T[],
	id: string
): T | undefined {
	if (!id) return undefined;
	return items.find((item) => item.id === id);
}

/**
 * Filter items by category.
 */
export function filterByCategory<T extends Categorized>(
	items: readonly T[],
	category: string
): T[] {
	if (!category) return [...items];
	return items.filter((item) => item.category === category);
}

/**
 * Filter items by multiple categories.
 */
export function filterByCategories<T extends Categorized>(
	items: readonly T[],
	categories: readonly string[]
): T[] {
	if (!categories.length) return [...items];
	const categorySet = new Set(categories);
	return items.filter((item) => categorySet.has(item.category));
}

/**
 * Filter items by a predicate function.
 */
export function filterBy<T>(
	items: readonly T[],
	predicate: (item: T) => boolean
): T[] {
	return items.filter(predicate);
}

/**
 * Group items by a key function.
 */
export function groupBy<T, K extends string | number>(
	items: readonly T[],
	keyFn: (item: T) => K
): Map<K, T[]> {
	const groups = new Map<K, T[]>();
	for (const item of items) {
		const key = keyFn(item);
		const group = groups.get(key);
		if (group) {
			group.push(item);
		} else {
			groups.set(key, [item]);
		}
	}
	return groups;
}

/**
 * Group items by category.
 */
export function groupByCategory<T extends Categorized>(
	items: readonly T[]
): Map<string, T[]> {
	return groupBy(items, (item) => item.category);
}

/**
 * Search items by name (partial, case-insensitive match).
 */
export function searchByName<T extends Named>(
	items: readonly T[],
	query: string
): T[] {
	if (!query) return [...items];
	const lowerQuery = query.toLowerCase();
	return items.filter((item) => item.name.toLowerCase().includes(lowerQuery));
}

/**
 * Sort items by name alphabetically.
 */
export function sortByName<T extends Named>(items: readonly T[]): T[] {
	return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get unique values from a collection by key.
 */
export function uniqueBy<T, K>(items: readonly T[], keyFn: (item: T) => K): T[] {
	const seen = new Set<K>();
	return items.filter((item) => {
		const key = keyFn(item);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/**
 * Get all unique categories from a collection.
 */
export function getCategories<T extends Categorized>(items: readonly T[]): string[] {
	const categories = new Set(items.map((item) => item.category));
	return [...categories].sort();
}

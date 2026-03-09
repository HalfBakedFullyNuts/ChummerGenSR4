/**
 * Combat & Condition Store Module
 * ===============================
 * Pain/stun tracking, Edge tracking, and Ammo tracking.
 */

import { get } from 'svelte/store';
import { characterStore } from './character';

/* ============================================
 * Condition Monitor Functions
 * ============================================ */

/** Update condition monitor value. */
export function updateCondition(type: 'physical' | 'stun', value: number): void {
	characterStore.update((c) => {
		if (!c) return c;

		const maxValue =
			type === 'physical'
				? Math.ceil((c.attributes.bod.base + c.attributes.bod.bonus) / 2) + 8
				: Math.ceil((c.attributes.wil.base + c.attributes.wil.bonus) / 2) + 8;

		const clampedValue = Math.max(0, Math.min(value, maxValue));

		return {
			...c,
			condition: {
				...c.condition,
				[type === 'physical' ? 'physicalCurrent' : 'stunCurrent']: clampedValue
			}
		};
	});
}

/* ============================================
 * Edge Tracking Functions
 * ============================================ */

/** Update current Edge points. */
export function updateEdge(value: number): void {
	characterStore.update((c) => {
		if (!c) return c;

		const maxEdge = c.attributes.edg.base + c.attributes.edg.bonus;
		const clampedValue = Math.max(0, Math.min(value, maxEdge));

		return {
			...c,
			condition: {
				...c.condition,
				edgeCurrent: clampedValue
			}
		};
	});
}

/** Spend Edge point(s). Returns false if not enough Edge available. */
export function spendEdge(amount: number = 1): boolean {
	const char = get(characterStore);
	if (!char) return false;

	const current = char.condition.edgeCurrent;
	if (current < amount) return false;

	updateEdge(current - amount);
	return true;
}

/** Recover Edge point(s). */
export function recoverEdge(amount: number = 1): void {
	const char = get(characterStore);
	if (!char) return;

	const current = char.condition.edgeCurrent;
	const maxEdge = char.attributes.edg.base + char.attributes.edg.bonus;
	updateEdge(Math.min(current + amount, maxEdge));
}

/** Fully refresh Edge to maximum. */
export function refreshEdge(): void {
	const char = get(characterStore);
	if (!char) return;

	const maxEdge = char.attributes.edg.base + char.attributes.edg.bonus;
	updateEdge(maxEdge);
}

/* ============================================
 * Ammo Tracking Functions
 * ============================================ */

/** Get the maximum ammo capacity for a weapon. */
export function getMaxAmmo(ammoString: string): number {
	const match = ammoString.match(/^(\d+)/);
	return match && match[1] ? parseInt(match[1], 10) : 0;
}

/** Spend ammo for a weapon. */
export function spendAmmo(weaponId: string, amount: number = 1): boolean {
	const char = get(characterStore);
	if (!char) return false;

	const weapon = char.equipment.weapons.find((w) => w.id === weaponId);
	if (!weapon) return false;

	if (weapon.currentAmmo < amount) return false;

	characterStore.update((c) => {
		if (!c) return c;
		return {
			...c,
			equipment: {
				...c.equipment,
				weapons: c.equipment.weapons.map((w) =>
					w.id === weaponId ? { ...w, currentAmmo: w.currentAmmo - amount } : w
				)
			}
		};
	});

	return true;
}

/** Reload a weapon to its maximum capacity. */
export function reloadWeapon(weaponId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const weapon = char.equipment.weapons.find((w) => w.id === weaponId);
	if (!weapon) return;

	const maxAmmo = getMaxAmmo(weapon.ammo);

	characterStore.update((c) => {
		if (!c) return c;
		return {
			...c,
			equipment: {
				...c.equipment,
				weapons: c.equipment.weapons.map((w) =>
					w.id === weaponId ? { ...w, currentAmmo: maxAmmo } : w
				)
			}
		};
	});
}

/** Set ammo for a weapon to a specific value. */
export function setAmmo(weaponId: string, value: number): void {
	const char = get(characterStore);
	if (!char) return;

	const weapon = char.equipment.weapons.find((w) => w.id === weaponId);
	if (!weapon) return;

	const maxAmmo = getMaxAmmo(weapon.ammo);
	const clampedValue = Math.max(0, Math.min(value, maxAmmo));

	characterStore.update((c) => {
		if (!c) return c;
		return {
			...c,
			equipment: {
				...c.equipment,
				weapons: c.equipment.weapons.map((w) =>
					w.id === weaponId ? { ...w, currentAmmo: clampedValue } : w
				)
			}
		};
	});
}

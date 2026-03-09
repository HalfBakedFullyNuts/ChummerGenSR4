/**
 * Contacts Store Module
 * =====================
 * Contact CRUD and identity field updates.
 */

import { get } from 'svelte/store';
import { type Character, type Contact } from '$types';
import { characterStore, generateId } from './character';

/** Add a contact to the character. */
export function addContact(name: string, type: string, loyalty: number, connection: number): void {
	const char = get(characterStore);
	if (!char) return;

	const newContact: Contact = {
		id: generateId(),
		name,
		type,
		loyalty: Math.max(1, Math.min(6, loyalty)),
		connection: Math.max(1, Math.min(6, connection)),
		notes: ''
	};

	const updated: Character = {
		...char,
		contacts: [...char.contacts, newContact],
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Remove a contact from the character. */
export function removeContact(contactId: string): void {
	const char = get(characterStore);
	if (!char) return;

	const updated: Character = {
		...char,
		contacts: char.contacts.filter((c) => c.id !== contactId),
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/** Update character identity fields. */
export function updateIdentity(field: keyof Character['identity'], value: string): void {
	const char = get(characterStore);
	if (!char) return;

	const updated: Character = {
		...char,
		identity: {
			...char.identity,
			[field]: value
		},
		updatedAt: new Date().toISOString()
	};

	characterStore.set(updated);
}

/**
 * User store module.
 * Manages auth state as a reactive Svelte store.
 *
 * FIREBASE DISABLED: Currently using local-only mode.
 * To re-enable Firebase auth, uncomment the Firebase imports and createUserStore logic.
 */

import { writable, type Readable } from 'svelte/store';
// FIREBASE DISABLED:
// import type { User } from 'firebase/auth';
// import { subscribeToAuthState } from '$firebase/auth';
// import { browser } from '$app/environment';

/** User type exposed by the store. */
export interface AppUser {
	uid: string;
	email: string | null;
	displayName: string | null;
	photoURL: string | null;
}

/**
 * Create the user store.
 * FIREBASE DISABLED: Returns null (local-only mode).
 */
function createUserStore(): Readable<AppUser | null> {
	const { subscribe } = writable<AppUser | null>(null);
	// FIREBASE DISABLED: No auth subscription
	return { subscribe };
}

/** Reactive user store - null when not signed in (Firebase disabled). */
export const user = createUserStore();

/**
 * Derived store for checking if user is signed in.
 * Returns true if user is authenticated.
 */
export function isSignedIn(u: AppUser | null): boolean {
	return u !== null;
}

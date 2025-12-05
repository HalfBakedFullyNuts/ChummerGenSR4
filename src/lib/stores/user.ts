/**
 * User store module.
 * Manages auth state as a reactive Svelte store.
 */

import { writable, type Readable } from 'svelte/store';
import type { User } from 'firebase/auth';
import { subscribeToAuthState } from '$firebase/auth';
import { browser } from '$app/environment';

/** User type exposed by the store. */
export interface AppUser {
	uid: string;
	email: string | null;
	displayName: string | null;
	photoURL: string | null;
}

/**
 * Convert Firebase User to AppUser.
 * Extracts only the fields we need for the app.
 */
function toAppUser(firebaseUser: User): AppUser {
	return {
		uid: firebaseUser.uid,
		email: firebaseUser.email,
		displayName: firebaseUser.displayName,
		photoURL: firebaseUser.photoURL
	};
}

/**
 * Create the user store.
 * Subscribes to Firebase auth state changes in browser.
 */
function createUserStore(): Readable<AppUser | null> {
	const { subscribe, set } = writable<AppUser | null>(null);

	if (browser) {
		/* Subscribe to auth state changes */
		subscribeToAuthState((firebaseUser: User | null) => {
			if (firebaseUser) {
				set(toAppUser(firebaseUser));
			} else {
				set(null);
			}
		});
	}

	return { subscribe };
}

/** Reactive user store - null when not signed in. */
export const user = createUserStore();

/**
 * Derived store for checking if user is signed in.
 * Returns true if user is authenticated.
 */
export function isSignedIn(u: AppUser | null): boolean {
	return u !== null;
}

/**
 * Firebase Authentication module.
 * Handles Google sign-in, sign-out, and auth state management.
 */

import {
	GoogleAuthProvider,
	signInWithPopup,
	signOut,
	onAuthStateChanged,
	type User
} from 'firebase/auth';
import { getAuthInstance } from './config';

/** Result type for auth operations. */
interface AuthResult {
	success: boolean;
	error?: string;
	user?: User;
}

const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google popup.
 * Returns user on success, error message on failure.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
	try {
		const auth = getAuthInstance();
		const result = await signInWithPopup(auth, googleProvider);

		if (!result.user) {
			return { success: false, error: 'No user returned from sign-in' };
		}

		return { success: true, user: result.user };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Sign-in failed';
		return { success: false, error: message };
	}
}

/**
 * Sign out current user.
 * Returns success status and error message if failed.
 */
export async function signOutUser(): Promise<AuthResult> {
	try {
		const auth = getAuthInstance();
		await signOut(auth);
		return { success: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Sign-out failed';
		return { success: false, error: message };
	}
}

/**
 * Subscribe to auth state changes.
 * Calls callback with user (or null) whenever auth state changes.
 * Returns unsubscribe function.
 */
export function subscribeToAuthState(
	callback: (user: User | null) => void
): () => void {
	try {
		const auth = getAuthInstance();
		return onAuthStateChanged(auth, callback);
	} catch {
		/* If auth not initialized, return no-op unsubscribe */
		return () => {};
	}
}

/**
 * Get current user synchronously.
 * Returns null if not signed in or auth not initialized.
 */
export function getCurrentUser(): User | null {
	try {
		const auth = getAuthInstance();
		return auth.currentUser;
	} catch {
		return null;
	}
}

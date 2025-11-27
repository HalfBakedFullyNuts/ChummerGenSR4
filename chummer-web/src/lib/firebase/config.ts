/**
 * Firebase configuration and initialization module.
 * Handles Firebase app setup with offline persistence for Firestore.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
	getFirestore,
	enableIndexedDbPersistence,
	type Firestore
} from 'firebase/firestore';

/** Firebase configuration loaded from environment variables. */
const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
	appId: import.meta.env.VITE_FIREBASE_APP_ID as string
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let initialized = false;

/** Result type for initialization operations. */
interface InitResult {
	success: boolean;
	error?: string;
}

/**
 * Initialize Firebase app, auth, and Firestore with offline persistence.
 * Safe to call multiple times - only initializes once.
 * Returns success status and error message if failed.
 */
export function initializeFirebase(): InitResult {
	if (initialized) {
		return { success: true };
	}

	/* Validate required config values exist */
	const requiredKeys = ['apiKey', 'authDomain', 'projectId'] as const;
	for (const key of requiredKeys) {
		if (!firebaseConfig[key]) {
			return {
				success: false,
				error: `Missing Firebase config: ${key}`
			};
		}
	}

	try {
		app = initializeApp(firebaseConfig);
		auth = getAuth(app);
		db = getFirestore(app);

		/* Enable offline persistence for Firestore */
		enableIndexedDbPersistence(db).catch((err: Error) => {
			/* Ignore persistence errors - app still works without it */
			console.warn('Firestore persistence unavailable:', err.message);
		});

		initialized = true;
		return { success: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return { success: false, error: message };
	}
}

/**
 * Get Firebase Auth instance.
 * Throws if Firebase not initialized.
 */
export function getAuthInstance(): Auth {
	if (!auth) {
		throw new Error('Firebase Auth not initialized');
	}
	return auth;
}

/**
 * Get Firestore instance.
 * Throws if Firebase not initialized.
 */
export function getDbInstance(): Firestore {
	if (!db) {
		throw new Error('Firestore not initialized');
	}
	return db;
}

/**
 * Check if Firebase is initialized.
 * Returns true if app, auth, and db are all ready.
 */
export function isInitialized(): boolean {
	return initialized && app !== null && auth !== null && db !== null;
}

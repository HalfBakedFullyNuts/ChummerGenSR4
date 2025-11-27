/**
 * Firebase module exports.
 * Re-exports all Firebase functionality from a single entry point.
 */

export {
	initializeFirebase,
	getAuthInstance,
	getDbInstance,
	isInitialized
} from './config';

export {
	signInWithGoogle,
	signOutUser,
	subscribeToAuthState,
	getCurrentUser
} from './auth';

export {
	saveCharacter,
	loadCharacter,
	deleteCharacter,
	listUserCharacters,
	verifyCharacterOwnership,
	duplicateCharacter,
	type CharacterSummary
} from './characters';

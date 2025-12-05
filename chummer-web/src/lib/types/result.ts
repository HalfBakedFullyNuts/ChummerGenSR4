/**
 * Centralized Result types for async operations.
 * Provides consistent error handling across the application.
 */

/**
 * Generic result type for operations that may fail.
 * Use this instead of throwing exceptions for expected failure cases.
 */
export interface Result<T = void> {
	readonly success: boolean;
	readonly error?: string;
	readonly data?: T;
}

/**
 * Create a successful result with optional data.
 */
export function success<T>(data?: T): Result<T> {
	return data !== undefined ? { success: true, data } : { success: true };
}

/**
 * Create a failed result with an error message.
 */
export function failure<T = void>(error: string): Result<T> {
	return { success: false, error };
}

/**
 * Extract error message from unknown error type.
 * Useful in catch blocks.
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	return 'An unknown error occurred';
}

/**
 * Wrap an async function with Result error handling.
 * Converts thrown exceptions to Result failures.
 */
export async function wrapAsync<T>(
	fn: () => Promise<T>
): Promise<Result<T>> {
	try {
		const data = await fn();
		return success(data);
	} catch (error) {
		return failure(getErrorMessage(error));
	}
}

/**
 * Wrap a sync function with Result error handling.
 */
export function wrapSync<T>(fn: () => T): Result<T> {
	try {
		const data = fn();
		return success(data);
	} catch (error) {
		return failure(getErrorMessage(error));
	}
}

/**
 * Performance Utilities Tests
 * ===========================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	measureTime,
	measureTimeAsync,
	isSlowConnection,
	getConnectionInfo,
	runInChunks
} from '../performance';

describe('Performance Utilities', () => {
	describe('measureTime', () => {
		it('should return the function result', () => {
			const result = measureTime('test', () => 42);
			expect(result).toBe(42);
		});

		it('should work with complex return types', () => {
			const result = measureTime('test', () => ({ a: 1, b: 'hello' }));
			expect(result).toEqual({ a: 1, b: 'hello' });
		});
	});

	describe('measureTimeAsync', () => {
		it('should return the async function result', async () => {
			const result = await measureTimeAsync('test', async () => {
				return Promise.resolve(42);
			});
			expect(result).toBe(42);
		});

		it('should work with delayed promises', async () => {
			const result = await measureTimeAsync('test', async () => {
				await new Promise(resolve => setTimeout(resolve, 10));
				return 'done';
			});
			expect(result).toBe('done');
		});
	});

	describe('isSlowConnection', () => {
		it('should return false when navigator.connection is not available', () => {
			// In Node/test environment, connection API is not available
			expect(isSlowConnection()).toBe(false);
		});
	});

	describe('getConnectionInfo', () => {
		it('should return null when navigator.connection is not available', () => {
			expect(getConnectionInfo()).toBe(null);
		});
	});

	describe('runInChunks', () => {
		it('should process all items', async () => {
			const items = [1, 2, 3, 4, 5];
			const results = await runInChunks(items, x => x * 2, 2);
			expect(results).toEqual([2, 4, 6, 8, 10]);
		});

		it('should process in chunks', async () => {
			const processOrder: number[] = [];
			const items = [1, 2, 3, 4, 5];

			await runInChunks(items, x => {
				processOrder.push(x);
				return x;
			}, 2, 0);

			expect(processOrder).toEqual([1, 2, 3, 4, 5]);
		});

		it('should handle empty array', async () => {
			const results = await runInChunks([], x => x, 10);
			expect(results).toEqual([]);
		});

		it('should handle chunk size larger than array', async () => {
			const items = [1, 2, 3];
			const results = await runInChunks(items, x => x * 2, 100);
			expect(results).toEqual([2, 4, 6]);
		});
	});
});

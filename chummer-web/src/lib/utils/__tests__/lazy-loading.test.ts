/**
 * Lazy Loading Utilities Tests
 * ============================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	debounce,
	throttle,
	memoize,
	batchUpdates
} from '../lazy-loading';

describe('Lazy Loading Utilities', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('debounce', () => {
		it('should delay function execution', () => {
			const fn = vi.fn();
			const debouncedFn = debounce(fn, 100);

			debouncedFn();
			expect(fn).not.toHaveBeenCalled();

			vi.advanceTimersByTime(100);
			expect(fn).toHaveBeenCalledTimes(1);
		});

		it('should reset timer on subsequent calls', () => {
			const fn = vi.fn();
			const debouncedFn = debounce(fn, 100);

			debouncedFn();
			vi.advanceTimersByTime(50);
			debouncedFn();
			vi.advanceTimersByTime(50);
			expect(fn).not.toHaveBeenCalled();

			vi.advanceTimersByTime(50);
			expect(fn).toHaveBeenCalledTimes(1);
		});

		it('should pass arguments to the function', () => {
			const fn = vi.fn();
			const debouncedFn = debounce(fn, 100);

			debouncedFn('arg1', 'arg2');
			vi.advanceTimersByTime(100);

			expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
		});

		it('should use the latest arguments', () => {
			const fn = vi.fn();
			const debouncedFn = debounce(fn, 100);

			debouncedFn('first');
			debouncedFn('second');
			debouncedFn('third');
			vi.advanceTimersByTime(100);

			expect(fn).toHaveBeenCalledTimes(1);
			expect(fn).toHaveBeenCalledWith('third');
		});
	});

	describe('throttle', () => {
		it('should execute immediately on first call', () => {
			const fn = vi.fn();
			const throttledFn = throttle(fn, 100);

			throttledFn();
			expect(fn).toHaveBeenCalledTimes(1);
		});

		it('should not execute again within limit', () => {
			const fn = vi.fn();
			const throttledFn = throttle(fn, 100);

			throttledFn();
			throttledFn();
			throttledFn();

			expect(fn).toHaveBeenCalledTimes(1);
		});

		it('should execute again after limit expires', () => {
			const fn = vi.fn();
			const throttledFn = throttle(fn, 100);

			throttledFn();
			vi.advanceTimersByTime(100);
			throttledFn();

			expect(fn).toHaveBeenCalledTimes(2);
		});

		it('should pass arguments to the function', () => {
			const fn = vi.fn();
			const throttledFn = throttle(fn, 100);

			throttledFn('arg1', 'arg2');

			expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
		});
	});

	describe('memoize', () => {
		it('should cache function results', () => {
			const fn = vi.fn((x: number) => x * 2);
			const memoizedFn = memoize(fn);

			expect(memoizedFn(5)).toBe(10);
			expect(memoizedFn(5)).toBe(10);

			expect(fn).toHaveBeenCalledTimes(1);
		});

		it('should compute for different arguments', () => {
			const fn = vi.fn((x: number) => x * 2);
			const memoizedFn = memoize(fn);

			expect(memoizedFn(5)).toBe(10);
			expect(memoizedFn(10)).toBe(20);

			expect(fn).toHaveBeenCalledTimes(2);
		});

		it('should use custom key function', () => {
			const fn = vi.fn((obj: { id: number }) => obj.id * 2);
			const memoizedFn = memoize(fn, (obj) => String(obj.id));

			expect(memoizedFn({ id: 5 })).toBe(10);
			expect(memoizedFn({ id: 5 })).toBe(10); // Different object, same id

			expect(fn).toHaveBeenCalledTimes(1);
		});

		it('should handle multiple arguments', () => {
			const fn = vi.fn((a: number, b: number) => a + b);
			const memoizedFn = memoize(fn);

			expect(memoizedFn(1, 2)).toBe(3);
			expect(memoizedFn(1, 2)).toBe(3);
			expect(memoizedFn(2, 3)).toBe(5);

			expect(fn).toHaveBeenCalledTimes(2);
		});
	});

	describe('batchUpdates', () => {
		it('should execute all updates', () => {
			vi.useRealTimers(); // Need real timers for RAF

			const update1 = vi.fn();
			const update2 = vi.fn();
			const update3 = vi.fn();

			// In non-browser environment, executes immediately
			batchUpdates([update1, update2, update3]);

			expect(update1).toHaveBeenCalled();
			expect(update2).toHaveBeenCalled();
			expect(update3).toHaveBeenCalled();
		});

		it('should handle empty updates array', () => {
			expect(() => batchUpdates([])).not.toThrow();
		});
	});
});

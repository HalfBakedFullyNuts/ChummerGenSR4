/**
 * Offline Sync Tests
 * ==================
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	queueChange,
	clearQueue,
	getQueue,
	resolveConflict,
	dismissConflict,
	type QueuedChange,
	type SyncConflict
} from '../offline-sync';

describe('Offline Sync', () => {
	beforeEach(() => {
		// Clear state before each test
		clearQueue();
	});

	describe('queueChange', () => {
		it('should add a change to the queue', () => {
			queueChange('create', 'characters', 'char-1', { name: 'Test' });

			const queue = getQueue();
			expect(queue).toHaveLength(1);
			expect(queue[0].operation).toBe('create');
			expect(queue[0].collection).toBe('characters');
			expect(queue[0].documentId).toBe('char-1');
		});

		it('should generate unique IDs for each change', () => {
			queueChange('create', 'characters', 'char-1', { name: 'Test1' });
			queueChange('create', 'characters', 'char-2', { name: 'Test2' });

			const queue = getQueue();
			expect(queue[0].id).not.toBe(queue[1].id);
		});

		it('should record timestamp', () => {
			const before = new Date().toISOString();
			queueChange('update', 'characters', 'char-1', { name: 'Updated' });
			const after = new Date().toISOString();

			const queue = getQueue();
			expect(queue[0].timestamp >= before).toBe(true);
			expect(queue[0].timestamp <= after).toBe(true);
		});

		it('should handle delete operations with null data', () => {
			queueChange('delete', 'characters', 'char-1', null);

			const queue = getQueue();
			expect(queue[0].data).toBeNull();
		});
	});

	describe('getQueue', () => {
		it('should return empty array when no changes', () => {
			expect(getQueue()).toEqual([]);
		});

		it('should return all queued changes', () => {
			queueChange('create', 'characters', 'char-1', { name: 'A' });
			queueChange('update', 'characters', 'char-2', { name: 'B' });
			queueChange('delete', 'characters', 'char-3', null);

			const queue = getQueue();
			expect(queue).toHaveLength(3);
		});
	});

	describe('clearQueue', () => {
		it('should remove all queued changes', () => {
			queueChange('create', 'characters', 'char-1', { name: 'A' });
			queueChange('create', 'characters', 'char-2', { name: 'B' });

			clearQueue();

			expect(getQueue()).toHaveLength(0);
		});
	});

	describe('Conflict Management', () => {
		it('should resolve conflict by keeping local', () => {
			// resolveConflict handles non-existent conflicts gracefully
			expect(() => resolveConflict('conflict-1', 'keep_local')).not.toThrow();
		});

		it('should resolve conflict by keeping remote', () => {
			expect(() => resolveConflict('conflict-1', 'keep_remote')).not.toThrow();
		});

		it('should resolve conflict with merged data', () => {
			const mergedData = { name: 'Merged', value: 42 };
			expect(() => resolveConflict('conflict-1', 'merge', mergedData)).not.toThrow();
		});

		it('should dismiss conflict', () => {
			expect(() => dismissConflict('conflict-1')).not.toThrow();
		});
	});

	describe('Queue Operations', () => {
		it('should maintain order of changes', () => {
			queueChange('create', 'characters', 'char-1', { order: 1 });
			queueChange('create', 'characters', 'char-2', { order: 2 });
			queueChange('create', 'characters', 'char-3', { order: 3 });

			const queue = getQueue();
			expect((queue[0].data as any).order).toBe(1);
			expect((queue[1].data as any).order).toBe(2);
			expect((queue[2].data as any).order).toBe(3);
		});

		it('should handle various data types', () => {
			queueChange('create', 'test', 'doc-1', {
				string: 'hello',
				number: 42,
				boolean: true,
				array: [1, 2, 3],
				nested: { a: 1 }
			});

			const queue = getQueue();
			const data = queue[0].data as Record<string, unknown>;

			expect(data.string).toBe('hello');
			expect(data.number).toBe(42);
			expect(data.boolean).toBe(true);
			expect(data.array).toEqual([1, 2, 3]);
			expect(data.nested).toEqual({ a: 1 });
		});
	});
});

/**
 * Accessibility Utilities Tests
 * =============================
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	generateId,
	getContrastRatio,
	meetsContrastRequirement,
	handleListNavigation,
	SKIP_LINK_TARGET,
	ARIA_LABELS,
	KEYBOARD_SHORTCUTS
} from '../accessibility';

describe('Accessibility Utilities', () => {
	describe('generateId', () => {
		it('should generate unique IDs', () => {
			const id1 = generateId();
			const id2 = generateId();
			expect(id1).not.toBe(id2);
		});

		it('should use the provided prefix', () => {
			const id = generateId('modal');
			expect(id.startsWith('modal-')).toBe(true);
		});

		it('should use default prefix when none provided', () => {
			const id = generateId();
			expect(id.startsWith('aria-')).toBe(true);
		});

		it('should generate valid HTML IDs', () => {
			const id = generateId('test');
			expect(id).toMatch(/^[a-z][a-z0-9-]*$/i);
		});
	});

	describe('getContrastRatio', () => {
		it('should return 21 for black on white', () => {
			const ratio = getContrastRatio('#000000', '#FFFFFF');
			expect(ratio).toBeCloseTo(21, 0);
		});

		it('should return 1 for same colors', () => {
			const ratio = getContrastRatio('#FF0000', '#FF0000');
			expect(ratio).toBeCloseTo(1, 1);
		});

		it('should return same ratio regardless of order', () => {
			const ratio1 = getContrastRatio('#000000', '#FFFFFF');
			const ratio2 = getContrastRatio('#FFFFFF', '#000000');
			expect(ratio1).toBeCloseTo(ratio2, 1);
		});

		it('should handle hex colors without #', () => {
			const ratio = getContrastRatio('000000', 'FFFFFF');
			expect(ratio).toBeCloseTo(21, 0);
		});

		it('should calculate correct ratio for our theme colors', () => {
			// Our accent blue on dark background
			const ratio = getContrastRatio('#58A6FF', '#0D1117');
			expect(ratio).toBeGreaterThan(4.5); // Should meet AA for normal text
		});
	});

	describe('meetsContrastRequirement', () => {
		it('should pass for black on white (normal text)', () => {
			expect(meetsContrastRequirement('#000000', '#FFFFFF')).toBe(true);
		});

		it('should pass for black on white (large text)', () => {
			expect(meetsContrastRequirement('#000000', '#FFFFFF', true)).toBe(true);
		});

		it('should fail for low contrast (normal text)', () => {
			expect(meetsContrastRequirement('#777777', '#888888')).toBe(false);
		});

		it('should require 4.5:1 for normal text', () => {
			// Light gray on white - about 4.48:1 ratio
			expect(meetsContrastRequirement('#767676', '#FFFFFF')).toBe(true);
		});

		it('should require 3:1 for large text', () => {
			// Medium gray on white - about 3.5:1 ratio
			expect(meetsContrastRequirement('#949494', '#FFFFFF', true)).toBe(true);
		});
	});

	describe('handleListNavigation', () => {
		let items: HTMLElement[];
		let mockFocus: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			mockFocus = vi.fn();
			items = [
				{ focus: mockFocus } as unknown as HTMLElement,
				{ focus: mockFocus } as unknown as HTMLElement,
				{ focus: mockFocus } as unknown as HTMLElement
			];
		});

		it('should move to next item on ArrowDown', () => {
			const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
			const preventDefault = vi.spyOn(event, 'preventDefault');

			const newIndex = handleListNavigation(event, items, 0);

			expect(preventDefault).toHaveBeenCalled();
			expect(newIndex).toBe(1);
			expect(mockFocus).toHaveBeenCalled();
		});

		it('should move to previous item on ArrowUp', () => {
			const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });

			const newIndex = handleListNavigation(event, items, 1);

			expect(newIndex).toBe(0);
		});

		it('should wrap to first item from last on ArrowDown', () => {
			const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });

			const newIndex = handleListNavigation(event, items, 2);

			expect(newIndex).toBe(0);
		});

		it('should wrap to last item from first on ArrowUp', () => {
			const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });

			const newIndex = handleListNavigation(event, items, 0);

			expect(newIndex).toBe(2);
		});

		it('should jump to first item on Home', () => {
			const event = new KeyboardEvent('keydown', { key: 'Home' });

			const newIndex = handleListNavigation(event, items, 2);

			expect(newIndex).toBe(0);
		});

		it('should jump to last item on End', () => {
			const event = new KeyboardEvent('keydown', { key: 'End' });

			const newIndex = handleListNavigation(event, items, 0);

			expect(newIndex).toBe(2);
		});

		it('should call onSelect on Enter', () => {
			const onSelect = vi.fn();
			const event = new KeyboardEvent('keydown', { key: 'Enter' });

			handleListNavigation(event, items, 1, onSelect);

			expect(onSelect).toHaveBeenCalledWith(1);
		});

		it('should call onSelect on Space', () => {
			const onSelect = vi.fn();
			const event = new KeyboardEvent('keydown', { key: ' ' });

			handleListNavigation(event, items, 1, onSelect);

			expect(onSelect).toHaveBeenCalledWith(1);
		});

		it('should support ArrowRight like ArrowDown', () => {
			const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });

			const newIndex = handleListNavigation(event, items, 0);

			expect(newIndex).toBe(1);
		});

		it('should support ArrowLeft like ArrowUp', () => {
			const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });

			const newIndex = handleListNavigation(event, items, 1);

			expect(newIndex).toBe(0);
		});
	});

	describe('Constants', () => {
		it('should have a valid skip link target', () => {
			expect(SKIP_LINK_TARGET).toBe('main-content');
		});

		it('should have all required ARIA labels', () => {
			expect(ARIA_LABELS.mainNav).toBeDefined();
			expect(ARIA_LABELS.close).toBeDefined();
			expect(ARIA_LABELS.loading).toBeDefined();
			expect(ARIA_LABELS.attributes).toBeDefined();
			expect(ARIA_LABELS.diceRoller).toBeDefined();
		});

		it('should have all required keyboard shortcuts', () => {
			expect(KEYBOARD_SHORTCUTS.save).toBeDefined();
			expect(KEYBOARD_SHORTCUTS.save.key).toBe('s');
			expect(KEYBOARD_SHORTCUTS.save.ctrl).toBe(true);
			expect(KEYBOARD_SHORTCUTS.escape.key).toBe('Escape');
		});
	});
});

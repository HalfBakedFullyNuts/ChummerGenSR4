/**
 * Accessibility Utilities
 * =======================
 * Helper functions for WCAG 2.1 AA compliance.
 */

/**
 * Generate a unique ID for ARIA relationships.
 */
export function generateId(prefix: string = 'aria'): string {
	return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Trap focus within an element (for modals/dialogs).
 */
export function trapFocus(container: HTMLElement): () => void {
	const focusableSelectors = [
		'a[href]',
		'button:not([disabled])',
		'textarea:not([disabled])',
		'input:not([disabled])',
		'select:not([disabled])',
		'[tabindex]:not([tabindex="-1"])'
	].join(', ');

	const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelectors);
	const firstFocusable = focusableElements[0];
	const lastFocusable = focusableElements[focusableElements.length - 1];

	function handleKeyDown(e: KeyboardEvent): void {
		if (e.key !== 'Tab') return;

		if (e.shiftKey) {
			if (document.activeElement === firstFocusable) {
				e.preventDefault();
				lastFocusable?.focus();
			}
		} else {
			if (document.activeElement === lastFocusable) {
				e.preventDefault();
				firstFocusable?.focus();
			}
		}
	}

	container.addEventListener('keydown', handleKeyDown);
	firstFocusable?.focus();

	return () => {
		container.removeEventListener('keydown', handleKeyDown);
	};
}

/**
 * Announce a message to screen readers.
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
	const announcer = document.getElementById('sr-announcer') || createAnnouncer();
	announcer.setAttribute('aria-live', priority);
	announcer.textContent = message;

	// Clear after announcement
	setTimeout(() => {
		announcer.textContent = '';
	}, 1000);
}

/**
 * Create the screen reader announcer element.
 */
function createAnnouncer(): HTMLElement {
	const announcer = document.createElement('div');
	announcer.id = 'sr-announcer';
	announcer.setAttribute('role', 'status');
	announcer.setAttribute('aria-live', 'polite');
	announcer.setAttribute('aria-atomic', 'true');
	announcer.className = 'sr-only';
	document.body.appendChild(announcer);
	return announcer;
}

/**
 * Check if an element is visible and focusable.
 */
export function isFocusable(element: HTMLElement): boolean {
	if (element.tabIndex < 0) return false;
	if (element.hasAttribute('disabled')) return false;
	if (element.getAttribute('aria-hidden') === 'true') return false;

	const style = window.getComputedStyle(element);
	if (style.display === 'none' || style.visibility === 'hidden') return false;

	return true;
}

/**
 * Get all focusable elements within a container.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
	const elements = container.querySelectorAll<HTMLElement>(
		'a[href], button, textarea, input, select, [tabindex]'
	);
	return Array.from(elements).filter(isFocusable);
}

/**
 * Handle keyboard navigation for a list of items.
 */
export function handleListNavigation(
	event: KeyboardEvent,
	items: HTMLElement[],
	currentIndex: number,
	onSelect?: (index: number) => void
): number {
	let newIndex = currentIndex;

	switch (event.key) {
		case 'ArrowDown':
		case 'ArrowRight':
			event.preventDefault();
			newIndex = (currentIndex + 1) % items.length;
			break;
		case 'ArrowUp':
		case 'ArrowLeft':
			event.preventDefault();
			newIndex = (currentIndex - 1 + items.length) % items.length;
			break;
		case 'Home':
			event.preventDefault();
			newIndex = 0;
			break;
		case 'End':
			event.preventDefault();
			newIndex = items.length - 1;
			break;
		case 'Enter':
		case ' ':
			event.preventDefault();
			onSelect?.(currentIndex);
			return currentIndex;
	}

	items[newIndex]?.focus();
	return newIndex;
}

/**
 * Calculate color contrast ratio between two colors.
 * Returns a value between 1 and 21.
 */
export function getContrastRatio(color1: string, color2: string): number {
	const lum1 = getLuminance(color1);
	const lum2 = getLuminance(color2);
	const lighter = Math.max(lum1, lum2);
	const darker = Math.min(lum1, lum2);
	return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color.
 */
function getLuminance(color: string): number {
	const rgb = hexToRgb(color);
	if (!rgb) return 0;

	const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
		c = c / 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	});

	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16)
			}
		: null;
}

/**
 * Check if contrast meets WCAG AA requirements.
 * Normal text: 4.5:1, Large text: 3:1
 */
export function meetsContrastRequirement(
	foreground: string,
	background: string,
	isLargeText: boolean = false
): boolean {
	const ratio = getContrastRatio(foreground, background);
	return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Skip link target ID.
 */
export const SKIP_LINK_TARGET = 'main-content';

/**
 * Common ARIA labels for the application.
 */
export const ARIA_LABELS = {
	// Navigation
	mainNav: 'Main navigation',
	mobileNav: 'Mobile navigation',
	breadcrumb: 'Breadcrumb',
	pagination: 'Pagination',

	// Actions
	close: 'Close',
	menu: 'Menu',
	search: 'Search',
	filter: 'Filter',
	sort: 'Sort',
	expand: 'Expand',
	collapse: 'Collapse',
	edit: 'Edit',
	delete: 'Delete',
	save: 'Save',
	cancel: 'Cancel',

	// Status
	loading: 'Loading',
	error: 'Error',
	success: 'Success',
	warning: 'Warning',

	// Character
	attributes: 'Character attributes',
	skills: 'Character skills',
	equipment: 'Character equipment',
	qualities: 'Character qualities',

	// Dice
	diceRoller: 'Dice roller',
	rollDice: 'Roll dice',
	rollResult: 'Roll result'
} as const;

/**
 * Keyboard shortcuts map.
 */
export const KEYBOARD_SHORTCUTS = {
	save: { key: 's', ctrl: true, description: 'Save character' },
	newCharacter: { key: 'n', ctrl: true, description: 'New character' },
	search: { key: 'k', ctrl: true, description: 'Open search' },
	help: { key: '?', shift: true, description: 'Show help' },
	escape: { key: 'Escape', description: 'Close dialog/cancel' }
} as const;

/**
 * Register global keyboard shortcuts.
 */
export function registerKeyboardShortcuts(
	handlers: Partial<Record<keyof typeof KEYBOARD_SHORTCUTS, () => void>>
): () => void {
	function handleKeyDown(e: KeyboardEvent): void {
		for (const [name, shortcut] of Object.entries(KEYBOARD_SHORTCUTS)) {
			const matches =
				e.key === shortcut.key &&
				(!('ctrl' in shortcut) || e.ctrlKey === shortcut.ctrl) &&
				(!('shift' in shortcut) || e.shiftKey === shortcut.shift);

			if (matches && handlers[name as keyof typeof KEYBOARD_SHORTCUTS]) {
				e.preventDefault();
				handlers[name as keyof typeof KEYBOARD_SHORTCUTS]!();
				return;
			}
		}
	}

	document.addEventListener('keydown', handleKeyDown);
	return () => document.removeEventListener('keydown', handleKeyDown);
}

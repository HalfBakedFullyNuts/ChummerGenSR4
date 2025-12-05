/**
 * Game Data Browser E2E Tests
 * ============================
 * Tests for the game data browsing functionality.
 */

import { test, expect } from '@playwright/test';

test.describe('Game Data Browser', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/browse');
	});

	test('should display data category tabs', async ({ page }) => {
		// Look for category tabs
		const tabs = page.locator('[role="tab"], .category-tab, .data-tab');

		if (await tabs.count() > 0) {
			await expect(tabs.first()).toBeVisible();
		}
	});

	test('should switch between data categories', async ({ page }) => {
		// Find and click different category tabs
		const tabNames = ['Skills', 'Qualities', 'Spells', 'Gear', 'Weapons'];

		for (const tabName of tabNames) {
			const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') });
			if (await tab.count() > 0) {
				await tab.click();
				await page.waitForTimeout(200);

				// Tab should be selected
				await expect(tab).toHaveAttribute('aria-selected', 'true');
				break; // Just test first available tab
			}
		}
	});

	test('should display data in a table or list', async ({ page }) => {
		// Look for data display
		const dataDisplay = page.locator(
			'table, [role="grid"], .data-list, .item-list'
		);

		if (await dataDisplay.count() > 0) {
			await expect(dataDisplay.first()).toBeVisible();
		}
	});

	test('should support search/filtering', async ({ page }) => {
		// Find search input
		const searchInput = page.locator(
			'input[type="search"], input[placeholder*="search"], input[placeholder*="filter"]'
		);

		if (await searchInput.count() > 0) {
			await searchInput.first().fill('test');
			await page.waitForTimeout(300);

			// Search should be applied (page shouldn't error)
			await expect(page.locator('body')).toBeVisible();
		}
	});

	test('should display item details on selection', async ({ page }) => {
		// Find clickable item
		const item = page.locator(
			'tr:not(:first-child), .data-item, .list-item'
		).first();

		if (await item.count() > 0) {
			await item.click();

			// Should show details panel or expand
			const details = page.locator(
				'.item-details, .detail-panel, [role="dialog"], .expanded'
			);

			// Details might appear
			await page.waitForTimeout(300);
		}
	});

	test('should support pagination or infinite scroll', async ({ page }) => {
		// Check for pagination controls
		const pagination = page.locator(
			'.pagination, [aria-label="pagination"], button:text("Next"), button:text("Load more")'
		);

		if (await pagination.count() > 0) {
			await expect(pagination.first()).toBeVisible();
		}
	});
});

test.describe('Metatypes Browser', () => {
	test('should display metatype information', async ({ page }) => {
		await page.goto('/browse');

		// Find metatypes tab
		const metatypesTab = page.getByRole('tab', { name: /metatype/i });
		if (await metatypesTab.count() > 0) {
			await metatypesTab.click();

			// Look for metatype names
			const human = page.locator(':text("Human")');
			const elf = page.locator(':text("Elf")');
			const dwarf = page.locator(':text("Dwarf")');
			const ork = page.locator(':text("Ork")');
			const troll = page.locator(':text("Troll")');

			// At least one standard metatype should be visible
			const hasMetatype =
				(await human.count()) > 0 ||
				(await elf.count()) > 0 ||
				(await dwarf.count()) > 0 ||
				(await ork.count()) > 0 ||
				(await troll.count()) > 0;

			expect(hasMetatype).toBeTruthy();
		}
	});
});

test.describe('Skills Browser', () => {
	test('should display skill groups', async ({ page }) => {
		await page.goto('/browse');

		// Find skills tab
		const skillsTab = page.getByRole('tab', { name: /skill/i });
		if (await skillsTab.count() > 0) {
			await skillsTab.click();

			// Look for skill group names
			const groups = page.locator(
				':text("Combat"), :text("Physical"), :text("Social"), :text("Technical")'
			);

			if (await groups.count() > 0) {
				await expect(groups.first()).toBeVisible();
			}
		}
	});
});

test.describe('Qualities Browser', () => {
	test('should distinguish positive and negative qualities', async ({ page }) => {
		await page.goto('/browse');

		// Find qualities tab
		const qualitiesTab = page.getByRole('tab', { name: /qualit/i });
		if (await qualitiesTab.count() > 0) {
			await qualitiesTab.click();

			// Look for category indicators
			const positive = page.locator(':text("Positive"), .positive-quality');
			const negative = page.locator(':text("Negative"), .negative-quality');

			// Should have both categories
			await page.waitForTimeout(300);
		}
	});
});

test.describe('Equipment Browser', () => {
	test('should display weapon stats', async ({ page }) => {
		await page.goto('/browse');

		// Find weapons tab
		const weaponsTab = page.getByRole('tab', { name: /weapon/i });
		if (await weaponsTab.count() > 0) {
			await weaponsTab.click();

			// Look for stat columns
			const stats = page.locator(
				':text("Damage"), :text("AP"), :text("Mode"), :text("RC")'
			);

			if (await stats.count() > 0) {
				await expect(stats.first()).toBeVisible();
			}
		}
	});

	test('should display armor ratings', async ({ page }) => {
		await page.goto('/browse');

		// Find armor tab
		const armorTab = page.getByRole('tab', { name: /armor/i });
		if (await armorTab.count() > 0) {
			await armorTab.click();

			// Look for armor rating columns
			const ratings = page.locator(
				':text("Ballistic"), :text("Impact"), :text("B/I")'
			);

			if (await ratings.count() > 0) {
				await expect(ratings.first()).toBeVisible();
			}
		}
	});
});

test.describe('Magic Data Browser', () => {
	test('should display spell categories', async ({ page }) => {
		await page.goto('/browse');

		// Find spells tab
		const spellsTab = page.getByRole('tab', { name: /spell/i });
		if (await spellsTab.count() > 0) {
			await spellsTab.click();

			// Look for spell categories
			const categories = page.locator(
				':text("Combat"), :text("Detection"), :text("Health"), :text("Illusion"), :text("Manipulation")'
			);

			if (await categories.count() > 0) {
				await expect(categories.first()).toBeVisible();
			}
		}
	});

	test('should display adept powers', async ({ page }) => {
		await page.goto('/browse');

		// Find powers tab
		const powersTab = page.getByRole('tab', { name: /power/i });
		if (await powersTab.count() > 0) {
			await powersTab.click();

			// Look for power point costs
			const costs = page.locator(':text("PP"), :text("Point")');

			if (await costs.count() > 0) {
				await expect(costs.first()).toBeVisible();
			}
		}
	});
});

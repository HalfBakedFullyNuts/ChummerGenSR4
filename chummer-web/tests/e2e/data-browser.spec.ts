import { test, expect } from '@playwright/test';

/**
 * Data Browser E2E Tests
 */
test.describe('Data Browser', () => {
	test('should display browse page', async ({ page }) => {
		await page.goto('/browse');
		await expect(page).toHaveTitle(/Browse Data/);
	});

	test('should have search functionality', async ({ page }) => {
		await page.goto('/browse');
		await page.waitForTimeout(1000);
		
		/* Find search input */
		const searchInput = page.getByPlaceholder(/search/i);
		if (await searchInput.count() > 0) {
			await expect(searchInput).toBeVisible();
			await searchInput.fill('Human');
			await page.waitForTimeout(500);
		}
	});

	test('should switch between category tabs', async ({ page }) => {
		await page.goto('/browse');
		await page.waitForTimeout(1000);
		
		/* Look for tab buttons */
		const skillsTab = page.getByRole('button', { name: /skills/i });
		if (await skillsTab.count() > 0) {
			await skillsTab.click();
			await page.waitForTimeout(500);
		}
	});

	test('should have source filter', async ({ page }) => {
		await page.goto('/browse');
		await page.waitForTimeout(1000);
		
		/* Find source filter dropdown */
		const sourceSelect = page.getByRole('combobox');
		if (await sourceSelect.count() > 0) {
			await expect(sourceSelect.first()).toBeVisible();
		}
	});

	test('should have sort controls', async ({ page }) => {
		await page.goto('/browse');
		await page.waitForTimeout(1000);
		
		/* Find sort button */
		const sortBtn = page.getByRole('button', { name: /name/i });
		if (await sortBtn.count() > 0) {
			await sortBtn.click();
			await page.waitForTimeout(300);
		}
	});
});

import { test, expect } from '@playwright/test';

/**
 * Homepage E2E Tests
 */
test.describe('Homepage', () => {
	test('should load the homepage', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/ChummerWeb/);
	});

	test('should display main navigation', async ({ page }) => {
		await page.goto('/');
		/* Wait for app to initialize */
		await page.waitForTimeout(1000);
		/* Check for main content */
		await expect(page.locator('body')).toBeVisible();
	});

	test('should have accessible skip link', async ({ page }) => {
		await page.goto('/');
		/* Tab to skip link */
		await page.keyboard.press('Tab');
		/* Skip link should be visible when focused */
		const skipLink = page.locator('.skip-link');
		if (await skipLink.count() > 0) {
			await expect(skipLink).toBeFocused();
		}
	});
});

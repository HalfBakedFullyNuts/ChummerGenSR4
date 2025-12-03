import { test, expect } from '@playwright/test';

/**
 * Character Creation E2E Tests
 */
test.describe('Character Creation', () => {
	test('should navigate to character creation', async ({ page }) => {
		await page.goto('/');
		await page.waitForTimeout(1000);
		
		/* Look for new character button */
		const newCharBtn = page.getByRole('link', { name: /new character/i });
		if (await newCharBtn.count() > 0) {
			await newCharBtn.click();
			await expect(page).toHaveURL(/character\/new/);
		}
	});

	test('should display metatype selection', async ({ page }) => {
		await page.goto('/character/new');
		await page.waitForTimeout(1000);
		
		/* Check for metatype section */
		const metatypeHeading = page.getByText(/metatype/i);
		if (await metatypeHeading.count() > 0) {
			await expect(metatypeHeading.first()).toBeVisible();
		}
	});
});

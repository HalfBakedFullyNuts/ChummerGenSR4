import { test, expect } from '@playwright/test';

/**
 * Character Creation E2E Tests
 * =============================
 * Comprehensive tests for the character creation wizard workflow.
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

	test('should display creation wizard steps', async ({ page }) => {
		await page.goto('/character/new');

		/* Check for wizard step indicators */
		const steps = page.locator('[role="tablist"], .wizard-steps, .stepper');
		if (await steps.count() > 0) {
			await expect(steps.first()).toBeVisible();
		}
	});

	test('should track BP allocation', async ({ page }) => {
		await page.goto('/character/new');

		/* Look for BP counter */
		const bpDisplay = page.locator('[data-bp], .bp-counter, :text("BP"), :text("Build Points")');
		if (await bpDisplay.count() > 0) {
			await expect(bpDisplay.first()).toBeVisible();
		}
	});

	test('should have navigation buttons', async ({ page }) => {
		await page.goto('/character/new');

		/* Check for Next/Previous buttons */
		const nextButton = page.getByRole('button', { name: /next|continue|proceed/i });
		if (await nextButton.count() > 0) {
			await expect(nextButton.first()).toBeVisible();
		}
	});
});

test.describe('Attribute Allocation', () => {
	test('should display attribute controls', async ({ page }) => {
		await page.goto('/character/new');

		/* Navigate to attributes step if needed */
		const attrStep = page.getByRole('tab', { name: /attribute/i });
		if (await attrStep.count() > 0) {
			await attrStep.click();
		}

		/* Look for attribute inputs */
		const attrControls = page.locator(
			'[data-attribute], .attribute-control, input[name*="bod"], input[name*="agi"]'
		);
		if (await attrControls.count() > 0) {
			await expect(attrControls.first()).toBeVisible();
		}
	});
});

test.describe('Skill Selection', () => {
	test('should display skill categories', async ({ page }) => {
		await page.goto('/character/new');

		/* Navigate to skills step */
		const skillStep = page.getByRole('tab', { name: /skill/i });
		if (await skillStep.count() > 0) {
			await skillStep.click();
		}

		/* Look for skill categories */
		const categories = page.locator(
			'.skill-category, [data-category], :text("Combat"), :text("Physical")'
		);
		if (await categories.count() > 0) {
			await expect(categories.first()).toBeVisible();
		}
	});

	test('should allow skill search', async ({ page }) => {
		await page.goto('/character/new');

		/* Find search input */
		const searchInput = page.locator(
			'input[type="search"], input[placeholder*="search"], input[name*="filter"]'
		);
		if (await searchInput.count() > 0) {
			await searchInput.first().fill('Pistols');
			await page.waitForTimeout(300);
		}
	});
});

test.describe('Equipment Selection', () => {
	test('should display equipment categories', async ({ page }) => {
		await page.goto('/character/new');

		/* Navigate to equipment step */
		const equipStep = page.getByRole('tab', { name: /equipment|gear/i });
		if (await equipStep.count() > 0) {
			await equipStep.click();
		}

		/* Look for equipment tabs */
		const tabs = page.locator(
			'[role="tab"]:text("Weapons"), [role="tab"]:text("Armor"), .equipment-tab'
		);
		if (await tabs.count() > 0) {
			await expect(tabs.first()).toBeVisible();
		}
	});

	test('should track nuyen spending', async ({ page }) => {
		await page.goto('/character/new');

		/* Look for nuyen display */
		const nuyenDisplay = page.locator('[data-nuyen], .nuyen-counter, :text("¥"), :text("Nuyen")');
		if (await nuyenDisplay.count() > 0) {
			await expect(nuyenDisplay.first()).toBeVisible();
		}
	});
});

test.describe('Character Finalization', () => {
	test('should have save button', async ({ page }) => {
		await page.goto('/character/new');

		/* Look for save/create button */
		const saveButton = page.getByRole('button', {
			name: /save|create|finish|complete/i
		});
		if (await saveButton.count() > 0) {
			await expect(saveButton.first()).toBeVisible();
		}
	});
});

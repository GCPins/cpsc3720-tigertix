import { test, expect } from '@playwright/test';

test('frontend exists', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/TigerTix/);
});
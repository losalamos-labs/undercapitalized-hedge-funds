import { test, expect } from '@playwright/test';

test('auth and portfolio access', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill('playwrighttest@uhf.local');
  await page.locator('input[name="password"]').fill('UHFtest2026!');
  await page.locator('button[type="submit"]').click();
+  await page.waitForNavigation({ waitUntil: 'networkidle' });
  await page.goto('/portfolio');
  const balance = page.locator('.balance, [data-test="balance"], [aria-label="funds"]');
  await expect(balance.first()).toBeVisible();
});

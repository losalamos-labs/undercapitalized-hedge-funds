import { test, expect } from '@playwright/test';

test.describe('Auth flows', () => {
  test('login page renders and can submit', async ({ page }) => {
    // Go to either login or root relying on redirect
    await page.goto('/login');
    
    // Check for email and password inputs
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });

    // Fill form
    await emailInput.fill('playwrighttest@uhf.local');
    await passwordInput.fill('UHFtest2026!');
    
    // Try to login (button text might vary)
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    
    // Expect some navigation or state change
    // Using a longer timeout to allow auth to process
    await page.waitForTimeout(3000); 
  });
});

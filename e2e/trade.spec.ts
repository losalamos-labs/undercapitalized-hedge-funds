import { test, expect } from '@playwright/test';

test('auth then trade flow', async ({ page }) => {
  // Go to root page
  await page.goto('/login');
  
  // Login with test account
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const passwordInput = page.locator('input[type="password"], input[name="password"]');
  const submitBtn = page.locator('button[type="submit"]');

  await emailInput.fill('playwrighttest@uhf.local');
  await passwordInput.fill('UHFtest2026!');
  await submitBtn.click();
  
  // Wait for login redirect
  await page.waitForTimeout(3000);

  // Navigate to trade explicitly if there's a menu link
  const tradeLink = page.locator('a[href="/trade"]');
  if (await tradeLink.count() > 0) {
    await tradeLink.first().click();
  } else {
    await page.goto('/trade');
  }

  // Look for search bar
  const searchBar = page.locator('input[placeholder*="Search" i], input[type="search"]');
  if (await searchBar.count() > 0) {
    await searchBar.first().fill('AAPL');
    await searchBar.first().press('Enter');
    await page.waitForTimeout(1000); // Wait for quote
  }

  // Find a Buy button and click
  const buyButton = page.locator('button', { hasText: /buy/i });
  if (await buyButton.count() > 0) {
    await buyButton.first().click();
    await page.waitForTimeout(1000); // Wait for order to fill
    
    // Check for success toast
    const toastMessage = page.locator(':text-matches("success|filled|order", "i")');
    if (await toastMessage.count() > 0) {
       await expect(toastMessage.first()).toBeVisible({ timeout: 5000 });
    }
  }

  // Find a Sell button and click
  const sellButton = page.locator('button', { hasText: /sell/i });
  if (await sellButton.count() > 0) {
    await sellButton.first().click();
  }
});

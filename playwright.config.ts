import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 120000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: 'https://undercapitalized-hedge-funds-production.up.railway.app',
    headless: true,
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'Chromium', use: { browserName: 'chromium' } },
  ],
  reporter: 'list',
});

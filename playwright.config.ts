import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Retry flaky specs (transient editor-hydration / network hiccups on staging).
  retries: process.env.CI ? 2 : 1,
  // Single worker: the suite shares one test account, and concurrent logins to
  // it invalidate each other's session. Serialising avoids that race.
  workers: 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'https://staging.talktravel.com',
    // Cap individual actions/navigations so a stuck locator fails fast with a
    // clear log instead of silently consuming the whole 180s test timeout.
    actionTimeout: 20000,
    navigationTimeout: 45000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});

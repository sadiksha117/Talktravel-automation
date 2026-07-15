import { defineConfig, devices } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
/**
 * Minimal .env loader with no external dependency — the `dotenv` package
 * broke on a machine whose node_modules hadn't been reinstalled after the
 * package.json change ("Cannot find module 'dotenv/config'"). Reading the
 * file directly means TEST_EMAIL/TEST_PASSWORD load the moment you pull,
 * no npm install required.
 */
function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvFile(join(__dirname, '.env'));
export default defineConfig({
  testDir: './tests',
  testIgnore: '**/exploratory/**',
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

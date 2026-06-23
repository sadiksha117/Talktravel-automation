import { test as setup } from '@playwright/test';
import { EditPostPage } from '../src/pages/EditPost';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Auth setup project: logs in ONCE and saves the session to
 * playwright/.auth/owner.json. Specs that need an authenticated owner reuse it
 * via `test.use({ storageState })`, avoiding per-test logins that race on the
 * single shared account.
 *
 * This project runs with NO storageState of its own, so the `page` fixture here
 * is a fresh, logged-out browser — exactly what login() needs.
 */
const VALID_EMAIL    = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const VALID_PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';

const AUTH_DIR  = path.join(__dirname, '..', 'playwright', '.auth');
const AUTH_FILE = path.join(AUTH_DIR, 'owner.json');

setup('authenticate as post owner', async ({ page }) => {
  setup.setTimeout(90000);
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const auth = new EditPostPage(page);
  await auth.login(VALID_EMAIL, VALID_PASSWORD);
  await page.context().storageState({ path: AUTH_FILE });
});

import { test as setup } from '@playwright/test';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { PostLoginSinglePostViewPage } from '../src/pages/PostLoginSinglePostView';
import { STORAGE_STATE } from '../src/authState';

/**
 * One-time authentication. Logs in a single time and saves the session to
 * STORAGE_STATE so the whole worker pool can share it. This avoids the failure
 * where 4 parallel workers each log into the SAME account and invalidate one
 * another's session (the comment editor then reverts to "Please login").
 */
const VALID_EMAIL    = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';

setup('authenticate', async ({ page }) => {
  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  const flow = new PostLoginSinglePostViewPage(page);
  await flow.login(VALID_EMAIL, VALID_PASSWORD);
  await page.context().storageState({ path: STORAGE_STATE });
});

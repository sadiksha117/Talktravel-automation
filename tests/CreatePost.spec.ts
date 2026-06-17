import { test, expect } from '@playwright/test';
import { CreatePostPage } from '../src/pages/CreatePost';

const VALID_EMAIL = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const VALID_PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';

test.describe('Create Post (Post-Login) — Positive Flows', () => {
  let createPost: CreatePostPage;

  test.beforeEach(async ({ page }) => {
    createPost = new CreatePostPage(page);
    await createPost.login(VALID_EMAIL, VALID_PASSWORD);
    await createPost.goToCreatePost();
  });

  // ── Step 1: Page loads with all required elements ────────────────────────

  test('Step 1 — Create Post page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Create New Post' })).toBeVisible();
  });

  test('Step 1 — Title input is visible', async () => {
    await expect(createPost.titleInput).toBeVisible();
  });

  test('Step 1 — Discussion editor is visible', async () => {
    await expect(createPost.discussionEditor).toBeVisible();
  });

  test('Step 1 — External Link input is visible', async () => {
    await expect(createPost.externalLinkInput).toBeVisible();
  });

  test('Step 1 — Topics input is visible', async () => {
    await expect(createPost.topicsInput).toBeVisible();
  });

  test('Step 1 — Publish Post button is visible', async () => {
    await expect(createPost.publishBtn).toBeVisible();
  });

  test('Step 1 — Cancel button is visible', async () => {
    await expect(createPost.cancelBtn).toBeVisible();
  });

  // ── Step 3: Title field ──────────────────────────────────────────────────

  test('Step 3 — Title field accepts text input', async () => {
    await createPost.titleInput.fill('Automation test post title');
    await expect(createPost.titleInput).toHaveValue('Automation test post title');
  });

  // ── Step 4: Discussion editor ────────────────────────────────────────────

  test('Step 4 — Discussion editor accepts text input', async () => {
    await createPost.discussionEditor.click();
    await createPost.discussionEditor.fill('This is an automation discussion body.');
    await expect(createPost.discussionEditor).toContainText('This is an automation discussion body.');
  });

  // ── Step 5: External Link ────────────────────────────────────────────────

  test('Step 5 — External Link input accepts a URL', async () => {
    await createPost.externalLinkInput.fill('https://www.bbc.com/travel');
    await expect(createPost.externalLinkInput).toHaveValue('https://www.bbc.com/travel');
  });

  // ── Step 6: Topics — search and select ──────────────────────────────────

  test('Step 6 — Selecting a topic adds it as a chip', async ({ page }) => {
    await createPost.topicsInput.fill('hi');
    await createPost.topicsInput.press('Enter');
    await page.getByText('Hilton', { exact: true }).click();
    await expect(page.locator('div').filter({ hasText: /^Hilton×$/ }).nth(1)).toBeVisible();
  });

  test('Step 6 — Topics input clears after a topic is selected', async ({ page }) => {
    await createPost.topicsInput.fill('hi');
    await createPost.topicsInput.press('Enter');
    await page.getByText('Hilton', { exact: true }).click();
    await expect(createPost.topicsInput).toHaveValue('');
  });

  // ── Step 10: Topics — remove a chip ─────────────────────────────────────

  test('Step 10 — Removing a topic chip deselects the topic', async ({ page }) => {
    await createPost.topicsInput.fill('hi');
    await createPost.topicsInput.press('Enter');
    await page.getByText('Hilton', { exact: true }).click();
    await expect(page.locator('div').filter({ hasText: /^Hilton×$/ }).nth(1)).toBeVisible();
    await page.locator('div').filter({ hasText: /^Hilton×$/ }).nth(1).getByText('×').click();
    await expect(page.locator('div').filter({ hasText: /^Hilton×$/ })).toHaveCount(0);
  });

  // ── Step 11: Cancel ──────────────────────────────────────────────────────

  test('Step 11 — Cancel returns to previous page', async ({ page }) => {
    await createPost.titleInput.fill('Will be discarded');
    await createPost.cancelBtn.click();
    await expect(page).not.toHaveURL(/\/create-post|\/new-post|\/post\/new/);
  });

  // ── Step 15: Publish — full happy path ───────────────────────────────────

  test('Step 15 — Publish with full form redirects to Single Post View', async ({ page }) => {
    const title = `E2E full post ${Date.now()}`;
    await createPost.titleInput.fill(title);
    await createPost.discussionEditor.click();
    await createPost.discussionEditor.fill('Discussion body content.');
    await createPost.topicsInput.fill('hi');
    await createPost.topicsInput.press('Enter');
    await page.getByText('Hilton', { exact: true }).click();
    await createPost.publishBtn.click();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
  });

  // ── Step 16: Publish — minimal (Title + 1 topic only) ────────────────────

  test('Step 16 — Publish with Title and one topic succeeds', async ({ page }) => {
    const title = `Minimal post ${Date.now()}`;
    await createPost.titleInput.fill(title);
    await createPost.topicsInput.fill('hi');
    await createPost.topicsInput.press('Enter');
    await page.getByText('Hilton', { exact: true }).click();
    await createPost.publishBtn.click();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
  });

  // ── Step 17: Post appears in My Posts ────────────────────────────────────

  test('Step 17 — Published post appears in My Posts', async ({ page }) => {
    const title = `My Posts check ${Date.now()}`;
    await createPost.titleInput.fill(title);
    await createPost.topicsInput.fill('hi');
    await createPost.topicsInput.press('Enter');
    await page.getByText('Hilton', { exact: true }).click();
    await createPost.publishBtn.click();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
    await page.getByRole('link', { name: /my posts/i }).click();
    await expect(page.locator(`text=${title}`).first()).toBeVisible();
  });
});

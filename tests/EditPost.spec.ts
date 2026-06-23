import { test, expect } from '@playwright/test';
import { EditPostPage } from '../src/pages/EditPost';

const VALID_EMAIL    = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const VALID_PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';

/**
 * Edit Post (Post-Login) — positive / happy-path coverage from docs/Editpost.md.
 *
 * Simple positive flow only: reach the edit form, confirm it is pre-filled,
 * edit each field, update successfully, cancel cleanly, and see the "Edited"
 * label. Negative / validation / edge cases live in
 * tests/exploratory/EditPost.exploratory.spec.ts.
 *
 * Edit Post is owner-only, so these tests log in as the test account and edit
 * one of its own posts. They run serially (shared login + a single owned post
 * is edited repeatedly) to avoid parallel workers fighting over the same post.
 */
test.describe('Edit Post (Post-Login) — Positive Flows', () => {
  // Each test logs in and opens the edit form independently in beforeEach, so
  // they don't depend on each other — run them in default (non-serial) mode so
  // one failure doesn't skip the rest. Run with `--workers=1` to avoid two
  // tests editing the same post at once.
  test.setTimeout(120000);

  let editPost: EditPostPage;

  test.beforeEach(async ({ page }) => {
    editPost = new EditPostPage(page);
    await editPost.login(VALID_EMAIL, VALID_PASSWORD);
    await editPost.openOwnPostEdit();
  });

  // ── Steps 1–3: Reaching the edit form ────────────────────────────────────

  test('Steps 1–3 — opening Edit Post lands on the edit form URL', async () => {
    expect(editPost.isOnEditUrl()).toBe(true);
  });

  // ── Step 4: Form is pre-filled with existing values ──────────────────────

  test('Step 4 — Title is pre-filled (non-empty)', async () => {
    await expect(editPost.titleInput).not.toHaveValue('');
  });

  test('Step 4 — Discussion editor is loaded and editable', async () => {
    // The body may legitimately be image-only (no text), so assert the editor
    // mounted and is editable rather than that it contains text.
    await expect(editPost.discussionEditor).toBeVisible();
    await expect(editPost.discussionEditor).toHaveAttribute('contenteditable', 'true');
  });

  test('Step 4 — at least one topic chip is pre-selected', async () => {
    await expect(editPost.selectedTopicChips.first()).toBeVisible();
  });

  test('Step 4 — Update Post and Cancel buttons are visible', async () => {
    await expect(editPost.updatePostBtn).toBeVisible();
    await expect(editPost.cancelBtn).toBeVisible();
  });

  // ── Step 5: Edit the Title ───────────────────────────────────────────────

  test('Step 5 — Title field replaces (not appends) its value', async () => {
    await editPost.titleInput.fill('Edited title by automation');
    await expect(editPost.titleInput).toHaveValue('Edited title by automation');
  });

  // ── Step 6: Edit the Discussion ──────────────────────────────────────────

  test('Step 6 — Discussion editor accepts appended content', async ({ page }) => {
    await editPost.discussionEditor.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type(' Additional edited content.');
    await expect(editPost.discussionEditor).toContainText('Additional edited content.');
  });

  // ── Step 7: Edit the External Link ───────────────────────────────────────

  test('Step 7 — External Link field accepts a new URL', async () => {
    await editPost.externalLinkInput.fill('https://www.example.com');
    await expect(editPost.externalLinkInput).toHaveValue('https://www.example.com');
  });

  // ── Step 9: Remove an existing topic chip ────────────────────────────────

  test('Step 9 — removing a topic chip deselects it', async () => {
    const before = await editPost.selectedTopicChips.count();
    test.skip(before < 2, 'Post has a single topic — removing it would trip the min-1 rule');
    await editPost.selectedTopicChips
      .first()
      .locator('button, [aria-label="Remove"], [class*="remove"], [class*="close"]')
      .first()
      .click();
    await expect(editPost.selectedTopicChips).toHaveCount(before - 1);
  });

  // ── Step 10: Update Post — happy path ────────────────────────────────────

  test('Step 10 — Update Post redirects to the Single Post View with new title', async ({ page }) => {
    const newTitle = `Edited by automation ${Date.now()}`;
    await editPost.titleInput.fill(newTitle);
    await editPost.dismissCookieBanner();
    await editPost.submitUpdate();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+(?<!\/edit)$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(newTitle);
  });

  // ── Step 11: Cancel discards edits ───────────────────────────────────────

  test('Step 11 — Cancel exits the edit form without saving', async ({ page }) => {
    const slug = editPost.currentPostSlug();
    await editPost.titleInput.fill('This change will be discarded');
    await editPost.cancelBtn.click();
    await expect(page).not.toHaveURL(/\/edit$/, { timeout: 10000 });
    // Reopen the post and confirm the discarded title never persisted.
    await page.goto(`https://staging.talktravel.com/post/${slug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).not.toContainText('This change will be discarded');
  });

  // ── Step 15: "Edited" label after a successful update ────────────────────

  test('Step 15 — successful update shows an "Edited" label on the post', async ({ page }) => {
    const newTitle = `Edited label check ${Date.now()}`;
    await editPost.titleInput.fill(newTitle);
    await editPost.dismissCookieBanner();
    await editPost.submitUpdate();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+(?<!\/edit)$/, { timeout: 15000 });
    await expect(editPost.editedLabel).toBeVisible({ timeout: 10000 });
  });
});

import { test, expect } from '@playwright/test';
import { DeletePostPage } from '../src/pages/DeletePost';

const VALID_EMAIL    = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const VALID_PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';

/**
 * Delete Post (Post-Login) — positive / happy-path coverage from docs/DeletePost.md.
 *
 * Simple positive flow only: open the delete confirmation, confirm the dialog
 * appears (no instant delete), see its Cancel / Delete actions, cancel cleanly,
 * and the two successful outcomes — a post WITHOUT comments is removed
 * permanently (URL → 404), a post WITH comments becomes a "Deleted by author"
 * placeholder with its comments preserved. Negative / owner-enforcement / edge
 * cases live outside this file.
 *
 * Delete is owner-only and irreversible, so each test seeds its OWN throwaway
 * post via the Create Post UI in beforeEach and deletes that — no pre-existing
 * data is ever touched. They run independently; use `--workers=1` so parallel
 * workers don't fight over the shared login.
 */
test.describe('Delete Post (Post-Login) — Positive Flows', () => {
  test.setTimeout(120000);

  let deletePost: DeletePostPage;
  let slug: string;

  test.beforeEach(async ({ page }) => {
    deletePost = new DeletePostPage(page);
    await deletePost.login(VALID_EMAIL, VALID_PASSWORD);
    slug = await deletePost.createDisposablePost(`Delete flow ${Date.now()}`, {
      body: 'Disposable post seeded by automation for the delete flow.',
    });
  });

  // ── Steps 1–3: Reaching the delete confirmation ──────────────────────────

  test('Steps 1–3 — clicking Delete opens the confirmation dialog', async () => {
    const opened = await deletePost.openDeleteDialog();
    expect(opened).toBe(true);
  });

  test('Steps 1–3 — opening Delete does NOT delete the post immediately', async () => {
    await deletePost.openDeleteDialog();
    // The click only opened the dialog — we are still on the post.
    expect(deletePost.isOnPostUrl(slug)).toBe(true);
  });

  // ── Step 4: Confirmation dialog structure ────────────────────────────────

  test('Step 4 — confirmation dialog is visible', async () => {
    await deletePost.openDeleteDialog();
    await expect(deletePost.confirmDialog).toBeVisible();
  });

  test('Step 4 — dialog shows a Cancel button', async () => {
    await deletePost.openDeleteDialog();
    await expect(deletePost.cancelDeleteBtn).toBeVisible();
  });

  test('Step 4 — dialog shows a Delete (confirm) button', async () => {
    await deletePost.openDeleteDialog();
    await expect(deletePost.confirmDeleteBtn).toBeVisible();
  });

  // ── Step 5: Cancel the deletion ──────────────────────────────────────────

  test('Step 5 — Cancel closes the confirmation dialog', async () => {
    await deletePost.openDeleteDialog();
    await deletePost.cancelDelete();
    await expect(deletePost.confirmDialog).not.toBeVisible();
  });

  test('Step 5 — Cancel preserves the post', async ({ page }) => {
    await deletePost.openDeleteDialog();
    await deletePost.cancelDelete();
    // Reopen the post and confirm it still resolves with its heading intact.
    await page.goto(`https://staging.talktravel.com/post/${slug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  // ── Step 7: Delete a post WITHOUT comments → permanent removal ────────────

  test('Step 7 — deleting a comment-less post redirects away from it', async ({ page }) => {
    const opened = await deletePost.openDeleteDialog();
    expect(opened).toBe(true);
    await deletePost.confirmDelete();
    await expect(page).not.toHaveURL(new RegExp(`/post/${slug}(?:[/?#]|$)`), { timeout: 15000 });
  });

  test('Step 7 — a permanently deleted post URL shows a not-found state', async ({ page }) => {
    await deletePost.openDeleteDialog();
    await deletePost.confirmDelete();
    // Direct navigation to the deleted post now fails.
    await page.goto(`https://staging.talktravel.com/post/${slug}`, { waitUntil: 'domcontentloaded' });
    await expect(deletePost.notFoundState).toBeVisible({ timeout: 10000 });
  });

  // ── Step 6: Delete a post WITH comments → "Deleted by author" placeholder ─

  test('Step 6 — deleting a post with comments shows the "Deleted by author" placeholder', async ({ page }) => {
    const commentedSlug = await deletePost.createDisposablePost(`Delete w/ comments ${Date.now()}`, {
      body: 'Post with a comment, for the placeholder branch.',
      withComment: 'Automation seed comment on a soon-to-be-deleted post.',
    });
    await deletePost.openDeleteDialog();
    await deletePost.confirmDelete();
    // URL still resolves and shows the placeholder.
    await expect(page).toHaveURL(new RegExp(`/post/${commentedSlug}`), { timeout: 15000 });
    await expect(deletePost.deletedPlaceholder).toBeVisible({ timeout: 10000 });
  });

  test('Step 6 — comments remain visible on a placeholder post', async ({ page }) => {
    const commentText = 'Automation seed comment that should survive deletion.';
    await deletePost.createDisposablePost(`Delete keeps comments ${Date.now()}`, {
      body: 'Post with a comment, for the placeholder branch.',
      withComment: commentText,
    });
    await deletePost.openDeleteDialog();
    await deletePost.confirmDelete();
    await expect(page.getByText(commentText)).toBeVisible({ timeout: 10000 });
  });
});

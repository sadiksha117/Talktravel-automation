import { test, expect } from '@playwright/test';
import { DeletePostPage } from '../src/pages/DeletePost';

const VALID_EMAIL    = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const VALID_PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';

/**
 * Delete Post (Post-Login) — positive / happy-path coverage from docs/DeletePost.md.
 *
 * Positive flow only: open the delete confirmation, see the dialog (no instant
 * delete), cancel cleanly, and the two successful outcomes — a post WITHOUT
 * comments is permanently removed (URL → 404), a post WITH comments becomes a
 * "Deleted by author" placeholder with its comments preserved. Negative /
 * owner-enforcement / edge cases are out of scope here.
 *
 * Delete is owner-only and irreversible, so every test seeds its OWN throwaway
 * post via the Create Post UI in beforeEach and deletes that — no pre-existing
 * data is ever touched. Run with `--workers=1` to avoid parallel workers
 * fighting over the shared login.
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

  // ── Steps 1–3: Delete opens a confirmation dialog (no instant delete) ─────

  test('Steps 1–3 — clicking Delete opens the confirmation dialog without deleting', async () => {
    const opened = await deletePost.openDeleteDialog();
    expect(opened).toBe(true);
    // Still on the post — the click only opened the dialog, it did not delete.
    expect(deletePost.isOnPostUrl(slug)).toBe(true);
  });

  // ── Step 4: Confirmation dialog exposes Cancel and Delete actions ─────────

  test('Step 4 — confirmation dialog shows Cancel and Delete buttons', async () => {
    await deletePost.openDeleteDialog();
    await expect(deletePost.confirmDialog).toBeVisible();
    await expect(deletePost.cancelDeleteBtn).toBeVisible();
    await expect(deletePost.confirmDeleteBtn).toBeVisible();
  });

  // ── Step 5: Cancel preserves the post ────────────────────────────────────

  test('Step 5 — Cancel closes the dialog and preserves the post', async ({ page }) => {
    await deletePost.openDeleteDialog();
    await deletePost.cancelDelete();
    await expect(deletePost.confirmDialog).not.toBeVisible();
    expect(deletePost.isOnPostUrl(slug)).toBe(true);

    // Reopen the post and confirm it still resolves with its title intact.
    await page.goto(`https://staging.talktravel.com/post/${slug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  // ── Step 7: Delete a post WITHOUT comments → permanent removal ────────────

  test('Step 7 — deleting a post without comments removes it permanently', async ({ page }) => {
    const opened = await deletePost.openDeleteDialog();
    expect(opened).toBe(true);
    await deletePost.confirmDelete();

    // User is redirected away from the deleted post.
    await expect(page).not.toHaveURL(new RegExp(`/post/${slug}(?:[/?#]|$)`), { timeout: 15000 });

    // Direct navigation now fails with a not-found state.
    await page.goto(`https://staging.talktravel.com/post/${slug}`, { waitUntil: 'domcontentloaded' });
    await expect(deletePost.notFoundState).toBeVisible({ timeout: 10000 });
  });

  // ── Step 6: Delete a post WITH comments → "Deleted by author" placeholder ─

  test('Step 6 — deleting a post with comments shows the placeholder and keeps comments', async ({ page }) => {
    // Seed a fresh post that already has a comment for the placeholder branch.
    const commentedSlug = await deletePost.createDisposablePost(`Delete w/ comments ${Date.now()}`, {
      body: 'Post with a comment, for the placeholder branch.',
      withComment: 'Automation seed comment on a soon-to-be-deleted post.',
    });

    const opened = await deletePost.openDeleteDialog();
    expect(opened).toBe(true);
    await deletePost.confirmDelete();

    // The post URL still resolves and shows the "Deleted by author" placeholder.
    await expect(page).toHaveURL(new RegExp(`/post/${commentedSlug}`), { timeout: 15000 });
    await expect(deletePost.deletedPlaceholder).toBeVisible({ timeout: 10000 });

    // The comment thread is preserved.
    await expect(page.getByText('Automation seed comment on a soon-to-be-deleted post.')).toBeVisible();
  });
});

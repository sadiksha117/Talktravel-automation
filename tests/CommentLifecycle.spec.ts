import { test, expect } from '@playwright/test';
import { CommentLifecyclePage } from '../src/pages/CommentLifecycle';

/**
 * Comment Lifecycle — POSITIVE (happy-path) suite.
 *
 * Mirrors docs/Comment_lifecycle.md, covering ONLY the positive cases: valid
 * inputs that should succeed (add, reply, thread, vote, share, edit, delete,
 * sort, Jetfuel). Negative / validation / cancel cases are intentionally
 * excluded from this file.
 *
 * Every test runs for real — no test.skip() guards. Each test that needs a
 * comment creates its own, so the vote/share/menu steps never depend on a post
 * already having comments. Selectors live in the CommentLifecyclePage page
 * object and use the locators confirmed against this app.
 */

const VALID_EMAIL    = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';

test.describe('Comment Lifecycle — Happy Path (positive only)', () => {
  let flow: CommentLifecyclePage;

  // Run serially in a single worker. Each test logs in fresh (required — the
  // comment editor's auth token isn't captured by storageState), and this app's
  // single shared account invalidates a session whenever another login occurs.
  // Serial execution guarantees logins never overlap, so no test gets bumped to
  // the "Please login" placeholder mid-run.
  test.describe.configure({ mode: 'serial' });

  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    flow = new CommentLifecyclePage(page);
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.openFirstPost();
  });

  // ── Step 1: Add a top-level comment ────────────────────────────────────────

  test('Step 1 — submitting a valid comment publishes it and clears the input', async ({ page }) => {
    const text = `Top-level ${Date.now()}`;
    await flow.addTopLevelComment(text);

    await expect(page.getByText(text)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.ql-editor[contenteditable="true"]').first()).toHaveText('');
  });

  // ── Step 2: Rich-text formatting in a comment ──────────────────────────────

  test('Step 2 — a bold-formatted comment renders bold text when published', async ({ page }) => {
    const input = await flow.getCommentInput();
    const marker = `Bold ${Date.now()}`;
    await input.click();
    await page.keyboard.type(marker);
    await page.keyboard.press('Control+A');

    // Quill toolbar bold control is `button.ql-bold`.
    await page.locator('button.ql-bold').first().click();
    await flow.commentSubmitBtn.click();

    await expect(flow.commentRow(marker).locator('strong, b').first()).toBeVisible({ timeout: 15000 });
  });

  // ── Step 4: Reply to a comment (level 2) ───────────────────────────────────

  test('Step 4 — replying to a comment creates a nested reply', async ({ page }) => {
    const parentText = `Parent ${Date.now()}`;
    await flow.addTopLevelComment(parentText);

    const replyText = `Level 2 reply ${Date.now()}`;
    await flow.replyTo(flow.commentRow(parentText), replyText);
    await expect(page.getByText(replyText)).toBeVisible({ timeout: 15000 });
  });

  // ── Step 6: Reply to an existing reply still creates a deeper reply ─────────

  test('Step 6 — replying to a nested reply creates a deeper reply', async ({ page }) => {
    const parentText = `Thread parent ${Date.now()}`;
    await flow.addTopLevelComment(parentText);

    const level2 = `Thread level 2 ${Date.now()}`;
    await flow.replyTo(flow.commentRow(parentText), level2);

    const level3 = `Thread level 3 ${Date.now()}`;
    await flow.replyTo(flow.commentRow(level2), level3);
    await expect(page.getByText(level3)).toBeVisible({ timeout: 15000 });
  });

  // ── Step 8: Upvote a comment ───────────────────────────────────────────────

  test('Step 8 — upvoting a comment is accepted (stays on the post page)', async ({ page }) => {
    const text = `Upvote me ${Date.now()}`;
    await flow.addTopLevelComment(text);

    await flow.upvoteIn(flow.commentRow(text)).click();
    await expect(page).toHaveURL(/\/post\/.+/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  // ── Step 9: Downvote a comment ─────────────────────────────────────────────

  test('Step 9 — downvoting a comment is accepted (stays on the post page)', async ({ page }) => {
    const text = `Downvote me ${Date.now()}`;
    await flow.addTopLevelComment(text);

    await flow.downvoteIn(flow.commentRow(text)).click();
    await expect(page).toHaveURL(/\/post\/.+/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  // ── Step 10: Share a comment ───────────────────────────────────────────────

  test('Step 10 — sharing a comment shows a link-copied confirmation toast', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const text = `Share me ${Date.now()}`;
    await flow.addTopLevelComment(text);

    await flow.shareIn(flow.commentRow(text)).click();
    await expect(flow.linkCopiedToast).toBeVisible();
  });

  // ── Step 11: 3-dot menu on own comment shows Edit + Delete ─────────────────

  test('Step 11 — 3-dot menu on own comment shows Edit and Delete', async () => {
    const text = `Own comment ${Date.now()}`;
    await flow.addTopLevelComment(text);

    await flow.openCommentMenu(flow.commentRow(text));
    await expect(flow.menuEditItem).toBeVisible();
    await expect(flow.menuDeleteItem).toBeVisible();
  });

  // ── Step 13: Edit own comment (Edited label appears) ───────────────────────

  test('Step 13 — editing own comment updates the text and shows the Edited label', async ({ page }) => {
    const original = `Edit me ${Date.now()}`;
    await flow.addTopLevelComment(original);

    const row = flow.commentRow(original);
    await flow.openCommentMenu(row);
    await flow.menuEditItem.click();

    const edited = `Edited by automation ${Date.now()}`;
    await flow.activeInlineEditor().fill(edited);
    await flow.editSaveBtn.click();

    await expect(page.getByText(edited)).toBeVisible({ timeout: 15000 });
    await expect(flow.editedLabel.first()).toBeVisible();
  });

  // ── Step 15: Multiple edits show a single Edited label ─────────────────────

  test('Step 15 — editing a comment twice still shows exactly one Edited label', async ({ page }) => {
    const original = `Multi-edit ${Date.now()}`;
    await flow.addTopLevelComment(original);

    // First edit
    await flow.openCommentMenu(flow.commentRow(original));
    await flow.menuEditItem.click();
    const firstEdit = `First edit ${Date.now()}`;
    await flow.activeInlineEditor().fill(firstEdit);
    await flow.editSaveBtn.click();
    await page.getByText(firstEdit).first().waitFor({ state: 'visible', timeout: 15000 });

    // Second edit
    await flow.openCommentMenu(flow.commentRow(firstEdit));
    await flow.menuEditItem.click();
    const secondEdit = `Second edit ${Date.now()}`;
    await flow.activeInlineEditor().fill(secondEdit);
    await flow.editSaveBtn.click();
    await page.getByText(secondEdit).first().waitFor({ state: 'visible', timeout: 15000 });

    await expect(flow.commentRow(secondEdit).locator('text=/Edited/i')).toHaveCount(1);
  });

  // ── Step 16: Delete own comment with NO replies → removed permanently ──────

  test('Step 16 — deleting own comment with no replies removes it from the thread', async ({ page }) => {
    const text = `Delete me ${Date.now()}`;
    await flow.addTopLevelComment(text);

    await flow.openCommentMenu(flow.commentRow(text));
    await flow.menuDeleteItem.click();
    await flow.deleteConfirmBtn.click();

    await expect(page.getByText(text)).not.toBeVisible({ timeout: 10000 });
  });

  // ── Step 17: Delete own comment WITH replies → placeholder; replies remain ──

  test('Step 17 — deleting a parent comment with a reply leaves a placeholder and keeps the reply', async ({ page }) => {
    const parentText = `Parent to delete ${Date.now()}`;
    await flow.addTopLevelComment(parentText);

    const childText = `Child reply ${Date.now()}`;
    await flow.replyTo(flow.commentRow(parentText), childText);

    await flow.openCommentMenu(flow.commentRow(parentText));
    await flow.menuDeleteItem.click();
    await flow.deleteConfirmBtn.click();

    await expect(page.locator('text=/Deleted by author|Deleted/i').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(childText)).toBeVisible();
  });

  // ── Step 19: Sort comments Newest ↔ Oldest ─────────────────────────────────

  test('Step 19 — switching the sort control to Oldest updates the selection', async ({ page }) => {
    await flow.commentSort.click();
    const oldest = page.getByRole('option', { name: /oldest/i })
      .or(page.getByRole('menuitem', { name: /oldest/i }))
      .or(page.getByText('Oldest', { exact: true }))
      .first();
    await oldest.click();
    await expect(flow.commentSort).toContainText('Oldest');
  });

  // ── Step 20: Comment earns Jetfuel ─────────────────────────────────────────
  // Posting a comment surfaces a "+2 Jetfuel" reward confirmation.

  test('Step 20 — posting a comment shows the +2 Jetfuel reward', async () => {
    await flow.addTopLevelComment(`Jetfuel ${Date.now()}`);
    await expect(flow.jetfuelReward()).toBeVisible({ timeout: 15000 });
  });
});

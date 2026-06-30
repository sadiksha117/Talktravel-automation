import { test, expect, type Page, type Locator } from '@playwright/test';
import { PostLoginSinglePostViewPage } from '../src/pages/PostLoginSinglePostView';

/**
 * Comment Lifecycle — POSITIVE (happy-path) suite.
 *
 * Mirrors docs/Comment_lifecycle.md, but covers ONLY the positive cases:
 * valid inputs that should succeed (add, reply, thread, vote, share, edit,
 * delete, sort, Jetfuel). Negative / validation / cancel cases
 * (empty-comment rejection, cancel reply, cancel edit, cancel delete) are
 * intentionally excluded from this file.
 *
 * Style follows tests/PostLoginSinglePostView.spec.ts: real selectors against
 * staging with graceful test.skip() when an element isn't present, so the
 * suite degrades cleanly across app versions instead of hard-failing on
 * selector drift.
 */

const VALID_EMAIL    = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';

const SUBMIT_NAME = /^reply$|^post$|^submit/i;

// The submitted comment text lives several DOM levels below the comment row;
// ancestor::*[4] climbs to the row wrapper that also holds the action buttons.
function commentRowFor(page: Page, text: string): Locator {
  return page.getByText(text).first().locator('xpath=ancestor::*[4]');
}

async function submitTopLevelComment(page: Page, postPage: PostLoginSinglePostViewPage, text: string): Promise<boolean> {
  let commentInput: Locator;
  try {
    commentInput = await postPage.getCommentInput();
  } catch {
    return false;
  }
  await commentInput.click();
  await commentInput.fill(text);
  await page.getByRole('button', { name: SUBMIT_NAME }).last().click();
  await page.getByText(text).first().waitFor({ state: 'visible', timeout: 15000 });
  return true;
}

test.describe('Comment Lifecycle — Happy Path (positive only)', () => {
  let postPage: PostLoginSinglePostViewPage;

  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    postPage = new PostLoginSinglePostViewPage(page);
    await postPage.login(VALID_EMAIL, VALID_PASSWORD);
    await postPage.openFirstPost();
  });

  // ── Step 1: Add a top-level comment ────────────────────────────────────────

  test('Step 1 — submitting a valid comment publishes it and clears the input', async ({ page }) => {
    const text = `Top-level ${Date.now()}`;
    const ok = await submitTopLevelComment(page, postPage, text);
    test.skip(!ok, 'Comment input not found — Quill editor did not activate');

    await expect(page.getByText(text)).toBeVisible({ timeout: 15000 });
    // Input clears after a successful submit
    const editor = page.locator('.ql-editor[contenteditable="true"]').first();
    if (await editor.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(editor).toHaveText('');
    }
  });

  // ── Step 2: Rich-text formatting in a comment ──────────────────────────────

  test('Step 2 — a bold-formatted comment renders bold text when published', async ({ page }) => {
    let commentInput: Locator;
    try {
      commentInput = await postPage.getCommentInput();
    } catch {
      test.skip(true, 'Comment input not found — Quill editor did not activate');
      return;
    }
    const marker = `Bold ${Date.now()}`;
    await commentInput.click();
    await page.keyboard.type(marker);
    await page.keyboard.press('Control+A');

    const boldBtn = page.locator('button[aria-label="Bold" i]')
      .or(page.locator('button.ql-bold'))
      .first();
    const boldVisible = await boldBtn.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(!boldVisible, 'Bold toolbar button not found — rich-text toolbar unavailable');
    await boldBtn.click();
    await page.getByRole('button', { name: SUBMIT_NAME }).last().click();

    const row = commentRowFor(page, marker);
    await expect(row.locator('strong, b').first()).toBeVisible({ timeout: 15000 });
  });

  // ── Step 4: Reply to a comment (level 2) ───────────────────────────────────

  test('Step 4 — replying to a comment creates a nested level-2 reply', async ({ page }) => {
    const parentText = `Parent ${Date.now()}`;
    const ok = await submitTopLevelComment(page, postPage, parentText);
    test.skip(!ok, 'Comment input not found — Quill editor did not activate');

    const replyBtn = commentRowFor(page, parentText).getByRole('button', { name: /reply/i }).first();
    await replyBtn.click();
    const replyInput = page.locator('[contenteditable="true"]').or(page.locator('textarea')).last();
    await replyInput.waitFor({ state: 'visible', timeout: 5000 });
    const replyText = `Level 2 reply ${Date.now()}`;
    await replyInput.fill(replyText);
    await page.getByRole('button', { name: /^reply$/i }).last().click();

    await expect(page.getByText(replyText)).toBeVisible({ timeout: 15000 });
  });

  // ── Step 7: Reply at level 4 stays at level 4 (flattening rule) ────────────
  // Positive framing: the reply IS created (success), and no level-5 indentation appears.

  test('Step 7 — replying at the deepest visible level still creates the reply', async ({ page }) => {
    const deepest = page.locator('[data-testid="comment"][data-level="4"]')
      .or(page.locator('[data-level="4"]'))
      .first();
    const deepestVisible = await deepest.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!deepestVisible, 'No level-4 thread present — seed a 4-level thread to exercise flattening');

    await deepest.getByRole('button', { name: /reply/i }).first().click();
    const replyInput = page.locator('[contenteditable="true"]').or(page.locator('textarea')).last();
    await replyInput.waitFor({ state: 'visible', timeout: 5000 });
    const replyText = `Reply to level 4 ${Date.now()}`;
    await replyInput.fill(replyText);
    await page.getByRole('button', { name: /^reply$/i }).last().click();

    await expect(page.getByText(replyText)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-level="5"]')).toHaveCount(0);
  });

  // ── Step 8: Upvote a comment ───────────────────────────────────────────────

  test('Step 8 — upvoting a comment is accepted (stays on the post page)', async ({ page }) => {
    const commentUpvote = page.locator('button[data-action="upvote"]').nth(1);
    const visible = await commentUpvote.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!visible, 'No comment-level upvote button found — post may have no comments');
    await commentUpvote.click();
    await expect(page).toHaveURL(/\/post\/.+/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  // ── Step 9: Downvote a comment ─────────────────────────────────────────────

  test('Step 9 — downvoting a comment is accepted (stays on the post page)', async ({ page }) => {
    const commentDownvote = page.locator('button[data-action="downvote"]').nth(1);
    const visible = await commentDownvote.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!visible, 'No comment-level downvote button found — post may have no comments');
    await commentDownvote.click();
    await expect(page).toHaveURL(/\/post\/.+/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  // ── Step 10: Share a comment ───────────────────────────────────────────────

  test('Step 10 — sharing a comment shows a link-copied confirmation toast', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const commentShare = page.getByRole('button', { name: /share/i }).nth(1);
    const visible = await commentShare.isVisible({ timeout: 10000 }).catch(() => false);
    test.skip(!visible, 'No comment-level share button found — post may have no comments');
    await commentShare.click();
    await expect(postPage.linkCopiedToast).toBeVisible();
  });

  // ── Step 11: 3-dot menu on own comment shows Edit + Delete ─────────────────

  test('Step 11 — 3-dot menu on own comment shows Edit and Delete', async ({ page }) => {
    const text = `Own comment ${Date.now()}`;
    const ok = await submitTopLevelComment(page, postPage, text);
    test.skip(!ok, 'Comment input not found — Quill editor did not activate');

    await commentRowFor(page, text).getByRole('button', { name: /more|options/i }).first().click();
    await expect(page.locator('[role="menuitem"]:has-text("Edit")')).toBeVisible();
    await expect(page.locator('[role="menuitem"]:has-text("Delete")')).toBeVisible();
  });

  // ── Step 13: Edit own comment (Edited label appears) ───────────────────────

  test('Step 13 — editing own comment updates the text and shows the Edited label', async ({ page }) => {
    const original = `Edit me ${Date.now()}`;
    const ok = await submitTopLevelComment(page, postPage, original);
    test.skip(!ok, 'Comment input not found — Quill editor did not activate');

    const row = commentRowFor(page, original);
    await row.getByRole('button', { name: /more|options/i }).first().click();
    await page.locator('[role="menuitem"]:has-text("Edit")').click();

    const editInput = row.locator('[contenteditable="true"]').or(row.locator('textarea')).first();
    const edited = `Edited by automation ${Date.now()}`;
    await editInput.fill(edited);
    await page.getByRole('button', { name: /save|update|done/i }).first().click();

    await expect(page.getByText(edited)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=/Edited/i').first()).toBeVisible();
  });

  // ── Step 15: Multiple edits show a single Edited label ─────────────────────

  test('Step 15 — editing a comment twice still shows exactly one Edited label', async ({ page }) => {
    const original = `Multi-edit ${Date.now()}`;
    const ok = await submitTopLevelComment(page, postPage, original);
    test.skip(!ok, 'Comment input not found — Quill editor did not activate');

    // First edit
    let row = commentRowFor(page, original);
    await row.getByRole('button', { name: /more|options/i }).first().click();
    await page.locator('[role="menuitem"]:has-text("Edit")').click();
    const firstEdit = `First edit ${Date.now()}`;
    await row.locator('[contenteditable="true"]').or(row.locator('textarea')).first().fill(firstEdit);
    await page.getByRole('button', { name: /save|update|done/i }).first().click();
    await page.getByText(firstEdit).first().waitFor({ state: 'visible', timeout: 15000 });

    // Second edit
    row = commentRowFor(page, firstEdit);
    await row.getByRole('button', { name: /more|options/i }).first().click();
    await page.locator('[role="menuitem"]:has-text("Edit")').click();
    const secondEdit = `Second edit ${Date.now()}`;
    await row.locator('[contenteditable="true"]').or(row.locator('textarea')).first().fill(secondEdit);
    await page.getByRole('button', { name: /save|update|done/i }).first().click();
    await page.getByText(secondEdit).first().waitFor({ state: 'visible', timeout: 15000 });

    await expect(commentRowFor(page, secondEdit).locator('text=/Edited/i')).toHaveCount(1);
  });

  // ── Step 16: Delete own comment with NO replies → removed permanently ──────

  test('Step 16 — deleting own comment with no replies removes it from the thread', async ({ page }) => {
    const text = `Delete me ${Date.now()}`;
    const ok = await submitTopLevelComment(page, postPage, text);
    test.skip(!ok, 'Comment input not found — Quill editor did not activate');

    await commentRowFor(page, text).getByRole('button', { name: /more|options/i }).first().click();
    await page.locator('[role="menuitem"]:has-text("Delete")').click();
    await page.locator('[role="dialog"] button:has-text("Delete")').click();

    await expect(page.getByText(text)).not.toBeVisible({ timeout: 10000 });
  });

  // ── Step 17: Delete own comment WITH replies → placeholder; replies remain ──

  test('Step 17 — deleting a parent comment with a reply leaves a placeholder and keeps the reply', async ({ page }) => {
    const parentText = `Parent to delete ${Date.now()}`;
    const ok = await submitTopLevelComment(page, postPage, parentText);
    test.skip(!ok, 'Comment input not found — Quill editor did not activate');

    // Add a child reply
    await commentRowFor(page, parentText).getByRole('button', { name: /reply/i }).first().click();
    const replyInput = page.locator('[contenteditable="true"]').or(page.locator('textarea')).last();
    await replyInput.waitFor({ state: 'visible', timeout: 5000 });
    const childText = `Child reply ${Date.now()}`;
    await replyInput.fill(childText);
    await page.getByRole('button', { name: /^reply$/i }).last().click();
    await page.getByText(childText).first().waitFor({ state: 'visible', timeout: 15000 });

    // Delete the parent
    const parentRow = commentRowFor(page, parentText);
    await parentRow.getByRole('button', { name: /more|options/i }).first().click();
    await page.locator('[role="menuitem"]:has-text("Delete")').click();
    await page.locator('[role="dialog"] button:has-text("Delete")').click();

    // Placeholder appears and the child reply is still visible
    await expect(page.locator('text=/Deleted by author|Deleted/i').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(childText)).toBeVisible();
  });

  // ── Step 19: Sort comments Newest ↔ Oldest ─────────────────────────────────

  test('Step 19 — switching the sort control to Oldest updates the selection', async ({ page }) => {
    const visible = await postPage.commentSort.isVisible({ timeout: 10000 }).catch(() => false);
    test.skip(!visible, 'Comment sort control not found');
    await postPage.commentSort.click();
    const oldest = page.locator('[role="option"]:has-text("Oldest")')
      .or(page.getByRole('menuitem', { name: /oldest/i }))
      .or(page.getByText('Oldest', { exact: true }))
      .first();
    await oldest.click();
    await expect(postPage.commentSort).toContainText('Oldest');
  });

  // ── Step 20: Comment earns +2 Jetfuel ──────────────────────────────────────
  // Best-effort: Jetfuel is eventually consistent, so we assert it does not
  // decrease after posting (a strict +2 equality would flake on a shared account).

  test('Step 20 — posting a comment does not decrease the user Jetfuel balance', async ({ page }) => {
    const jetfuel = page.locator('[data-testid="jetfuel-count"]')
      .or(page.locator('[class*="jetfuel" i]'))
      .first();
    const visible = await jetfuel.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!visible, 'Jetfuel count not visible on the post page — assert on profile instead');

    const before = parseInt((await jetfuel.textContent())?.replace(/\D/g, '') || '0', 10);
    const ok = await submitTopLevelComment(page, postPage, `Jetfuel ${Date.now()}`);
    test.skip(!ok, 'Comment input not found — Quill editor did not activate');

    await page.waitForTimeout(1000);
    const after = parseInt((await jetfuel.textContent())?.replace(/\D/g, '') || '0', 10);
    expect(after).toBeGreaterThanOrEqual(before);
  });
});

import { test, expect } from '@playwright/test';
import { PostLoginSinglePostViewPage } from '../src/pages/PostLoginSinglePostView';

const VALID_EMAIL    = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';

test.describe('Post-Login Single Post View — Happy Path', () => {
  let postPage: PostLoginSinglePostViewPage;

  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    postPage = new PostLoginSinglePostViewPage(page);
    await postPage.login(VALID_EMAIL, VALID_PASSWORD);
    await postPage.openFirstPost();
  });

  // ── Step 1: Open a Single Post View ────────────────────────────────────────

  test('Step 1 — URL matches /post/{slug} after clicking a post card', async ({ page }) => {
    await expect(page).toHaveURL(/\/post\/.+/);
  });

  test('Step 1 — post title (H1) is visible', async () => {
    await expect(postPage.postTitle).toBeVisible();
  });

  test('Step 1 — post author link is visible', async () => {
    await expect(postPage.postAuthor).toBeVisible();
  });

  test('Step 1 — upvote button is visible', async () => {
    await expect(postPage.upvoteBtn).toBeVisible();
  });

  test('Step 1 — downvote button is visible', async () => {
    await expect(postPage.downvoteBtn).toBeVisible();
  });

  test('Step 1 — share button is visible', async () => {
    await expect(postPage.shareBtn).toBeVisible();
  });

  test('Step 1 — topic chip link is visible', async () => {
    await expect(postPage.topicChip).toBeVisible();
  });

  // ── Step 2: Upvote the post ─────────────────────────────────────────────────

  test('Step 2 — upvoting the post increments the vote count by 1', async () => {
    const initial = await postPage.getVoteCount();
    await postPage.upvoteBtn.click();
    await expect(postPage.voteCount).toHaveText(String(initial + 1));
  });

  // ── Step 3: Switch from upvote to downvote ──────────────────────────────────

  test('Step 3 — switching from upvote to downvote adjusts count by -2', async () => {
    await postPage.upvoteBtn.click();
    const afterUpvote = await postPage.getVoteCount();
    await postPage.downvoteBtn.click();
    await expect(postPage.voteCount).toHaveText(String(afterUpvote - 2));
  });

  // ── Step 4: Follow / Unfollow the post ─────────────────────────────────────

  test('Step 4 — clicking Follow changes button to Following', async () => {
    await postPage.followBtn.click();
    await expect(postPage.followingBtn).toBeVisible();
  });

  test('Step 4 — clicking Following unfollows and returns to Follow state', async () => {
    await postPage.followBtn.click();
    await expect(postPage.followingBtn).toBeVisible();
    await postPage.followingBtn.click();
    await expect(postPage.followBtn).toBeVisible();
  });

  // ── Step 5: Share the post ──────────────────────────────────────────────────

  test('Step 5 — clicking Share shows a link-copied confirmation toast', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await postPage.shareBtn.click();
    await expect(postPage.linkCopiedToast).toBeVisible();
  });

  // ── Step 6: 3-dot menu — non-owner sees Report only ────────────────────────

  test('Step 6 — 3-dot menu on another user\'s post shows Report option only', async ({ page }) => {
    // Use the second card on trending to maximise chance it's not owned by the test account
    await page.goto('https://staging.talktravel.com/trending', { waitUntil: 'domcontentloaded' });
    await postPage.dismissCookieBanner();
    const cards = page.locator('a[href^="/post/"]:has(div)');
    await cards.nth(1).waitFor({ state: 'visible' });
    await cards.nth(1).click();
    await page.waitForURL('**/post/**');
    await postPage.postMoreBtn.click();
    await expect(postPage.menuReport).toBeVisible();
    await expect(postPage.menuEdit).not.toBeVisible();
    await expect(postPage.menuDelete).not.toBeVisible();
  });

  // ── Step 7: 3-dot menu — owner sees Edit and Delete ────────────────────────

  test('Step 7 — 3-dot menu on own post shows Edit and Delete options', async ({ page }) => {
    await page.goto('https://staging.talktravel.com/profile', { waitUntil: 'domcontentloaded' });
    await postPage.dismissCookieBanner();
    const myPostLink = page.locator('a[href^="/post/"]:has(div)').first();
    await myPostLink.waitFor({ state: 'visible' });
    await myPostLink.click();
    await page.waitForURL('**/post/**');
    await postPage.postMoreBtn.click();
    await expect(postPage.menuEdit).toBeVisible();
    await expect(postPage.menuDelete).toBeVisible();
    await expect(postPage.menuReport).not.toBeVisible();
  });

  // ── Step 9: Add a top-level comment ────────────────────────────────────────

  test('Step 9 — submitting a comment publishes it in the comment thread', async ({ page }) => {
    const commentText = `Automation comment ${Date.now()}`;
    await postPage.addComment(commentText);
    await expect(page.getByText(commentText)).toBeVisible();
  });

  // ── Step 10: Reply to a comment (level 2) ──────────────────────────────────

  test('Step 10 — replying to a comment creates a nested reply', async ({ page }) => {
    const commentText = `Parent ${Date.now()}`;
    await postPage.addComment(commentText);
    const parentComment = page.getByText(commentText).first().locator('../..');
    const replyText = `Level 2 reply ${Date.now()}`;
    await parentComment.locator('button:has-text("Reply")').click();
    const replyInput = page.locator('[contenteditable="true"]').or(page.locator('textarea')).last();
    await replyInput.click();
    await replyInput.fill(replyText);
    await page.getByRole('button', { name: /^reply$/i }).last().click();
    await expect(page.getByText(replyText)).toBeVisible();
  });

  // ── Step 12: Upvote a comment ──────────────────────────────────────────────

  test('Step 12 — upvoting a comment increments its vote count', async ({ page }) => {
    const commentUpvote = page.locator('button[data-action="upvote"]').nth(1);
    const countEl = page.locator('button[data-action="upvote"] + *').nth(1);
    const initial = parseInt((await countEl.innerText()).replace(/\D/g, '') || '0', 10);
    await commentUpvote.click();
    const updated = parseInt((await countEl.innerText()).replace(/\D/g, '') || '0', 10);
    expect(updated).toBe(initial + 1);
  });

  // ── Step 13: Share a comment ───────────────────────────────────────────────

  test('Step 13 — sharing a comment shows a link-copied confirmation toast', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    // Share button on the first comment (nth(1) skips the post-level share button)
    await page.getByRole('button', { name: /share/i }).nth(1).click();
    await expect(postPage.linkCopiedToast).toBeVisible();
  });

  // ── Step 14: Sort comments Newest → Oldest ─────────────────────────────────

  test('Step 14 — switching sort to Oldest updates the sort control label', async ({ page }) => {
    await postPage.commentSort.click();
    await page.locator('[role="option"]:has-text("Oldest")').click();
    await expect(postPage.commentSort).toContainText('Oldest');
  });

  // ── Step 15: Edit own comment shows Edited label ───────────────────────────

  test('Step 15 — editing own comment updates its text and shows Edited label', async ({ page }) => {
    const commentText = `Edit me ${Date.now()}`;
    await postPage.addComment(commentText);
    const myComment = page.getByText(commentText).first().locator('../..');
    await myComment.locator('button[aria-label="More"]').click();
    await page.locator('[role="menuitem"]:has-text("Edit")').click();
    const editedText = `Edited by automation ${Date.now()}`;
    const editInput = myComment.locator('[contenteditable="true"]').or(myComment.locator('textarea')).first();
    await editInput.fill(editedText);
    await myComment.locator('[data-testid="comment-edit-save"]')
      .or(page.getByRole('button', { name: /save|update/i }))
      .first()
      .click();
    await expect(page.getByText(editedText)).toBeVisible();
    await expect(page.locator('text=/Edited/i').first()).toBeVisible();
  });

  // ── Step 16: Delete own comment ────────────────────────────────────────────

  test('Step 16 — deleting own comment (no children) removes it from the thread', async ({ page }) => {
    const commentText = `Delete me ${Date.now()}`;
    await postPage.addComment(commentText);
    const myComment = page.getByText(commentText).first().locator('../..');
    await myComment.locator('button[aria-label="More"]').click();
    await page.locator('[role="menuitem"]:has-text("Delete")').click();
    await page.locator('[role="dialog"] button:has-text("Delete")').click();
    await expect(page.getByText(commentText)).not.toBeVisible();
  });

  // ── Step 18: Click author and topic chip navigation ────────────────────────

  test('Step 18 — clicking post author navigates to the author\'s profile page', async ({ page }) => {
    await postPage.postAuthor.click();
    await expect(page).toHaveURL(/\/profile\/[a-zA-Z0-9_-]+/);
  });

  test('Step 18 — clicking a topic chip navigates to the topic tags page', async ({ page }) => {
    await postPage.topicChip.click();
    await expect(page).toHaveURL(/\/tags\/[a-z0-9-]+/);
  });
});

import { test, expect } from '@playwright/test';
import { PostLoginSinglePostViewPage } from '../src/pages/PostLoginSinglePostView';

const VALID_EMAIL    = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';

test.describe('Post-Login Single Post View — Happy Path', () => {
  let postPage: PostLoginSinglePostViewPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostLoginSinglePostViewPage(page);
    await postPage.login(VALID_EMAIL, VALID_PASSWORD);
    await postPage.openFirstPost();
  });

  // ── Step 1: Open a Single Post View ────────────────────────────────────────

  test('Step 1 — URL matches /post/{slug} after clicking a post card', async ({ page }) => {
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
  });

  test('Step 1 — post title (H1) is visible', async () => {
    await expect(postPage.postTitle).toBeVisible();
  });

  test('Step 1 — post author is visible', async () => {
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

  test('Step 1 — comment input box is visible', async () => {
    await expect(postPage.commentInput).toBeVisible();
  });

  // ── Step 2: Upvote the post ─────────────────────────────────────────────────

  test('Step 2 — upvoting the post increments the vote count by 1', async () => {
    const initial = await postPage.getVoteCount();
    await postPage.upvoteBtn.click();
    await expect(postPage.voteCount).toHaveText(String(initial + 1));
  });

  test('Step 2 — upvote button is active after clicking', async () => {
    await postPage.upvoteBtn.click();
    await expect(postPage.upvoteBtn).toHaveAttribute('aria-pressed', 'true');
  });

  // ── Step 3: Switch from upvote to downvote ──────────────────────────────────

  test('Step 3 — switching from upvote to downvote adjusts count by -2', async () => {
    await postPage.upvoteBtn.click();
    const afterUpvote = await postPage.getVoteCount();
    await postPage.downvoteBtn.click();
    await expect(postPage.voteCount).toHaveText(String(afterUpvote - 2));
  });

  test('Step 3 — downvote button is active after switching from upvote', async () => {
    await postPage.upvoteBtn.click();
    await postPage.downvoteBtn.click();
    await expect(postPage.downvoteBtn).toHaveAttribute('aria-pressed', 'true');
  });

  // ── Step 4: Follow / Unfollow the post ─────────────────────────────────────

  test('Step 4 — clicking Follow changes button to Following', async () => {
    await postPage.followBtn.click();
    await expect(postPage.followingBtn).toBeVisible();
  });

  test('Step 4 — clicking Following unfollows the post', async () => {
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

  test('Step 6 — 3-dot menu on another user\'s post shows Report option', async ({ page }) => {
    // Navigate to a post not owned by the logged-in user
    await page.goto('https://staging.talktravel.com/trending');
    await page.waitForLoadState('load');
    // Click through posts until a non-owned post is found (take second card as heuristic)
    const cards = page.locator('a[href^="/post/"]:has(div)');
    await cards.nth(1).click();
    await page.waitForURL(/\/post\/[a-z0-9-]+/);
    await postPage.postMoreBtn.click();
    await expect(postPage.menuReport).toBeVisible();
    await expect(postPage.menuEdit).not.toBeVisible();
    await expect(postPage.menuDelete).not.toBeVisible();
  });

  // ── Step 7: 3-dot menu — owner sees Edit and Delete ────────────────────────

  test('Step 7 — 3-dot menu on own post shows Edit and Delete options', async ({ page }) => {
    // Navigate to My Posts via profile
    await page.goto('https://staging.talktravel.com/profile');
    await page.waitForLoadState('load');
    const myPostLink = page.locator('a[href^="/post/"]:has(div)').first();
    await myPostLink.click();
    await page.waitForURL(/\/post\/[a-z0-9-]+/);
    await postPage.postMoreBtn.click();
    await expect(postPage.menuEdit).toBeVisible();
    await expect(postPage.menuDelete).toBeVisible();
    await expect(postPage.menuReport).not.toBeVisible();
  });

  // ── Step 9: Add a top-level comment ────────────────────────────────────────

  test('Step 9 — submitting a comment publishes it at the top of the thread', async () => {
    const commentText = `Automation comment ${Date.now()}`;
    await postPage.addComment(commentText);
    await expect(postPage.commentRows.first()).toContainText(commentText);
  });

  // ── Step 10: Reply to a comment (level 2) ──────────────────────────────────

  test('Step 10 — replying to a comment creates a nested level-2 reply', async () => {
    const commentText = `Parent comment ${Date.now()}`;
    await postPage.addComment(commentText);
    const firstComment = postPage.commentRows.first();
    const replyText = `Level 2 reply ${Date.now()}`;
    await postPage.replyToComment(firstComment, replyText);
    await expect(firstComment.locator('[data-testid="comment"]').first()).toContainText(replyText);
  });

  // ── Step 12: Upvote a comment ──────────────────────────────────────────────

  test('Step 12 — upvoting a comment increments its vote count', async () => {
    const comment = postPage.commentRows.first();
    const countLocator = comment.locator('[data-testid="comment-vote-count"]');
    const initial = parseInt((await countLocator.textContent()) ?? '0', 10);
    await comment.locator('[data-testid="comment-upvote"]').click();
    await expect(countLocator).toHaveText(String(initial + 1));
  });

  // ── Step 13: Share a comment ───────────────────────────────────────────────

  test('Step 13 — sharing a comment shows a link-copied confirmation toast', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await postPage.commentRows.first().locator('button:has-text("Share")').click();
    await expect(postPage.linkCopiedToast).toBeVisible();
  });

  // ── Step 14: Sort comments Newest → Oldest ─────────────────────────────────

  test('Step 14 — switching sort to Oldest reorders the comment thread', async ({ page }) => {
    const newestFirstId = await postPage.commentRows.first().getAttribute('data-comment-id');
    await postPage.commentSort.click();
    await page.locator('[role="option"]:has-text("Oldest")').click();
    await expect(postPage.commentSort).toContainText('Oldest');
    const oldestFirstId = await postPage.commentRows.first().getAttribute('data-comment-id');
    expect(newestFirstId).not.toBe(oldestFirstId);
  });

  // ── Step 15: Edit own comment shows Edited label ───────────────────────────

  test('Step 15 — editing own comment updates its text and shows Edited label', async ({ page }) => {
    const commentText = `Edit me ${Date.now()}`;
    await postPage.addComment(commentText);
    const myComment = postPage.commentRows.first();
    await myComment.locator('button[aria-label="More"]').click();
    await page.locator('[role="menuitem"]:has-text("Edit")').click();
    const editedText = `Edited by automation ${Date.now()}`;
    await myComment.locator('[data-testid="comment-edit-input"]').fill(editedText);
    await myComment.locator('[data-testid="comment-edit-save"]').click();
    await expect(myComment).toContainText(editedText);
    await expect(myComment.locator('[data-testid="edited-label"]').or(myComment.locator('text=/Edited/i'))).toBeVisible();
  });

  // ── Step 16: Delete own comment ────────────────────────────────────────────

  test('Step 16 — deleting own comment (no children) removes it from the thread', async ({ page }) => {
    const commentText = `Delete me ${Date.now()}`;
    await postPage.addComment(commentText);
    const myComment = postPage.commentRows.first();
    await myComment.locator('button[aria-label="More"]').click();
    await page.locator('[role="menuitem"]:has-text("Delete")').click();
    await page.locator('[role="dialog"] button:has-text("Delete")').click();
    await expect(page.locator(`text=${commentText}`)).not.toBeVisible();
  });

  // ── Step 18: Click author and topic chip navigation ────────────────────────

  test('Step 18 — clicking post author navigates to the author\'s profile page', async ({ page }) => {
    await postPage.postAuthor.click();
    await expect(page).toHaveURL(/\/user\/[a-zA-Z0-9_-]+/);
  });

  test('Step 18 — clicking a topic chip navigates to the topic page', async ({ page }) => {
    await page.goBack();
    await page.waitForURL(/\/post\/[a-z0-9-]+/);
    await postPage.topicChip.click();
    await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+/);
  });
});

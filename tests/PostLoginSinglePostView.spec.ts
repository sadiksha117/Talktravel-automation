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

  test('Step 2 — clicking upvote changes the vote count', async () => {
    const initial = await postPage.getVoteCount();
    await postPage.upvoteBtn.click();
    // Vote may increment or toggle off depending on prior state — assert it changed
    await expect(postPage.voteCount).not.toHaveAttribute('data-total', String(initial));
  });

  // ── Step 3: Switch from upvote to downvote ──────────────────────────────────

  test('Step 3 — clicking downvote after upvote changes the vote count', async () => {
    // Ensure in a known upvoted state first
    await postPage.upvoteBtn.click();
    await expect(postPage.voteCount).toBeVisible();
    const afterUpvote = await postPage.getVoteCount();
    await postPage.downvoteBtn.click();
    // After switching, count should differ from the upvoted value
    await expect(postPage.voteCount).not.toHaveAttribute('data-total', String(afterUpvote));
  });

  // ── Step 4: Follow / Unfollow the post ─────────────────────────────────────

  test('Step 4 — clicking Follow/Following toggles the follow state', async ({ page }) => {
    // Determine initial state and toggle
    const isFollowing = await postPage.followingBtn.isVisible({ timeout: 2000 }).catch(() => false);
    if (isFollowing) {
      // Already following — unfollow then follow again to verify toggle works
      await postPage.followingBtn.click();
      await expect(postPage.followBtn).toBeVisible({ timeout: 10000 });
      await postPage.followBtn.click();
      await expect(postPage.followingBtn).toBeVisible({ timeout: 10000 });
    } else {
      await postPage.followBtn.click();
      await expect(postPage.followingBtn).toBeVisible({ timeout: 10000 });
    }
  });

  // ── Step 5: Share the post ──────────────────────────────────────────────────

  test('Step 5 — clicking Share shows a link-copied confirmation toast', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await postPage.shareBtn.click();
    await expect(postPage.linkCopiedToast).toBeVisible();
  });

  // ── Step 6: 3-dot menu — non-owner sees Report only ────────────────────────

  test('Step 6 — 3-dot menu on another user\'s post shows Report option', async ({ page }) => {
    await page.goto('https://staging.talktravel.com/trending', { waitUntil: 'load' });
    await postPage.dismissCookieBanner();
    const cards = page.locator('a[href^="/post/"]:has(div)');
    await cards.nth(1).waitFor({ state: 'visible' });
    await cards.nth(1).click();
    await page.waitForURL('**/post/**', { timeout: 30000 });
    await postPage.postMoreBtn.click();
    await expect(postPage.menuReport).toBeVisible();
    await expect(postPage.menuEdit).not.toBeVisible();
    await expect(postPage.menuDelete).not.toBeVisible();
  });

  // ── Step 7: 3-dot menu — owner sees Edit and Delete ────────────────────────

  test('Step 7 — 3-dot menu on own post shows Edit and Delete options', async ({ page }) => {
    // Profile page post cards use .feed-post-item / a.feed-post-title-link
    await page.goto('https://staging.talktravel.com/profile', { waitUntil: 'load' });
    await postPage.dismissCookieBanner();
    // Try feed-post-title-link first, fall back to any post link
    const myPostLink = page.locator('a.feed-post-title-link, a[href*="/post/"]:has-text("")').first();
    await myPostLink.waitFor({ state: 'visible', timeout: 20000 });
    await myPostLink.click();
    await page.waitForURL('**/post/**', { timeout: 30000 });
    await postPage.postMoreBtn.click();
    await expect(postPage.menuEdit).toBeVisible();
    await expect(postPage.menuDelete).toBeVisible();
    await expect(postPage.menuReport).not.toBeVisible();
  });

  // ── Step 9: Add a top-level comment ────────────────────────────────────────

  test('Step 9 — submitting a comment publishes it in the comment thread', async ({ page }) => {
    const commentText = `Automation comment ${Date.now()}`;
    await postPage.addComment(commentText);
    await expect(page.getByText(commentText)).toBeVisible({ timeout: 15000 });
  });

  // ── Step 10: Reply to a comment (level 2) ──────────────────────────────────

  test('Step 10 — replying to a comment creates a nested reply', async ({ page }) => {
    // Add a parent comment first, then reply to it
    const parentText = `Parent ${Date.now()}`;
    await postPage.addComment(parentText);
    const parentEl = page.getByText(parentText).first();
    await expect(parentEl).toBeVisible({ timeout: 15000 });

    const replyText = `Level 2 reply ${Date.now()}`;
    // Click the Reply button associated with the parent comment
    const replyBtn = parentEl.locator('xpath=ancestor::*[5]').getByRole('button', { name: /reply/i }).first();
    await replyBtn.click();
    const replyInput = page.locator('[contenteditable]').or(page.locator('textarea')).last();
    await replyInput.waitFor({ state: 'visible', timeout: 5000 });
    await replyInput.fill(replyText);
    await page.getByRole('button', { name: /^reply$/i }).last().click();
    await expect(page.getByText(replyText)).toBeVisible({ timeout: 15000 });
  });

  // ── Step 12: Upvote a comment ──────────────────────────────────────────────

  test('Step 12 — upvoting a comment changes its vote count', async ({ page }) => {
    // Add a comment first to guarantee one exists
    const commentText = `Upvote target ${Date.now()}`;
    await postPage.addComment(commentText);
    await page.getByText(commentText).first().waitFor({ state: 'visible', timeout: 15000 });

    // The comment's upvote button is the last data-action="upvote" (post is first)
    const commentUpvote = page.locator('button[data-action="upvote"]').last();
    const commentCount  = page.locator('button[data-action="upvote"] + *').last();
    const initial = await commentCount.getAttribute('data-total').then(v => parseInt(v ?? '0', 10));
    await commentUpvote.click();
    await expect(commentCount).not.toHaveAttribute('data-total', String(initial));
  });

  // ── Step 13: Share a comment ───────────────────────────────────────────────

  test('Step 13 — sharing a comment shows a link-copied confirmation toast', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    // Share buttons: index 0 is the post share, index 1+ are comment shares
    const commentShareBtn = page.getByRole('button', { name: /share/i }).nth(1);
    await commentShareBtn.waitFor({ state: 'visible', timeout: 10000 });
    await commentShareBtn.click();
    await expect(postPage.linkCopiedToast).toBeVisible();
  });

  // ── Step 14: Sort comments Newest → Oldest ─────────────────────────────────

  test('Step 14 — switching sort to Oldest updates the sort control', async ({ page }) => {
    await postPage.commentSort.waitFor({ state: 'visible', timeout: 10000 });
    await postPage.commentSort.click();
    const oldestOption = page.locator('[role="option"]:has-text("Oldest")')
      .or(page.getByRole('menuitem', { name: /oldest/i }))
      .or(page.getByText('Oldest', { exact: true }))
      .first();
    await oldestOption.click();
    await expect(postPage.commentSort).toContainText('Oldest');
  });

  // ── Step 15: Edit own comment shows Edited label ───────────────────────────

  test('Step 15 — editing own comment updates text and shows Edited label', async ({ page }) => {
    const originalText = `Edit me ${Date.now()}`;
    await postPage.addComment(originalText);
    await page.getByText(originalText).first().waitFor({ state: 'visible', timeout: 15000 });

    const myCommentContainer = page.getByText(originalText).first().locator('xpath=ancestor::*[4]');
    await myCommentContainer.locator('button[aria-label="More"], button:has-text("More"), button[aria-label*="option" i]')
      .first().click();
    await page.locator('[role="menuitem"]:has-text("Edit")').click();

    const editInput = myCommentContainer.locator('[contenteditable]').or(myCommentContainer.locator('textarea')).first();
    const editedText = `Edited by automation ${Date.now()}`;
    await editInput.fill(editedText);
    await page.getByRole('button', { name: /save|update|done/i }).first().click();

    await expect(page.getByText(editedText)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=/Edited/i').first()).toBeVisible();
  });

  // ── Step 16: Delete own comment ────────────────────────────────────────────

  test('Step 16 — deleting own comment removes it from the thread', async ({ page }) => {
    const commentText = `Delete me ${Date.now()}`;
    await postPage.addComment(commentText);
    await page.getByText(commentText).first().waitFor({ state: 'visible', timeout: 15000 });

    const myCommentContainer = page.getByText(commentText).first().locator('xpath=ancestor::*[4]');
    await myCommentContainer.locator('button[aria-label="More"], button:has-text("More"), button[aria-label*="option" i]')
      .first().click();
    await page.locator('[role="menuitem"]:has-text("Delete")').click();
    await page.locator('[role="dialog"] button:has-text("Delete")').click();
    await expect(page.getByText(commentText)).not.toBeVisible({ timeout: 10000 });
  });

  // ── Step 18: Click author and topic chip navigation ────────────────────────

  test('Step 18 — clicking post author navigates to the author\'s profile page', async ({ page }) => {
    await postPage.postAuthor.click();
    await expect(page).toHaveURL(/\/profile\/.+/);
  });

  test('Step 18 — clicking a topic chip navigates to the topic tags page', async ({ page }) => {
    await postPage.topicChip.click();
    // URL pattern: /tags/{TopicName} or /tags/{TopicName}/trending — case insensitive slug
    await expect(page).toHaveURL(/\/tags\/.+/);
  });
});

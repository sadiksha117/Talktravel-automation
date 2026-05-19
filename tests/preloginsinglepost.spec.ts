import { expect, test } from '@playwright/test';
import { PreLoginSinglePostPage } from '../src/pages/preloginsinglepost';

test.describe('Flow 3 — Landing → Pre-Login Feed → Single Post View', () => {
  let flow3: PreLoginSinglePostPage;

  test.beforeEach(async ({ page }) => {
    flow3 = new PreLoginSinglePostPage(page);
    await flow3.goToLanding();
  });

  // ── Step 1: Landing page ─────────────────────────────────────────────────

  test('Step 1 — landing page loads at correct URL', async ({ page }) => {
    await expect(page).toHaveURL('https://talktravel.com/');
  });

  test('Step 1 — logo is visible in header', async () => {
    await expect(flow3.logo).toBeVisible();
  });

  test('Step 1 — header nav links are visible', async () => {
    await expect(flow3.headerCommunity).toBeVisible();
    await expect(flow3.headerBlog).toBeVisible();
    await expect(flow3.headerFaq).toBeVisible();
    await expect(flow3.headerLogIn).toBeVisible();
    await expect(flow3.headerJoinFree).toBeVisible();
  });

  test('Step 1 — hero heading is visible', async () => {
    await expect(flow3.heroHeading).toBeVisible();
  });

  test('Step 1 — hero subtext is visible', async () => {
    await expect(flow3.heroSubtext).toBeVisible();
  });

  test('Step 1 — Join the Community CTA is visible', async () => {
    await expect(flow3.joinCommunityBtn).toBeVisible();
  });

  test('Step 1 — Read the Blog CTA is visible', async () => {
    await expect(flow3.readTheBlogBtn).toBeVisible();
  });

  test('Step 1 — hero image is visible', async () => {
    await expect(flow3.heroImage).toBeVisible();
  });

  // ── Step 2: Pre-Login Feed (/trending) ───────────────────────────────────

  test('Step 2 — Community header link navigates to /trending', async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await expect(page).toHaveURL('https://talktravel.com/trending');
  });

  test('Step 2 — Trending and Latest feed tabs are visible', async () => {
    await flow3.goToFeedViaCommunityLink();
    await expect(flow3.feedTabTrending).toBeVisible();
    await expect(flow3.feedTabLatest).toBeVisible();
  });

  test('Step 2 — Card and Compact view toggles are visible', async () => {
    await flow3.goToFeedViaCommunityLink();
    await expect(flow3.viewToggleCard).toBeVisible();
    await expect(flow3.viewToggleCompact).toBeVisible();
  });

  test('Step 2 — feed contains at least one post card', async () => {
    await flow3.goToFeedViaCommunityLink();
    await expect(flow3.feedPostCards.first()).toBeVisible();
  });

  test('Step 2 — Popular This Week section is visible', async () => {
    await flow3.goToFeedViaCommunityLink();
    await expect(flow3.popularThisWeek).toBeVisible();
  });

  test('Step 2 — footer is visible on feed page', async () => {
    await flow3.goToFeedViaCommunityLink();
    await expect(flow3.footer).toBeVisible();
  });

  test('Step 2 — header persists on feed page', async () => {
    await flow3.goToFeedViaCommunityLink();
    await expect(flow3.headerCommunity).toBeVisible();
    await expect(flow3.headerBlog).toBeVisible();
    await expect(flow3.headerFaq).toBeVisible();
  });

  // ── Step 3: Single post view (/post/{id}) ────────────────────────────────

  test('Step 3 — clicking a post card navigates to /post/{id}', async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    await expect(page).toHaveURL(/https:\/\/talktravel\.com\/post\/.+/);
  });

  test('Step 3 — post title on single post page matches clicked card title', async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    const clickedTitle = await flow3.openFirstPostCard();
    const postPageTitle = await flow3.postTitle.innerText();
    expect(postPageTitle.trim()).toContain(clickedTitle.trim());
  });

  test('Step 3 — post content is visible', async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    await expect(flow3.postContent).toBeVisible();
  });

  test('Step 3 — vote section is visible', async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    await expect(flow3.voteSection).toBeVisible();
  });

  test('Step 3 — comments section is visible', async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    await expect(flow3.commentsSection).toBeVisible();
  });

  test('Step 3 — Share button is visible', async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    await expect(flow3.shareButton).toBeVisible();
  });

  test('Step 3 — Login button is visible (user is logged out)', async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    await expect(flow3.loginButton).toBeVisible();
  });

  test('Step 3 — header persists on single post page', async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    await expect(flow3.headerCommunity).toBeVisible();
    await expect(flow3.headerBlog).toBeVisible();
    await expect(flow3.headerFaq).toBeVisible();
  });

  test('Step 3 — footer is visible on single post page', async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    await expect(flow3.footer).toBeVisible();
  });

  // ── Full end-to-end happy path ───────────────────────────────────────────

  test('happy path — full flow Landing → Trending Feed → Single Post', async ({ page }) => {
    await expect(page).toHaveURL('https://talktravel.com/');
    await expect(flow3.heroHeading).toBeVisible();

    await flow3.goToFeedViaCommunityLink();
    await expect(page).toHaveURL('https://talktravel.com/trending');
    await expect(flow3.feedTabTrending).toBeVisible();
    await expect(flow3.feedPostCards.first()).toBeVisible();

    await flow3.openFirstPostCard();
    await expect(page).toHaveURL(/https:\/\/talktravel\.com\/post\/.+/);
    await expect(flow3.postTitle).toBeVisible();
  });
});

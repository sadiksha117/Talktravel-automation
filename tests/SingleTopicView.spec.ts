import { expect, test } from '@playwright/test';
import { SingleTopicViewPage } from '../src/pages/SingleTopicView';

test.describe('Single Topic View (Pre-Login) — Positive Flow', () => {
  let topicPage: SingleTopicViewPage;

  test.beforeEach(async ({ page }) => {
    topicPage = new SingleTopicViewPage(page);
    await topicPage.goToTopicViaHomepageChip();
  });

  // ── Step 1 — Enter topic page from Homepage ──────────────────────────────

  test('Step 1 — clicking topic chip from homepage navigates to /tags/{slug}', async ({ page }) => {
    await expect(page).toHaveURL(/\/tags\/.+/);
  });

  test('Step 1 — topic title (h1) is visible', async () => {
    await expect(topicPage.topicTitle).toBeVisible();
  });

  test('Step 1 — Follow Topic button is visible', async () => {
    await expect(topicPage.followTopicBtn).toBeVisible();
  });

  test('Step 1 — New Post button is visible', async () => {
    await expect(topicPage.newPostBtn).toBeVisible();
  });

  test('Step 1 — Trending sub-tab is visible', async () => {
    await expect(topicPage.tabTrending).toBeVisible();
  });

  test('Step 1 — Popular sub-tab is visible', async () => {
    await expect(topicPage.tabPopular).toBeVisible();
  });

  test('Step 1 — Latest sub-tab is visible', async () => {
    await expect(topicPage.tabLatest).toBeVisible();
  });

  test('Step 1 — header nav links are visible', async () => {
    await expect(topicPage.headerCommunity).toBeVisible();
    await expect(topicPage.headerBlog).toBeVisible();
    await expect(topicPage.headerFaq).toBeVisible();
    await expect(topicPage.headerLogIn).toBeVisible();
    await expect(topicPage.headerJoinFree).toBeVisible();
  });

  test('Step 1 — footer is visible', async () => {
    await expect(topicPage.footer).toBeVisible();
  });

  test('Step 1 — post list contains at least one post card', async () => {
    await expect(topicPage.postCards.first()).toBeVisible();
  });

  // ── Step 2 — Enter topic page from Single Post View ─────────────────────

  test('Step 2 — clicking topic chip from a post detail navigates to /tags/{slug}', async ({ page }) => {
    await topicPage.goToTopicViaPostChip();
    await expect(page).toHaveURL(/\/tags\/.+/);
  });

  test('Step 2 — topic title is visible when entering via post detail chip', async () => {
    await topicPage.goToTopicViaPostChip();
    await expect(topicPage.topicTitle).toBeVisible();
  });

  // ── Step 3 — Switch sub-tab (Trending → Popular) ────────────────────────

  test('Step 3 — clicking Popular sub-tab shows post cards', async () => {
    await topicPage.switchToPopularTab();
    await expect(topicPage.postCards.first()).toBeVisible();
  });

  test('Step 3 — Popular sub-tab is visible after switching', async () => {
    await topicPage.switchToPopularTab();
    await expect(topicPage.tabPopular).toBeVisible();
  });

  // ── Step 4 — Switch sub-tab (Popular → Latest) ──────────────────────────

  test('Step 4 — clicking Latest sub-tab shows post cards', async () => {
    await topicPage.switchToPopularTab();
    await topicPage.switchToLatestTab();
    await expect(topicPage.postCards.first()).toBeVisible();
  });

  test('Step 4 — Latest sub-tab is visible after switching', async () => {
    await topicPage.switchToLatestTab();
    await expect(topicPage.tabLatest).toBeVisible();
  });

  // ── Step 5 — Click a post in the topic post list ─────────────────────────

  test('Step 5 — clicking a post card navigates to /post/{slug}', async ({ page }) => {
    await topicPage.clickFirstPostCard();
    await expect(page).toHaveURL(/\/post\/.+/);
  });

  test('Step 5 — post title (h1) is visible on single post page', async () => {
    await topicPage.clickFirstPostCard();
    await expect(topicPage.topicTitle).toBeVisible();
  });

  test('Step 5 — header persists on single post page', async () => {
    await topicPage.clickFirstPostCard();
    await expect(topicPage.headerCommunity).toBeVisible();
    await expect(topicPage.headerBlog).toBeVisible();
    await expect(topicPage.headerFaq).toBeVisible();
  });

  // ── Step 6 — Topic-to-topic navigation ──────────────────────────────────

  // Known bug: clicking a topic chip inside a post does not navigate to the new topic page.
  test.fixme('Step 6 — clicking a topic chip inside a post navigates to a new topic page', async ({ page }) => {
    const firstTopicUrl = page.url();
    await topicPage.clickFirstPostCard();
    await expect(page).toHaveURL(/\/post\/.+/);
    const chip = page.locator('a[href^="/tags/"]').nth(1);
    await chip.waitFor({ state: 'visible' });
    await chip.click();
    await page.waitForURL(/\/tags\/.+/);
    await expect(page).toHaveURL(/\/tags\/.+/);
    expect(page.url()).not.toBe(firstTopicUrl);
  });

  // Known bug: relies on topic-to-topic navigation via chip click, which currently does not work.
  test.fixme('Step 6 — new topic page renders topic title after topic-to-topic navigation', async ({ page }) => {
    await topicPage.clickFirstPostCard();
    const chip = page.locator('a[href^="/tags/"]').nth(1);
    await chip.waitFor({ state: 'visible' });
    await chip.click();
    await page.waitForURL(/\/tags\/.+/);
    await expect(topicPage.topicTitle).toBeVisible();
  });

  // ── Step 7 — Gated action: Follow Topic → redirect to Login ─────────────

  test('Step 7 — clicking Follow Topic redirects to /login', async ({ page }) => {
    await topicPage.clickFollowTopic();
    await expect(page).toHaveURL(/\/login/);
  });

  // ── Step 8 — Gated action: + New Post → redirect to Login ───────────────

  test('Step 8 — clicking New Post redirects to /login', async ({ page }) => {
    await topicPage.clickNewPost();
    await expect(page).toHaveURL(/\/login/);
  });

  // ── Step 9 — Gated action: Vote → redirect to Login ─────────────────────

  test('Step 9 — clicking Upvote redirects to /login', async ({ page }) => {
    await topicPage.clickUpvote();
    await expect(page).toHaveURL(/\/login/);
  });

  // ── Step 10 — Back navigation preserves sub-tab state ───────────────────

  test('Step 10 — browser back from a post returns to /tags/{slug}', async ({ page }) => {
    await topicPage.switchToLatestTab();
    await topicPage.clickFirstPostCard();
    await expect(page).toHaveURL(/\/post\/.+/);
    await page.goBack();
    await expect(page).toHaveURL(/\/tags\/.+/);
  });

  test('Step 10 — Latest sub-tab is still visible after navigating back', async ({ page }) => {
    await topicPage.switchToLatestTab();
    await topicPage.clickFirstPostCard();
    await page.goBack();
    await expect(topicPage.tabLatest).toBeVisible();
  });

  // ── Full end-to-end happy path ───────────────────────────────────────────

  test('Full happy path — homepage chip → sub-tabs → post click → back → gated actions', async ({ page }) => {
    // Step 1 — on topic page from homepage chip
    await expect(page).toHaveURL(/\/tags\/.+/);
    await expect(topicPage.topicTitle).toBeVisible();
    await expect(topicPage.postCards.first()).toBeVisible();

    // Step 3 — switch to Popular
    await topicPage.switchToPopularTab();
    await expect(topicPage.postCards.first()).toBeVisible();

    // Step 4 — switch to Latest
    await topicPage.switchToLatestTab();
    await expect(topicPage.postCards.first()).toBeVisible();

    // Step 5 — click first post card
    await topicPage.clickFirstPostCard();
    await expect(page).toHaveURL(/\/post\/.+/);
    await expect(topicPage.topicTitle).toBeVisible();

    // Step 10 — back returns to topic page
    await page.goBack();
    await expect(page).toHaveURL(/\/tags\/.+/);
    await expect(topicPage.tabLatest).toBeVisible();

    // Step 7 — Follow Topic → /login
    await topicPage.clickFollowTopic();
    await expect(page).toHaveURL(/\/login/);
    await page.goBack();

    // Step 8 — New Post → /login
    await topicPage.clickNewPost();
    await expect(page).toHaveURL(/\/login/);
    await page.goBack();

    // Step 9 — Upvote → /login
    await topicPage.clickUpvote();
    await expect(page).toHaveURL(/\/login/);
  });
});

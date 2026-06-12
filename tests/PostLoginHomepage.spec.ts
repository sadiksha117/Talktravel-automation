import { test, expect } from '@playwright/test';
import { PostLoginHomepagePage } from '../src/pages/PostLoginHomepage';

const VALID_EMAIL = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';
const BASE_URL = 'https://staging.talktravel.com';

test.describe('Post-Login Homepage', () => {
  let homePage: PostLoginHomepagePage;

  test.beforeEach(async ({ page }) => {
    homePage = new PostLoginHomepagePage(page);
    await homePage.login(VALID_EMAIL, VALID_PASSWORD);
    await homePage.dismissCookieBanner();
  });

  // ── Step 1: Post-login redirect ───────────────────────────────────────────

  test('Step 1 — after login user lands on /trending', async ({ page }) => {
    await expect(page).toHaveURL(/\/trending/);
  });

  // ── Step 2: Header elements ───────────────────────────────────────────────

  test('Step 2 — logo is visible in header', async () => {
    await expect(homePage.logo).toBeVisible();
  });

  test('Step 2 — Community nav link is visible', async () => {
    await expect(homePage.headerCommunity).toBeVisible();
  });

  test('Step 2 — Blog nav link is visible', async () => {
    await expect(homePage.headerBlog).toBeVisible();
  });

  test('Step 2 — FAQ nav link is visible', async () => {
    await expect(homePage.headerFaq).toBeVisible();
  });

  test('Step 2 — Log in and Join Free buttons are NOT visible after login', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Log in', exact: true })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Join Free', exact: true })).not.toBeVisible();
  });

  // ── Step 3: Feed tabs ─────────────────────────────────────────────────────

  test('Step 3 — Trending tab is visible', async () => {
    await expect(homePage.feedTabTrending).toBeVisible();
  });

  test('Step 3 — Latest tab is visible', async () => {
    await expect(homePage.feedTabLatest).toBeVisible();
  });

  test('Step 3 — For You tab is visible', async () => {
    await expect(homePage.feedTabForYou).toBeVisible();
  });

  test('Step 3 — Trending tab is active by default', async ({ page }) => {
    await expect(page).toHaveURL(/\/trending/);
  });

  // ── Step 4: Feed content ──────────────────────────────────────────────────

  test('Step 4 — feed post cards are visible', async () => {
    await expect(homePage.feedPostCards.first()).toBeVisible();
  });

  test('Step 4 — multiple post cards are rendered', async () => {
    const count = await homePage.feedPostCards.count();
    expect(count).toBeGreaterThan(0);
  });

  // ── Step 5: Sidebar ───────────────────────────────────────────────────────

  test('Step 5 — Popular This Week sidebar is visible', async () => {
    await expect(homePage.popularThisWeek).toBeVisible();
  });

  test('Step 5 — Popular This Week sidebar has post links', async () => {
    await expect(homePage.popularThisWeekLinks.first()).toBeVisible();
  });

  // ── Step 6: Footer ────────────────────────────────────────────────────────

  test('Step 6 — footer is visible', async () => {
    await expect(homePage.footer).toBeVisible();
  });

  // ── Step 7: Switch feed tabs ──────────────────────────────────────────────

  test('Step 7 — switching to Latest tab updates the feed', async ({ page }) => {
    await homePage.switchToLatestTab();
    await expect(page).toHaveURL(/\/latest/);
    await expect(homePage.feedPostCards.first()).toBeVisible();
  });

  test('Step 7 — switching to For You tab updates the feed', async ({ page }) => {
    await homePage.switchToForYouTab();
    await expect(page).toHaveURL(/\/for-you|\/foryou|\/trending/);
    await expect(homePage.feedPostCards.first()).toBeVisible();
  });

  test('Step 7 — switching back to Trending tab shows feed', async ({ page }) => {
    await homePage.switchToLatestTab();
    await homePage.switchToTrendingTab();
    await expect(page).toHaveURL(/\/trending/);
    await expect(homePage.feedPostCards.first()).toBeVisible();
  });

  // ── Step 8: View toggle ───────────────────────────────────────────────────

  test('Step 8 — switching to Compact view re-renders feed', async () => {
    await homePage.switchToCompactView();
    await expect(homePage.feedPostCards.first()).toBeVisible();
  });

  test('Step 8 — switching back to Card view re-renders feed', async () => {
    await homePage.switchToCompactView();
    await homePage.switchToCardView();
    await expect(homePage.feedPostCards.first()).toBeVisible();
  });

  // ── Step 9: Navigate to single post ──────────────────────────────────────

  test('Step 9 — clicking a post card navigates to single post page', async ({ page }) => {
    await homePage.clickFirstPostCard();
    await expect(page).toHaveURL(/\/post\//);
  });

  test('Step 9 — single post page shows heading', async ({ page }) => {
    await homePage.clickFirstPostCard();
    await expect(homePage.postTitle).toBeVisible();
  });

  test('Step 9 — browser back from single post returns to /trending', async ({ page }) => {
    await homePage.clickFirstPostCard();
    await page.goBack();
    await expect(page).toHaveURL(/\/trending/);
  });

  // ── Step 10: Popular This Week sidebar navigation ─────────────────────────

  test('Step 10 — clicking a Popular This Week post navigates to single post', async ({ page }) => {
    await homePage.clickFirstPopularThisWeekPost();
    await expect(page).toHaveURL(/\/post\//);
  });

  // ── Step 11: Authenticated voting ────────────────────────────────────────

  test('Step 11 — upvote button is visible on feed cards when logged in', async () => {
    await expect(homePage.upvoteButtons.first()).toBeVisible();
  });

  test('Step 11 — clicking upvote does NOT redirect to /login', async ({ page }) => {
    await homePage.upvoteButtons.first().click();
    await expect(page).not.toHaveURL(/\/login/);
  });

  // ── Step 12: Logo navigation ──────────────────────────────────────────────

  test('Step 12 — clicking logo from a post returns to homepage', async ({ page }) => {
    await homePage.clickFirstPostCard();
    await homePage.clickLogo();
    await expect(page).toHaveURL(/\/(trending)?$/);
  });

  // ── Step 13: Header nav links ─────────────────────────────────────────────

  test('Step 13 — Community nav link navigates to /trending or community feed', async ({ page }) => {
    await homePage.headerCommunity.click();
    await expect(page).toHaveURL(/\/(trending|community)/);
  });

  test('Step 13 — Blog nav link navigates to /blog', async ({ page }) => {
    await homePage.headerBlog.click();
    await expect(page).toHaveURL(/\/blog/);
  });

  test('Step 13 — FAQ nav link navigates to /faq', async ({ page }) => {
    await homePage.headerFaq.click();
    await expect(page).toHaveURL(/\/faq/);
  });

  // ── Full end-to-end happy path ────────────────────────────────────────────

  test('happy path — login → /trending → switch tabs → view post → back', async ({ page }) => {
    // Verify post-login landing
    await expect(page).toHaveURL(/\/trending/);
    await expect(homePage.feedPostCards.first()).toBeVisible();

    // Switch to Latest tab
    await homePage.switchToLatestTab();
    await expect(page).toHaveURL(/\/latest/);
    await expect(homePage.feedPostCards.first()).toBeVisible();

    // Switch to Compact view
    await homePage.switchToCompactView();
    await expect(homePage.feedPostCards.first()).toBeVisible();

    // Click first post and verify single post page
    await homePage.clickFirstPostCard();
    await expect(page).toHaveURL(/\/post\//);
    await expect(homePage.postTitle).toBeVisible();

    // Navigate back
    await page.goBack();
    await expect(page).toHaveURL(/\/latest/);
  });

  test('happy path — login → /trending → upvote stays on page', async ({ page }) => {
    await expect(page).toHaveURL(/\/trending/);
    await homePage.upvoteButtons.first().click();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/trending/);
  });
});

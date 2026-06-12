import { test, expect } from '@playwright/test';
import { PostLoginHomepagePage } from '../src/pages/PostLoginHomepage';

const VALID_EMAIL = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';

test.describe('Post-Login Homepage', () => {
  let homePage: PostLoginHomepagePage;

  test.beforeEach(async ({ page }) => {
    homePage = new PostLoginHomepagePage(page);
    await homePage.login(VALID_EMAIL, VALID_PASSWORD);
    await homePage.goToHomepage();
  });

  // ── Step 1: Land on Homepage after login ──────────────────────────────────

  test('Step 1 — homepage loads at /trending URL after login', async ({ page }) => {
    await expect(page).toHaveURL(/\/trending$/);
  });

  test('Step 1 — logo is visible in header', async () => {
    await expect(homePage.logo).toBeVisible();
  });

  test('Step 1 — Community nav link is visible', async () => {
    await expect(homePage.headerCommunity).toBeVisible();
  });

  test('Step 1 — Blog nav link is visible', async () => {
    await expect(homePage.headerBlog).toBeVisible();
  });

  test('Step 1 — FAQ nav link is visible', async () => {
    await expect(homePage.headerFaq).toBeVisible();
  });

  test('Step 1 — Trending tab is visible', async () => {
    await expect(homePage.feedTabTrending).toBeVisible();
  });

  test('Step 1 — Latest tab is visible', async () => {
    await expect(homePage.feedTabLatest).toBeVisible();
  });

  test('Step 1 — For You tab is visible', async () => {
    await expect(homePage.feedTabForYou).toBeVisible();
  });

  test('Step 1 — feed contains at least one post card', async () => {
    await expect(homePage.feedPostCards.first()).toBeVisible();
  });

  test('Step 1 — Popular This Week sidebar heading is visible', async () => {
    await expect(homePage.popularThisWeek).toBeVisible();
  });

  test('Step 1 — footer is visible', async () => {
    await expect(homePage.footer).toBeVisible();
  });

  test('Step 1 — view switch menu button is visible', async () => {
    await expect(homePage.viewSwitchMenuBtn).toBeVisible();
  });

  // ── Step 2: Switch tab Trending → Latest ──────────────────────────────────

  test('Step 2 — clicking Latest tab shows Latest tab as visible', async () => {
    await homePage.switchToLatestTab();
    await expect(homePage.feedTabLatest).toBeVisible();
  });

  test('Step 2 — feed cards are visible after switching to Latest', async () => {
    await homePage.switchToLatestTab();
    await expect(homePage.feedPostCards.first()).toBeVisible();
  });

  // ── Step 3: Switch tab → For You ─────────────────────────────────────────

  test('Step 3 — clicking For You tab shows feed cards', async () => {
    await homePage.switchToForYouTab();
    await expect(homePage.feedPostCards.first()).toBeVisible();
  });

  test('Step 3 — switching back to Trending shows feed cards', async () => {
    await homePage.switchToForYouTab();
    await homePage.switchToTrendingTab();
    await expect(homePage.feedPostCards.first()).toBeVisible();
  });

  // ── Step 4: Toggle view Card → Compact ───────────────────────────────────

  test('Step 4 — switching to Compact view re-renders feed', async () => {
    await homePage.switchToCompactView();
    await expect(homePage.feedPostCards.first()).toBeVisible();
  });

  test('Step 4 — switching back to Card view re-renders feed', async () => {
    await homePage.switchToCompactView();
    await homePage.switchToCardView();
    await expect(homePage.feedPostCards.first()).toBeVisible();
  });

  // ── Step 5: Persistence check ─────────────────────────────────────────────

  test('Step 5 — feed cards still visible after page reload', async ({ page }) => {
    await page.reload();
    await expect(homePage.feedPostCards.first()).toBeVisible();
  });

  test('Step 5 — page remains on /trending after reload', async ({ page }) => {
    await page.reload();
    await expect(page).toHaveURL(/\/trending$/);
  });

  // ── Step 6: Upvote ────────────────────────────────────────────────────────

  test('Step 6 — upvote button is visible on feed', async () => {
    await expect(homePage.firstUpvoteBtn).toBeVisible();
  });

  test('Step 6 — clicking upvote does not redirect to /login', async ({ page }) => {
    await homePage.firstUpvoteBtn.click();
    await expect(page).not.toHaveURL(/\/login/);
  });

  // ── Step 7: Downvote ──────────────────────────────────────────────────────

  test('Step 7 — downvote button is visible on feed', async () => {
    await expect(homePage.firstDownvoteBtn).toBeVisible();
  });

  test('Step 7 — clicking downvote does not redirect to /login', async ({ page }) => {
    await homePage.firstDownvoteBtn.click();
    await expect(page).not.toHaveURL(/\/login/);
  });

  // ── Step 9: Click a post card ─────────────────────────────────────────────

  test('Step 9 — clicking a post card navigates to /post/{slug}', async ({ page }) => {
    await homePage.clickFirstPostCard();
    await expect(page).toHaveURL(/\/post\/.+/);
  });

  test('Step 9 — single post page shows h1 heading', async () => {
    await homePage.clickFirstPostCard();
    await expect(homePage.postTitle).toBeVisible();
  });

  test('Step 9 — browser back from single post returns to /trending', async ({ page }) => {
    await homePage.clickFirstPostCard();
    await page.goBack();
    await expect(page).toHaveURL(/\/trending/);
  });

  // ── Step 10: Click a topic chip ───────────────────────────────────────────

  test('Step 10 — clicking a topic chip navigates to /tags/{slug}', async ({ page }) => {
    await homePage.clickFirstTopicChip();
    await expect(page).toHaveURL(/\/tags\/.+/);
  });

  // ── Step 11: Click author link ────────────────────────────────────────────

  test('Step 11 — clicking author link navigates to user profile', async ({ page }) => {
    await homePage.clickFirstAuthorLink();
    await expect(page).toHaveURL(/\/profile\/.+/);
  });

  // ── Step 15: Popular This Week sidebar ───────────────────────────────────

  test('Step 15 — clicking Popular This Week post navigates to /post/{slug}', async ({ page }) => {
    await homePage.clickFirstPopularThisWeekPost();
    await expect(page).toHaveURL(/\/post\/.+/);
  });

  // ── Step 17: Logo click ───────────────────────────────────────────────────

  test('Step 17 — logo click from single post returns to homepage', async ({ page }) => {
    await homePage.clickFirstPostCard();
    await homePage.clickLogo();
    await expect(page).toHaveURL(/\/(trending)?$/);
  });

  // ── Full end-to-end happy path ────────────────────────────────────────────

  test('happy path — login → trending → switch tabs → view toggle → post → back', async ({ page }) => {
    await expect(page).toHaveURL(/\/trending$/);
    await expect(homePage.feedPostCards.first()).toBeVisible();

    await homePage.switchToLatestTab();
    await expect(homePage.feedTabLatest).toBeVisible();
    await expect(homePage.feedPostCards.first()).toBeVisible();

    await homePage.switchToCompactView();
    await expect(homePage.feedPostCards.first()).toBeVisible();

    await homePage.clickFirstPostCard();
    await expect(page).toHaveURL(/\/post\/.+/);
    await expect(homePage.postTitle).toBeVisible();

    await homePage.clickLogo();
    await expect(page).toHaveURL(/\/(trending)?$/);
  });

  test('happy path — upvote and downvote stay on homepage', async ({ page }) => {
    await expect(page).toHaveURL(/\/trending$/);

    await homePage.firstUpvoteBtn.click();
    await expect(page).not.toHaveURL(/\/login/);

    await homePage.firstDownvoteBtn.click();
    await expect(page).not.toHaveURL(/\/login/);
  });
});

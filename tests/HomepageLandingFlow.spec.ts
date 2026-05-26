import { expect, test } from '@playwright/test';
import { HomepageLandingFlowPage } from '../src/pages/HomepageLandingFlow';

test.describe('Homepage / Trending Landing Flow (Pre-Login) — Happy Path', () => {
  let flow: HomepageLandingFlowPage;

  test.beforeEach(async ({ page }) => {
    flow = new HomepageLandingFlowPage(page);
    await flow.goToHomepage();
  });

  // ── Step 1 — Land on homepage ────────────────────────────────────────────

  test('Step 1 — homepage loads at /trending URL', async ({ page }) => {
    await expect(page).toHaveURL(/\/trending$/);
  });

  test('Step 1 — logo is visible in header', async () => {
    await expect(flow.logo).toBeVisible();
  });

  test('Step 1 — header nav links are visible (Community, Blog, FAQ, Log in, Join Free)', async () => {
    await expect(flow.headerCommunity).toBeVisible();
    await expect(flow.headerBlog).toBeVisible();
    await expect(flow.headerFaq).toBeVisible();
    await expect(flow.headerLogIn).toBeVisible();
    await expect(flow.headerJoinFree).toBeVisible();
  });

  test('Step 1 — Trending tab is visible and active by default', async () => {
    await expect(flow.feedTabTrending).toBeVisible();
    await expect(flow.feedTabLatest).toBeVisible();
  });

  test('Step 1 — feed contains at least one post card', async () => {
    await expect(flow.feedPostCards.first()).toBeVisible();
  });

  test('Step 1 — Popular This Week sidebar is visible', async () => {
    await expect(flow.popularThisWeek).toBeVisible();
  });

  test('Step 1 — footer is visible', async () => {
    await expect(flow.footer).toBeVisible();
  });

  // ── Step 2 — Switch feed tab (Trending → Latest) ─────────────────────────

  test('Step 2 — clicking Latest tab switches the active tab', async () => {
    await flow.switchToLatestTab();
    await expect(flow.feedTabLatest).toBeVisible();
  });

  test('Step 2 — feed still contains post cards after switching to Latest', async () => {
    await flow.switchToLatestTab();
    await expect(flow.feedPostCards.first()).toBeVisible();
  });

  test('Step 2 — switching back to Trending tab shows post cards', async () => {
    await flow.switchToLatestTab();
    await flow.switchToTrendingTab();
    await expect(flow.feedPostCards.first()).toBeVisible();
  });

  // ── Step 3 — Toggle view mode (Card → Compact) ───────────────────────────

  test('Step 3 — Compact view toggle is visible', async () => {
    await expect(flow.compactViewToggle).toBeVisible();
  });

  test('Step 3 — clicking Compact view toggle re-renders feed', async () => {
    await flow.switchToCompactView();
    await expect(flow.feedPostCards.first()).toBeVisible();
  });

  test('Step 3 — switching back to Card view shows post cards', async () => {
    await flow.switchToCompactView();
    await flow.switchToCardView();
    await expect(flow.feedPostCards.first()).toBeVisible();
  });

  // ── Step 4 — Persistence check (refresh) ────────────────────────────────

  test('Step 4 — page remains on /trending after reload', async ({ page }) => {
    await page.reload();
    await expect(page).toHaveURL(/\/trending$/);
  });

  test('Step 4 — feed cards still visible after page reload', async () => {
    await flow.goToHomepage();
    await expect(flow.feedPostCards.first()).toBeVisible();
  });

  // ── Step 5 — Click a post card ───────────────────────────────────────────

  test('Step 5 — clicking a post card navigates to /post/{slug}', async ({ page }) => {
    await flow.clickFirstPostCard();
    await expect(page).toHaveURL(/\/post\/.+/);
  });

  test('Step 5 — post title (h1) is visible on single post page', async () => {
    await flow.clickFirstPostCard();
    await expect(flow.postTitle).toBeVisible();
  });

  test('Step 5 — header persists on single post page', async () => {
    await flow.clickFirstPostCard();
    await expect(flow.headerCommunity).toBeVisible();
    await expect(flow.headerBlog).toBeVisible();
    await expect(flow.headerFaq).toBeVisible();
  });

  test('Step 5 — footer is visible on single post page', async () => {
    await flow.clickFirstPostCard();
    await expect(flow.footer).toBeVisible();
  });

  // ── Step 6 — Click a topic chip ──────────────────────────────────────────

  test('Step 6 — clicking a topic chip navigates to /topic/{slug}', async ({ page }) => {
    await flow.clickFirstTopicChip();
    await expect(page).toHaveURL(/\/topic\/.+/);
  });

  // ── Step 7 — Click an author username / avatar ───────────────────────────

  test('Step 7 — clicking an author link navigates to /user/{username}', async ({ page }) => {
    await flow.clickFirstAuthorLink();
    await expect(page).toHaveURL(/\/user\/.+/);
  });

  // ── Step 9 — Click a post in Popular This Week sidebar ───────────────────

  test('Step 9 — clicking a Popular This Week post navigates to /post/{slug}', async ({ page }) => {
    await flow.clickFirstPopularThisWeekPost();
    await expect(page).toHaveURL(/\/post\/.+/);
  });

  // ── Step 10 — Logo click returns to /trending ────────────────────────────

  test('Step 10 — clicking logo from a post page returns to /trending', async ({ page }) => {
    await flow.clickFirstPostCard();
    await flow.clickLogo();
    await expect(page).toHaveURL(/\/trending$/);
  });

  // ── Full end-to-end happy path ───────────────────────────────────────────

  test('Full happy path — land → switch tab → toggle view → click post → back to trending', async ({ page }) => {
    // Step 1 — verify landing
    await expect(page).toHaveURL(/\/trending$/);
    await expect(flow.feedTabTrending).toBeVisible();
    await expect(flow.feedPostCards.first()).toBeVisible();

    // Step 2 — switch to Latest tab
    await flow.switchToLatestTab();
    await expect(flow.feedTabLatest).toBeVisible();
    await expect(flow.feedPostCards.first()).toBeVisible();

    // Step 3 — toggle to Compact view
    await flow.switchToCompactView();
    await expect(flow.feedPostCards.first()).toBeVisible();

    // Step 5 — click first post card
    await flow.clickFirstPostCard();
    await expect(page).toHaveURL(/\/post\/.+/);
    await expect(flow.postTitle).toBeVisible();

    // Step 10 — logo returns to /trending
    await flow.clickLogo();
    await expect(page).toHaveURL(/\/trending$/);
  });
});

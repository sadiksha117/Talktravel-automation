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
    await homePage.goToHomepage();
    await homePage.dismissCookieBanner();
  });

  // ── Step 1: Land on Homepage after login ──────────────────────────────────

  test('Step 1 — homepage loads at correct URL after login', async ({ page }) => {
    await expect(page).toHaveURL(/\/(trending)?$/);
  });

  test('Step 1 — Create Post button is visible', async () => {
    await expect(homePage.createPostBtn).toBeVisible();
  });

  test('Step 1 — notifications bell is visible', async () => {
    await expect(homePage.notificationsBell).toBeVisible();
  });

  test('Step 1 — profile avatar is visible in header', async () => {
    await expect(homePage.headerAvatar).toBeVisible();
  });

  test('Step 1 — left navigation is visible', async () => {
    await expect(homePage.leftNav).toBeVisible();
  });

  test('Step 1 — Trending tab is active by default', async () => {
    await expect(homePage.feedTabTrending).toHaveAttribute('aria-selected', 'true');
  });

  test('Step 1 — For You tab is visible', async () => {
    await expect(homePage.feedTabForYou).toBeVisible();
  });

  test('Step 1 — feed post cards are visible', async () => {
    await expect(homePage.feedPostCards.first()).toBeVisible();
  });

  test('Step 1 — Popular This Week sidebar is visible', async () => {
    await expect(homePage.popularThisWeek).toBeVisible();
  });

  test('Step 1 — footer is visible', async () => {
    await expect(homePage.footer).toBeVisible();
  });

  // ── Step 2: Switch tab Trending → Latest ──────────────────────────────────

  test('Step 2 — clicking Latest tab makes it active', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Latest")').click();
    await expect(page.locator('[role="tab"]:has-text("Latest")')).toHaveAttribute('aria-selected', 'true');
  });

  test('Step 2 — feed cards are visible after switching to Latest', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Latest")').click();
    await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible();
  });

  // ── Step 3: Switch tab Latest → For You ───────────────────────────────────

  test('Step 3 — clicking For You tab makes it active', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("For You")').click();
    await expect(page.locator('[role="tab"]:has-text("For You")')).toHaveAttribute('aria-selected', 'true');
  });

  test('Step 3 — feed cards are visible after switching to For You', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("For You")').click();
    await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible();
  });

  // ── Step 4: Toggle view Card → Compact ───────────────────────────────────

  test('Step 4 — clicking Compact view toggle makes it active', async ({ page }) => {
    await page.locator('button[aria-label="Compact view"]').click();
    await expect(page.locator('button[aria-label="Compact view"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Step 4 — feed cards are visible in Compact view', async ({ page }) => {
    await page.locator('button[aria-label="Compact view"]').click();
    await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible();
  });

  // ── Step 5: Persistence check ─────────────────────────────────────────────

  test('Step 5 — For You tab persists after page reload', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("For You")').click();
    await page.locator('button[aria-label="Compact view"]').click();
    await page.reload();
    await expect(page.locator('[role="tab"]:has-text("For You")')).toHaveAttribute('aria-selected', 'true');
  });

  test('Step 5 — Compact view persists after page reload', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("For You")').click();
    await page.locator('button[aria-label="Compact view"]').click();
    await page.reload();
    await expect(page.locator('button[aria-label="Compact view"]')).toHaveAttribute('aria-pressed', 'true');
  });

  // ── Step 6: Upvote a post ─────────────────────────────────────────────────

  test('Step 6 — upvote count increments by 1', async ({ page }) => {
    const firstPost = page.locator('[data-testid="post-card"]').first();
    const initialCount = parseInt(await firstPost.locator('[data-testid="vote-count"]').textContent() ?? '0');
    await firstPost.locator('[data-testid="upvote"]').click();
    await expect(firstPost.locator('[data-testid="vote-count"]')).toHaveText(String(initialCount + 1));
  });

  test('Step 6 — upvote button becomes active after clicking', async ({ page }) => {
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await firstPost.locator('[data-testid="upvote"]').click();
    await expect(firstPost.locator('[data-testid="upvote"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Step 6 — page stays on homepage after upvote', async ({ page }) => {
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await firstPost.locator('[data-testid="upvote"]').click();
    await expect(page).not.toHaveURL(/\/login/);
  });

  // ── Step 7: Downvote a post ───────────────────────────────────────────────

  test('Step 7 — downvote count decrements by 1', async ({ page }) => {
    const secondPost = page.locator('[data-testid="post-card"]').nth(1);
    const initialCount = parseInt(await secondPost.locator('[data-testid="vote-count"]').textContent() ?? '0');
    await secondPost.locator('[data-testid="downvote"]').click();
    await expect(secondPost.locator('[data-testid="vote-count"]')).toHaveText(String(initialCount - 1));
  });

  // ── Step 8: Follow a post ─────────────────────────────────────────────────

  test('Step 8 — Follow button toggles to Following after click', async ({ page }) => {
    const post = page.locator('[data-testid="post-card"]').first();
    await post.hover();
    await post.locator('button:has-text("Follow")').click();
    await expect(post.locator('button:has-text("Following")')).toBeVisible();
  });

  // ── Step 9: Click a post card ─────────────────────────────────────────────

  test('Step 9 — clicking a post card navigates to /post/{slug}', async ({ page }) => {
    const firstPost = page.locator('[data-testid="post-card"]').first();
    const postTitle = await firstPost.locator('h2, h3').first().textContent();
    await firstPost.click();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
    await expect(page.locator('h1')).toContainText(postTitle!.trim());
  });

  // ── Step 10: Click a topic chip ───────────────────────────────────────────

  test('Step 10 — clicking a topic chip navigates to /topic/{slug}', async ({ page }) => {
    await page.locator('[data-testid="post-card"] >> [data-testid="topic-chip"]').first().click();
    await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+/);
  });

  // ── Step 11: Click another user's author link ─────────────────────────────

  test('Step 11 — clicking author link navigates to user profile', async ({ page }) => {
    await page.locator('[data-testid="post-card"] >> [data-testid="author-link"]').first().click();
    await expect(page).toHaveURL(/\/user\/[a-zA-Z0-9_-]+/);
  });

  // ── Step 13: 3-dot menu on another user's post shows Report ───────────────

  test('Step 13 — 3-dot menu on others post shows Report option', async ({ page }) => {
    await page.locator('[data-testid="post-card"]').first().locator('button[aria-label="More"]').click();
    await expect(page.locator('[role="menuitem"]:has-text("Report")')).toBeVisible();
  });

  test('Step 13 — clicking Report opens Report modal', async ({ page }) => {
    await page.locator('[data-testid="post-card"]').first().locator('button[aria-label="More"]').click();
    await page.locator('[role="menuitem"]:has-text("Report")').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-reason"]')).toBeVisible();
  });

  // ── Step 14: 3-dot menu on own post shows Edit / Delete ───────────────────

  test('Step 14 — 3-dot menu on own post shows Edit Post and Delete Post', async ({ page }) => {
    await page.locator('nav[aria-label="Primary"] >> text=My Posts').click();
    await page.locator('[data-testid="post-card"]').first().locator('button[aria-label="More"]').click();
    await expect(page.locator('[role="menuitem"]:has-text("Edit Post")')).toBeVisible();
    await expect(page.locator('[role="menuitem"]:has-text("Delete Post")')).toBeVisible();
  });

  // ── Step 15: Popular This Week sidebar ───────────────────────────────────

  test('Step 15 — clicking Popular This Week post navigates to /post/{slug}', async ({ page }) => {
    await page.locator('aside:has-text("Popular This Week") >> a').first().click();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
  });

  // ── Step 16: Create Post button ───────────────────────────────────────────

  test('Step 16 — clicking Create Post navigates to create post page', async ({ page }) => {
    await page.locator('[data-testid="create-post"]').click();
    await expect(page).toHaveURL(/\/create-post/);
  });

  // ── Step 17: Logo click returns to Homepage ───────────────────────────────

  test('Step 17 — logo click from single post returns to homepage', async ({ page }) => {
    await page.locator('[data-testid="post-card"]').first().click();
    await page.waitForURL(/\/post\//);
    await page.locator('header >> a[href="/"]').click();
    await expect(page).toHaveURL(/\/(trending)?$/);
    await expect(page.locator('[role="tab"]:has-text("Trending")')).toHaveAttribute('aria-selected', 'true');
  });

  // ── Full end-to-end happy path ────────────────────────────────────────────

  test('happy path — tabs, view toggle and persistence', async ({ page }) => {
    await expect(page.locator('[role="tab"]:has-text("Trending")')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-testid="create-post"]')).toBeVisible();

    await page.locator('[role="tab"]:has-text("Latest")').click();
    await expect(page.locator('[role="tab"]:has-text("Latest")')).toHaveAttribute('aria-selected', 'true');

    await page.locator('[role="tab"]:has-text("For You")').click();
    await expect(page.locator('[role="tab"]:has-text("For You")')).toHaveAttribute('aria-selected', 'true');

    await page.locator('button[aria-label="Compact view"]').click();
    await expect(page.locator('button[aria-label="Compact view"]')).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await expect(page.locator('[role="tab"]:has-text("For You")')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('button[aria-label="Compact view"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('happy path — vote and follow on feed', async ({ page }) => {
    const post = page.locator('[data-testid="post-card"]').first();

    const initialCount = parseInt(await post.locator('[data-testid="vote-count"]').textContent() ?? '0');
    await post.locator('[data-testid="upvote"]').click();
    await expect(post.locator('[data-testid="vote-count"]')).toHaveText(String(initialCount + 1));

    await post.hover();
    await post.locator('button:has-text("Follow")').click();
    await expect(post.locator('button:has-text("Following")')).toBeVisible();
  });

  test('happy path — 3-dot menu others vs own post', async ({ page }) => {
    await page.locator('[data-testid="post-card"]').first().locator('button[aria-label="More"]').click();
    await expect(page.locator('[role="menuitem"]:has-text("Report")')).toBeVisible();
    await expect(page.locator('[role="menuitem"]:has-text("Edit Post")')).not.toBeVisible();
    await page.keyboard.press('Escape');

    await page.locator('nav[aria-label="Primary"] >> text=My Posts').click();
    await page.locator('[data-testid="post-card"]').first().locator('button[aria-label="More"]').click();
    await expect(page.locator('[role="menuitem"]:has-text("Edit Post")')).toBeVisible();
    await expect(page.locator('[role="menuitem"]:has-text("Delete Post")')).toBeVisible();
    await expect(page.locator('[role="menuitem"]:has-text("Report")')).not.toBeVisible();
  });
});

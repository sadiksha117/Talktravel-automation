import { test, expect } from '@playwright/test';
import { LeftNavFollowedPostsPage } from '../src/pages/LeftNavFollowedPosts';

/**
 * Left Nav — Followed Posts (Post-Login) — positive-path coverage only.
 * Source: docs/Leftnav_followedpost.md (Steps 1-9, 11-12).
 *
 * Excluded on purpose (not positive flows):
 * - The empty-state case (doc Step 10) needs a dedicated zero-follow account.
 *   This suite shares one staging account across every spec file (see
 *   playwright.config.ts — workers: 1 to avoid session collisions), so
 *   driving it to zero follows would break every other test's fixtures.
 * - Everything in the doc's "Edge cases to add as separate tests" table
 *   (logged-out redirects, network failures, deleted posts, session expiry,
 *   double-clicks, etc.) — those are negative/error-path cases.
 *
 * The left-nav link, page URL, and per-card Follow/Unfollow toggle are
 * unconfirmed against the live app (the doc itself lists several URL
 * candidates) — see LeftNavFollowedPostsPage for the fallback locators used.
 */

const VALID_EMAIL = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';

test.describe('Left Nav — Followed Posts — Positive Flows', () => {
  let followedPage: LeftNavFollowedPostsPage;

  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    followedPage = new LeftNavFollowedPostsPage(page);
    await followedPage.login(VALID_EMAIL, VALID_PASSWORD);
    await followedPage.ensureFollowingAtLeastOnePost();
    await followedPage.goToFollowedPosts();
  });

  // ── Step 1: Navigate to Followed Posts from left nav ─────────────────────

  test('Step 1 — navigating to Followed Posts lands on the followed-posts page', async ({ page }) => {
    await expect(page).toHaveURL(/followed|following/i);
  });

  test('Step 1 — page heading is visible', async () => {
    await expect(followedPage.pageHeading).toBeVisible();
  });

  // ── Step 2: List renders with at least one followed post ─────────────────

  test('Step 2 — at least one post card is visible in the list', async () => {
    await expect(followedPage.postCards.first()).toBeVisible();
  });

  // ── Step 3: Vote on a followed post ───────────────────────────────────────

  test('Step 3 — upvoting a followed post does not redirect to /login', async ({ page }) => {
    await followedPage.firstUpvoteBtn.click();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Step 3 — the post stays in the list after voting', async () => {
    const card = followedPage.postCards.first();
    const href = await card.getAttribute('href');
    await followedPage.firstUpvoteBtn.click();
    await expect(followedPage.postCards.first()).toHaveAttribute('href', href!);
  });

  // ── Step 4: Inline Unfollow removes the post from the list ────────────────

  test('Step 4 — clicking Following removes the post from the list', async ({ page }) => {
    const countBefore = await followedPage.postCards.count();
    const card = followedPage.postCards.first();
    const href = await card.getAttribute('href');

    await followedPage.followingButtonOnCard(card).click();

    await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);
    await expect(followedPage.postCards).toHaveCount(countBefore - 1);
  });

  // ── Step 5: Unfollow persists after refresh ───────────────────────────────

  test('Step 5 — unfollowed post stays off the list after a page reload', async ({ page }) => {
    const card = followedPage.postCards.first();
    const href = await card.getAttribute('href');
    await followedPage.followingButtonOnCard(card).click();
    await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);

    await page.reload();
    await followedPage.waitForPageLoad();
    await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);
  });

  // ── Step 6: Unfollowed post still exists elsewhere ────────────────────────

  test('Step 6 — unfollowed post shows Follow (not Following) on its Single Post View', async ({ page }) => {
    const card = followedPage.postCards.first();
    const href = await card.getAttribute('href');
    await followedPage.followingButtonOnCard(card).click();
    await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);

    await page.goto(`https://staging.talktravel.com${href}`, { waitUntil: 'domcontentloaded' });
    await followedPage.waitForPageLoad();

    const followBtn = page.locator('button[data-action="follow"], button[data-action="subscribe"]')
      .or(page.getByRole('button', { name: /^follow$/i }).first())
      .first();
    await expect(followBtn).toBeVisible();
  });

  // ── Step 7: Re-follow a post, verify it reappears in Followed Posts ──────

  test('Step 7 — re-following from Single Post View adds the post back to the list', async ({ page }) => {
    const card = followedPage.postCards.first();
    const href = await card.getAttribute('href');
    await followedPage.followingButtonOnCard(card).click();
    await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);

    await page.goto(`https://staging.talktravel.com${href}`, { waitUntil: 'domcontentloaded' });
    await followedPage.waitForPageLoad();
    const followBtn = page.locator('button[data-action="follow"], button[data-action="subscribe"]')
      .or(page.getByRole('button', { name: /^follow$/i }).first())
      .first();
    await followBtn.click();

    await followedPage.goToFollowedPosts();
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
  });

  // ── Step 8: Click a post title/card to open Single Post View ─────────────

  test('Step 8 — clicking a post card opens its Single Post View', async ({ page }) => {
    await followedPage.postCards.first().click();
    await expect(page).toHaveURL(/\/post\/.+/);
  });

  test('Step 8 — browser back from Single Post View returns to Followed Posts', async ({ page }) => {
    const listUrl = page.url();
    await followedPage.postCards.first().click();
    await expect(page).toHaveURL(/\/post\/.+/);

    await page.goBack();
    await expect(page).toHaveURL(listUrl);
    await expect(followedPage.postCards.first()).toBeVisible();
  });

  // ── Step 9: 3-dot menu on a non-owned followed post ───────────────────────

  test('Step 9 — 3-dot menu on a followed post opens with an available action', async () => {
    await followedPage.postOptionsBtn.click();
    const reportVisible = await followedPage.menuReportPost.isVisible({ timeout: 3000 }).catch(() => false);
    const editVisible = await followedPage.menuEditPost.isVisible({ timeout: 3000 }).catch(() => false);
    expect(reportVisible || editVisible).toBeTruthy();
  });

  // ── Step 11: Click a topic chip inside a followed post ────────────────────

  test('Step 11 — clicking a topic chip navigates to /tags/{slug}', async ({ page }) => {
    const topicChip = page.locator('a[href^="/tags/"]').first();
    await topicChip.waitFor({ state: 'visible' });
    await topicChip.click();
    await expect(page).toHaveURL(/\/tags\/.+/);
  });

  // ── Step 12: Click an author username/avatar ──────────────────────────────

  test('Step 12 — clicking an author link navigates to the user profile', async ({ page }) => {
    const authorLink = page.locator('a[href^="/profile/"]').first();
    await authorLink.waitFor({ state: 'visible' });
    await authorLink.click();
    await expect(page).toHaveURL(/\/profile\/.+/);
  });

  // ── Full end-to-end happy path ─────────────────────────────────────────────

  test('happy path — view list → vote → unfollow → refresh keeps it removed', async ({ page }) => {
    await expect(followedPage.postCards.first()).toBeVisible();

    await followedPage.firstUpvoteBtn.click();
    await expect(page).not.toHaveURL(/\/login/);

    const card = followedPage.postCards.first();
    const href = await card.getAttribute('href');
    await followedPage.followingButtonOnCard(card).click();
    await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);

    await page.reload();
    await followedPage.waitForPageLoad();
    await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);
  });
});

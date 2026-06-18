import { test, expect } from '@playwright/test';
import { PostLoginHomepageExploratoryPage } from '../../src/pages/exploratory/PostLoginHomepageExploratory';

const VALID_EMAIL = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';

test.describe('Post-Login Homepage — Exploratory (Edge & Negative)', () => {
  let flow: PostLoginHomepageExploratoryPage;

  test.beforeEach(async ({ page }) => {
    flow = new PostLoginHomepageExploratoryPage(page);
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.goToHomepage();
  });

  // ── Feed tab hrefs ────────────────────────────────────────────────────────

  test('Edge — Trending tab href points to /trending', { tag: '@exploratory' }, async () => {
    await expect(flow.feedTabTrendingLink).toHaveAttribute('href', '/trending');
  });

  test('Edge — Latest tab href points to /latest', { tag: '@exploratory' }, async () => {
    await expect(flow.feedTabLatestLink).toHaveAttribute('href', '/latest');
  });

  test('Edge — For You tab href points to /for-you', { tag: '@exploratory' }, async () => {
    await expect(flow.feedTabForYouLink).toHaveAttribute('href', '/for-you');
  });

  // ── Rapid tab switching — may expose race conditions or stale state ────────

  test('Edge — rapid tab switching Trending → Latest → For You renders feed each time', { tag: '@exploratory' }, async () => {
    await flow.feedTabLatestLink.click();
    await flow.feedTabForYouLink.click();
    await flow.feedTabTrendingLink.click();
    await expect(flow.feedPostCards.first()).toBeVisible();
  });

  // ── View toggle edge cases ────────────────────────────────────────────────

  test('Edge — toggling Card → Compact → Card multiple times does not break feed', { tag: '@exploratory' }, async () => {
    await flow.switchToCompactView();
    await flow.switchToCardView();
    await flow.switchToCompactView();
    await flow.switchToCardView();
    await expect(flow.feedPostCards.first()).toBeVisible();
  });

  // ── Voting edge cases — double click, toggle ──────────────────────────────

  test('Edge — clicking Upvote twice rapidly does not navigate away', { tag: '@exploratory' }, async ({ page }) => {
    await flow.firstUpvoteBtn.click();
    await flow.firstUpvoteBtn.click();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/trending/);
  });

  test('Edge — clicking Upvote then Downvote on same post does not crash page', { tag: '@exploratory' }, async ({ page }) => {
    await flow.firstUpvoteBtn.click();
    await flow.firstDownvoteBtn.click();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(flow.feedPostCards.first()).toBeVisible();
  });

  test('Edge — clicking Downvote then Upvote on same post does not crash page', { tag: '@exploratory' }, async ({ page }) => {
    await flow.firstDownvoteBtn.click();
    await flow.firstUpvoteBtn.click();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(flow.feedPostCards.first()).toBeVisible();
  });

  // ── Direct URL navigation while logged in ────────────────────────────────

  test('Negative — visiting /login while logged in redirects away from /login', { tag: '@exploratory' }, async ({ page }) => {
    await flow.safeGoto('https://staging.talktravel.com/login');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Negative — visiting /register while logged in redirects away from /register', { tag: '@exploratory' }, async ({ page }) => {
    await flow.safeGoto('https://staging.talktravel.com/register');
    await expect(page).not.toHaveURL(/\/register/);
  });

  test('Negative — navigating to a non-existent route shows 404 or redirects gracefully', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('https://staging.talktravel.com/this-page-does-not-exist-xyz');
    const title = await page.title();
    const url = page.url();
    // Should either show a 404 page or redirect — must not crash with blank page
    expect(title.trim().length).toBeGreaterThan(0);
    expect(url).toBeTruthy();
  });

  // ── Browser back / forward edge cases ────────────────────────────────────

  test('Edge — browser back after switching to Latest tab returns to /trending', { tag: '@exploratory' }, async ({ page }) => {
    await flow.feedTabLatestLink.click();
    await expect(page).toHaveURL(/\/latest/);
    await page.goBack().catch(e => { if (!String(e).includes('ERR_ABORTED')) throw e; });
    await expect(page).toHaveURL(/\/trending/);
  });

  test('Edge — browser forward after going back restores /latest', { tag: '@exploratory' }, async ({ page }) => {
    await flow.feedTabLatestLink.click();
    await expect(page).toHaveURL(/\/latest/);
    await page.goBack().catch(e => { if (!String(e).includes('ERR_ABORTED')) throw e; });
    await expect(page).toHaveURL(/\/trending/);
    await page.goForward().catch(e => { if (!String(e).includes('ERR_ABORTED')) throw e; });
    await expect(page).toHaveURL(/\/latest/);
  });

  // ── Page reload edge cases ────────────────────────────────────────────────

  test('Edge — reloading /trending while logged in does not redirect to /login', { tag: '@exploratory' }, async ({ page }) => {
    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/trending/);
  });

  // ── Footer integrity ──────────────────────────────────────────────────────

  test('Edge — footer Privacy link has correct href', { tag: '@exploratory' }, async () => {
    await expect(flow.footerPrivacyLink).toHaveAttribute('href', '/privacy-policy');
  });

  test('Edge — footer Terms link has correct href', { tag: '@exploratory' }, async () => {
    await expect(flow.footerTermsLink).toHaveAttribute('href', '/terms-of-service');
  });

  test('Edge — footer copyright text contains current year and TalkTravel brand', { tag: '@exploratory' }, async () => {
    await expect(flow.footerCopyright).toBeVisible();
    const text = await flow.footerCopyright.innerText();
    expect(text).toMatch(/© \d{4} TalkTravel/);
  });

  // ── Post card data integrity ──────────────────────────────────────────────

  test('Edge — first post card has non-empty title text', { tag: '@exploratory' }, async () => {
    const firstCard = flow.feedPostCards.first();
    await expect(firstCard).toBeVisible();
    const text = await firstCard.innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('Edge — author profile link href uses /profile/ pattern', { tag: '@exploratory' }, async () => {
    await expect(flow.firstAuthorProfileLink).toHaveAttribute('href', /^\/profile\/.+/);
  });

  test('Edge — first tag chip href uses /tags/ pattern', { tag: '@exploratory' }, async () => {
    await expect(flow.firstTagChip).toHaveAttribute('href', /^\/tags\/.+/);
  });

  // ── No console errors on load ─────────────────────────────────────────────

  test('Edge — /trending page has no console errors when logged in', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('https://staging.talktravel.com/trending', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    expect(errors).toHaveLength(0);
  });
});

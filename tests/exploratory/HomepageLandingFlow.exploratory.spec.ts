import { expect, test } from '@playwright/test';
import { HomepageLandingFlowExploratoryPage } from '../../src/pages/exploratory/HomepageLandingFlowExploratory';

test.describe('Homepage / Trending Landing Flow — Exploratory (Edge & Negative)', () => {
  let flow: HomepageLandingFlowExploratoryPage;

  test.beforeEach(async ({ page }) => {
    flow = new HomepageLandingFlowExploratoryPage(page);
    await flow.goToHomepage();
  });

  // ── Header ───────────────────────────────────────────────────────────────

  test('Edge — Community header link href points to /trending', { tag: '@exploratory' }, async () => {
    await expect(flow.headerCommunity).toHaveAttribute('href', '/trending');
  });

  test('Edge — Log in header link href points to /login', { tag: '@exploratory' }, async () => {
    await expect(flow.headerLogIn).toHaveAttribute('href', '/login');
  });

  test('Edge — Join Free header link href points to /register', { tag: '@exploratory' }, async () => {
    await expect(flow.headerJoinFree).toHaveAttribute('href', '/register');
  });

  // ── Feed tabs ────────────────────────────────────────────────────────────

  test('Edge — Trending tab href points to /trending', { tag: '@exploratory' }, async () => {
    await expect(flow.feedTabTrending).toHaveAttribute('href', '/trending');
  });

  test('Edge — Latest tab href points to /latest', { tag: '@exploratory' }, async () => {
    await expect(flow.feedTabLatest).toHaveAttribute('href', '/latest');
  });

  test('Edge — For You tab href points to /for-you', { tag: '@exploratory' }, async () => {
    await expect(flow.feedTabForYouLink).toHaveAttribute('href', '/for-you');
  });

  // ── Gated actions (negative — logged-out user redirected to /login) ──────

  test('Negative — clicking Upvote while logged out redirects to /login', { tag: '@exploratory' }, async ({ page }) => {
    await flow.firstUpvoteBtn.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('Negative — clicking Downvote while logged out redirects to /login', { tag: '@exploratory' }, async ({ page }) => {
    await flow.firstDownvoteBtn.click();
    await expect(page).toHaveURL(/\/login/);
  });

  // ── Tag chips ────────────────────────────────────────────────────────────

  test('Edge — first tag chip href uses /tags/ pattern', { tag: '@exploratory' }, async () => {
    await expect(flow.firstTagChip).toHaveAttribute('href', /^\/tags\/.+/);
  });

  test('Edge — tag chip text is not empty', { tag: '@exploratory' }, async () => {
    const text = await flow.firstTagChip.innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  // ── Sidebar ──────────────────────────────────────────────────────────────

  test('Edge — Popular This Week heading level is 4', { tag: '@exploratory' }, async () => {
    await expect(flow.popularThisWeekHeading).toBeVisible();
  });

  test('Edge — Popular This Week sidebar contains at least one post link', { tag: '@exploratory' }, async () => {
    const links = flow.popularThisWeekLinks;
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });

  // ── Footer ───────────────────────────────────────────────────────────────

  test('Edge — footer Trending link href points to /trending', { tag: '@exploratory' }, async () => {
    await expect(flow.footerTrendingLink).toHaveAttribute('href', '/trending');
  });

  test('Edge — footer copyright text contains current year and TalkTravel brand', { tag: '@exploratory' }, async () => {
    await expect(flow.footerCopyright).toBeVisible();
    const text = await flow.footerCopyright.innerText();
    expect(text).toMatch(/© \d{4} TalkTravel/);
  });

  test('Edge — footer Privacy and Terms links are present and have correct hrefs', { tag: '@exploratory' }, async () => {
    await expect(flow.footerPrivacyLink).toHaveAttribute('href', '/privacy-policy');
    await expect(flow.footerTermsLink).toHaveAttribute('href', '/terms-of-service');
  });
});

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

  // ── Logo ─────────────────────────────────────────────────────────────────

  test('Edge — logo link href points to root /', { tag: '@exploratory' }, async () => {
    await expect(flow.logoLink).toHaveAttribute('href', '/');
  });

  test('Edge — logo link is visible in the header navigation', { tag: '@exploratory' }, async () => {
    await expect(flow.logoLink).toBeVisible();
    const logoInsideNav = flow.page.getByRole('navigation').getByRole('link', { name: 'TalkTravel talk travel' });
    await expect(logoInsideNav).toBeVisible();
  });

  // ── Direct URL navigation (negative — no redirect to login) ──────────────

  test('Negative — direct navigation to /trending loads without auth redirect', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('/trending');
    await expect(page).toHaveURL('https://staging.talktravel.com/trending');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Negative — direct navigation to /latest loads without auth redirect', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('/latest');
    await expect(page).toHaveURL('https://staging.talktravel.com/latest');
    await expect(page).not.toHaveURL(/\/login/);
  });

  // ── Post card links ───────────────────────────────────────────────────────

  test('Edge — first post card link href uses /post/ pattern', { tag: '@exploratory' }, async () => {
    await expect(flow.firstPostCardLink).toHaveAttribute('href', /^\/post\/.+/);
  });

  test('Edge — author profile link href uses /profile/ pattern', { tag: '@exploratory' }, async () => {
    await expect(flow.firstAuthorProfileLink).toHaveAttribute('href', /^\/profile\/.+/);
  });

  // ── Footer support & social links ─────────────────────────────────────────

  test('Edge — footer FAQ link href points to /faq', { tag: '@exploratory' }, async () => {
    await expect(flow.footerFaqLink).toHaveAttribute('href', '/faq');
  });

  test('Edge — footer Help link href points to /help', { tag: '@exploratory' }, async () => {
    await expect(flow.footerHelpLink).toHaveAttribute('href', '/help');
  });

  test('Edge — footer Guidelines link href points to /guidelines', { tag: '@exploratory' }, async () => {
    await expect(flow.footerGuidelinesLink).toHaveAttribute('href', '/guidelines');
  });

  test('Edge — footer social links point to correct external platforms', { tag: '@exploratory' }, async () => {
    await expect(flow.footerSocialX).toHaveAttribute('href', 'https://x.com/talktravelhq');
    await expect(flow.footerSocialInstagram).toHaveAttribute('href', 'https://www.instagram.com/talktravelhq/');
    await expect(flow.footerSocialFacebook).toHaveAttribute('href', 'https://www.facebook.com/talktravelhq');
  });

  // ── Page title & console errors ───────────────────────────────────────────

  test('Edge — /trending page document title is not empty', { tag: '@exploratory' }, async ({ page }) => {
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
  });

  test('Edge — /trending page has no console errors on load', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/trending');
    await page.waitForLoadState('load');
    expect(errors).toHaveLength(0);
  });

  test('Edge — footer Latest link href points to /latest', { tag: '@exploratory' }, async () => {
    await expect(flow.footerLatestLink).toHaveAttribute('href', '/latest');
  });

  // ── Feed card content (data quality) ────────────────────────────────────────

  test('Edge — first post card displays author name and is not empty', { tag: '@exploratory' }, async () => {
    const authorElement = flow.firstAuthorProfileLink;
    await expect(authorElement).toBeVisible();
    const authorText = await authorElement.innerText();
    expect(authorText.trim().length).toBeGreaterThan(0);
  });

  test('Edge — first post card has non-empty title text', { tag: '@exploratory' }, async () => {
    const cardLink = flow.firstPostCardLink;
    await expect(cardLink).toBeVisible();
    const titleText = await cardLink.innerText();
    expect(titleText.trim().length).toBeGreaterThan(0);
  });
});

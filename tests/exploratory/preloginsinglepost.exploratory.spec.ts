import { expect, test } from '@playwright/test';
import { PreLoginSinglePostExploratoryPage } from '../../src/pages/exploratory/PreLoginSinglePostExploratory';

const BASE_URL = 'https://staging.talktravel.com';

test.describe('Flow 3 — Landing → Pre-Login Feed → Single Post View (Exploratory)', () => {
  let flow3: PreLoginSinglePostExploratoryPage;

  test.beforeEach(async ({ page }) => {
    flow3 = new PreLoginSinglePostExploratoryPage(page);
    await flow3.goToLanding();
  });

  // ── Step 1 edge cases ────────────────────────────────────────────────────

  test('Edge — Step 1: Community header link href points to /trending', { tag: '@exploratory' }, async () => {
    await expect(flow3.headerCommunity).toHaveAttribute('href', '/trending');
  });

  test('Edge — Step 1: Log in header link href points to /login', { tag: '@exploratory' }, async () => {
    await expect(flow3.headerLoginBtn).toHaveAttribute('href', '/login');
  });

  test('Edge — Step 1: Join Free header link href points to /register', { tag: '@exploratory' }, async () => {
    await expect(flow3.headerJoinFreeBtn).toHaveAttribute('href', '/register');
  });

  // ── Step 2 edge cases ────────────────────────────────────────────────────

  test('Edge — Step 2: direct navigation to /trending loads feed without landing page', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('/trending');
    await flow3.waitForPageLoad();
    await expect(page).toHaveURL(`${BASE_URL}/trending`);
    await expect(flow3.feedPostCards.first()).toBeVisible();
  });

  test('Edge — Step 2: feed contains more than 3 post cards', { tag: '@exploratory' }, async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.feedPostCards.first().waitFor({ state: 'visible' });
    const count = await flow3.feedPostCards.count();
    expect(count).toBeGreaterThan(3);
  });

  test('Edge — Step 2: first post card link opens in same tab (no _blank)', { tag: '@exploratory' }, async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.feedPostCards.first().waitFor({ state: 'visible' });
    const target = await flow3.feedPostCards.first().getAttribute('target');
    expect(target).not.toBe('_blank');
  });

  test('Edge — Step 2: feed page has no console errors on load', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await flow3.goToFeedViaCommunityLink();
    expect(errors).toHaveLength(0);
  });

  // ── Step 3 edge cases ────────────────────────────────────────────────────

  test('Edge — Step 3: post URL slug has no spaces', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    expect(page.url()).not.toContain(' ');
  });

  test('Edge — Step 3: post H1 title text is not empty', { tag: '@exploratory' }, async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    const titleText = await flow3.postTitle.innerText();
    expect(titleText.trim().length).toBeGreaterThan(0);
  });

  test('Edge — Step 3: browser back from post returns to /trending feed', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/trending/);
  });
});

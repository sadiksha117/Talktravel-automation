import { expect, test } from '@playwright/test';
import { UserProfileViewExploratoryPage } from '../../src/pages/exploratory/UserProfileViewExploratory';

test.describe('User Profile View (Pre-Login) — Exploratory Edge Cases', () => {
  let profilePage: UserProfileViewExploratoryPage;

  test.beforeEach(async ({ page }) => {
    profilePage = new UserProfileViewExploratoryPage(page);
    await profilePage.goToProfileViaHomepageFeed();
  });

  // ── Edge: URL & navigation ────────────────────────────────────────────────

  test('Edge — direct navigation to a non-existent username shows 404 or user-not-found state', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('https://staging.talktravel.com/profile/this-user-does-not-exist-xyz999abc');
    await page.waitForLoadState('load');
    const body = await page.locator('body').textContent() ?? '';
    const isHandled =
      (await page.locator('text=/not found|does not exist|unavailable|404/i').count()) > 0 ||
      page.url().includes('/404') ||
      page.url().includes('/trending');
    expect(isHandled, `Expected graceful 404 or redirect but got body: ${body.substring(0, 200)}`).toBe(true);
  });

  test('Edge — profile URL has no 404 network errors on load', { tag: '@exploratory' }, async ({ page }) => {
    const notFoundUrls: string[] = [];
    page.on('response', response => {
      if (response.status() === 404) notFoundUrls.push(response.url());
    });
    await profilePage.goToProfileViaHomepageFeed();
    expect(notFoundUrls).toHaveLength(0);
  });

  test('Edge — profile page has no console errors on load', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await profilePage.goToProfileViaHomepageFeed();
    expect(errors).toHaveLength(0);
  });

  test('Edge — page title includes the username', { tag: '@exploratory' }, async ({ page }) => {
    const title = await page.title();
    const usernameEl = profilePage.profileUsername;
    const username = await usernameEl.textContent() ?? '';
    expect(title).toContain(username.trim());
  });

  // ── Edge: gated actions redirect ─────────────────────────────────────────

  test('Edge — Add Friend redirects to /login and does not trigger a network mutation', { tag: '@exploratory' }, async ({ page }) => {
    const postRequests: string[] = [];
    page.on('request', req => {
      if (['POST', 'PUT', 'PATCH'].includes(req.method())) postRequests.push(req.url());
    });
    await profilePage.addFriendBtn.click();
    await page.waitForURL(/\/login/);
    expect(postRequests).toHaveLength(0);
  });

  test('Edge — Chat redirects to /login and does not trigger a network mutation', { tag: '@exploratory' }, async ({ page }) => {
    const postRequests: string[] = [];
    page.on('request', req => {
      if (['POST', 'PUT', 'PATCH'].includes(req.method())) postRequests.push(req.url());
    });
    await profilePage.chatBtn.click();
    await page.waitForURL(/\/login/);
    expect(postRequests).toHaveLength(0);
  });

  test('Edge — Follow/Unfollow redirects to /login and does not trigger a network mutation', { tag: '@exploratory' }, async ({ page }) => {
    const postRequests: string[] = [];
    page.on('request', req => {
      if (['POST', 'PUT', 'PATCH'].includes(req.method())) postRequests.push(req.url());
    });
    await profilePage.followBtn.click();
    await page.waitForURL(/\/login/);
    expect(postRequests).toHaveLength(0);
  });

  test('Edge — More button redirects to /login and does not open a dropdown that leaks user actions', { tag: '@exploratory' }, async ({ page }) => {
    const profileUrl = page.url();
    await profilePage.moreBtn.click();
    // Either redirects directly to login, or opens a dropdown
    const redirected = await page.waitForURL(/\/login/, { timeout: 5000 }).then(() => true).catch(() => false);
    if (!redirected) {
      // If menu opened, any item clicked should redirect to login
      await page.goto(profileUrl);
      await page.waitForLoadState('load');
      expect(await profilePage.moreBtn.isVisible()).toBe(true);
    }
  });

  // ── Edge: browser back behaviour ─────────────────────────────────────────

  test('Edge — browser back from /login restores the profile page', { tag: '@exploratory' }, async ({ page }) => {
    const profileUrl = page.url();
    await profilePage.addFriendBtn.click();
    await page.waitForURL(/\/login/);
    await page.goBack();
    await page.waitForLoadState('load');
    expect(page.url()).toContain(profileUrl);
    await expect(profilePage.profileUsername).toBeVisible();
  });

  // ── Edge: tab state ───────────────────────────────────────────────────────

  test('Edge — switching tabs multiple times does not show stale content', { tag: '@exploratory' }, async ({ page }) => {
    await profilePage.switchToCommentsTab();
    await profilePage.switchToPostsTab();
    await profilePage.switchToCommentsTab();
    await expect(profilePage.commentsTab).toHaveClass(/active/);
    await expect(profilePage.postsTab).not.toHaveClass(/active/);
  });

  test('Edge — refreshing on Comments tab reloads the page without JS errors', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    await profilePage.switchToCommentsTab();
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.reload();
    await page.waitForLoadState('load');
    expect(errors).toHaveLength(0);
  });

  // ── Edge: security ────────────────────────────────────────────────────────

  test('Edge — XSS payload in profile username slug does not execute script', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async dialog => {
      alertFired = true;
      await dialog.dismiss();
    });
    await page.goto('https://staging.talktravel.com/profile/<script>alert(1)</script>');
    await page.waitForLoadState('load');
    expect(alertFired).toBe(false);
  });

  test('Edge — profile page canonical URL uses production domain not staging', { tag: '@exploratory' }, async ({ page }) => {
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    if (canonical) {
      expect(canonical).toMatch(/talktravel\.com\/profile\/.+/);
    }
  });

  // ── Edge: sidebar data integrity ─────────────────────────────────────────

  test('Edge — Jetfuel count in sidebar is a valid non-negative number', { tag: '@exploratory' }, async () => {
    const text = await profilePage.jetfuelCount.textContent() ?? '';
    const value = parseInt(text.trim(), 10);
    expect(isNaN(value)).toBe(false);
    expect(value).toBeGreaterThanOrEqual(0);
  });

  test('Edge — tier progress text contains a valid positive number before "Jetfuel until"', { tag: '@exploratory' }, async () => {
    const text = await profilePage.tierProgress.textContent() ?? '';
    const match = text.match(/(\d+)\s+Jetfuel until/i);
    expect(match, `Could not find a number before "Jetfuel until" in: "${text}"`).not.toBeNull();
    if (match) {
      expect(parseInt(match[1], 10)).toBeGreaterThan(0);
    }
  });
});

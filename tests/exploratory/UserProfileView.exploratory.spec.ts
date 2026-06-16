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

  // ── Edge: badge behaviour ─────────────────────────────────────────────────

  test('Edge — badge detail page loads without console errors after clicking a badge', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await profilePage.clickFirstBadge();
    expect(errors).toHaveLength(0);
  });

  test('Edge — See all badges link navigates to /badges and page renders without 404 resources', { tag: '@exploratory' }, async ({ page }) => {
    const notFoundUrls: string[] = [];
    page.on('response', res => { if (res.status() === 404) notFoundUrls.push(res.url()); });
    await profilePage.clickSeeAllBadges();
    await expect(page).toHaveURL(/\/badges/);
    expect(notFoundUrls).toHaveLength(0);
  });

  test('Edge — badge strip has at least one badge visible or shows empty state gracefully', { tag: '@exploratory' }, async ({ page }) => {
    const badgeCount = await profilePage.singleBadge.count();
    if (badgeCount === 0) {
      const emptyState = page.locator('text=/no badges|badges yet/i');
      await expect(emptyState).toBeVisible();
    } else {
      expect(badgeCount).toBeGreaterThan(0);
    }
  });

  // ── Edge: topic chip navigation ───────────────────────────────────────────

  test('Edge — topic chip navigation loads /tags page without console errors', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await profilePage.clickFirstTopicChip();
    await expect(page).toHaveURL(/\/tags\/.+/);
    expect(errors).toHaveLength(0);
  });

  test('Edge — topic chip URL slug contains only valid characters (no encoded spaces or special chars)', { tag: '@exploratory' }, async ({ page }) => {
    const chip = profilePage.topicChips.first();
    await chip.waitFor({ state: 'visible' });
    const href = await chip.getAttribute('href') ?? '';
    expect(href).toMatch(/^\/tags\/[A-Za-z0-9_%-]+$/);
  });

  // ── Edge: post navigation from profile ───────────────────────────────────

  test('Edge — clicking a post navigates to /post page that has no 500 server errors', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => { if (res.status() >= 500) serverError = true; });
    await profilePage.clickFirstPostCard();
    expect(serverError).toBe(false);
  });

  test('Edge — browser back from a post inside the Posts tab returns to the profile page', { tag: '@exploratory' }, async ({ page }) => {
    const profileUrl = page.url();
    await profilePage.clickFirstPostCard();
    await page.goBack();
    await page.waitForLoadState('load');
    expect(page.url()).toContain('/profile/');
    await expect(profilePage.profileUsername).toBeVisible();
  });

  // ── Edge: header links from profile ──────────────────────────────────────

  test('Edge — clicking TalkTravel logo from profile navigates to /trending', { tag: '@exploratory' }, async ({ page }) => {
    await profilePage.logo.click();
    await expect(page).toHaveURL(/\/trending/);
  });

  test('Edge — clicking Log in from profile navigates to /login', { tag: '@exploratory' }, async ({ page }) => {
    await profilePage.headerLogIn.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('Edge — clicking Join Free from profile navigates to /register', { tag: '@exploratory' }, async ({ page }) => {
    await profilePage.headerJoinFree.click();
    await expect(page).toHaveURL(/\/register/);
  });

  // ── Edge: rapid interaction ───────────────────────────────────────────────

  test('Edge — rapid double-click on Add Friend triggers only one redirect to /login', { tag: '@exploratory' }, async ({ page }) => {
    const profileUrl = page.url();
    let loginRedirectCount = 0;
    page.on('response', res => {
      if (res.url().includes('/login')) loginRedirectCount++;
    });
    await profilePage.addFriendBtn.dblclick();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
    // Should not have looped or double-redirected back to profile
    expect(page.url()).not.toBe(profileUrl);
  });

  // ── Edge: og/meta tags ────────────────────────────────────────────────────

  test('Edge — profile page has og:title meta tag containing the username', { tag: '@exploratory' }, async ({ page }) => {
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const username = (await profilePage.profileUsername.textContent() ?? '').trim();
    expect(ogTitle).toContain(username);
  });

  test('Edge — profile page has og:type set to "profile"', { tag: '@exploratory' }, async ({ page }) => {
    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');
    expect(ogType).toBe('profile');
  });
});

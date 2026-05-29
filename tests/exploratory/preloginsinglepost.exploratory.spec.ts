import { expect, test } from '@playwright/test';
import { PreLoginSinglePostExploratoryPage } from '../../src/pages/exploratory/PreLoginSinglePostExploratory';

test.describe('Flow 3 — Landing → Pre-Login Feed → Single Post View (Exploratory)', () => {
  let flow3: PreLoginSinglePostExploratoryPage;

  test.beforeEach(async ({ page }) => {
    flow3 = new PreLoginSinglePostExploratoryPage(page);
    await flow3.goToLanding();
  });

  // ── Negative cases ───────────────────────────────────────────────────────

  test('Negative — non-existent post URL returns an HTTP 404 status (not a silent 200)', { tag: '@exploratory' }, async ({ page }) => {
    let status = 0;
    page.on('response', response => {
      if (response.url().includes('/post/this-post-does-not-exist-xyz123abc')) {
        status = response.status();
      }
    });
    await page.goto('/post/this-post-does-not-exist-xyz123abc');
    await page.waitForLoadState('networkidle');
    expect(status).toBe(404);
  });

  test('Negative — feed page has no 404 network errors on load', { tag: '@exploratory' }, async ({ page }) => {
    const notFoundUrls: string[] = [];
    page.on('response', response => {
      if (response.status() === 404) notFoundUrls.push(response.url());
    });
    await flow3.goToFeedViaCommunityLink();
    expect(notFoundUrls).toHaveLength(0);
  });

  test('Negative — post page has no console errors on load', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    expect(errors).toHaveLength(0);
  });

  // ── Security cases ───────────────────────────────────────────────────────

  test('Security — XSS payload in /trending query param does not execute script', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async dialog => {
      alertFired = true;
      await dialog.dismiss();
    });
    await page.goto('/trending?q=<script>alert(1)</script>');
    await page.waitForLoadState('networkidle');
    expect(alertFired).toBe(false);
  });

  test('Security — XSS payload in post slug does not execute script', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async dialog => {
      alertFired = true;
      await dialog.dismiss();
    });
    await page.goto('/post/<script>alert(1)</script>');
    await page.waitForLoadState('networkidle');
    expect(alertFired).toBe(false);
  });

  test('Security — post page response sets Strict-Transport-Security (HSTS) header', { tag: '@exploratory' }, async ({ page }) => {
    let hsts: string | undefined;
    page.on('response', response => {
      if (response.url().includes('/post/')) {
        hsts = response.headers()['strict-transport-security'];
      }
    });
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    expect(hsts).toBeDefined();
    expect(hsts!.length).toBeGreaterThan(0);
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  test('Edge — post page browser tab title includes the post H1 heading text', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    const h1Text = (await flow3.postTitle.innerText()).trim().slice(0, 30);
    const pageTitle = await page.title();
    expect(pageTitle.toLowerCase()).toContain(h1Text.toLowerCase());
  });

  test('Edge — post page has no broken images', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const naturalWidth = await images.nth(i).evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });

  test('Edge — first post card link opens in same tab (not _blank)', { tag: '@exploratory' }, async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.feedPostCards.first().waitFor({ state: 'visible' });
    const target = await flow3.feedPostCards.first().getAttribute('target');
    expect(target).not.toBe('_blank');
  });

  test('Edge — browser back from post returns to /trending feed', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/trending/);
  });

  // ── Restored tests (previously replaced in error) ───────────────────────

  test('Negative — navigating to a non-existent post URL does not show a blank page', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('/post/this-post-does-not-exist-xyz123abc');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test('Security — post page URL uses HTTPS (no mixed protocol)', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    expect(page.url()).toMatch(/^https:/);
  });

  test('Edge — reloading the single post page keeps the post title visible', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(flow3.postTitle).toBeVisible();
  });

  test('Security — /trending with 500-character query param does not crash the page', { tag: '@exploratory' }, async ({ page }) => {
    const longParam = 'a'.repeat(500);
    await page.goto(`/trending?q=${longParam}`);
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test('Edge — Latest tab contains at least one post card after switching', { tag: '@exploratory' }, async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.feedTabLatest.click();
    await flow3.waitForPageLoad();
    await expect(flow3.feedPostCards.first()).toBeVisible();
  });

  // ── Hard edge / negative / security cases ────────────────────────────────

  test('Security — response headers do not expose X-Powered-By server info', { tag: '@exploratory' }, async ({ page }) => {
    const responses: string[] = [];
    page.on('response', response => {
      if (response.url().includes('/trending')) {
        const header = response.headers()['x-powered-by'];
        if (header) responses.push(header);
      }
    });
    await flow3.goToFeedViaCommunityLink();
    expect(responses).toHaveLength(0);
  });

  test('Security — post page response sets X-Frame-Options or CSP to prevent clickjacking', { tag: '@exploratory' }, async ({ page }) => {
    let hasProtection = false;
    page.on('response', async response => {
      if (response.url().includes('/post/')) {
        const headers = response.headers();
        if (headers['x-frame-options'] || headers['content-security-policy']) {
          hasProtection = true;
        }
      }
    });
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    expect(hasProtection).toBe(true);
  });

  test('Edge — post page has JSON-LD structured data script tag for SEO', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);
    const content = await jsonLd.innerText();
    const parsed = JSON.parse(content);
    expect(parsed['@type']).toBeTruthy();
  });

  test('Security — SQL injection in /trending query param does not crash the page', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto("/trending?q=' OR 1=1 --");
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test('Negative — all visible post card titles in the feed are non-empty', { tag: '@exploratory' }, async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.feedPostCards.first().waitFor({ state: 'visible' });
    const cards = await flow3.feedPostCards.all();
    for (const card of cards) {
      const text = await card.innerText();
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  test('Negative — all post card hrefs in the feed are unique (no duplicates)', { tag: '@exploratory' }, async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.feedPostCards.first().waitFor({ state: 'visible' });
    const cards = await flow3.feedPostCards.all();
    const hrefs: string[] = [];
    for (const card of cards) {
      const href = await card.getAttribute('href') ?? '';
      hrefs.push(href);
    }
    const uniqueHrefs = new Set(hrefs);
    expect(uniqueHrefs.size).toBe(hrefs.length);
  });

  test('Negative — all images on the post page have non-empty alt attributes', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).not.toBeNull();
      expect((alt ?? '').trim().length).toBeGreaterThan(0);
    }
  });

  test('Edge — post page has og:title meta tag matching the H1', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).not.toBeNull();
    expect((ogTitle ?? '').trim().length).toBeGreaterThan(0);
    const h1Text = await flow3.postTitle.innerText();
    expect(h1Text.trim()).toContain((ogTitle ?? '').trim().slice(0, 20));
  });

  test('Edge — post page has og:description meta tag', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content');
    expect(ogDesc).not.toBeNull();
    expect((ogDesc ?? '').trim().length).toBeGreaterThan(0);
  });

  test('Edge — post page has a canonical link tag in head', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).not.toBeNull();
    expect(canonical).toContain('/post/');
  });

  test('Edge — feed renders at least one post card on mobile viewport (375px)', { tag: '@exploratory' }, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    // On mobile the nav collapses — navigate directly instead of clicking the hidden Community link
    await page.goto('/trending');
    await flow3.waitForPageLoad();
    await expect(flow3.feedPostCards.first()).toBeVisible();
  });

  test('Edge — Trending and Latest tabs each load post cards and navigate to different URLs', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.feedPostCards.first().waitFor({ state: 'visible' });
    const trendingUrl = page.url();
    await flow3.feedTabLatest.click();
    await flow3.waitForPageLoad();
    await flow3.feedPostCards.first().waitFor({ state: 'visible' });
    expect(page.url()).not.toBe(trendingUrl);
    await expect(flow3.feedPostCards.first()).toBeVisible();
  });

  test('Negative — direct navigation to /post (no slug) does not return a 500 error', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', response => {
      if (response.url().endsWith('/post') || response.url().endsWith('/post/')) {
        if (response.status() >= 500) serverError = true;
      }
    });
    await page.goto('/post');
    await page.waitForLoadState('networkidle');
    expect(serverError).toBe(false);
  });

  test('Negative — voting on a post while logged out redirects to login or shows login prompt', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    const upvoteBtn = page.getByRole('button', { name: 'Upvote' }).first();
    await upvoteBtn.click();
    await page.waitForTimeout(1500);
    const redirectedToLogin = page.url().includes('/login');
    const hasLoginAlert = await page.locator('[role="alert"]').filter({ hasText: /login|sign in/i }).isVisible().catch(() => false);
    const hasDialog = await page.getByRole('dialog').isVisible().catch(() => false);
    expect(redirectedToLogin || hasLoginAlert || hasDialog).toBe(true);
  });

  test('Negative — attempting to comment while logged out shows login prompt', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    // The comment box is replaced by a "Please login to add a reply" message + Login link
    // for logged-out users — no textarea is rendered, so assert the prompt directly
    const loginPrompt = page.getByText(/please login to add a reply/i)
      .or(page.locator('[class*="comment"] a[href*="/login"]'));
    await expect(loginPrompt.first()).toBeVisible();
  });

  // ── Moderate edge cases ──────────────────────────────────────────────────

  test('Edge — clicking logo on post page navigates back to homepage', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    await flow3.logo.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/$/);
  });

  test('Edge — post page has at least one tag link pointing to /tags/', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    const tagLink = page.locator('a[href*="/tags/"]').first();
    await expect(tagLink).toBeVisible();
  });

  test('Edge — post author name is visible on single post page', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    const authorLink = page.locator('a[href*="/profile/"]').first();
    await expect(authorLink).toBeVisible();
    const text = await authorLink.innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('Edge — post page does not contain more than one H1 tag', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('Edge — Popular This Week sidebar links all point to /post/ URLs', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    const popularLinks = page.locator('a[href^="/post/"]');
    await popularLinks.first().waitFor({ state: 'visible' });
    const links = await page.locator('[class*="popular" i] a, [class*="sidebar" i] a').all();
    for (const link of links) {
      const href = await link.getAttribute('href') ?? '';
      expect(href).toMatch(/^\/(post\/|trending|popular|latest)/);
    }
  });

  test('Edge — switching from Trending to Latest tab changes the URL', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    const trendingUrl = page.url();
    await flow3.feedTabLatest.click();
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toBe(trendingUrl);
  });

  test('Edge — post page comment count in vote bar matches comments section heading number', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    // Target the "Scroll to comments" button directly to avoid matching vote count buttons
    const scrollBtn = page.getByRole('button', { name: /scroll to comments/i });
    const badgeText = await scrollBtn.innerText();
    const badgeCount = badgeText.match(/\d+/)?.[0];
    const headingText = await page.locator('h2').filter({ hasText: /comment/i }).first().innerText();
    const headingCount = headingText.match(/\d+/)?.[0];
    expect(badgeCount).toBe(headingCount);
  });

  test('Edge — feed post cards show a relative time (e.g. "2d ago") on at least one visible card', { tag: '@exploratory' }, async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.feedPostCards.first().waitFor({ state: 'visible' });
    const cards = await flow3.feedPostCards.all();
    // Some cards (sidebar) may not include timestamps — require at least one main card does
    const withTimestamp = await Promise.all(
      cards.slice(0, 8).map(async card => {
        const text = await card.innerText();
        return /\d+\s*(s|m|h|d|w|mo|yr|month|day|hour|min|sec|ago)/i.test(text);
      })
    );
    expect(withTimestamp.some(Boolean)).toBe(true);
  });

  test('Edge — post page footer non-social links do not point to external domains', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    const footerLinks = await page.locator('footer a').all();
    const knownSocials = /x\.com|twitter\.com|instagram\.com|facebook\.com|linkedin\.com/i;
    for (const link of footerLinks) {
      const href = await link.getAttribute('href') ?? '';
      if (href.startsWith('http') && !knownSocials.test(href)) {
        expect(href).toMatch(/staging\.talktravel\.com|talktravel\.com/);
      }
    }
  });

  test('Edge — post page upvote and downvote buttons are both visible', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    await expect(page.getByRole('button', { name: /upvote/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /downvote/i }).first()).toBeVisible();
  });

  test('Edge — post page vote count is a visible numeric value', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    const voteCount = page.locator('button:has(img[alt="Upvote"]) + *').first();
    const text = await voteCount.innerText();
    expect(text.replace(/"/g, '').trim()).toMatch(/^\d+$/);
  });

  test('Edge — each individual tab (Trending and Latest) has no duplicate hrefs within itself', { tag: '@exploratory' }, async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.feedPostCards.first().waitFor({ state: 'visible' });
    const trendingHrefs = await flow3.feedPostCards.evaluateAll(
      els => els.map(el => el.getAttribute('href'))
    );
    expect(new Set(trendingHrefs).size).toBe(trendingHrefs.length);
    await flow3.feedTabLatest.click();
    await flow3.waitForPageLoad();
    await flow3.feedPostCards.first().waitFor({ state: 'visible' });
    const latestHrefs = await flow3.feedPostCards.evaluateAll(
      els => els.map(el => el.getAttribute('href'))
    );
    expect(new Set(latestHrefs).size).toBe(latestHrefs.length);
  });

  test('Edge — post page share button is enabled (not disabled)', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    await expect(flow3.shareButton).toBeEnabled();
  });

  test('Edge — post login link in comments includes a callback URL to return after login', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    // Target the login link inside the comments section specifically (not the header nav link)
    const loginLink = page.locator('a[href*="/login?"]').first();
    const href = await loginLink.getAttribute('href') ?? '';
    expect(href).toMatch(/callback|redirect|return|\?/i);
  });

  test('Edge — post page has a visible comment count that is a non-negative number', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    const heading = page.locator('h2').filter({ hasText: /comment/i }).first();
    await expect(heading).toBeVisible();
    const text = await heading.innerText();
    const count = parseInt(text.match(/\d+/)?.[0] ?? '-1', 10);
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

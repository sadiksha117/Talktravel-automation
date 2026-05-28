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

  test('Edge — Trending and Latest tabs show a different first post (not identical ordering)', { tag: '@exploratory' }, async () => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.feedPostCards.first().waitFor({ state: 'visible' });
    const trendingFirst = await flow3.feedPostCards.first().getAttribute('href');
    await flow3.feedTabLatest.click();
    await flow3.waitForPageLoad();
    await flow3.feedPostCards.first().waitFor({ state: 'visible' });
    const latestFirst = await flow3.feedPostCards.first().getAttribute('href');
    expect(latestFirst).not.toBe(trendingFirst);
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

  test('Negative — voting on a post while logged out triggers a login prompt', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    const upvoteBtn = page.getByRole('button', { name: /upvote|up|like/i }).first();
    await upvoteBtn.click();
    const loginPrompt = page.getByRole('dialog').or(page.locator('[class*="modal"], [class*="login"]')).first();
    await expect(loginPrompt).toBeVisible({ timeout: 5000 });
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
});

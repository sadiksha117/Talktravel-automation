import { expect, test } from '@playwright/test';
import { SingleTopicViewExploratoryPage } from '../../src/pages/exploratory/SingleTopicViewExploratory';

test.describe('Single Topic View (Pre-Login) — Exploratory', () => {
  let topicPage: SingleTopicViewExploratoryPage;

  test.beforeEach(async ({ page }) => {
    topicPage = new SingleTopicViewExploratoryPage(page);
    await topicPage.goToTopicViaHomepageChip();
  });

  // ── Negative cases ───────────────────────────────────────────────────────

  test('Negative — non-existent topic slug does not return a 500 error', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', response => {
      if (response.url().includes('/tags/this-topic-does-not-exist-xyz123')) {
        if (response.status() >= 500) serverError = true;
      }
    });
    await page.goto('/tags/this-topic-does-not-exist-xyz123');
    await page.waitForLoadState('networkidle');
    expect(serverError).toBe(false);
  });

  test('Negative — topic page has no 404 network errors on load', { tag: '@exploratory' }, async ({ page }) => {
    const notFoundUrls: string[] = [];
    page.on('response', response => {
      if (response.status() === 404) notFoundUrls.push(response.url());
    });
    await topicPage.goToTopicViaHomepageChip();
    expect(notFoundUrls).toHaveLength(0);
  });

  test('Negative — topic page has no console errors on load', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await topicPage.goToTopicViaHomepageChip();
    expect(errors).toHaveLength(0);
  });

  test('Negative — all post card titles in topic feed are non-empty', { tag: '@exploratory' }, async () => {
    await topicPage.postCards.first().waitFor({ state: 'visible' });
    const cards = await topicPage.postCards.all();
    for (const card of cards) {
      const text = await card.innerText();
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  test('Negative — all post card hrefs in topic feed are unique (no duplicates)', { tag: '@exploratory' }, async () => {
    await topicPage.postCards.first().waitFor({ state: 'visible' });
    const cards = await topicPage.postCards.all();
    const hrefs: string[] = [];
    for (const card of cards) {
      const href = await card.getAttribute('href') ?? '';
      hrefs.push(href);
    }
    const uniqueHrefs = new Set(hrefs);
    expect(uniqueHrefs.size).toBe(hrefs.length);
  });

  test('Negative — all images on topic page have non-empty alt attributes', { tag: '@exploratory' }, async ({ page }) => {
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).not.toBeNull();
      expect((alt ?? '').trim().length).toBeGreaterThan(0);
    }
  });

  test('Negative — direct navigation to /tags (no slug) does not return a 500 error', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', response => {
      if (response.url().endsWith('/tags') || response.url().endsWith('/tags/')) {
        if (response.status() >= 500) serverError = true;
      }
    });
    await page.goto('/tags');
    await page.waitForLoadState('networkidle');
    expect(serverError).toBe(false);
  });

  test('Negative — disabled Upvote button on deleted post does not navigate away', { tag: '@exploratory' }, async ({ page }) => {
    const disabledUpvote = page.locator('button[disabled]:has(img[alt="Upvote"])');
    const count = await disabledUpvote.count();
    if (count > 0) {
      const urlBefore = page.url();
      await disabledUpvote.first().click({ force: true });
      await page.waitForTimeout(500);
      expect(page.url()).toBe(urlBefore);
    } else {
      test.skip();
    }
  });

  // ── Security cases ───────────────────────────────────────────────────────

  test('Security — XSS payload in topic slug does not execute script', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async dialog => {
      alertFired = true;
      await dialog.dismiss();
    });
    await page.goto('/tags/<script>alert(1)</script>');
    await page.waitForLoadState('networkidle');
    expect(alertFired).toBe(false);
  });

  test('Security — XSS payload in query param on topic page does not execute script', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async dialog => {
      alertFired = true;
      await dialog.dismiss();
    });
    await page.goto('/tags/airlines?q=<script>alert(1)</script>');
    await page.waitForLoadState('networkidle');
    expect(alertFired).toBe(false);
  });

  test('Security — SQL injection in topic slug does not crash the page', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto("/tags/' OR 1=1 --");
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test('Security — topic page response sets Strict-Transport-Security (HSTS) header', { tag: '@exploratory' }, async ({ page }) => {
    let hsts: string | undefined;
    page.on('response', response => {
      if (response.url().includes('/tags/')) {
        hsts = response.headers()['strict-transport-security'];
      }
    });
    await topicPage.goToTopicViaHomepageChip();
    expect(hsts).toBeDefined();
    expect(hsts!.length).toBeGreaterThan(0);
  });

  test('Security — topic page response sets X-Frame-Options or CSP to prevent clickjacking', { tag: '@exploratory' }, async ({ page }) => {
    let hasProtection = false;
    page.on('response', response => {
      if (response.url().includes('/tags/')) {
        const headers = response.headers();
        if (headers['x-frame-options'] || headers['content-security-policy']) {
          hasProtection = true;
        }
      }
    });
    await topicPage.goToTopicViaHomepageChip();
    expect(hasProtection).toBe(true);
  });

  test('Security — topic page response does not expose X-Powered-By server info', { tag: '@exploratory' }, async ({ page }) => {
    const exposed: string[] = [];
    page.on('response', response => {
      if (response.url().includes('/tags/')) {
        const header = response.headers()['x-powered-by'];
        if (header) exposed.push(header);
      }
    });
    await topicPage.goToTopicViaHomepageChip();
    expect(exposed).toHaveLength(0);
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  test('Edge — browser tab title includes the topic name', { tag: '@exploratory' }, async ({ page }) => {
    const h1Text = (await topicPage.topicTitle.innerText()).trim().slice(0, 20);
    const pageTitle = await page.title();
    expect(pageTitle.toLowerCase()).toContain(h1Text.toLowerCase());
  });

  test('Edge — topic page has no broken images', { tag: '@exploratory' }, async ({ page }) => {
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const naturalWidth = await images.nth(i).evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });

  test('Edge — topic page has og:title meta tag', { tag: '@exploratory' }, async ({ page }) => {
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).not.toBeNull();
    expect((ogTitle ?? '').trim().length).toBeGreaterThan(0);
  });

  test('Edge — topic page has og:description meta tag', { tag: '@exploratory' }, async ({ page }) => {
    const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content');
    expect(ogDesc).not.toBeNull();
    expect((ogDesc ?? '').trim().length).toBeGreaterThan(0);
  });

  test('Edge — topic page has a canonical link tag pointing to /tags/', { tag: '@exploratory' }, async ({ page }) => {
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).not.toBeNull();
    expect(canonical).toContain('/tags/');
  });

  test('Edge — topic page renders post cards on mobile viewport (375px)', { tag: '@exploratory' }, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/trending');
    await topicPage.waitForPageLoad();
    const chip = page.locator('a[href^="/tags/"]').first();
    await chip.waitFor({ state: 'visible' });
    await chip.click();
    await page.waitForURL(/\/tags\/.+/);
    await expect(topicPage.postCards.first()).toBeVisible();
  });

  test('Edge — Trending and Popular sub-tabs show a different first post', { tag: '@exploratory' }, async () => {
    await topicPage.postCards.first().waitFor({ state: 'visible' });
    const trendingFirst = await topicPage.postCards.first().getAttribute('href');
    await topicPage.switchToPopularTab();
    await topicPage.postCards.first().waitFor({ state: 'visible' });
    const popularFirst = await topicPage.postCards.first().getAttribute('href');
    expect(popularFirst).not.toBe(trendingFirst);
  });

  test('Edge — all sub-tab links have hrefs scoped to the current topic slug', { tag: '@exploratory' }, async ({ page }) => {
    const currentUrl = page.url();
    const slug = currentUrl.split('/tags/')[1]?.split('/')[0];
    expect(slug).toBeTruthy();
    const subTabLinks = await topicPage.allSubTabLinks.all();
    for (const link of subTabLinks) {
      const href = await link.getAttribute('href') ?? '';
      expect(href).toContain(`/tags/${slug}/`);
    }
  });

  test('Edge — topic chip links on post cards point to /tags/ routes', { tag: '@exploratory' }, async () => {
    await topicPage.postCards.first().waitFor({ state: 'visible' });
    const chips = await topicPage.postCardTopicChips.all();
    for (const chip of chips.slice(0, 5)) {
      const href = await chip.getAttribute('href') ?? '';
      expect(href).toMatch(/\/tags\/.+/);
    }
  });

  test('Edge — author links on post cards point to /profile/ routes', { tag: '@exploratory' }, async () => {
    await topicPage.postCards.first().waitFor({ state: 'visible' });
    const authors = await topicPage.postAuthorLinks.all();
    for (const author of authors.slice(0, 5)) {
      const href = await author.getAttribute('href') ?? '';
      expect(href).toContain('/profile/');
    }
  });

  test('Edge — topic page has JSON-LD structured data for SEO', { tag: '@exploratory' }, async ({ page }) => {
    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();
    expect(count).toBeGreaterThanOrEqual(1);
    const content = await jsonLd.first().innerText();
    const parsed = JSON.parse(content);
    expect(parsed['@type']).toBeTruthy();
  });

  test('Edge — Downvote button is visible alongside Upvote on each post card', { tag: '@exploratory' }, async () => {
    await topicPage.postCards.first().waitFor({ state: 'visible' });
    await expect(topicPage.downvoteBtn.first()).toBeVisible();
  });

  test('Edge — clicking Downvote while logged out redirects to /login', { tag: '@exploratory' }, async ({ page }) => {
    await topicPage.postCards.first().waitFor({ state: 'visible' });
    await topicPage.downvoteBtn.first().click();
    await expect(page).toHaveURL(/\/login/);
  });
});

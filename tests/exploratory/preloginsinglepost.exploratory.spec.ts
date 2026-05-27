import { expect, test } from '@playwright/test';
import { PreLoginSinglePostExploratoryPage } from '../../src/pages/exploratory/PreLoginSinglePostExploratory';

test.describe('Flow 3 — Landing → Pre-Login Feed → Single Post View (Exploratory)', () => {
  let flow3: PreLoginSinglePostExploratoryPage;

  test.beforeEach(async ({ page }) => {
    flow3 = new PreLoginSinglePostExploratoryPage(page);
    await flow3.goToLanding();
  });

  // ── Negative cases ───────────────────────────────────────────────────────

  test('Negative — navigating to a non-existent post URL does not show a blank page', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('/post/this-post-does-not-exist-xyz123abc');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
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

  test('Security — post page URL uses HTTPS (no mixed protocol)', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    expect(page.url()).toMatch(/^https:/);
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  test('Edge — reloading the single post page keeps the post title visible', { tag: '@exploratory' }, async ({ page }) => {
    await flow3.goToFeedViaCommunityLink();
    await flow3.openFirstPostCard();
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(flow3.postTitle).toBeVisible();
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
});

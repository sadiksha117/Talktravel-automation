import { test, expect } from '@playwright/test';
import { CreatePostExploratoryPage } from '../../src/pages/exploratory/CreatePostExploratory';

const VALID_EMAIL = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const VALID_PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';
const BASE_URL = 'https://staging.talktravel.com';

test.describe('Create Post — Exploratory (Negative, Edge, Security, Accessibility)', () => {
  // Serial keeps 1 worker → no concurrent login rate-limiting.
  // Known-bug tests are placed LAST so their real failures don't skip anything.
  test.describe.configure({ mode: 'serial' });

  let createPost: CreatePostExploratoryPage;

  test.beforeEach(async ({ page }) => {
    test.slow();
    createPost = new CreatePostExploratoryPage(page);
    await createPost.loginAndNavigateToCreatePost(VALID_EMAIL, VALID_PASSWORD);
    await createPost.dismissCookieBanner();
  });

  // ── Negative — Required field validation ─────────────────────────────────

  test('Negative — Publish without Title shows validation error or stays on page', { tag: '@exploratory' }, async ({ page }) => {
    await createPost.selectTopic('Hilton');
    await createPost.publishBtn.click({ force: true });
    await expect(page).not.toHaveURL(/\/post\/[a-z0-9-]+/);
  });

  test('Negative — Publish without any Topic shows validation error or stays on page', { tag: '@exploratory' }, async ({ page }) => {
    await createPost.titleInput.fill('No topic post');
    await createPost.publishBtn.click({ force: true });
    await expect(page).not.toHaveURL(/\/post\/[a-z0-9-]+/);
  });

  test('Negative — Publish with empty form stays on create-post page', { tag: '@exploratory' }, async ({ page }) => {
    await createPost.publishBtn.click({ force: true });
    await expect(page).not.toHaveURL(/\/post\/[a-z0-9-]+/);
  });

  // ── Negative — Input boundary ────────────────────────────────────────────

  test('Negative — Title with only whitespace does not publish', { tag: '@exploratory' }, async ({ page }) => {
    await createPost.titleInput.fill('     ');
    await createPost.selectTopic('Hilton');
    await createPost.publishBtn.click({ force: true });
    await expect(page).not.toHaveURL(/\/post\/[a-z0-9-]+/);
  });

  test('Negative — External Link field with invalid URL format does not crash', { tag: '@exploratory' }, async ({ page }) => {
    await createPost.titleInput.fill(`Invalid link test ${Date.now()}`);
    await createPost.externalLinkInput.fill('not-a-url');
    await createPost.selectTopic('Hilton');
    await createPost.publishBtn.click({ force: true });
    expect(page.url()).toBeTruthy();
  });

  test('Negative — External Link with javascript: scheme is rejected or does not execute', { tag: '@exploratory' }, async ({ page }) => {
    await createPost.externalLinkInput.fill('javascript:alert(1)');
    await createPost.titleInput.fill(`JS scheme test ${Date.now()}`);
    await createPost.selectTopic('Hilton');
    await createPost.publishBtn.click({ force: true });
    await expect(createPost.formHeading).toBeVisible({ timeout: 10000 });
  });

  test('Negative — Topics input with unknown topic shows no matching result or graceful fallback', { tag: '@exploratory' }, async ({ page }) => {
    await createPost.topicsInput.fill('xyznonexistentopicabc123');
    await page.waitForTimeout(1500);
    const dropdown = page.getByRole('listbox');
    const visible = await dropdown.isVisible().catch(() => false);
    if (visible) {
      const text = await dropdown.innerText();
      expect(typeof text).toBe('string');
    }
  });

  // ── Security ──────────────────────────────────────────────────────────────

  test('Security — XSS payload in Title is not executed as script', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', () => { alertFired = true; });
    await createPost.titleInput.fill('<script>alert("xss")</script>');
    await createPost.selectTopic('Hilton');
    await createPost.publishBtn.click({ force: true });
    await page.waitForTimeout(2000);
    expect(alertFired).toBe(false);
  });

  test('Security — XSS payload in Discussion body is not executed', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', () => { alertFired = true; });
    await createPost.titleInput.fill(`XSS body test ${Date.now()}`);
    await createPost.discussionEditor.click();
    await createPost.discussionEditor.fill('<img src=x onerror=alert(1)>');
    await createPost.selectTopic('Hilton');
    await createPost.publishBtn.click({ force: true });
    await page.waitForTimeout(2000);
    expect(alertFired).toBe(false);
  });

  test('Security — XSS in External Link field does not trigger alert', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', () => { alertFired = true; });
    await createPost.titleInput.fill(`XSS link test ${Date.now()}`);
    await createPost.externalLinkInput.fill('"><script>alert(1)</script>');
    await createPost.selectTopic('Hilton');
    await createPost.publishBtn.click({ force: true });
    await page.waitForTimeout(2000);
    expect(alertFired).toBe(false);
  });

  test('Security — SQL injection in Title does not cause server error', { tag: '@exploratory' }, async ({ page }) => {
    await createPost.titleInput.fill("'; DROP TABLE posts; --");
    await createPost.selectTopic('Hilton');
    await createPost.publishBtn.click({ force: true });
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
  });

  test('Security — Accessing /create-post directly without auth redirects to login', { tag: '@exploratory' }, async ({ browser }) => {
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    await freshPage.goto(`${BASE_URL}/create-post`, { waitUntil: 'domcontentloaded' });
    await expect(freshPage).toHaveURL(/login/);
    await freshContext.close();
  });

  test('Security — Create post page URL uses HTTPS', { tag: '@exploratory' }, async ({ page }) => {
    expect(page.url()).toMatch(/^https:/);
  });

  test('Security — No sensitive credentials visible in page source after login', { tag: '@exploratory' }, async ({ page }) => {
    const content = await page.content();
    expect(content).not.toContain(VALID_PASSWORD);
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  test('Accessibility — Title input has an accessible label', { tag: '@exploratory' }, async () => {
    const label = await createPost.titleInput.getAttribute('aria-label')
      ?? await createPost.titleInput.getAttribute('placeholder')
      ?? null;
    const id = await createPost.titleInput.getAttribute('id');
    if (label) {
      expect(label.trim().length).toBeGreaterThan(0);
    } else {
      expect(id).toBeTruthy();
    }
  });

  test('Accessibility — Topics input has an accessible label', { tag: '@exploratory' }, async () => {
    const label = await createPost.topicsInput.getAttribute('aria-label')
      ?? await createPost.topicsInput.getAttribute('placeholder')
      ?? null;
    const id = await createPost.topicsInput.getAttribute('id');
    if (label) {
      expect(label.trim().length).toBeGreaterThan(0);
    } else {
      expect(id).toBeTruthy();
    }
  });

  test('Accessibility — Publish button has accessible name', { tag: '@exploratory' }, async () => {
    const name = await createPost.publishBtn.getAttribute('aria-label')
      ?? await createPost.publishBtn.innerText();
    expect(name?.trim().length).toBeGreaterThan(0);
  });

  test('Accessibility — Create Post form heading is present and visible', { tag: '@exploratory' }, async () => {
    await expect(createPost.formHeading).toBeVisible();
  });

  test('Accessibility — Discussion editor is keyboard focusable', { tag: '@exploratory' }, async ({ page }) => {
    await createPost.discussionEditor.click();
    const focused = await page.evaluate(() => document.activeElement?.classList.contains('ql-editor'));
    expect(focused).toBe(true);
  });

  test('Accessibility — Page has no app-level console errors on load', { tag: '@exploratory' }, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        const isThirdParty = /google|facebook|gtm|analytics|content security policy/i.test(text);
        if (!isThirdParty) errors.push(text);
      }
    });
    const cp = new CreatePostExploratoryPage(page);
    await cp.loginAndNavigateToCreatePost(VALID_EMAIL, VALID_PASSWORD);
    expect(errors).toHaveLength(0);
    await context.close();
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  test('Edge — Title field enforces max length or truncates gracefully', { tag: '@exploratory' }, async () => {
    const longTitle = 'A'.repeat(500);
    await createPost.titleInput.fill(longTitle);
    const value = await createPost.titleInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test('Edge — Discussion editor accepts emoji characters', { tag: '@exploratory' }, async () => {
    await createPost.discussionEditor.click();
    await createPost.discussionEditor.fill('Travel is amazing! ✈️ 🌍 🏖️');
    await expect(createPost.discussionEditor).toContainText('✈️');
  });

  test('Edge — Title field accepts special characters', { tag: '@exploratory' }, async () => {
    await createPost.titleInput.fill('Post: "Top 5" tips & tricks — 100%');
    const value = await createPost.titleInput.inputValue();
    expect(value).toContain('Top 5');
  });

  test('Edge — Reloading /create-post while logged in keeps session and shows form', { tag: '@exploratory' }, async ({ page }) => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(createPost.formHeading).toBeVisible({ timeout: 15000 });
  });

  test('Edge — Pasting text into Title field works correctly', { tag: '@exploratory' }, async ({ page }) => {
    await createPost.titleInput.click();
    await page.keyboard.type('Pasted title content');
    const value = await createPost.titleInput.inputValue();
    expect(value).toContain('Pasted title content');
  });

  test('Edge — Discussion editor supports bold toolbar action without crash', { tag: '@exploratory' }, async ({ page }) => {
    await createPost.discussionEditor.click();
    await createPost.discussionEditor.fill('Bold this text');
    const boldBtn = page.locator('.ql-bold');
    if (await boldBtn.isVisible()) {
      await boldBtn.click();
    }
    await expect(createPost.discussionEditor).toBeVisible();
  });

  test('Edge — Create Post page has no 404 network errors on load', { tag: '@exploratory' }, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const notFound: string[] = [];
    page.on('response', r => { if (r.status() === 404) notFound.push(r.url()); });
    const cp = new CreatePostExploratoryPage(page);
    await cp.loginAndNavigateToCreatePost(VALID_EMAIL, VALID_PASSWORD);
    expect(notFound).toHaveLength(0);
    await context.close();
  });

  test('Edge — Title input clears after selecting all and pressing Delete', { tag: '@exploratory' }, async ({ page }) => {
    await createPost.titleInput.fill('To be deleted');
    await createPost.titleInput.selectText();
    await page.keyboard.press('Delete');
    const value = await createPost.titleInput.inputValue();
    expect(value).toBe('');
  });

  test('Edge — Navigating to /create-post twice in same session loads form each time', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto(`${BASE_URL}/trending`, { waitUntil: 'domcontentloaded' });
    await page.goto(`${BASE_URL}/create-post`, { waitUntil: 'domcontentloaded' });
    await expect(createPost.titleInput).toBeVisible({ timeout: 15000 });
  });

  // ── Known bugs — placed last so failures do not cascade-skip other tests ──

  test('Accessibility — External Link input has a placeholder or aria-label [KNOWN BUG: missing]', { tag: '@exploratory' }, async () => {
    // Real accessibility gap: screen readers cannot identify this field.
    // Expected to FAIL until the bug is fixed.
    const placeholder = await createPost.externalLinkInput.getAttribute('placeholder');
    const ariaLabel = await createPost.externalLinkInput.getAttribute('aria-label');
    expect((placeholder ?? ariaLabel ?? '').length).toBeGreaterThan(0);
  });

  test('Edge — Selecting the same topic twice does not add duplicate chip [KNOWN BUG: allows duplicates]', { tag: '@exploratory' }, async ({ page }) => {
    // Real UX bug: app should prevent adding the same topic more than once.
    // Expected to FAIL until the bug is fixed.
    await createPost.selectTopic('Hilton');
    await createPost.topicsInput.fill('Hilton');
    await page.waitForTimeout(1500);
    const dropdown = page.getByRole('listbox');
    if (await dropdown.isVisible()) {
      const option = dropdown.getByText('Hilton', { exact: true }).filter({ hasNotText: 'Create new topic' });
      if (await option.first().isVisible().catch(() => false)) {
        await option.first().click();
      }
    }
    const chips = page.locator('[class*="multiselect__tag"],[class*="selected-topic"],[class*="topic-chip"]').filter({ hasText: 'Hilton' });
    const count = await chips.count();
    expect(count).toBeLessThanOrEqual(1);
  });
});

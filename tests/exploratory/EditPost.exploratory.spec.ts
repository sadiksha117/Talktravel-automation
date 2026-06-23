import { test, expect } from '@playwright/test';
import { EditPostExploratoryPage } from '../../src/pages/exploratory/EditPostExploratory';

const VALID_EMAIL    = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const VALID_PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';
const BASE           = 'https://staging.talktravel.com';

/**
 * Edit Post — Exploratory (Edge / Negative / Security / Accessibility).
 *
 * Derived from the edge-case table and "known issues" in docs/Editpost.md.
 * Tests skip gracefully where a precondition can't be established (e.g. no
 * owned post surfaced) rather than failing on environment drift.
 */
test.describe('Edit Post — Exploratory (Edge & Negative)', () => {
  let flow: EditPostExploratoryPage;

  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    flow = new EditPostExploratoryPage(page);
  });

  // ── Authorization / access ───────────────────────────────────────────────

  test('Edge #3 — logged-out access to an /edit URL redirects to login', { tag: '@exploratory' }, async ({ page }) => {
    // No login performed.
    await page.goto(`${BASE}/post/some-post-slug/edit`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    const onLogin = /\/login/.test(page.url());
    const hasPasswordField = await flow.loginForm.isVisible({ timeout: 5000 }).catch(() => false);
    // Logged-out users must NOT be left on a usable edit form.
    const titleVisible = await flow.titleInput.isVisible({ timeout: 2000 }).catch(() => false);
    expect(onLogin || hasPasswordField).toBe(true);
    expect(titleVisible).toBe(false);
  });

  test('Edge #4 — direct navigation to /post/{nonexistent}/edit shows an error, not a usable form', { tag: '@exploratory' }, async ({ page }) => {
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.gotoEdit('this-post-does-not-exist-xyz123abc');
    await page.waitForLoadState('networkidle').catch(() => {});
    const titleVisible = await flow.titleInput.isVisible({ timeout: 3000 }).catch(() => false);
    const errorShown = await flow.notFound.isVisible({ timeout: 3000 }).catch(() => false);
    const redirected = !flow.isOnEditUrl();
    expect(titleVisible).toBe(false);
    expect(errorShown || redirected).toBe(true);
  });

  test('Edge #1 — owner direct navigation to the edit URL loads a pre-filled form', { tag: '@exploratory' }, async ({ page }) => {
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.openFirstPost();
    const opened = await flow.openEditFromSinglePost();
    test.skip(!opened, 'Trending feed did not surface a post owned by the test account');
    const slug = flow.currentPostSlug();
    // Re-navigate directly to the same edit URL to exercise the direct-nav path.
    await flow.gotoEdit(slug);
    await expect(flow.titleInput).toBeVisible({ timeout: 15000 });
    await expect(flow.titleInput).not.toHaveValue('');
  });

  // ── Validation edge cases ────────────────────────────────────────────────

  test('Edge #10 — whitespace-only Title is rejected on Update', { tag: '@exploratory' }, async ({ page }) => {
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.openFirstPost();
    const opened = await flow.openEditFromSinglePost();
    test.skip(!opened, 'No owned post available to edit');
    await flow.titleInput.fill('     ');
    await flow.submitUpdate();
    // Whitespace should be treated as empty → stays on the edit form.
    await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });
  });

  test('Edge #18 — invalid External Link URL surfaces a validation error', { tag: '@exploratory' }, async ({ page }) => {
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.openFirstPost();
    const opened = await flow.openEditFromSinglePost();
    test.skip(!opened, 'No owned post available to edit');
    await flow.externalLinkInput.fill('not-a-url');
    // Trigger validation via Fetch Title if present, else Update.
    if (await flow.fetchTitleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await flow.fetchTitleBtn.click();
    } else {
      await flow.submitUpdate();
    }
    await expect(
      page.getByText(/invalid.*url|valid url|enter a valid/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Edge #14 — adding a duplicate topic does not create a second chip', { tag: '@exploratory' }, async ({ page }) => {
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.openFirstPost();
    const opened = await flow.openEditFromSinglePost();
    test.skip(!opened, 'No owned post available to edit');
    await flow.selectTopic('Hilton').catch(() => test.skip(true, 'Hilton topic not selectable'));
    const afterFirst = await flow.selectedTopicChips.filter({ hasText: 'Hilton' }).count();
    await flow.selectTopic('Hilton').catch(() => {});
    const afterSecond = await flow.selectedTopicChips.filter({ hasText: 'Hilton' }).count();
    expect(afterSecond).toBe(afterFirst);
  });

  // ── Security ─────────────────────────────────────────────────────────────

  test('Security — XSS payload in the edit slug does not execute script', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await page.goto(`${BASE}/post/<script>alert(1)</script>/edit`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(alertFired).toBe(false);
  });

  test('Security — XSS typed into the Title is not executed after Update', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.openFirstPost();
    const opened = await flow.openEditFromSinglePost();
    test.skip(!opened, 'No owned post available to edit');
    await flow.titleInput.fill('<img src=x onerror=alert(1)>');
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await expect.poll(() => alertFired, { timeout: 3000 }).toBe(false);
  });

  test('Security — edit page response sets a clickjacking protection header', { tag: '@exploratory' }, async ({ page }) => {
    let hasProtection = false;
    page.on('response', res => {
      if (res.url().includes('/edit') || res.url().includes('/post/')) {
        const h = res.headers();
        if (h['x-frame-options'] || (h['content-security-policy'] ?? '').includes('frame-ancestors')) {
          hasProtection = true;
        }
      }
    });
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.openFirstPost();
    const opened = await flow.openEditFromSinglePost();
    test.skip(!opened, 'No owned post available to edit');
    expect(hasProtection).toBe(true);
  });

  // ── Persistence / behavior ───────────────────────────────────────────────

  test('Edge #6 — refreshing mid-edit resets the form to stored values (no draft persistence)', { tag: '@exploratory' }, async ({ page }) => {
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.openFirstPost();
    const opened = await flow.openEditFromSinglePost();
    test.skip(!opened, 'No owned post available to edit');
    const original = await flow.titleInput.inputValue();
    await flow.titleInput.fill('Unsaved draft that should not persist');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await flow.titleInput.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await expect(flow.titleInput).toHaveValue(original);
  });

  test('Edge #22 — browser back from the edit form leaves the edit URL', { tag: '@exploratory' }, async ({ page }) => {
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.openFirstPost();
    const opened = await flow.openEditFromSinglePost();
    test.skip(!opened, 'No owned post available to edit');
    await page.goBack().catch(() => {});
    await page.waitForTimeout(1000);
    expect(flow.isOnEditUrl()).toBe(false);
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  test('Accessibility — Title input has an accessible name', { tag: '@exploratory' }, async ({ page }) => {
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.openFirstPost();
    const opened = await flow.openEditFromSinglePost();
    test.skip(!opened, 'No owned post available to edit');
    await expect(flow.titleInput).toBeVisible();
    const name = await flow.titleInput.getAttribute('aria-label')
      ?? await flow.titleInput.getAttribute('placeholder')
      ?? await flow.titleInput.getAttribute('name');
    expect(name && name.length > 0).toBe(true);
  });

  test('Edge #29 — at 375px the edit form fields remain visible and usable', { tag: '@exploratory' }, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.openFirstPost();
    const opened = await flow.openEditFromSinglePost();
    test.skip(!opened, 'No owned post available to edit');
    await expect(flow.titleInput).toBeVisible();
    await expect(flow.updatePostBtn).toBeVisible();
  });
});

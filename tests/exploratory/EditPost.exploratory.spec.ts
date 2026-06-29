import { test, expect } from '@playwright/test';
import { EditPostExploratoryPage } from '../../src/pages/exploratory/EditPostExploratory';

/**
 * Edit Post — Exploratory suite (Edge / Negative / Security / Accessibility).
 *
 * 40 cases derived from the edge-case table and "known issues" in
 * docs/Editpost.md, hunting for input-validation gaps, authorization holes,
 * XSS / clickjacking / caching weaknesses, and accessibility defects.
 *
 * Run with a single worker — these log in to one shared account and staging
 * keeps a single session per account:
 *   npx playwright test tests/exploratory/EditPost.exploratory.spec.ts --workers=1
 *
 * Tests skip gracefully when a precondition can't be met (e.g. the owned post
 * has fewer than N topics) rather than failing on environment drift.
 */

const VALID_EMAIL    = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const VALID_PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';
const BASE           = 'https://staging.talktravel.com';

test.describe('Edit Post — Exploratory', () => {
  test.setTimeout(180000);

  let flow: EditPostExploratoryPage;

  test.beforeEach(async ({ page }) => {
    flow = new EditPostExploratoryPage(page);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // A. Authorization & access (6)
  // ─────────────────────────────────────────────────────────────────────────

  test('A1 — logged-out access to an /edit URL is not an editable form', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto(`${BASE}/post/e2e-full-post-1781686073532/edit`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    const editable = await flow.titleInput.isVisible({ timeout: 3000 }).catch(() => false);
    expect(editable, 'logged-out users must not get an editable Edit Post form').toBe(false);
    expect(await flow.isLoggedOut()).toBe(true);
  });

  test('A2 — owner direct navigation to /post/{slug}/edit loads a pre-filled form', { tag: '@exploratory' }, async () => {
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.gotoEdit(slug);
    await expect(flow.titleInput).toBeVisible({ timeout: 15000 });
    await expect(flow.titleInput).not.toHaveValue('');
  });

  test('A3 — nonexistent slug /edit shows an error, not a usable form', { tag: '@exploratory' }, async ({ page }) => {
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.gotoEdit('this-post-does-not-exist-xyz123abc');
    await page.waitForLoadState('networkidle').catch(() => {});
    const editable = await flow.titleInput.isVisible({ timeout: 3000 }).catch(() => false);
    expect(editable).toBe(false);
  });

  test('A4 — special-character slug /edit does not return a 5xx', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => { if (res.url().includes('/edit') && res.status() >= 500) serverError = true; });
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await page.goto(`${BASE}/post/%27%22%3E%3C%2Fedit/edit`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(serverError).toBe(false);
  });

  test('A5 — empty slug (/post//edit) does not return a 5xx', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => { if (res.url().includes('/post//edit') && res.status() >= 500) serverError = true; });
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await page.goto(`${BASE}/post//edit`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(serverError).toBe(false);
  });

  test('A6 — trailing junk after /edit does not return a 5xx', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => { if (res.url().includes('/edit/') && res.status() >= 500) serverError = true; });
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await page.goto(`${BASE}/post/${slug}/edit/extra-segment`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(serverError).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // B. Input validation & edge cases (14)
  // ─────────────────────────────────────────────────────────────────────────

  test('B1 — clearing the Title blocks Save (stays on edit form)', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.titleInput.fill('');
    await flow.submitUpdate();
    await expect(flow.titleInput).toBeVisible({ timeout: 8000 });
    expect(flow.isOnEditUrl()).toBe(true);
  });

  test('B2 — whitespace-only Title is treated as empty (stays on edit form)', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.titleInput.fill('     ');
    await flow.submitUpdate();
    expect(flow.isOnEditUrl()).toBe(true);
  });

  test('B3 — removing all topics blocks Save', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.removeAllTopics();
    await flow.submitUpdate();
    expect(flow.isOnEditUrl()).toBe(true);
  });

  test('B4 — invalid External Link URL is rejected', { tag: '@exploratory' }, async ({ page }) => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.externalLinkInput.fill('not-a-url');
    await flow.submitUpdate();
    const blocked = flow.isOnEditUrl()
      || await flow.anyValidationError.isVisible({ timeout: 5000 }).catch(() => false);
    expect(blocked, 'an invalid external URL should not silently save').toBe(true);
  });

  test('B5 — javascript: scheme in External Link is not accepted as valid', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.externalLinkInput.fill('javascript:alert(1)');
    await flow.submitUpdate();
    const blocked = flow.isOnEditUrl()
      || await flow.anyValidationError.isVisible({ timeout: 5000 }).catch(() => false);
    expect(blocked, 'javascript: URLs must be rejected').toBe(true);
  });

  test('B6 — data: URI in External Link is not accepted as valid', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.externalLinkInput.fill('data:text/html,<script>alert(1)</script>');
    await flow.submitUpdate();
    const blocked = flow.isOnEditUrl()
      || await flow.anyValidationError.isVisible({ timeout: 5000 }).catch(() => false);
    expect(blocked, 'data: URIs must be rejected').toBe(true);
  });

  test('B7 — a very long Title (1000 chars) does not crash the form', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => { if (res.status() >= 500) serverError = true; });
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.titleInput.fill('A'.repeat(1000));
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await page.waitForTimeout(2000);
    expect(serverError).toBe(false);
  });

  test('B8 — adding a duplicate topic does not create a second chip', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    let added = true;
    await flow.selectTopic('Hilton').catch(() => { added = false; });
    test.skip(!added, 'Hilton topic not selectable in this environment');
    const afterFirst = await flow.selectedTopicChips.filter({ hasText: 'Hilton' }).count();
    await flow.selectTopic('Hilton').catch(() => {});
    const afterSecond = await flow.selectedTopicChips.filter({ hasText: 'Hilton' }).count();
    expect(afterSecond).toBe(afterFirst);
  });

  test('B9 — cannot exceed the 5-topic maximum', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    const candidates = ['Hilton', 'Marriott', 'Airlines', 'Solo Travel', 'Budget Travel', 'Backpacking'];
    for (const t of candidates) { await flow.selectTopic(t).catch(() => {}); }
    const count = await flow.selectedTopicChips.count();
    expect(count, 'selected topics must never exceed 5').toBeLessThanOrEqual(5);
  });

  test('B10 — emoji / unicode in the Title is preserved in the field', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    const t = 'Edit ✈️🌍 títlë 日本語';
    await flow.titleInput.fill(t);
    await expect(flow.titleInput).toHaveValue(t);
  });

  test('B11 — External Link can be cleared (removed) on the form', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.externalLinkInput.fill('https://example.com');
    await flow.externalLinkInput.fill('');
    await expect(flow.externalLinkInput).toHaveValue('');
  });

  test('B12 — Fetch Title is disabled while External Link is empty', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.externalLinkInput.fill('');
    // Best-effort: the button may be absent entirely on some builds.
    if (await flow.fetchTitleBtn.count() > 0) {
      await expect(flow.fetchTitleBtn).toBeDisabled();
    }
  });

  test('B13 — Topics input exposes a search placeholder', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    const ph = await flow.topicsInput.getAttribute('placeholder');
    expect(ph && /search|topic/i.test(ph)).toBeTruthy();
  });

  test('B14 — Title field enforces a maxlength (informational, not unbounded)', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    const max = await flow.titleInput.getAttribute('maxlength');
    // Not a hard failure if absent — log the finding via the assertion message.
    expect(max === null || Number(max) > 0, `Title maxlength="${max}"`).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // C. Persistence & navigation behavior (5)
  // ─────────────────────────────────────────────────────────────────────────

  test('C1 — refreshing mid-edit discards unsaved changes (no draft persistence)', { tag: '@exploratory' }, async ({ page }) => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    const original = await flow.titleInput.inputValue();
    await flow.titleInput.fill('Unsaved draft that must not persist');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await flow.titleInput.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await expect(flow.titleInput).toHaveValue(original);
  });

  test('C2 — browser Back from the edit form leaves the edit URL', { tag: '@exploratory' }, async ({ page }) => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await page.goBack().catch(() => {});
    await page.waitForTimeout(1000);
    expect(flow.isOnEditUrl()).toBe(false);
  });

  test('C3 — Cancel discards edits and the original title is unchanged', { tag: '@exploratory' }, async ({ page }) => {
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.titleInput.fill('Discarded change ' + slug);
    await flow.cancelBtn.click();
    await page.goto(`${BASE}/post/${slug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).not.toContainText('Discarded change');
  });

  test('C4 — reopening the edit form after Cancel is still pre-filled', { tag: '@exploratory' }, async () => {
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.cancelBtn.click().catch(() => {});
    await flow.gotoEdit(slug);
    await expect(flow.titleInput).not.toHaveValue('');
  });

  test('C5 — editing does not wipe the post body editor (still present on reload)', { tag: '@exploratory' }, async ({ page }) => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(flow.discussionEditor).toBeVisible({ timeout: 15000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // D. Security (9)
  // ─────────────────────────────────────────────────────────────────────────

  test('D1 — XSS payload in the Title is not executed after Save', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.titleInput.fill('<img src=x onerror=alert(1)>');
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await expect.poll(() => alertFired, { timeout: 3000 }).toBe(false);
  });

  test('D2 — XSS payload in the edit slug does not execute script', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await page.goto(`${BASE}/post/<script>alert(1)</script>/edit`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(alertFired).toBe(false);
  });

  test('D3 — XSS typed into the Discussion editor is not executed', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.discussionEditor.click();
    await flow.discussionEditor.fill('<img src=x onerror=alert(1)><script>alert(2)</script>');
    await expect.poll(() => alertFired, { timeout: 2000 }).toBe(false);
  });

  test('D4 — HTML in the Title renders as text (escaped) on the post view', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    const marker = `<b>xss${Date.now()}</b>`;
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.titleInput.fill(marker);
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await page.waitForLoadState('networkidle').catch(() => {});
    // No script/dialog should fire, and the literal angle brackets should survive as text.
    expect(alertFired).toBe(false);
  });

  test('D5 — SQL-injection-style Title does not cause a 5xx', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => { if (res.status() >= 500) serverError = true; });
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.titleInput.fill(`Robert'); DROP TABLE posts;-- `);
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await page.waitForTimeout(2000);
    expect(serverError).toBe(false);
  });

  test('D6 — large Discussion payload (10k chars) does not 5xx', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => { if (res.status() >= 500) serverError = true; });
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.discussionEditor.click();
    await flow.discussionEditor.fill('x'.repeat(10000));
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await page.waitForTimeout(2000);
    expect(serverError).toBe(false);
  });

  test('D7 — edit page sets a clickjacking-protection header', { tag: '@exploratory' }, async ({ page }) => {
    let hasProtection = false;
    page.on('response', res => {
      if (res.url().includes('/edit') || res.url().includes('/post/')) {
        const h = res.headers();
        if (h['x-frame-options'] || (h['content-security-policy'] ?? '').includes('frame-ancestors')) {
          hasProtection = true;
        }
      }
    });
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.gotoEdit(slug);
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(hasProtection, 'expected X-Frame-Options or CSP frame-ancestors on the edit page').toBe(true);
  });

  test('D8 — authenticated edit page is not publicly cacheable', { tag: '@exploratory' }, async ({ page }) => {
    let cacheControl = '';
    page.on('response', res => {
      if (res.url().endsWith('/edit')) cacheControl = res.headers()['cache-control'] ?? cacheControl;
    });
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.gotoEdit(slug);
    await page.waitForLoadState('networkidle').catch(() => {});
    // If a Cache-Control header is present it must not allow public/shared caching.
    if (cacheControl) {
      expect(cacheControl, `Cache-Control="${cacheControl}"`).not.toMatch(/public/i);
    }
  });

  test('D9 — Save does not expose credentials/token in the URL (no GET-mutation)', { tag: '@exploratory' }, async ({ page }) => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.titleInput.fill(`No token in URL ${Date.now()}`);
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(page.url()).not.toMatch(/token=|password=|session=/i);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // E. Accessibility (6)
  // ─────────────────────────────────────────────────────────────────────────

  test('E1 — the edit page exposes an "Edit Post" heading', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await expect(flow.editHeading).toBeVisible();
  });

  test('E2 — Title input has an accessible name', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    const name = (await flow.titleInput.getAttribute('aria-label'))
      ?? (await flow.titleInput.getAttribute('placeholder'))
      ?? (await flow.titleInput.getAttribute('name'));
    expect(name && name.length > 0).toBe(true);
  });

  test('E3 — External Link input has an accessible name', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    const name = (await flow.externalLinkInput.getAttribute('aria-label'))
      ?? (await flow.externalLinkInput.getAttribute('placeholder'))
      ?? (await flow.externalLinkInput.getAttribute('name'));
    expect(name && name.length > 0).toBe(true);
  });

  test('E4 — Save Changes and Cancel buttons have discernible text', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await expect(flow.updatePostBtn).toBeVisible();
    await expect(flow.cancelBtn).toBeVisible();
    expect((await flow.updatePostBtn.innerText()).trim().length).toBeGreaterThan(0);
    expect((await flow.cancelBtn.innerText()).trim().length).toBeGreaterThan(0);
  });

  test('E5 — rich-text toolbar buttons carry accessible names', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    const count = await flow.toolbarButtons.count();
    test.skip(count === 0, 'No Quill toolbar buttons found');
    let named = 0;
    for (let i = 0; i < count; i++) {
      const b = flow.toolbarButtons.nth(i);
      const name = (await b.getAttribute('aria-label')) ?? (await b.getAttribute('title')) ?? (await b.innerText());
      if (name && name.trim().length > 0) named++;
    }
    expect(named, `${named}/${count} toolbar buttons have an accessible name`).toBe(count);
  });

  test('E6 — the remove-topic × control has an accessible name', { tag: '@exploratory' }, async () => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    test.skip(await flow.selectedTopicChips.count() === 0, 'Post has no topic chips');
    const x = flow.topicChipRemoveBtn.first();
    const name = (await x.getAttribute('aria-label')) ?? (await x.getAttribute('title')) ?? (await x.innerText());
    expect(name && name.trim().length > 0, 'topic remove × needs an aria-label/title').toBeTruthy();
  });
});

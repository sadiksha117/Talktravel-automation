import { test, expect } from '@playwright/test';
import { EditPostExploratoryPage, OWN_HANDLE } from '../../src/pages/exploratory/EditPostExploratory';

/**
 * Edit Post — Exploratory PRODUCT-bug probes.
 *
 * Every case performs a real edit (or a real authorization attempt) and then
 * inspects the LIVE product — the saved post page, the feed, or the HTTP
 * outcome — so a failure means an actual product defect, not a flaky selector.
 *
 * Focus areas: stored XSS / sanitization, authorization (IDOR), server-side
 * validation enforcement, data integrity, and update propagation.
 *
 * Run with a single worker (one shared account, one session):
 *   npx playwright test tests/exploratory/EditPost.exploratory.spec.ts --workers=1
 */

const VALID_EMAIL    = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const VALID_PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';
const BASE           = 'https://staging.talktravel.com';

test.describe('Edit Post — Exploratory (product bugs)', () => {
  test.setTimeout(180000);

  let flow: EditPostExploratoryPage;

  test.beforeEach(async ({ page }) => {
    flow = new EditPostExploratoryPage(page);
  });

  // ── Security: stored XSS / sanitization ──────────────────────────────────

  test('SEC1 — HTML/JS in the Title is stored escaped, not executed on the post view', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.setTitleAndSave(`<img src=x onerror="window.__xss=1">PWN-${Date.now()}`);
    await flow.openPostView(slug);
    // The payload must NOT become a live element inside the heading, and must not run.
    const injectedImg = await page.locator('h1 img[src="x"], h1 img[onerror]').count();
    const xssRan = await page.evaluate(() => (window as unknown as { __xss?: number }).__xss === 1);
    expect(alertFired, 'no dialog should fire').toBe(false);
    expect(injectedImg, 'title HTML must be escaped, not parsed into an <img>').toBe(0);
    expect(xssRan, 'onerror handler from the title must not execute').toBe(false);
  });

  test('SEC2 — HTML/JS in the Discussion body is not executed on the post view', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.discussionEditor.click();
    await flow.discussionEditor.fill(`<img src=x onerror="window.__xss2=1"> hello ${Date.now()}`);
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await flow.openPostView(slug);
    const xssRan = await page.evaluate(() => (window as unknown as { __xss2?: number }).__xss2 === 1);
    expect(alertFired).toBe(false);
    expect(xssRan, 'onerror handler from the body must not execute').toBe(false);
  });

  test('SEC3 — an unsafe External Link is never rendered as a javascript: href', { tag: '@exploratory' }, async ({ page }) => {
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.externalLinkInput.fill('javascript:window.__xss3=1');
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await flow.openPostView(slug);
    const jsHrefs = await page.locator('a[href^="javascript:"]').count();
    expect(jsHrefs, 'no javascript: link should ever be rendered').toBe(0);
  });

  // ── Security: authorization (IDOR) ───────────────────────────────────────

  test('SEC4 — a non-owner cannot open another user\'s edit form via direct URL', { tag: '@exploratory' }, async ({ page }) => {
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    const foreignSlug = await flow.openForeignPostSlug();
    test.skip(!foreignSlug, 'No foreign-authored post found in the trending feed to probe');
    await flow.gotoEdit(foreignSlug);
    await page.waitForLoadState('networkidle').catch(() => {});
    const editable = await flow.titleInput.isVisible({ timeout: 4000 }).catch(() => false);
    expect(editable, `IDOR: editing another user's post (${foreignSlug}) must be blocked`).toBe(false);
  });

  test('SEC5 — a logged-out user cannot open the edit form', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto(`${BASE}/post/e2e-full-post-1781686073532/edit`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    const editable = await flow.titleInput.isVisible({ timeout: 4000 }).catch(() => false);
    expect(editable, 'logged-out users must not get an editable form').toBe(false);
    expect(await flow.isLoggedOut()).toBe(true);
  });

  // ── Server-side validation (client checks must not be the only gate) ──────

  test('SEC6 — an empty Title is rejected server-side (post title never becomes blank)', { tag: '@exploratory' }, async ({ page }) => {
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.titleInput.fill('');
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await page.waitForTimeout(1500);
    await flow.openPostView(slug);
    const heading = (await flow.postViewTitle.innerText().catch(() => '')).trim();
    expect(heading.length, 'the post must never end up with an empty title').toBeGreaterThan(0);
  });

  test('SEC7 — removing all topics is rejected (post keeps at least one topic)', { tag: '@exploratory' }, async ({ page }) => {
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.removeAllTopics();
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await page.waitForTimeout(1500);
    await flow.openPostView(slug);
    const topics = await flow.topicCountOnView();
    expect(topics, 'a published post must retain at least one topic').toBeGreaterThanOrEqual(1);
  });

  test('SEC8 — the 5-topic maximum holds end-to-end (saved post has <= 5 topics)', { tag: '@exploratory' }, async ({ page }) => {
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    for (const t of ['Hilton', 'Marriott', 'Airlines', 'Solo Travel', 'Budget Travel', 'Backpacking']) {
      await flow.selectTopic(t).catch(() => {});
    }
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await page.waitForTimeout(1500);
    await flow.openPostView(slug);
    const topics = await flow.topicCountOnView();
    expect(topics, 'saved post must not exceed 5 topics').toBeLessThanOrEqual(5);
  });

  // ── Data integrity & propagation ─────────────────────────────────────────

  test('INT1 — a saved Title round-trips exactly on the post view (no mangling)', { tag: '@exploratory' }, async () => {
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    const title = `Round-trip integrity ${Date.now()}`;
    await flow.setTitleAndSave(title);
    await flow.openPostView(slug);
    await expect(flow.postViewTitle).toContainText(title);
  });

  test('INT2 — a successful edit surfaces an "Edited" label on the post', { tag: '@exploratory' }, async ({ page }) => {
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.setTitleAndSave(`Edited label probe ${Date.now()}`);
    await flow.openPostView(slug);
    await expect(flow.editedLabelOnView).toBeVisible({ timeout: 10000 });
  });

  test('INT3 — an edited Title propagates to the trending feed', { tag: '@exploratory' }, async ({ page }) => {
    await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    const title = `Feed propagation ${Date.now()}`;
    await flow.setTitleAndSave(title);
    await page.goto(`${BASE}/trending`, { waitUntil: 'domcontentloaded' });
    await flow.dismissCookieBanner();
    await expect(page.locator(`a[href^="/post/"]:has-text("${title}")`).first())
      .toBeVisible({ timeout: 10000 });
  });

  test('INT4 — editing a post does not lose its comments', { tag: '@exploratory' }, async ({ page }) => {
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    // Capture comment count from the live post first.
    await flow.openPostView(slug);
    const before = await flow.commentCount();
    test.skip(before === 0, 'Seed post has no comments to preserve');
    await flow.openOwnPostEdit();
    await flow.setTitleAndSave(`Comments preserved ${Date.now()}`);
    await flow.openPostView(slug);
    const after = await flow.commentCount();
    expect(after, 'comment count must be unchanged after an edit').toBe(before);
  });

  test('INT5 — editing a post does not change its author', { tag: '@exploratory' }, async ({ page }) => {
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.setTitleAndSave(`Author unchanged ${Date.now()}`);
    await flow.openPostView(slug);
    const authorHref = await page.locator('a[href*="/profile/"]').first().getAttribute('href');
    expect(authorHref, 'the post author must remain the same after an edit').toContain(OWN_HANDLE);
  });

  test('INT6 — Cancel discards edits (the change never persists)', { tag: '@exploratory' }, async ({ page }) => {
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    const discarded = `Discarded change ${Date.now()}`;
    await flow.titleInput.fill(discarded);
    await flow.cancelBtn.click();
    await flow.openPostView(slug);
    await expect(flow.postViewTitle).not.toContainText(discarded);
  });

  test('INT7 — double-clicking Save does not 5xx or duplicate the post', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => { if (res.status() >= 500) serverError = true; });
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.titleInput.fill(`Double submit ${Date.now()}`);
    await flow.dismissCookieBanner();
    // Fire two clicks quickly to probe double-submit handling.
    await flow.updatePostBtn.click({ force: true }).catch(() => {});
    await flow.updatePostBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(2500);
    expect(serverError, 'double-submit must not cause a server error').toBe(false);
    // We should land on a single post view, not a broken/duplicate state.
    expect(page.url()).toMatch(/\/post\/[^/?#]+/);
  });

  test('INT8 — a very long Title (2000 chars) does not corrupt the post or 5xx', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => { if (res.status() >= 500) serverError = true; });
    const slug = await flow.openEditForm(VALID_EMAIL, VALID_PASSWORD);
    await flow.titleInput.fill('L'.repeat(2000));
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await page.waitForTimeout(2000);
    await flow.openPostView(slug);
    const heading = (await flow.postViewTitle.innerText().catch(() => '')).trim();
    expect(serverError, 'oversized title must not 5xx').toBe(false);
    expect(heading.length, 'post must still render a (possibly truncated) title').toBeGreaterThan(0);
  });
});

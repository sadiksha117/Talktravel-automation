import { test, expect } from '@playwright/test';
import { EditPostExploratoryPage, OWN_HANDLE } from '../../src/pages/exploratory/EditPostExploratory';

/**
 * Edit Post — 40 Exploratory PRODUCT-bug probes.
 *
 * PER-TEST ISOLATION: the "owner edit cases" block creates a FRESH post in
 * beforeEach and opens its edit form, so tests never share/pollute a post.
 * Editing the Title regenerates the slug, so save helpers return the post-save
 * slug and views use that; postViewLoaded() guards every view.
 *
 * The deepest probes replay the app's own update request maliciously to test
 * the SERVER (unauth write, mass-assignment, empty-title). They fall back to a
 * UI assertion if the request shape can't be captured — no false skips.
 *
 * Run single-worker (one shared account/session):
 *   npx playwright test tests/exploratory/EditPost.exploratory.spec.ts --workers=1
 */

const VALID_EMAIL    = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const VALID_PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';
const BASE           = 'https://staging.talktravel.com';

/** Copy of the JSON body with `title` blanked (best effort). */
function withBlankTitle(body: string | null): string | null {
  if (!body) return body;
  try { const j = JSON.parse(body); if ('title' in j) j.title = ''; return JSON.stringify(j); }
  catch { return body.replace(/("title"\s*:\s*")[^"]*(")/i, '$1$2'); }
}

/** Copy of the JSON body with privileged fields injected. */
function withInjectedFields(body: string | null): string | null {
  if (!body) return body;
  try {
    const j = JSON.parse(body);
    Object.assign(j, { user_id: 999999, author: 'hacker', authorId: 999999, upvotes: 99999, votes: 99999 });
    return JSON.stringify(j);
  } catch { return body; }
}

// ─────────────────────────────────────────────────────────────────────────
// Owner edit cases — each test starts on a FRESH post's edit form.
// ─────────────────────────────────────────────────────────────────────────
test.describe('Edit Post — Exploratory (owner edit cases)', () => {
  test.setTimeout(180000);

  let flow: EditPostExploratoryPage;
  let freshSlug: string;

  test.beforeEach(async ({ page }) => {
    flow = new EditPostExploratoryPage(page);
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    // Fresh, isolated post per test; seed one topic so remove-all starts valid.
    freshSlug = await flow.createFreshPostForEditing({
      title: `Test post ${Date.now()}`,
      body: 'Test body',
      topics: ['Hilton'],
    });
    await flow.gotoEdit(freshSlug);
  });

  // ── Stored XSS / sanitization (7) ───────────────────────────────────────

  test('SEC1 — HTML/JS in the Title is escaped, not executed, on the post view', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    const slug = await flow.setTitleAndSave(`<img src=x onerror="window.__xss=1">PWN-${Date.now()}`);
    await flow.openPostView(slug);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    const injectedImg = await page.locator('h1 img[src="x"], h1 img[onerror]').count();
    const xssRan = await page.evaluate(() => (window as unknown as { __xss?: number }).__xss === 1);
    expect(alertFired).toBe(false);
    expect(injectedImg, 'title HTML must be escaped, not parsed into an <img>').toBe(0);
    expect(xssRan, 'onerror from the title must not execute').toBe(false);
  });

  test('SEC2 — HTML/JS in the Discussion body is not executed on the post view', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    const slug = await flow.setDiscussionAndSave(`<img src=x onerror="window.__xss2=1"> body ${Date.now()}`);
    await flow.openPostView(slug);
    const xssRan = await page.evaluate(() => (window as unknown as { __xss2?: number }).__xss2 === 1);
    expect(alertFired).toBe(false);
    expect(xssRan, 'onerror from the body must not execute').toBe(false);
  });

  test('SEC3 — an unsafe External Link is never rendered as a javascript: href', { tag: '@exploratory' }, async ({ page }) => {
    const slug = await flow.setExternalLinkAndSave('javascript:window.__xss3=1');
    await flow.openPostView(slug);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    expect(await page.locator('a[href^="javascript:"]').count(), 'no javascript: link should render').toBe(0);
  });

  test('SEC4 — a stored XSS Title does not execute on the trending feed', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    await flow.setTitleAndSave(`<img src=x onerror="window.__xssfeed=1">FEED-${Date.now()}`);
    await page.goto(`${BASE}/trending`, { waitUntil: 'domcontentloaded' });
    await flow.dismissCookieBanner();
    await page.waitForTimeout(1500);
    const ran = await page.evaluate(() => (window as unknown as { __xssfeed?: number }).__xssfeed === 1);
    expect(alertFired).toBe(false);
    expect(ran, 'feed card must escape the title').toBe(false);
  });

  test('SEC5 — an event-handler attribute in the Title does not survive as an attribute', { tag: '@exploratory' }, async ({ page }) => {
    const slug = await flow.setTitleAndSave(`hi" onmouseover="window.__xss5=1" data-x="${Date.now()}`);
    await flow.openPostView(slug);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    expect(await page.locator('h1 [onmouseover]').count(), 'injected onmouseover must not become a real attribute').toBe(0);
  });

  test('SEC6 — an <iframe> in the Discussion is not rendered on the post view', { tag: '@exploratory' }, async ({ page }) => {
    const slug = await flow.setDiscussionAndSave(`<iframe src="https://evil.example.com"></iframe> txt ${Date.now()}`);
    await flow.openPostView(slug);
    expect(await page.locator('iframe[src*="evil.example.com"]').count(), 'untrusted iframe must be stripped').toBe(0);
  });

  test('SEC7 — an entity-encoded script payload is not decoded into a live script', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    const slug = await flow.setTitleAndSave(`&lt;script&gt;window.__xss7=1&lt;/script&gt; ${Date.now()}`);
    await flow.openPostView(slug);
    const ran = await page.evaluate(() => (window as unknown as { __xss7?: number }).__xss7 === 1);
    expect(alertFired).toBe(false);
    expect(ran).toBe(false);
  });

  // ── Server-layer authorization / validation via request replay (4) ──────

  test('SEC12 — the update API rejects an UNAUTHENTICATED write (no cookie)', { tag: '@exploratory' }, async ({ page, context }) => {
    const req = await flow.captureUpdateRequest(`Auth probe ${Date.now()}`);
    if (!req) {
      await context.clearCookies();
      await page.goto(`${BASE}/post/${freshSlug}/edit`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      expect(await flow.titleInput.isVisible({ timeout: 4000 }).catch(() => false)).toBe(false);
      return;
    }
    await context.clearCookies();
    const status = await flow.replayUpdate(req, req.body, { cookie: '' });
    expect(status, `unauthenticated update returned ${status}; must be 401/403/302, never 2xx`).toBeGreaterThanOrEqual(400);
  });

  test('SEC13 — the update API ignores injected privileged fields (mass-assignment)', { tag: '@exploratory' }, async () => {
    const title = `Mass assign ${Date.now()}`;
    const req = await flow.captureUpdateRequest(title);
    if (!req) {
      const slug = await flow.setTitleAndSave(`Author check ${Date.now()}`);
      await flow.openPostView(slug);
      expect(await flow.postAuthorHref()).toContain(OWN_HANDLE);
      return;
    }
    await flow.replayUpdate(req, withInjectedFields(req.body));
    expect(await flow.isInMyPosts(title), 'post must remain owned by the original author').toBe(true);
  });

  test('SEC14 — the edit page sets a clickjacking-protection header', { tag: '@exploratory' }, async ({ page }) => {
    let hasProtection = false;
    page.on('response', res => {
      if (res.url().includes('/edit') || res.url().includes('/post/')) {
        const h = res.headers();
        if (h['x-frame-options'] || (h['content-security-policy'] ?? '').includes('frame-ancestors')) hasProtection = true;
      }
    });
    await flow.gotoEdit(freshSlug); // re-request with the listener attached
    expect(hasProtection, 'expected X-Frame-Options or CSP frame-ancestors').toBe(true);
  });

  test('VAL1 — the update API rejects an empty Title (server-side, not just UI)', { tag: '@exploratory' }, async ({ page }) => {
    const req = await flow.captureUpdateRequest(`Empty title probe ${Date.now()}`);
    if (!req) {
      const slug = flow.currentPostSlug();
      await flow.gotoEdit(slug);
      await flow.titleInput.fill('');
      await flow.dismissCookieBanner();
      await flow.submitUpdate();
      await page.waitForTimeout(1500);
      await flow.openPostView(slug);
      expect((await flow.postViewTitle.innerText().catch(() => '')).trim().length).toBeGreaterThan(0);
      return;
    }
    const status = await flow.replayUpdate(req, withBlankTitle(req.body));
    expect(status, `empty-title update returned ${status}; server must reject with 4xx`).toBeGreaterThanOrEqual(400);
  });

  // ── Server-side validation via UI (4) ───────────────────────────────────

  test('VAL2 — an empty Title via the UI never blanks the post', { tag: '@exploratory' }, async ({ page }) => {
    await flow.titleInput.fill('');
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await page.waitForTimeout(1500);
    await flow.openPostView(freshSlug);
    const heading = (await flow.postViewTitle.innerText().catch(() => '')).trim();
    expect(heading.length, 'the post must never end up with an empty title').toBeGreaterThan(0);
  });

  test('VAL3 — leading/trailing whitespace in the Title is trimmed on save', { tag: '@exploratory' }, async () => {
    const core = `Trim probe ${Date.now()}`;
    const slug = await flow.setTitleAndSave(`   ${core}   `);
    await flow.openPostView(slug);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    const heading = (await flow.postViewTitle.innerText().catch(() => '')).trim();
    expect(heading, 'stored title should be trimmed').toBe(core);
  });

  test('VAL4 — removing all topics is rejected (post keeps at least one topic)', { tag: '@exploratory' }, async ({ page }) => {
    await flow.removeAllTopics();
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await page.waitForTimeout(1500);
    await flow.openPostView(freshSlug);
    expect(await flow.postViewLoaded(), 'post view did not load (topic removal may have orphaned it)').toBe(true);
    expect(await flow.topicCountOnView(), 'a post must retain at least one topic').toBeGreaterThanOrEqual(1);
  });

  test('VAL5 — the 5-topic maximum holds end-to-end (saved post has <= 5 topics)', { tag: '@exploratory' }, async ({ page }) => {
    for (const t of ['Marriott', 'Airlines', 'Solo Travel', 'Budget Travel', 'Backpacking']) {
      await flow.selectTopic(t).catch(() => {});
    }
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await page.waitForTimeout(1500);
    await flow.openPostView(freshSlug);
    expect(await flow.topicCountOnView(), 'saved post must not exceed 5 topics').toBeLessThanOrEqual(5);
  });

  // ── Data integrity & propagation (21) ───────────────────────────────────

  test('INT1 — a saved Title round-trips exactly on the post view', { tag: '@exploratory' }, async () => {
    const title = `Round-trip ${Date.now()}`;
    const slug = await flow.setTitleAndSave(title);
    await flow.openPostView(slug);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    await expect(flow.postViewTitle).toContainText(title);
  });

  test('INT2 — special characters in the Title round-trip as literal text', { tag: '@exploratory' }, async () => {
    const title = `A & B <C> "D" ${Date.now()}`;
    const slug = await flow.setTitleAndSave(title);
    await flow.openPostView(slug);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    await expect(flow.postViewTitle).toContainText('A & B');
  });

  test('INT3 — emoji / unicode Title persists on the post view', { tag: '@exploratory' }, async () => {
    const title = `✈️🌍 títlë 日本語 ${Date.now()}`;
    const slug = await flow.setTitleAndSave(title);
    await flow.openPostView(slug);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    await expect(flow.postViewTitle).toContainText('日本語');
  });

  test('INT4 — a successful edit surfaces an "Edited" label on the post', { tag: '@exploratory' }, async () => {
    const slug = await flow.setTitleAndSave(`Edited label ${Date.now()}`);
    await flow.openPostView(slug);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    await expect(flow.editedLabelOnView).toBeVisible({ timeout: 10000 });
  });

  test('INT5 — an edited Title propagates to the trending feed', { tag: '@exploratory' }, async ({ page }) => {
    const title = `Feed prop ${Date.now()}`;
    await flow.setTitleAndSave(title);
    await page.goto(`${BASE}/trending`, { waitUntil: 'domcontentloaded' });
    await flow.dismissCookieBanner();
    await expect(page.locator(`a[href^="/post/"]:has-text("${title}")`).first()).toBeVisible({ timeout: 10000 });
  });

  test('INT6 — an edited Title propagates to My Posts', { tag: '@exploratory' }, async ({ page }) => {
    const title = `MyPosts prop ${Date.now()}`;
    await flow.setTitleAndSave(title);
    await flow.goToMyPosts();
    await expect(page.locator(`text=${title}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('INT7 — an edited Title updates the browser tab title', { tag: '@exploratory' }, async ({ page }) => {
    const title = `Tab title ${Date.now()}`;
    const slug = await flow.setTitleAndSave(title);
    await flow.openPostView(slug);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    await expect.poll(() => page.title(), { timeout: 10000 }).toContain(title);
  });

  test('INT8 — editing the Discussion reflects the new text on the post view', { tag: '@exploratory' }, async ({ page }) => {
    const marker = `body-marker-${Date.now()}`;
    const slug = await flow.setDiscussionAndSave(`Updated discussion ${marker}`);
    await flow.openPostView(slug);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    await expect(page.getByText(marker).first()).toBeVisible({ timeout: 10000 });
  });

  test('INT9 — the ORIGINAL permalink still resolves after a Title edit', { tag: '@exploratory' }, async ({ page }) => {
    const before = freshSlug;
    const after = await flow.setTitleAndSave(`Permalink ${Date.now()}`);
    if (before && after && before !== after) {
      test.info().annotations.push({ type: 'note', description: `slug changed on edit: ${before} -> ${after}` });
    }
    let status = 0;
    page.on('response', res => { if (res.url().endsWith(`/post/${before}`)) status = res.status(); });
    await flow.openPostView(before);
    expect(status === 0 || status < 400, `original permalink /post/${before} returned ${status} after edit`).toBe(true);
    expect(await flow.postViewLoaded(), 'original permalink must still render the post').toBe(true);
  });

  test('INT10 — the edited post is reachable at its (new) slug and keeps its author', { tag: '@exploratory' }, async () => {
    const title = `Reachable ${Date.now()}`;
    const slug = await flow.setTitleAndSave(title);
    await flow.openPostView(slug);
    expect(await flow.postViewLoaded(), 'edited post must remain reachable').toBe(true);
    await expect(flow.postViewTitle).toContainText(title);
    expect(await flow.postAuthorHref(), 'author must be unchanged').toContain(OWN_HANDLE);
  });

  test('INT11 — Cancel discards edits (the change never persists)', { tag: '@exploratory' }, async () => {
    const discarded = `Discarded ${Date.now()}`;
    await flow.titleInput.fill(discarded);
    await flow.cancelBtn.click();
    await flow.openPostView(freshSlug);
    await expect(flow.postViewTitle).not.toContainText(discarded);
  });

  test('INT12 — editing a post does not change its comment count', { tag: '@exploratory' }, async () => {
    await flow.openPostView(freshSlug);
    const before = await flow.commentCount();
    await flow.openEditFromSinglePost();
    const slug = await flow.setTitleAndSave(`Comments kept ${Date.now()}`);
    await flow.openPostView(slug);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    expect(await flow.commentCount(), 'comment count must be unchanged after an edit').toBe(before);
  });

  test('INT13 — editing the Title preserves the vote count', { tag: '@exploratory' }, async () => {
    await flow.openPostView(freshSlug);
    const before = await flow.getVoteCount().catch(() => 0);
    await flow.openEditFromSinglePost();
    const slug = await flow.setTitleAndSave(`Votes kept ${Date.now()}`);
    await flow.openPostView(slug);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    expect(await flow.getVoteCount().catch(() => 0), 'vote count must survive an edit').toBe(before);
  });

  test('INT14 — editing preserves the original post date', { tag: '@exploratory' }, async () => {
    await flow.openPostView(freshSlug);
    const before = await flow.postDateText();
    await flow.openEditFromSinglePost();
    const slug = await flow.setTitleAndSave(`Date kept ${Date.now()}`);
    await flow.openPostView(slug);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    expect(await flow.postDateText(), 'original post date must not be reset by an edit').toBe(before);
  });

  test('INT15 — a second consecutive edit also persists', { tag: '@exploratory' }, async () => {
    const s1 = await flow.setTitleAndSave(`First edit ${Date.now()}`);
    await flow.gotoEdit(s1);
    const second = `Second edit ${Date.now()}`;
    const s2 = await flow.setTitleAndSave(second);
    await flow.openPostView(s2);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    await expect(flow.postViewTitle).toContainText(second);
  });

  test('INT16 — an edit does not create a duplicate post in My Posts', { tag: '@exploratory' }, async ({ page }) => {
    const title = `Unique edit ${Date.now()}`;
    await flow.setTitleAndSave(title);
    await flow.goToMyPosts();
    await page.waitForTimeout(1000);
    const count = await page.locator(`a[href^="/post/"]:has-text("${title}")`).count();
    expect(count, 'an edit must update in place, not create a second post').toBeLessThanOrEqual(1);
  });

  test('INT17 — adding an External Link makes it appear on the post view', { tag: '@exploratory' }, async ({ page }) => {
    const seg = `added-${Date.now()}`;
    const slug = await flow.setExternalLinkAndSave(`https://example.com/${seg}`);
    await flow.openPostView(slug);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    expect(await page.locator(`a[href*="${seg}"]`).count(), 'added external link should render').toBeGreaterThanOrEqual(1);
  });

  test('INT18 — clearing the External Link removes it from the post view', { tag: '@exploratory' }, async ({ page }) => {
    const seg = `tobe-removed-${Date.now()}`;
    const s1 = await flow.setExternalLinkAndSave(`https://example.com/${seg}`);
    await flow.gotoEdit(s1);
    await flow.externalLinkInput.fill('');
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await page.waitForURL(/\/post\/[^/?#]+$/, { timeout: 15000 }).catch(() => {});
    const s2 = flow.currentPostSlug();
    await flow.openPostView(s2);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    expect(await page.locator(`a[href*="${seg}"]`).count(), 'removed external link should disappear').toBe(0);
  });

  test('INT19 — a topic added during edit appears as a tag on the post view', { tag: '@exploratory' }, async ({ page }) => {
    let added = true;
    await flow.selectTopic('Marriott').catch(() => { added = false; });
    expect(added, 'Marriott topic should be selectable').toBe(true);
    await flow.dismissCookieBanner();
    await flow.submitUpdate();
    await page.waitForURL(/\/post\/[^/?#]+$/, { timeout: 15000 }).catch(() => {});
    await flow.openPostView(freshSlug);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    await expect(page.locator('a[href*="/tags/Marriott"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('INT20 — saving the Title twice quickly does not 5xx or corrupt the post', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => { if (res.status() >= 500) serverError = true; });
    const title = `Double save ${Date.now()}`;
    await flow.titleInput.fill(title);
    await flow.dismissCookieBanner();
    await flow.updatePostBtn.click({ force: true }).catch(() => {});
    await flow.updatePostBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(2500);
    const slug = flow.currentPostSlug();
    expect(serverError, 'double-submit must not 5xx').toBe(false);
    await flow.openPostView(slug);
    expect(await flow.postViewLoaded(), 'post view did not load').toBe(true);
    await expect(flow.postViewTitle).toContainText(title);
  });

  test('INT21 — Save never leaks a token/password/session in the URL', { tag: '@exploratory' }, async ({ page }) => {
    await flow.setTitleAndSave(`No secrets in URL ${Date.now()}`);
    expect(page.url()).not.toMatch(/token=|password=|session=|secret=/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Access & authorization — lightweight (no fresh post needed).
// ─────────────────────────────────────────────────────────────────────────
test.describe('Edit Post — Exploratory (access & authorization)', () => {
  test.setTimeout(120000);

  let flow: EditPostExploratoryPage;

  test.beforeEach(async ({ page }) => {
    flow = new EditPostExploratoryPage(page);
  });

  test('SEC8 — XSS payload in the edit slug does not execute script', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await page.goto(`${BASE}/post/<script>alert(1)</script>/edit`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(alertFired).toBe(false);
  });

  test('SEC9 — a non-owner cannot open another user\'s edit form via direct URL (IDOR)', { tag: '@exploratory' }, async ({ page }) => {
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    const foreignSlug = await flow.openForeignPostSlug();
    test.skip(!foreignSlug, 'no foreign-authored post available on staging to probe');
    await flow.gotoEdit(foreignSlug);
    await page.waitForLoadState('networkidle').catch(() => {});
    const editable = await flow.titleInput.isVisible({ timeout: 4000 }).catch(() => false);
    expect(editable, `IDOR: editing another user's post (${foreignSlug}) must be blocked`).toBe(false);
  });

  test('SEC10 — a foreign post\'s 3-dot menu offers no Edit', { tag: '@exploratory' }, async ({ page }) => {
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    const foreignSlug = await flow.openForeignPostSlug();
    test.skip(!foreignSlug, 'no foreign-authored post available on staging to probe');
    await page.getByRole('button', { name: /post options/i }).first().click({ timeout: 8000 }).catch(() => {});
    const hasEdit = await flow.menuEditPost.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasEdit, 'a non-owner must not see an Edit option on someone else\'s post').toBe(false);
  });

  test('SEC11 — a logged-out user cannot open the edit form', { tag: '@exploratory' }, async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(BASE, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }).catch(() => {});
    await page.goto(`${BASE}/post/e2e-full-post-1781686073532/edit`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    const editable = await flow.titleInput.isVisible({ timeout: 4000 }).catch(() => false);
    expect(editable, 'logged-out users must not get an editable form').toBe(false);
    await page.goto(`${BASE}/trending`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    const loggedOut = /\/login/.test(page.url())
      || await page.getByRole('link', { name: /^log ?in$|join free/i }).first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(loggedOut, 'session must be logged out').toBe(true);
  });
});

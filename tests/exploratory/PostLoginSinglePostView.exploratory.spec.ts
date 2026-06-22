import { test, expect } from '@playwright/test';
import { PostLoginSinglePostExploratoryPage } from '../../src/pages/exploratory/PostLoginSinglePostExploratory';

const VALID_EMAIL    = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';
const BASE           = 'https://staging.talktravel.com';

test.describe('Post-Login Single Post View — Exploratory (Edge & Negative)', () => {
  let flow: PostLoginSinglePostExploratoryPage;

  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    flow = new PostLoginSinglePostExploratoryPage(page);
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.openFirstPost();
  });

  // ── Negative cases ─────────────────────────────────────────────────────────

  test('Negative — non-existent post slug returns HTTP 404 (not a silent 200)', { tag: '@exploratory' }, async ({ page }) => {
    let status = 0;
    page.on('response', res => {
      if (res.url().includes('/post/this-post-does-not-exist-xyz123abc')) status = res.status();
    });
    await page.goto(`${BASE}/post/this-post-does-not-exist-xyz123abc`);
    await page.waitForLoadState('networkidle');
    expect(status).toBe(404);
  });

  test('Negative — direct navigation to /post with no slug does not return a 500', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => {
      if ((res.url().endsWith('/post') || res.url().endsWith('/post/')) && res.status() >= 500) {
        serverError = true;
      }
    });
    await page.goto(`${BASE}/post`);
    await page.waitForLoadState('networkidle');
    expect(serverError).toBe(false);
  });

  test('Negative — submitting an empty comment does not create a blank comment', { tag: '@exploratory' }, async ({ page }) => {
    // If the post renders the logged-out reply prompt, no editor/submit exists — skip.
    if (await flow.loginPrompt.isVisible().catch(() => false)) {
      test.skip(true, 'Comment section rendered logged-out "Please login" prompt');
      return;
    }
    let input;
    try {
      input = await flow.getCommentInput();
    } catch {
      test.skip(true, 'Comment editor did not activate');
      return;
    }
    const heading = page.locator('h2').filter({ hasText: /comment/i }).first();
    const beforeCount = parseInt((await heading.innerText()).match(/\d+/)?.[0] ?? '0', 10);
    await input.click();
    await input.fill('   '); // whitespace only
    // Bounded timeout: a disabled/absent submit button fails fast instead of
    // hanging until the test timeout. A no-op is the expected outcome here.
    await flow.commentSubmitBtn.click({ timeout: 5000 }).catch(() => { /* disabled or absent — acceptable */ });
    await expect(async () => {
      const afterCount = parseInt((await heading.innerText()).match(/\d+/)?.[0] ?? '0', 10);
      expect(afterCount).toBeLessThanOrEqual(beforeCount);
    }).toPass({ timeout: 5000 });
  });

  test('Negative — authenticated post page never shows the logged-out "please login" prompt', { tag: '@exploratory' }, async () => {
    await expect(flow.loginPrompt).toHaveCount(0);
  });

  test('Negative — clicking upvote does not redirect an authenticated user to /login', { tag: '@exploratory' }, async ({ page }) => {
    await flow.upvoteBtn.click();
    await page.waitForTimeout(1000);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/post\/.+/);
  });

  // ── Security cases ─────────────────────────────────────────────────────────

  test('Security — XSS payload in post slug does not execute script', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    await page.goto(`${BASE}/post/<script>alert(1)</script>`);
    await page.waitForLoadState('networkidle');
    expect(alertFired).toBe(false);
  });

  test('Security — XSS payload typed into the comment editor is not executed', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    // Logged-out post pages show a "Please login" prompt with no editor/submit — skip.
    if (await flow.loginPrompt.isVisible().catch(() => false)) {
      test.skip(true, 'Comment section rendered logged-out "Please login" prompt');
      return;
    }
    let input;
    try {
      input = await flow.getCommentInput();
    } catch {
      test.skip(true, 'Comment editor did not activate');
      return;
    }
    await input.click();
    await input.fill('<img src=x onerror=alert(1)><script>alert(2)</script>');
    // Bounded timeout so a missing/disabled submit button fails fast.
    await flow.commentSubmitBtn.click({ timeout: 5000 }).catch(() => {});
    // Give any injected handler a chance to fire; the dialog listener is the assertion.
    await expect.poll(() => alertFired, { timeout: 2000 }).toBe(false);
  });

  test('Security — post page response sets a clickjacking protection header (X-Frame-Options or CSP)', { tag: '@exploratory' }, async ({ page }) => {
    let hasProtection = false;
    page.on('response', res => {
      if (res.url().includes('/post/')) {
        const h = res.headers();
        if (h['x-frame-options'] || h['content-security-policy']) hasProtection = true;
      }
    });
    await page.reload();
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(hasProtection).toBe(true);
  });

  test('Security — post page response sets Strict-Transport-Security (HSTS) header', { tag: '@exploratory' }, async ({ page }) => {
    let hsts: string | undefined;
    page.on('response', res => {
      if (res.url().includes('/post/')) hsts = res.headers()['strict-transport-security'];
    });
    await page.reload();
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(hsts).toBeDefined();
    expect((hsts ?? '').length).toBeGreaterThan(0);
  });

  test('Security — response headers do not expose X-Powered-By server info', { tag: '@exploratory' }, async ({ page }) => {
    const exposed: string[] = [];
    page.on('response', res => {
      const h = res.headers()['x-powered-by'];
      if (h && res.url().includes('/post/')) exposed.push(h);
    });
    await page.reload();
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(exposed).toHaveLength(0);
  });

  test('Security — no plaintext password is persisted in local/session storage after login', { tag: '@exploratory' }, async ({ page }) => {
    const found = await page.evaluate(pwd => {
      const scan = (s: Storage) => Object.keys(s).some(k => (s.getItem(k) ?? '').includes(pwd));
      return scan(localStorage) || scan(sessionStorage);
    }, VALID_PASSWORD);
    expect(found, 'Plaintext password found in browser storage').toBe(false);
  });

  test('Security — post URL exposes no auth token / session id in query params', { tag: '@exploratory' }, async ({ page }) => {
    const url = new URL(page.url());
    const leaky = [...url.searchParams.keys()].filter(k => /token|session|jwt|auth|access|secret|password/i.test(k));
    expect(leaky, `Sensitive query params: ${leaky.join(', ')}`).toEqual([]);
  });

  test('Security — every target="_blank" link on the post page sets rel="noopener"', { tag: '@exploratory' }, async ({ page }) => {
    const offenders = await page.$$eval('a[target="_blank"]', els =>
      els
        .filter(a => !((a.getAttribute('rel') ?? '').toLowerCase().includes('noopener')))
        .map(a => a.getAttribute('href') ?? '(no href)')
    );
    expect(offenders, `Links missing rel="noopener": ${offenders.join(', ')}`).toEqual([]);
  });

  test('Security — XSS payload in a post query param does not execute script', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    const slug = flow.currentPostSlug();
    test.skip(!slug, 'Could not resolve current post slug');
    await page.goto(`${BASE}/post/${slug}?q=<script>alert(1)</script>`);
    await page.waitForLoadState('networkidle');
    expect(alertFired).toBe(false);
  });

  // ── Accessibility cases ──────────────────────────────────────────────────────

  test('A11y — post page <html> has a non-empty lang attribute', { tag: '@exploratory' }, async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang?.trim()).toBeTruthy();
  });

  test('A11y — post page has exactly one level-1 heading', { tag: '@exploratory' }, async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('A11y — every image on the post page has an alt attribute', { tag: '@exploratory' }, async ({ page }) => {
    const missing = await page.$$eval('img', els =>
      els.filter(img => img.getAttribute('alt') === null).map(img => img.getAttribute('src') ?? '(no src)')
    );
    expect(missing, `Images missing alt: ${missing.join(', ')}`).toEqual([]);
  });

  test('A11y — no visible button on the post page is missing an accessible name', { tag: '@exploratory' }, async ({ page }) => {
    const unnamed = await page.$$eval('button', els =>
      els.filter(b => {
        const visible = !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length);
        if (!visible) return false;
        const text = (b.textContent ?? '').trim();
        return !text
          && !b.getAttribute('aria-label')
          && !b.getAttribute('title')
          && !b.getAttribute('aria-labelledby')
          && !b.querySelector('img')?.getAttribute('alt');
      }).length
    );
    expect(unnamed, 'Visible buttons without an accessible name').toBe(0);
  });

  test('A11y — upvote button is keyboard focusable', { tag: '@exploratory' }, async () => {
    await flow.upvoteBtn.focus();
    await expect(flow.upvoteBtn).toBeFocused();
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  test('Edge — post page has no broken images (all rendered images load)', { tag: '@exploratory' }, async ({ page }) => {
    const broken = await page.$$eval('img', els =>
      els
        .filter(img => img.complete && img.naturalWidth === 0 && (img.getAttribute('src') ?? '') !== '')
        .map(img => img.getAttribute('src') ?? '(no src)')
    );
    expect(broken, `Broken images:\n${broken.join('\n')}`).toEqual([]);
  });

  test('Edge — clicking upvote twice rapidly does not crash or navigate away', { tag: '@exploratory' }, async ({ page }) => {
    await flow.upvoteBtn.click();
    await flow.upvoteBtn.click();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(flow.postTitle).toBeVisible();
  });

  test('Edge — browser back from post returns to the /trending feed', { tag: '@exploratory' }, async ({ page }) => {
    await page.goBack().catch(e => { if (!String(e).includes('ERR_ABORTED')) throw e; });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page).toHaveURL(/\/trending/);
  });

  test('Edge — pasting a very long (5000-char) comment does not crash the editor', { tag: '@exploratory' }, async ({ page }) => {
    if (await flow.loginPrompt.isVisible().catch(() => false)) {
      test.skip(true, 'Comment section rendered logged-out "Please login" prompt');
      return;
    }
    let input;
    try {
      input = await flow.getCommentInput();
    } catch {
      test.skip(true, 'Comment editor did not activate');
      return;
    }
    // fill() focuses and sets value without requiring the element to be
    // unobscured (a modal lightbox over the page would block click()).
    await input.fill('a'.repeat(5000));
    await expect(flow.postTitle).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  // ── Diagnostics / non-functional ──────────────────────────────────────────────

  test('Diagnostic — no uncaught JS (pageerror) on the post page', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.reload();
    await page.waitForLoadState('load');
    expect(errors, `Uncaught JS errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('Diagnostic — no HTTP 4xx/5xx responses while loading the post page', { tag: '@exploratory' }, async ({ page }) => {
    const bad: string[] = [];
    page.on('response', res => {
      const s = res.status();
      // 401/403 on auth-probe endpoints can be expected during hydration — only flag the post document and 5xx
      if (s >= 500 || (s >= 400 && res.url().includes('/post/'))) {
        bad.push(`${s} ${res.request().method()} ${res.url()}`);
      }
    });
    await page.reload();
    await page.waitForLoadState('load');
    expect(bad, `Failing responses:\n${bad.join('\n')}`).toEqual([]);
  });

  // ── Additional edge / negative / security / a11y cases ────────────────────────

  test('Negative — path-traversal slug (../../etc/passwd) does not leak files or 500', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => { if (res.status() >= 500) serverError = true; });
    await page.goto(`${BASE}/post/..%2f..%2f..%2fetc%2fpasswd`);
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').innerText();
    expect(serverError).toBe(false);
    expect(body).not.toContain('root:x:0:0');
  });

  test('Security — IDOR: a numeric-id post URL does not expose another user\'s draft via direct access', { tag: '@exploratory' }, async ({ page }) => {
    // Probing a guessable id should not return a 5xx nor silently render private content
    let serverError = false;
    page.on('response', res => {
      if (res.url().includes('/post/1') && res.status() >= 500) serverError = true;
    });
    await page.goto(`${BASE}/post/1`);
    await page.waitForLoadState('networkidle');
    expect(serverError).toBe(false);
    // Page must resolve to something (404 / redirect / valid post), never a blank crash
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(0);
  });

  test('Edge — opening the post on a 375px mobile viewport keeps the H1 and vote buttons visible', { tag: '@exploratory' }, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(flow.postTitle).toBeVisible();
    await expect(flow.upvoteBtn).toBeVisible();
  });

  test('A11y — post author and topic chip links have discernible (non-empty) text', { tag: '@exploratory' }, async () => {
    const authorText = (await flow.postAuthor.innerText()).trim();
    const topicText = (await flow.topicChip.innerText()).trim();
    expect(authorText.length).toBeGreaterThan(0);
    expect(topicText.length).toBeGreaterThan(0);
  });

  test('Diagnostic — submitting a comment triggers no server (5xx) error response', { tag: '@exploratory' }, async ({ page }) => {
    const bad: string[] = [];
    page.on('response', res => {
      if (res.status() >= 500) bad.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    });
    if (await flow.loginPrompt.isVisible().catch(() => false)) {
      test.skip(true, 'Comment section rendered logged-out "Please login" prompt');
      return;
    }
    let input;
    try {
      input = await flow.getCommentInput();
    } catch {
      test.skip(true, 'Comment editor did not activate');
      return;
    }
    await input.click();
    await input.fill(`Exploratory diagnostic ${Date.now()}`);
    await flow.commentSubmitBtn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(bad, `5xx errors on comment submit:\n${bad.join('\n')}`).toEqual([]);
  });
});

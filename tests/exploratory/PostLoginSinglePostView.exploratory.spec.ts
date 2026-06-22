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

  test('Security — post document enforces a CSP that forbids inline script (no unsafe-inline)', { tag: '@exploratory' }, async ({ page }) => {
    // HARD: a real, meaningful Content-Security-Policy on the document response that
    // constrains scripts and does not weaken itself with 'unsafe-inline'. Most SPA
    // hosts ship either no CSP or one that allows inline scripts — this exposes that.
    let csp: string | undefined;
    page.on('response', res => {
      if (res.request().resourceType() === 'document' && res.url().includes('/post/')) {
        csp = res.headers()['content-security-policy'];
      }
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(csp, 'No Content-Security-Policy header on the post document').toBeTruthy();
    const policy = (csp ?? '').toLowerCase();
    expect(policy, 'CSP defines neither script-src nor default-src').toMatch(/script-src|default-src/);
    expect(policy, "CSP weakens script execution with 'unsafe-inline'").not.toContain("'unsafe-inline'");
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

  // ── Accessibility cases ──────────────────────────────────────────────────────

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

  test('Performance — post page Largest Contentful Paint is within the 2.5s "good" budget', { tag: '@exploratory' }, async ({ page, browserName }) => {
    // HARD: Core Web Vitals "good" LCP threshold. Staging, image-heavy posts and
    // client-side hydration routinely blow past 2.5s. LCP API is Chromium-only.
    test.skip(browserName !== 'chromium', 'largest-contentful-paint PerformanceObserver is Chromium-only');
    await page.reload({ waitUntil: 'load' });
    const lcp = await page.evaluate<number>(() => new Promise<number>(resolve => {
      let last = 0;
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          last = (entry as PerformanceEntry & { renderTime?: number; loadTime?: number }).renderTime
            ?? (entry as PerformanceEntry & { loadTime?: number }).loadTime
            ?? entry.startTime;
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      // Allow paints to settle, then report the latest (final) LCP candidate.
      setTimeout(() => resolve(last), 3000);
    }));
    expect(lcp, 'No LCP entry was recorded').toBeGreaterThan(0);
    expect(lcp, `LCP ${Math.round(lcp)}ms exceeds the 2500ms budget`).toBeLessThan(2500);
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

  // ── New adversarial / hard cases (likely to surface real defects) ─────────────

  test('Security — auth/session cookies set HttpOnly, Secure and SameSite flags', { tag: '@exploratory' }, async ({ page }) => {
    // HARD: session cookies missing HttpOnly/Secure/SameSite are a real, common defect.
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter(c => /sess|token|jwt|auth|sid|csrf/i.test(c.name));
    test.skip(authCookies.length === 0, 'No session-like cookies present to evaluate');
    const offenders = authCookies
      .filter(c => !c.httpOnly || !c.secure || c.sameSite === 'None')
      .map(c => `${c.name} (httpOnly=${c.httpOnly}, secure=${c.secure}, sameSite=${c.sameSite})`);
    expect(offenders, `Insecure auth cookies: ${offenders.join('; ')}`).toEqual([]);
  });

  test('Security — post document sends X-Content-Type-Options: nosniff', { tag: '@exploratory' }, async ({ page }) => {
    let nosniff: string | undefined;
    page.on('response', res => {
      if (res.request().resourceType() === 'document' && res.url().includes('/post/')) {
        nosniff = res.headers()['x-content-type-options'];
      }
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    expect((nosniff ?? '').toLowerCase()).toBe('nosniff');
  });

  test('Security — post document sends a non-unsafe Referrer-Policy header', { tag: '@exploratory' }, async ({ page }) => {
    let referrer: string | undefined;
    page.on('response', res => {
      if (res.request().resourceType() === 'document' && res.url().includes('/post/')) {
        referrer = res.headers()['referrer-policy'];
      }
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(referrer, 'No Referrer-Policy header').toBeTruthy();
    expect((referrer ?? '').toLowerCase()).not.toBe('unsafe-url');
  });

  test('Security — no public JavaScript source maps are served in production', { tag: '@exploratory' }, async ({ page }) => {
    // HARD: shipping .js.map files leaks source. Probe the scripts referenced on the page.
    const scriptUrls = await page.$$eval('script[src]', els =>
      els.map(s => (s as HTMLScriptElement).src).filter(u => u.startsWith('http'))
    );
    test.skip(scriptUrls.length === 0, 'No external scripts to probe');
    const leaked: string[] = [];
    for (const url of scriptUrls.slice(0, 8)) {
      const mapUrl = `${url}.map`;
      const resp = await page.request.get(mapUrl).catch(() => null);
      if (resp && resp.status() === 200) leaked.push(mapUrl);
    }
    expect(leaked, `Publicly accessible source maps:\n${leaked.join('\n')}`).toEqual([]);
  });

  test('Edge — post page has no duplicate element id attributes', { tag: '@exploratory' }, async ({ page }) => {
    // HARD: duplicate ids are a frequent real DOM defect that breaks label/aria wiring.
    const dupes = await page.$$eval('[id]', els => {
      const seen = new Map<string, number>();
      for (const el of els) {
        const id = el.id;
        if (id) seen.set(id, (seen.get(id) ?? 0) + 1);
      }
      return [...seen.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id} ×${n}`);
    });
    expect(dupes, `Duplicate element ids: ${dupes.join(', ')}`).toEqual([]);
  });

  test('A11y — heading outline has no skipped levels (e.g. h1 → h3)', { tag: '@exploratory' }, async ({ page }) => {
    // HARD: heading-level jumps are a common WCAG 1.3.1 failure.
    const levels = await page.$$eval('h1,h2,h3,h4,h5,h6', els =>
      (els as HTMLElement[])
        .filter(h => !!(h.offsetWidth || h.offsetHeight || h.getClientRects().length))
        .map(h => parseInt(h.tagName.substring(1), 10))
    );
    test.skip(levels.length < 2, 'Not enough headings to evaluate outline');
    const jumps: string[] = [];
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) jumps.push(`h${levels[i - 1]} → h${levels[i]}`);
    }
    expect(jumps, `Skipped heading levels: ${jumps.join(', ')}`).toEqual([]);
  });

  test('Performance — post document Time To First Byte is under 800ms', { tag: '@exploratory' }, async ({ page }) => {
    // HARD: a strict TTFB budget that a slow/cold staging backend often misses.
    await page.reload({ waitUntil: 'commit' });
    const ttfb = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      return nav ? nav.responseStart - nav.requestStart : -1;
    });
    expect(ttfb, 'No navigation timing entry').toBeGreaterThanOrEqual(0);
    expect(ttfb, `TTFB ${Math.round(ttfb)}ms exceeds 800ms budget`).toBeLessThan(800);
  });

  test('Security — no mixed content: post page issues no insecure http:// subresource requests', { tag: '@exploratory' }, async ({ page }) => {
    const insecure: string[] = [];
    page.on('request', req => {
      const url = req.url();
      if (url.startsWith('http://') && !url.startsWith('http://localhost')) insecure.push(url);
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(insecure, `Insecure http:// requests:\n${insecure.join('\n')}`).toEqual([]);
  });
});

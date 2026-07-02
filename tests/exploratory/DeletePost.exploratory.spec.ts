import { test, expect } from '@playwright/test';
import { DeletePostExploratoryPage } from '../../src/pages/exploratory/DeletePostExploratory';

const VALID_EMAIL    = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';
const BASE           = 'https://staging.talktravel.com';

/**
 * Delete Post (Post-Login) — Exploratory (Edge, Negative, Security, A11y,
 * Diagnostic, Performance).
 *
 * 40 adversarial checks beyond the happy path in tests/DeletePost.spec.ts.
 * Delete is owner-only and irreversible, so each test seeds its OWN throwaway
 * post and operates on that. Run with `--workers=1` so the shared login and
 * seeding are not contended. Many checks are designed to surface REAL defects
 * (missing security headers, a11y gaps) — a failure is a finding, not
 * necessarily a broken test.
 */
test.describe('Delete Post (Post-Login) — Exploratory', () => {
  test.setTimeout(180000);

  let flow: DeletePostExploratoryPage;
  let slug: string;
  let title: string;

  test.beforeEach(async ({ page }) => {
    flow = new DeletePostExploratoryPage(page);
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    title = `Del exploratory ${Date.now()}`;
    slug = await flow.seedDisposablePost(title);
  });

  // ── Negative cases (10) ──────────────────────────────────────────────────

  test('Negative — Cancel leaves the post fully intact after reload', { tag: '@exploratory' }, async ({ page }) => {
    expect(await flow.openDeleteDialog()).toBe(true);
    await flow.cancelDelete();
    await flow.gotoPost(slug);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(flow.isOnPostUrl(slug)).toBe(true);
  });

  test('Negative — pressing Escape on the dialog does NOT delete the post', { tag: '@exploratory' }, async ({ page }) => {
    expect(await flow.openDeleteDialog()).toBe(true);
    await page.keyboard.press('Escape');
    await flow.gotoPost(slug);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('Negative — non-existent post slug does not return 5xx', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => {
      if (res.url().includes('/post/does-not-exist-') && res.status() >= 500) serverError = true;
    });
    await page.goto(`${BASE}/post/does-not-exist-${Date.now()}`);
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(serverError).toBe(false);
  });

  test('Negative — re-navigating a deleted post never 5xxs (idempotent)', { tag: '@exploratory' }, async ({ page }) => {
    const bad: string[] = [];
    page.on('response', res => { if (res.status() >= 500) bad.push(`${res.status()} ${res.url()}`); });
    expect(await flow.openDeleteDialog()).toBe(true);
    await flow.confirmDelete();
    await flow.gotoPost(slug);
    await flow.gotoPost(slug);
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(bad, `5xx after delete:\n${bad.join('\n')}`).toEqual([]);
  });

  test('Negative — the owner\'s 3-dot menu exposes a Delete action', { tag: '@exploratory' }, async () => {
    await flow.postOptionsBtn.click({ timeout: 10000 }).catch(() => {});
    await expect(flow.menuDeletePost).toBeVisible();
  });

  test('Negative — deleting does not redirect an authenticated user to /login', { tag: '@exploratory' }, async ({ page }) => {
    expect(await flow.openDeleteDialog()).toBe(true);
    await flow.confirmDelete();
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Negative — opening then cancelling fires no delete network request', { tag: '@exploratory' }, async ({ page }) => {
    const deleteReqs: string[] = [];
    page.on('request', req => {
      if (req.method() === 'DELETE' || (/delete/i.test(req.url()) && req.method() !== 'GET')) {
        deleteReqs.push(`${req.method()} ${req.url()}`);
      }
    });
    expect(await flow.openDeleteDialog()).toBe(true);
    await flow.cancelDelete();
    await page.waitForTimeout(1000);
    expect(deleteReqs, `Delete requests fired on Cancel:\n${deleteReqs.join('\n')}`).toEqual([]);
  });

  test('Negative — direct navigation to /post with no slug does not 5xx', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => {
      if ((res.url().endsWith('/post') || res.url().endsWith('/post/')) && res.status() >= 500) serverError = true;
    });
    await page.goto(`${BASE}/post`);
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(serverError).toBe(false);
  });

  test('Negative — path-traversal slug does not leak files or 500', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => { if (res.status() >= 500) serverError = true; });
    await page.goto(`${BASE}/post/..%2f..%2f..%2fetc%2fpasswd`);
    await page.waitForLoadState('networkidle').catch(() => {});
    const body = await page.locator('body').innerText();
    expect(serverError).toBe(false);
    expect(body).not.toContain('root:x:0:0');
  });

  test('Negative — a permanently deleted post no longer exposes its title text', { tag: '@exploratory' }, async ({ page }) => {
    expect(await flow.openDeleteDialog()).toBe(true);
    await flow.confirmDelete();
    await flow.gotoPost(slug);
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('heading', { level: 1, name: title })).toHaveCount(0);
  });

  // ── Security cases (12) ──────────────────────────────────────────────────

  test('Security — an XSS payload in the post title does not execute in the delete dialog', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    slug = await flow.seedDisposablePost(`<img src=x onerror=alert(1)> ${Date.now()}`);
    await flow.openDeleteDialog();
    await expect.poll(() => alertFired, { timeout: 2000 }).toBe(false);
  });

  test('Security — XSS payload in the post slug does not execute script', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    await page.goto(`${BASE}/post/<script>alert(1)</script>`);
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(alertFired).toBe(false);
  });

  test('Security — delete confirm request carries no auth token in the URL', { tag: '@exploratory' }, async ({ page }) => {
    const leaky: string[] = [];
    page.on('request', req => {
      if (/delete/i.test(req.url()) && req.method() !== 'GET') {
        const u = new URL(req.url());
        for (const k of u.searchParams.keys()) {
          if (/token|session|jwt|auth|access|secret|password/i.test(k)) leaky.push(`${k} in ${req.url()}`);
        }
      }
    });
    expect(await flow.openDeleteDialog()).toBe(true);
    await flow.confirmDelete();
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(leaky, `Sensitive query params on delete request: ${leaky.join(', ')}`).toEqual([]);
  });

  test('Security — the delete flow triggers no uncaught JS error', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    expect(await flow.openDeleteDialog()).toBe(true);
    await flow.confirmDelete();
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(errors, `Uncaught JS during delete:\n${errors.join('\n')}`).toEqual([]);
  });

  test('Security — auth/session cookies set HttpOnly, Secure and SameSite flags', { tag: '@exploratory' }, async ({ page }) => {
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter(c => /sess|token|jwt|auth|sid|csrf/i.test(c.name));
    test.skip(authCookies.length === 0, 'No session-like cookies present to evaluate');
    const offenders = authCookies
      .filter(c => !c.httpOnly || !c.secure || c.sameSite === 'None')
      .map(c => `${c.name} (httpOnly=${c.httpOnly}, secure=${c.secure}, sameSite=${c.sameSite})`);
    expect(offenders, `Insecure auth cookies: ${offenders.join('; ')}`).toEqual([]);
  });

  test('Security — post page sets a clickjacking protection header (X-Frame-Options or CSP)', { tag: '@exploratory' }, async ({ page }) => {
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

  test('Security — post page sets Strict-Transport-Security (HSTS)', { tag: '@exploratory' }, async ({ page }) => {
    let hsts: string | undefined;
    page.on('response', res => { if (res.url().includes('/post/')) hsts = res.headers()['strict-transport-security']; });
    await page.reload();
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(hsts, 'No HSTS header').toBeTruthy();
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

  test('Security — no public JavaScript source maps are served', { tag: '@exploratory' }, async ({ page }) => {
    const scriptUrls = await page.$$eval('script[src]', els =>
      els.map(s => (s as HTMLScriptElement).src).filter(u => u.startsWith('http')));
    test.skip(scriptUrls.length === 0, 'No external scripts to probe');
    const leaked: string[] = [];
    for (const url of scriptUrls.slice(0, 8)) {
      const resp = await page.request.get(`${url}.map`).catch(() => null);
      if (resp && resp.status() === 200) leaked.push(`${url}.map`);
    }
    expect(leaked, `Publicly accessible source maps:\n${leaked.join('\n')}`).toEqual([]);
  });

  test('Security — post page issues no insecure http:// subresource requests (no mixed content)', { tag: '@exploratory' }, async ({ page }) => {
    const insecure: string[] = [];
    page.on('request', req => {
      const url = req.url();
      if (url.startsWith('http://') && !url.startsWith('http://localhost')) insecure.push(url);
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(insecure, `Insecure http:// requests:\n${insecure.join('\n')}`).toEqual([]);
  });

  test('Security — no plaintext password persisted in local/session storage', { tag: '@exploratory' }, async ({ page }) => {
    const found = await page.evaluate(pwd => {
      const scan = (s: Storage) => Object.keys(s).some(k => (s.getItem(k) ?? '').includes(pwd));
      return scan(localStorage) || scan(sessionStorage);
    }, VALID_PASSWORD);
    expect(found, 'Plaintext password found in browser storage').toBe(false);
  });

  // ── Accessibility cases (9) ────────────────────────────────────────────────

  test('A11y — confirmation dialog uses a dialog/alertdialog role', { tag: '@exploratory' }, async () => {
    expect(await flow.openDeleteDialog()).toBe(true);
    const role = await flow.confirmDialog.getAttribute('role');
    expect(['dialog', 'alertdialog']).toContain(role);
  });

  test('A11y — confirmation dialog has an accessible name', { tag: '@exploratory' }, async () => {
    expect(await flow.openDeleteDialog()).toBe(true);
    const ariaLabel = await flow.confirmDialog.getAttribute('aria-label');
    const ariaLabelledBy = await flow.confirmDialog.getAttribute('aria-labelledby');
    const hasHeading = await flow.dialogHeading.isVisible().catch(() => false);
    expect(Boolean(ariaLabel) || Boolean(ariaLabelledBy) || hasHeading,
      'Dialog has no accessible name').toBe(true);
  });

  test('A11y — both dialog buttons expose an accessible name', { tag: '@exploratory' }, async () => {
    expect(await flow.openDeleteDialog()).toBe(true);
    await expect(flow.cancelDeleteBtn).toBeVisible();
    await expect(flow.confirmDeleteBtn).toBeVisible();
  });

  test('A11y — opening the dialog moves keyboard focus into it', { tag: '@exploratory' }, async ({ page }) => {
    expect(await flow.openDeleteDialog()).toBe(true);
    const focusInDialog = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"], [role="alertdialog"]');
      return !!d && !!document.activeElement && d.contains(document.activeElement);
    });
    expect(focusInDialog, 'Focus was not moved into the open dialog').toBe(true);
  });

  test('A11y — Escape closes the confirmation dialog (keyboard operability)', { tag: '@exploratory' }, async ({ page }) => {
    expect(await flow.openDeleteDialog()).toBe(true);
    await page.keyboard.press('Escape');
    await expect(flow.confirmDialog).not.toBeVisible({ timeout: 5000 });
  });

  test('A11y — no duplicate element ids while the dialog is open', { tag: '@exploratory' }, async ({ page }) => {
    expect(await flow.openDeleteDialog()).toBe(true);
    const dupes = await page.$$eval('[id]', els => {
      const seen = new Map<string, number>();
      for (const el of els) if (el.id) seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
      return [...seen.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id} ×${n}`);
    });
    expect(dupes, `Duplicate ids: ${dupes.join(', ')}`).toEqual([]);
  });

  test('A11y — every image on the post page has an alt attribute', { tag: '@exploratory' }, async ({ page }) => {
    const missing = await page.$$eval('img', els =>
      els.filter(img => img.getAttribute('alt') === null).map(img => img.getAttribute('src') ?? '(no src)'));
    expect(missing, `Images missing alt: ${missing.join(', ')}`).toEqual([]);
  });

  test('A11y — no visible button on the post page is missing an accessible name', { tag: '@exploratory' }, async ({ page }) => {
    const unnamed = await page.$$eval('button', els =>
      els.filter(b => {
        const visible = !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length);
        if (!visible) return false;
        const text = (b.textContent ?? '').trim();
        return !text && !b.getAttribute('aria-label') && !b.getAttribute('title')
          && !b.getAttribute('aria-labelledby') && !b.querySelector('img')?.getAttribute('alt');
      }).length);
    expect(unnamed, 'Visible buttons without an accessible name').toBe(0);
  });

  test('A11y — heading outline has no skipped levels', { tag: '@exploratory' }, async ({ page }) => {
    const levels = await page.$$eval('h1,h2,h3,h4,h5,h6', els =>
      (els as HTMLElement[])
        .filter(h => !!(h.offsetWidth || h.offsetHeight || h.getClientRects().length))
        .map(h => parseInt(h.tagName.substring(1), 10)));
    test.skip(levels.length < 2, 'Not enough headings to evaluate outline');
    const jumps: string[] = [];
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) jumps.push(`h${levels[i - 1]} → h${levels[i]}`);
    }
    expect(jumps, `Skipped heading levels: ${jumps.join(', ')}`).toEqual([]);
  });

  // ── Edge cases (5) ─────────────────────────────────────────────────────────

  test('Edge — after a permanent delete, browser Back does not restore the post', { tag: '@exploratory' }, async ({ page }) => {
    expect(await flow.openDeleteDialog()).toBe(true);
    await flow.confirmDelete();
    await page.goBack().catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(flow.postOptionsBtn).toHaveCount(0);
  });

  test('Edge — the dialog can be reopened after cancelling', { tag: '@exploratory' }, async () => {
    expect(await flow.openDeleteDialog()).toBe(true);
    await flow.cancelDelete();
    expect(await flow.openDeleteDialog()).toBe(true);
    await expect(flow.confirmDialog).toBeVisible();
  });

  test('Edge — double-clicking the confirm button fires no server (5xx) error', { tag: '@exploratory' }, async ({ page }) => {
    const bad: string[] = [];
    page.on('response', res => {
      if (res.status() >= 500) bad.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    });
    expect(await flow.openDeleteDialog()).toBe(true);
    await flow.confirmDeleteBtn.click({ force: true });
    await flow.confirmDeleteBtn.click({ force: true, timeout: 2000 }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(bad, `5xx on double-confirm:\n${bad.join('\n')}`).toEqual([]);
  });

  test('Edge — deleting a post with a very long (300-char) title succeeds', { tag: '@exploratory' }, async ({ page }) => {
    slug = await flow.seedDisposablePost(`L${'o'.repeat(300)}ng ${Date.now()}`);
    expect(await flow.openDeleteDialog()).toBe(true);
    await flow.confirmDelete();
    await expect(page).not.toHaveURL(new RegExp(`/post/${slug}(?:[/?#]|$)`), { timeout: 15000 });
  });

  test('Edge — clicking outside the dialog does not silently delete the post', { tag: '@exploratory' }, async ({ page }) => {
    expect(await flow.openDeleteDialog()).toBe(true);
    // Click top-left corner, away from the centered dialog.
    await page.mouse.click(5, 5);
    await flow.gotoPost(slug);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  // ── Diagnostic & Performance cases (4) ──────────────────────────────────────

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
      if (s >= 500 || (s >= 400 && res.url().includes('/post/'))) {
        bad.push(`${s} ${res.request().method()} ${res.url()}`);
      }
    });
    await page.reload();
    await page.waitForLoadState('load');
    expect(bad, `Failing responses:\n${bad.join('\n')}`).toEqual([]);
  });

  test('Performance — post document Time To First Byte is under 800ms', { tag: '@exploratory' }, async ({ page }) => {
    await page.reload({ waitUntil: 'commit' });
    const ttfb = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      return nav ? nav.responseStart - nav.requestStart : -1;
    });
    expect(ttfb, 'No navigation timing entry').toBeGreaterThanOrEqual(0);
    expect(ttfb, `TTFB ${Math.round(ttfb)}ms exceeds 800ms budget`).toBeLessThan(800);
  });

  test('Performance — post page Largest Contentful Paint is within the 2.5s budget', { tag: '@exploratory' }, async ({ page, browserName }) => {
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
      setTimeout(() => resolve(last), 3000);
    }));
    expect(lcp, 'No LCP entry was recorded').toBeGreaterThan(0);
    expect(lcp, `LCP ${Math.round(lcp)}ms exceeds the 2500ms budget`).toBeLessThan(2500);
  });
});

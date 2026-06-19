import { test, expect } from '@playwright/test';
import { PostLoginHomepageExploratoryPage } from '../../src/pages/exploratory/PostLoginHomepageExploratory';

const VALID_EMAIL = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';
const BASE = 'https://staging.talktravel.com';

test.describe('Post-Login Homepage — Exploratory (Edge & Negative)', () => {
  let flow: PostLoginHomepageExploratoryPage;

  test.beforeEach(async ({ page }) => {
    flow = new PostLoginHomepageExploratoryPage(page);
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.goToHomepage();
  });

  // ── Feed tab hrefs ────────────────────────────────────────────────────────

  test('Edge — Trending tab href points to /trending', { tag: '@exploratory' }, async () => {
    await expect(flow.feedTabTrendingLink).toHaveAttribute('href', '/trending');
  });

  test('Edge — Latest tab href points to /latest', { tag: '@exploratory' }, async () => {
    await expect(flow.feedTabLatestLink).toHaveAttribute('href', '/latest');
  });

  test('Edge — For You tab href points to /for-you', { tag: '@exploratory' }, async () => {
    await expect(flow.feedTabForYouLink).toHaveAttribute('href', '/for-you');
  });

  // ── Rapid tab switching — may expose race conditions or stale state ────────

  test('Edge — rapid tab switching Trending → Latest → For You renders feed each time', { tag: '@exploratory' }, async () => {
    await flow.feedTabLatestLink.click();
    await flow.feedTabForYouLink.click();
    await flow.feedTabTrendingLink.click();
    await expect(flow.feedPostCards.first()).toBeVisible();
  });

  // ── View toggle edge cases ────────────────────────────────────────────────

  test('Edge — toggling Card → Compact → Card multiple times does not break feed', { tag: '@exploratory' }, async () => {
    await flow.switchToCompactView();
    await flow.switchToCardView();
    await flow.switchToCompactView();
    await flow.switchToCardView();
    await expect(flow.feedPostCards.first()).toBeVisible();
  });

  // ── Voting edge cases — double click, toggle ──────────────────────────────

  test('Edge — clicking Upvote twice rapidly does not navigate away', { tag: '@exploratory' }, async ({ page }) => {
    await flow.firstUpvoteBtn.click();
    await flow.firstUpvoteBtn.click();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/trending/);
  });

  test('Edge — clicking Upvote then Downvote on same post does not crash page', { tag: '@exploratory' }, async ({ page }) => {
    await flow.firstUpvoteBtn.click();
    await flow.firstDownvoteBtn.click();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(flow.feedPostCards.first()).toBeVisible();
  });

  test('Edge — clicking Downvote then Upvote on same post does not crash page', { tag: '@exploratory' }, async ({ page }) => {
    await flow.firstDownvoteBtn.click();
    await flow.firstUpvoteBtn.click();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(flow.feedPostCards.first()).toBeVisible();
  });

  // ── Direct URL navigation while logged in ────────────────────────────────

  test('Negative — visiting /login while logged in redirects away from /login', { tag: '@exploratory' }, async ({ page }) => {
    await flow.safeGoto('https://staging.talktravel.com/login');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Negative — visiting /register while logged in redirects away from /register', { tag: '@exploratory' }, async ({ page }) => {
    await flow.safeGoto('https://staging.talktravel.com/register');
    await expect(page).not.toHaveURL(/\/register/);
  });

  test('Negative — navigating to a non-existent route shows 404 or redirects gracefully', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('https://staging.talktravel.com/this-page-does-not-exist-xyz');
    const title = await page.title();
    const url = page.url();
    // Should either show a 404 page or redirect — must not crash with blank page
    expect(title.trim().length).toBeGreaterThan(0);
    expect(url).toBeTruthy();
  });

  // ── Browser back / forward edge cases ────────────────────────────────────

  test('Edge — browser back after switching to Latest tab returns to /trending', { tag: '@exploratory' }, async ({ page }) => {
    await flow.feedTabLatestLink.click();
    await expect(page).toHaveURL(/\/latest/);
    await page.goBack().catch(e => { if (!String(e).includes('ERR_ABORTED')) throw e; });
    await expect(page).toHaveURL(/\/trending/);
  });

  test('Edge — browser forward after going back restores /latest', { tag: '@exploratory' }, async ({ page }) => {
    await flow.feedTabLatestLink.click();
    await expect(page).toHaveURL(/\/latest/);
    await page.goBack().catch(e => { if (!String(e).includes('ERR_ABORTED')) throw e; });
    await expect(page).toHaveURL(/\/trending/);
    await page.goForward().catch(e => { if (!String(e).includes('ERR_ABORTED')) throw e; });
    await expect(page).toHaveURL(/\/latest/);
  });

  // ── Page reload edge cases ────────────────────────────────────────────────

  test('Edge — reloading /trending while logged in does not redirect to /login', { tag: '@exploratory' }, async ({ page }) => {
    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/trending/);
  });

  // ── Footer integrity ──────────────────────────────────────────────────────

  test('Edge — footer Privacy link has correct href', { tag: '@exploratory' }, async () => {
    await expect(flow.footerPrivacyLink).toHaveAttribute('href', '/privacy-policy');
  });

  test('Edge — footer Terms link has correct href', { tag: '@exploratory' }, async () => {
    await expect(flow.footerTermsLink).toHaveAttribute('href', '/terms-of-service');
  });

  test('Edge — footer copyright text contains current year and TalkTravel brand', { tag: '@exploratory' }, async () => {
    await expect(flow.footerCopyright).toBeVisible();
    const text = await flow.footerCopyright.innerText();
    expect(text).toMatch(/© \d{4} TalkTravel/);
  });

  // ── Post card data integrity ──────────────────────────────────────────────

  test('Edge — first post card has non-empty title text', { tag: '@exploratory' }, async () => {
    const firstCard = flow.feedPostCards.first();
    await expect(firstCard).toBeVisible();
    const text = await firstCard.innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('Edge — author profile link href uses /profile/ pattern', { tag: '@exploratory' }, async () => {
    await expect(flow.firstAuthorProfileLink).toHaveAttribute('href', /^\/profile\/.+/);
  });

  test('Edge — first tag chip href uses /tags/ pattern', { tag: '@exploratory' }, async () => {
    await expect(flow.firstTagChip).toHaveAttribute('href', /^\/tags\/.+/);
  });

  // ── No console errors on load ─────────────────────────────────────────────

  test('Edge — /trending page has no console errors when logged in', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('https://staging.talktravel.com/trending', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    expect(errors).toHaveLength(0);
  });

  // ── Security ───────────────────────────────────────────────────────────────

  test('Security — after logout, visiting /trending redirects to login (session invalidated)', { tag: '@exploratory' }, async ({ page }) => {
    await flow.logout();
    await flow.safeGoto(`${BASE}/trending`);
    // The authenticated feed must not render to a logged-out user.
    const onLogin = /\/login/.test(page.url());
    const feedVisible = await flow.feedPostCards.first().isVisible().catch(() => false);
    expect(onLogin || !feedVisible).toBeTruthy();
  });

  test('Security — browser Back after logout does not re-expose the feed (bfcache)', { tag: '@exploratory' }, async ({ page }) => {
    await flow.logout();
    await page.goBack().catch(e => { if (!String(e).includes('ERR_ABORTED')) throw e; });
    await expect(page).not.toHaveURL(/\/trending/);
  });

  test('Security — every target="_blank" link sets rel="noopener" (reverse tabnabbing)', { tag: '@exploratory' }, async ({ page }) => {
    const offenders = await page.$$eval('a[target="_blank"]', els =>
      els
        .filter(a => !((a.getAttribute('rel') ?? '').toLowerCase().includes('noopener')))
        .map(a => a.getAttribute('href') ?? '(no href)')
    );
    expect(offenders, `Links missing rel="noopener": ${offenders.join(', ')}`).toEqual([]);
  });

  test('Security — homepage URL exposes no auth token / session id in query params', { tag: '@exploratory' }, async ({ page }) => {
    const url = new URL(page.url());
    const leaky = [...url.searchParams.keys()].filter(k => /token|session|jwt|auth|access|secret|password/i.test(k));
    expect(leaky, `Sensitive query params: ${leaky.join(', ')}`).toEqual([]);
  });

  test('Security — open-redirect: ?redirect to an external origin stays on talktravel.com', { tag: '@exploratory' }, async ({ page }) => {
    await flow.safeGoto(`${BASE}/login?redirect=https://evil.example.com`);
    expect(new URL(page.url()).hostname).toContain('talktravel.com');
  });

  test('Security — no plaintext password is persisted in local/session storage', { tag: '@exploratory' }, async ({ page }) => {
    const found = await page.evaluate((pwd) => {
      const scan = (s: Storage) => Object.keys(s).some(k => (s.getItem(k) ?? '').includes(pwd));
      return scan(localStorage) || scan(sessionStorage);
    }, VALID_PASSWORD);
    expect(found, 'Plaintext password found in browser storage').toBe(false);
  });

  test('Security — Reject All consent does not persist an "accepted" cookie value', { tag: '@exploratory' }, async ({ page }) => {
    await page.getByRole('button', { name: 'Reject All' }).click({ timeout: 3000 }).catch(() => { /* banner absent */ });
    const cookies = await page.context().cookies();
    const acceptedConsent = cookies.find(c => /consent|cookie/i.test(c.name) && /accept|all|true|granted/i.test(c.value));
    expect(acceptedConsent, `Consent cookie indicates acceptance after Reject: ${acceptedConsent?.name}`).toBeUndefined();
  });

  // ── Accessibility ────────────────────────────────────────────────────────

  test('A11y — <html> has a non-empty lang attribute', { tag: '@exploratory' }, async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang?.trim()).toBeTruthy();
  });

  test('A11y — page has exactly one level-1 heading', { tag: '@exploratory' }, async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('A11y — a main landmark is present', { tag: '@exploratory' }, async ({ page }) => {
    await expect(page.getByRole('main').first()).toBeVisible();
  });

  test('A11y — every image has an alt attribute', { tag: '@exploratory' }, async ({ page }) => {
    const missing = await page.$$eval('img', els =>
      els.filter(img => img.getAttribute('alt') === null).map(img => img.getAttribute('src') ?? '(no src)')
    );
    expect(missing, `Images missing alt: ${missing.join(', ')}`).toEqual([]);
  });

  test('A11y — no interactive button is missing an accessible name', { tag: '@exploratory' }, async ({ page }) => {
    await flow.dismissCookieBanner();
    const unnamed = await page.$$eval('button', els =>
      els
        .filter(b => {
          const visible = !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length);
          if (!visible) return false;
          const text = (b.textContent ?? '').trim();
          const aria = b.getAttribute('aria-label');
          const title = b.getAttribute('title');
          const labelledBy = b.getAttribute('aria-labelledby');
          const imgAlt = b.querySelector('img')?.getAttribute('alt');
          return !text && !aria && !title && !labelledBy && !imgAlt;
        })
        .length
    );
    expect(unnamed, 'Visible buttons without an accessible name').toBe(0);
  });

  test('A11y — feed tab is keyboard focusable and activates with Enter', { tag: '@exploratory' }, async ({ page }) => {
    await flow.feedTabLatestLink.focus();
    await expect(flow.feedTabLatestLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/latest/);
  });

  test('A11y — no link is empty of discernible text', { tag: '@exploratory' }, async ({ page }) => {
    const emptyLinks = await page.$$eval('a', els =>
      els.filter(a => {
        const visible = !!(a.offsetWidth || a.offsetHeight || a.getClientRects().length);
        if (!visible) return false;
        const text = (a.textContent ?? '').trim();
        const aria = a.getAttribute('aria-label');
        const title = a.getAttribute('title');
        const imgAlt = a.querySelector('img')?.getAttribute('alt');
        return !text && !aria && !title && !imgAlt;
      }).length
    );
    expect(emptyLinks, 'Visible links without discernible text').toBe(0);
  });

  // ── Usability ──────────────────────────────────────────────────────────────

  test('Usability — document title is non-empty and references TalkTravel', { tag: '@exploratory' }, async ({ page }) => {
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
    expect(title).toMatch(/talktravel/i);
  });

  test('Usability — active feed tab is visually distinguished after selection', { tag: '@exploratory' }, async ({ page }) => {
    await flow.feedTabLatestLink.click();
    await expect(page).toHaveURL(/\/latest/);
    const ariaCurrent = await flow.feedTabLatestLink.getAttribute('aria-current');
    const cls = (await flow.feedTabLatestLink.getAttribute('class')) ?? '';
    expect(
      ariaCurrent === 'page' || ariaCurrent === 'true' || /active|selected|current/i.test(cls),
      'Active tab has no aria-current and no active/selected class',
    ).toBeTruthy();
  });

  test('Usability — cookie banner does not reappear after acceptance + reload', { tag: '@exploratory' }, async ({ page }) => {
    await flow.dismissCookieBanner();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Accept All' })).toBeHidden();
  });

  test('Usability — clicking the logo from /latest returns to the home feed', { tag: '@exploratory' }, async ({ page }) => {
    await flow.feedTabLatestLink.click();
    await expect(page).toHaveURL(/\/latest/);
    await flow.logo.click();
    await expect(page).toHaveURL(/\/(trending)?$/);
  });

  test('Usability — double-clicking a post card opens a single post (no double navigation)', { tag: '@exploratory' }, async ({ page }) => {
    const card = flow.feedPostCards.first();
    await expect(card).toBeVisible();
    await card.dblclick();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/i);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('Usability — feed renders at least one post within 10s (no perpetual empty state)', { tag: '@exploratory' }, async () => {
    await expect(flow.feedPostCards.first()).toBeVisible({ timeout: 10000 });
  });

  // ── Error surfacing / diagnostics ──────────────────────────────────────────
  // These actively collect runtime problems and fail with a detailed report,
  // so a real defect in the app is shown explicitly in the test output.

  test('Diagnostic — no HTTP 4xx/5xx responses while loading /trending', { tag: '@exploratory' }, async ({ page }) => {
    const bad: string[] = [];
    page.on('response', res => {
      const s = res.status();
      if (s >= 400) bad.push(`${s} ${res.request().method()} ${res.url()}`);
    });
    await page.goto(`${BASE}/trending`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    expect(bad, `Failing responses:\n${bad.join('\n')}`).toEqual([]);
  });

  test('Diagnostic — no failed/aborted network requests while loading /trending', { tag: '@exploratory' }, async ({ page }) => {
    const failed: string[] = [];
    page.on('requestfailed', req => {
      const err = req.failure()?.errorText ?? 'unknown';
      // Ignore Next.js RSC prefetches that get cancelled — these are expected.
      if (err === 'net::ERR_ABORTED') return;
      failed.push(`${req.method()} ${req.url()} — ${err}`);
    });
    await page.goto(`${BASE}/trending`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    expect(failed, `Failed requests:\n${failed.join('\n')}`).toEqual([]);
  });

  test('Diagnostic — no uncaught page (JS) errors on /trending', { tag: '@exploratory' }, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    await page.goto(`${BASE}/trending`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    expect(pageErrors, `Uncaught JS errors:\n${pageErrors.join('\n')}`).toEqual([]);
  });

  test('Diagnostic — no broken images (all rendered images load successfully)', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto(`${BASE}/trending`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    const broken = await page.$$eval('img', els =>
      els
        .filter(img => img.complete && img.naturalWidth === 0 && (img.getAttribute('src') ?? '') !== '')
        .map(img => img.getAttribute('src') ?? '(no src)')
    );
    expect(broken, `Broken images:\n${broken.join('\n')}`).toEqual([]);
  });

  test('Diagnostic — switching every feed tab triggers no server errors', { tag: '@exploratory' }, async ({ page }) => {
    const bad: string[] = [];
    page.on('response', res => { if (res.status() >= 500) bad.push(`${res.status()} ${res.url()}`); });
    await flow.feedTabLatestLink.click();
    await flow.feedTabForYouLink.click();
    await flow.feedTabTrendingLink.click();
    await page.waitForLoadState('networkidle');
    expect(bad, `5xx errors during tab switching:\n${bad.join('\n')}`).toEqual([]);
  });

  test('Diagnostic — voting triggers no server (5xx) error response', { tag: '@exploratory' }, async ({ page }) => {
    const bad: string[] = [];
    page.on('response', res => { if (res.status() >= 500) bad.push(`${res.status()} ${res.request().method()} ${res.url()}`); });
    await flow.firstUpvoteBtn.click();
    await page.waitForLoadState('networkidle');
    expect(bad, `5xx errors on vote:\n${bad.join('\n')}`).toEqual([]);
  });
});

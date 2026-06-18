import { test, expect } from '@playwright/test';
import { PostLoginHomepageExploratoryPage } from '../../src/pages/exploratory/PostLoginHomepageExploratory';

const VALID_EMAIL = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const VALID_PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';
const BASE = 'https://staging.talktravel.com';

/**
 * Post-Login Homepage — Security / Accessibility / Usability edge & negative cases.
 *
 * These are exploratory probes: each asserts a property the app *should* hold.
 * A failure here is a genuine finding (auth/route-guard, a11y, or UX defect),
 * not test flakiness — triage accordingly.
 */
test.describe('Post-Login Homepage — Security / A11y / Usability (Edge & Negative)', () => {
  let flow: PostLoginHomepageExploratoryPage;

  test.beforeEach(async ({ page }) => {
    flow = new PostLoginHomepageExploratoryPage(page);
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.goToHomepage();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECURITY (7)
  // ─────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────
  // ACCESSIBILITY (7)
  // ─────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────
  // USABILITY (6)
  // ─────────────────────────────────────────────────────────────────────────

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
});

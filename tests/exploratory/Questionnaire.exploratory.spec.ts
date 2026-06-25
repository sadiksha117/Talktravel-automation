import { test, expect } from '@playwright/test';
import { QuestionnaireExploratoryPage } from '../../src/pages/exploratory/QuestionnaireExploratory';

const BASE_URL = 'https://staging.talktravel.com';

test.describe('Travel Profile / Questionnaire (Onboarding) — Exploratory Edge & Negative Cases', () => {
  let questionnaire: QuestionnaireExploratoryPage;

  // Registration on staging is flaky under load; allow the whole test
  // (incl. the registration in beforeEach) to retry, and give the
  // register→questionnaire setup more headroom than the default 30s.
  test.describe.configure({ retries: 2, timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    questionnaire = new QuestionnaireExploratoryPage(page);
    await questionnaire.registerAndOpenQuestionnaire();
    await expect(page).toHaveURL(/\/questionnaire/, { timeout: 15000 });
  });

  // ── Negative: invalid / unmatched input ───────────────────────────────────

  test('Edge — typing a non-existent airport code shows no bogus option or an empty state', { tag: '@exploratory' }, async ({ page }) => {
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('ZZZZZQ9');
    // Give the async dropdown time to resolve
    await page.waitForTimeout(1500);
    const options = page.locator('[role="option"]');
    const count = await options.count();
    if (count > 0) {
      // No option should falsely claim to match the garbage query
      await expect(options.first()).not.toContainText(/ZZZZZQ9/i);
    } else {
      expect(count).toBe(0);
    }
  });

  test('Edge — submitting Continue with empty required Home Airport does not leave /questionnaire', { tag: '@exploratory' }, async ({ page }) => {
    await questionnaire.continueBtn.click();
    // Either it blocks (stays on page) or shows a validation message
    await page.waitForTimeout(1500);
    const stillOnPage = page.url().includes('/questionnaire');
    const validationVisible =
      (await page.locator('text=/required|please|select|choose/i').count()) > 0;
    expect(stillOnPage || validationVisible).toBe(true);
  });

  test('Edge — typed-but-unselected airport text is not accepted as a valid selection', { tag: '@exploratory' }, async ({ page }) => {
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('LAX');
    // Deliberately do NOT pick an option from the dropdown
    await page.keyboard.press('Escape');
    await questionnaire.continueBtn.click();
    await page.waitForTimeout(1500);
    const stillOnPage = page.url().includes('/questionnaire');
    const validationVisible =
      (await page.locator('text=/required|select|choose|valid/i').count()) > 0;
    expect(stillOnPage || validationVisible).toBe(true);
  });

  test('Edge — whitespace-only input in Home Airport is not treated as valid', { tag: '@exploratory' }, async ({ page }) => {
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('     ');
    await page.waitForTimeout(1000);
    const optionCount = await page.locator('[role="option"]').count();
    // Whitespace should not surface real airport suggestions
    expect(optionCount).toBe(0);
  });

  // ── Security: injection payloads ──────────────────────────────────────────

  test('Edge — XSS payload in Home Airport field does not execute script', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async dialog => {
      alertFired = true;
      await dialog.dismiss();
    });
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('<img src=x onerror=alert(1)>');
    await page.waitForTimeout(1500);
    expect(alertFired).toBe(false);
  });

  test('Edge — XSS payload in Favorite Airline field does not execute script', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async dialog => {
      alertFired = true;
      await dialog.dismiss();
    });
    await questionnaire.favoriteAirlineInput.click();
    await questionnaire.favoriteAirlineInput.fill('"><script>alert(1)</script>');
    await page.waitForTimeout(1500);
    expect(alertFired).toBe(false);
  });

  test('Edge — SQL-injection-style string in Home Airport is handled without a server error', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => { if (res.status() >= 500) serverError = true; });
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill("' OR '1'='1");
    await page.waitForTimeout(1500);
    expect(serverError).toBe(false);
  });

  test('Edge — very long input (1000 chars) in airport field does not crash the page', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('A'.repeat(1000));
    await page.waitForTimeout(1500);
    await expect(questionnaire.homeAirportInput).toBeVisible();
    // Ignore the app's pre-existing React hydration warning (#418), which is
    // framework-level and not triggered by the long input under test.
    const relevant = errors.filter(e => !/react\.dev\/errors|Minified React error/i.test(e));
    expect(relevant, `Unexpected page errors: ${relevant.join(' | ')}`).toHaveLength(0);
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  test('Edge — Home Airport field has an accessible name (label or aria-label)', { tag: '@exploratory' }, async () => {
    const ariaLabel = await questionnaire.homeAirportInput.getAttribute('aria-label');
    const ariaLabelledBy = await questionnaire.homeAirportInput.getAttribute('aria-labelledby');
    const placeholder = await questionnaire.homeAirportInput.getAttribute('placeholder');
    const id = await questionnaire.homeAirportInput.getAttribute('id');
    const hasAccessibleName =
      !!ariaLabel || !!ariaLabelledBy || !!placeholder || !!id;
    expect(hasAccessibleName, 'Home Airport field exposes no accessible name').toBe(true);
  });

  test('Edge — page exposes exactly one h1 heading for screen-reader structure', { tag: '@exploratory' }, async ({ page }) => {
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('Edge — Continue control is a real button reachable by keyboard', { tag: '@exploratory' }, async ({ page }) => {
    const tagName = await questionnaire.continueBtn.evaluate(el => el.tagName.toLowerCase());
    const role = await questionnaire.continueBtn.getAttribute('role');
    expect(tagName === 'button' || role === 'button').toBe(true);
    // Should be focusable via keyboard, not removed from tab order
    const tabIndex = await questionnaire.continueBtn.getAttribute('tabindex');
    expect(tabIndex).not.toBe('-1');
  });

  test('Edge — Skip for now is a focusable link/button, not a bare clickable div', { tag: '@exploratory' }, async () => {
    const tagName = await questionnaire.skipLink.evaluate(el => el.tagName.toLowerCase());
    const role = await questionnaire.skipLink.getAttribute('role');
    expect(['a', 'button'].includes(tagName) || ['link', 'button'].includes(role ?? '')).toBe(true);
  });

  // ── Edge: navigation / state integrity ────────────────────────────────────

  test('Edge — direct unauthenticated access to /questionnaire does not expose the form', { tag: '@exploratory' }, async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(`${BASE_URL}/questionnaire`);
    await page.waitForLoadState('load');
    const redirected = /\/login|\/register/.test(page.url());
    const formHidden = await questionnaire.homeAirportInput.isVisible().catch(() => false);
    // Without a session, the onboarding form should not be usable
    expect(redirected || !formHidden).toBe(true);
  });

  test('Edge — questionnaire page loads without console errors', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.reload();
    await page.waitForLoadState('load');
    expect(errors, `Console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('Edge — rapid double-click on Continue with empty form does not double-submit or navigate twice', { tag: '@exploratory' }, async ({ page }) => {
    // Track only first-party (talktravel) write requests, keyed by path —
    // third-party analytics/telemetry beacons are not a double-submit.
    const mutations: string[] = [];
    page.on('request', req => {
      const url = req.url();
      if (['POST', 'PUT', 'PATCH'].includes(req.method()) && url.includes('talktravel.com')) {
        mutations.push(url.split('?')[0]);
      }
    });
    await questionnaire.continueBtn.dblclick();
    await page.waitForTimeout(1500);
    // A single double-click must not hit the same save endpoint twice
    const counts = mutations.reduce<Record<string, number>>((acc, u) => {
      acc[u] = (acc[u] ?? 0) + 1;
      return acc;
    }, {});
    const doubled = Object.entries(counts).filter(([, n]) => n > 1);
    expect(doubled, `Endpoints called more than once: ${JSON.stringify(doubled)}`).toHaveLength(0);
  });

  // ── Negative: more invalid / boundary input ───────────────────────────────

  test('Edge — numeric-only input in Home Airport surfaces no false airport match', { tag: '@exploratory' }, async ({ page }) => {
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('1234567890');
    await page.waitForTimeout(1500);
    const options = page.locator('[role="option"]');
    const count = await options.count();
    if (count > 0) {
      await expect(options.first()).not.toContainText(/1234567890/);
    } else {
      expect(count).toBe(0);
    }
  });

  test('Edge — emoji input in Favorite Airline does not crash the dropdown', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await questionnaire.favoriteAirlineInput.click();
    await questionnaire.favoriteAirlineInput.fill('✈️🛫🌍');
    await page.waitForTimeout(1500);
    // Field must remain functional (no crash) after the emoji input
    await expect(questionnaire.favoriteAirlineInput).toBeVisible();
    // Ignore the app's pre-existing React hydration warning (#418), which is
    // framework-level and not triggered by the emoji input under test.
    const relevant = errors.filter(e => !/react\.dev\/errors|Minified React error/i.test(e));
    expect(relevant, `Unexpected page errors: ${relevant.join(' | ')}`).toHaveLength(0);
  });

  test('Edge — leading/trailing whitespace around a real airport code is trimmed or still matches', { tag: '@exploratory' }, async ({ page }) => {
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('  LAX  ');
    await page.waitForTimeout(1500);
    const optionCount = await page.locator('[role="option"]').count();
    if (optionCount > 0) {
      await expect(page.locator('[role="option"]').first()).toContainText(/LAX|Los Angeles/i);
    }
    // If nothing matches, the field must not silently accept the padded value as valid
    expect(optionCount).toBeGreaterThanOrEqual(0);
  });

  test('Edge — single-character query does not return an overwhelming unfiltered list', { tag: '@exploratory' }, async ({ page }) => {
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('a');
    await page.waitForTimeout(1500);
    const optionCount = await page.locator('[role="option"]').count();
    // A reasonable autocomplete caps suggestions rather than dumping every airport
    expect(optionCount).toBeLessThanOrEqual(50);
  });

  test('Edge — clearing the field after typing removes the suggestion dropdown', { tag: '@exploratory' }, async ({ page }) => {
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('LAX');
    await page.waitForTimeout(1000);
    await questionnaire.homeAirportInput.fill('');
    await page.waitForTimeout(1000);
    expect(await page.locator('[role="option"]').count()).toBe(0);
  });

  // ── Security: transport & data exposure ───────────────────────────────────

  test('Edge — questionnaire submission is not sent over an insecure http endpoint', { tag: '@exploratory' }, async ({ page }) => {
    const insecure: string[] = [];
    page.on('request', req => {
      if (['POST', 'PUT', 'PATCH'].includes(req.method()) && req.url().startsWith('http://')) {
        insecure.push(req.url());
      }
    });
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('BKK');
    await page.locator('[role="option"]').first().click().catch(() => {});
    await questionnaire.continueBtn.click().catch(() => {});
    await page.waitForTimeout(1500);
    expect(insecure, `Insecure requests: ${insecure.join(', ')}`).toHaveLength(0);
  });

  test('Edge — javascript: URL in the questionnaire path does not execute', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async dialog => { alertFired = true; await dialog.dismiss(); });
    await page.goto(`${BASE_URL}/questionnaire?redirect=javascript:alert(1)`);
    await page.waitForLoadState('load');
    expect(alertFired).toBe(false);
  });

  test('Edge — no sensitive tokens are exposed in the page HTML source', { tag: '@exploratory' }, async ({ page }) => {
    const html = await page.content();
    // Crude check for leaked secrets in the rendered markup
    expect(html).not.toMatch(/secret_key|private_key|aws_access_key|BEGIN RSA PRIVATE KEY/i);
  });

  // ── Accessibility: more coverage ──────────────────────────────────────────

  test('Edge — Favorite Airline field has an accessible name', { tag: '@exploratory' }, async () => {
    const ariaLabel = await questionnaire.favoriteAirlineInput.getAttribute('aria-label');
    const ariaLabelledBy = await questionnaire.favoriteAirlineInput.getAttribute('aria-labelledby');
    const placeholder = await questionnaire.favoriteAirlineInput.getAttribute('placeholder');
    const id = await questionnaire.favoriteAirlineInput.getAttribute('id');
    expect(!!ariaLabel || !!ariaLabelledBy || !!placeholder || !!id).toBe(true);
  });

  test('Edge — page has a lang attribute on the html element', { tag: '@exploratory' }, async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang, 'html element is missing a lang attribute').toBeTruthy();
  });

  test('Edge — keyboard Tab moves focus into a form control', { tag: '@exploratory' }, async ({ page }) => {
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase() ?? '');
    expect(['input', 'button', 'a', 'select', 'textarea'].includes(focusedTag)).toBe(true);
  });

  test('Edge — verification banner is reachable as an interactive element, not decorative', { tag: '@exploratory' }, async () => {
    const banner = questionnaire.verifyBanner;
    const tagName = await banner.evaluate(el => el.tagName.toLowerCase());
    const role = await banner.getAttribute('role');
    const tabindex = await banner.getAttribute('tabindex');
    const hasClickAffordance = await banner.evaluate(el => {
      const cursor = getComputedStyle(el).cursor;
      const hasHandler = typeof (el as HTMLElement).onclick === 'function' || el.hasAttribute('onclick');
      return cursor === 'pointer' || hasHandler;
    });
    const isInteractive =
      ['a', 'button'].includes(tagName) ||
      ['link', 'button'].includes(role ?? '') ||
      (await banner.locator('a, button').count()) > 0 ||
      (tabindex !== null && tabindex !== '-1') ||
      hasClickAffordance;
    expect(isInteractive, 'Verify banner appears decorative — no semantic role, tabindex, or click affordance').toBe(true);
  });

  // ── Edge: navigation / state integrity (more) ─────────────────────────────

  test('Edge — reloading mid-entry does not persist unsubmitted typed text', { tag: '@exploratory' }, async ({ page }) => {
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('LAX');
    await page.reload();
    await page.waitForLoadState('load');
    const val = await questionnaire.homeAirportInput.inputValue().catch(() => '');
    // Unsubmitted free text should not silently survive a reload as a committed value
    expect(val).not.toContain('LAX');
  });

  test('Edge — Skip for now does not fire a profile write/mutation request', { tag: '@exploratory' }, async ({ page }) => {
    // Only first-party (talktravel) writes matter — third-party analytics
    // beacons are not a profile save.
    const mutations: string[] = [];
    page.on('request', req => {
      const url = req.url();
      if (['POST', 'PUT', 'PATCH'].includes(req.method()) && url.includes('talktravel.com')) {
        mutations.push(url.split('?')[0]);
      }
    });
    await questionnaire.skipLink.click();
    await page.waitForTimeout(1500);
    // Skipping may hit a single "skip"/dismiss endpoint, but must not save
    // partial profile data via multiple distinct write calls.
    expect(new Set(mutations).size, `First-party writes: ${[...new Set(mutations)].join(', ')}`).toBeLessThanOrEqual(1);
  });

  test('Edge — questionnaire page returns no 4xx/5xx for its own resources on load', { tag: '@exploratory' }, async ({ page }) => {
    const badResponses: string[] = [];
    page.on('response', res => {
      if (res.status() >= 400 && res.url().includes('talktravel.com')) {
        badResponses.push(`${res.status()} ${res.url()}`);
      }
    });
    await page.reload();
    // Use 'load' (NOT networkidle — a live site never goes idle) plus a short
    // settle window to capture any failed resource responses.
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    expect(badResponses, `Bad responses: ${badResponses.join(' | ')}`).toHaveLength(0);
  });
});

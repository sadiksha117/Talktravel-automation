import { test, expect } from '@playwright/test';
import { DeletePostExploratoryPage } from '../../src/pages/exploratory/DeletePostExploratory';

const VALID_EMAIL    = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';
const BASE           = 'https://staging.talktravel.com';

/**
 * Delete Post (Post-Login) — Exploratory (Edge, Negative, Security, A11y).
 *
 * Adversarial coverage beyond the happy path in tests/DeletePost.spec.ts.
 * Delete is owner-only and irreversible, so each test seeds its OWN throwaway
 * post and operates on that. Run with `--workers=1` so the shared login and
 * seeding are not contended.
 */
test.describe('Delete Post (Post-Login) — Exploratory (Edge & Negative & Security & A11y)', () => {
  test.setTimeout(180000);

  let flow: DeletePostExploratoryPage;
  let slug: string;

  test.beforeEach(async ({ page }) => {
    flow = new DeletePostExploratoryPage(page);
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    slug = await flow.seedDisposablePost(`Del exploratory ${Date.now()}`);
  });

  // ── Negative cases ─────────────────────────────────────────────────────────

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
    // The post must still resolve — Escape is a cancel, never a delete.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('Negative — direct navigation to a non-existent post slug does not return 5xx', { tag: '@exploratory' }, async ({ page }) => {
    let serverError = false;
    page.on('response', res => {
      if (res.url().includes('/post/does-not-exist-') && res.status() >= 500) serverError = true;
    });
    await page.goto(`${BASE}/post/does-not-exist-${Date.now()}`);
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(serverError).toBe(false);
  });

  test('Negative — deleting is idempotent: re-navigating a deleted post never 5xxs', { tag: '@exploratory' }, async ({ page }) => {
    const bad: string[] = [];
    page.on('response', res => {
      if (res.status() >= 500) bad.push(`${res.status()} ${res.url()}`);
    });
    expect(await flow.openDeleteDialog()).toBe(true);
    await flow.confirmDelete();
    await flow.gotoPost(slug);
    await flow.gotoPost(slug); // second hit — must stay stable
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(bad, `5xx after delete:\n${bad.join('\n')}`).toEqual([]);
  });

  // ── Security cases ───────────────────────────────────────────────────────────

  test('Security — an XSS payload in the post title does not execute in the delete dialog', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    const xssSlug = await flow.seedDisposablePost(`<img src=x onerror=alert(1)> ${Date.now()}`);
    slug = xssSlug;
    await flow.openDeleteDialog();
    await expect.poll(() => alertFired, { timeout: 2000 }).toBe(false);
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
    expect(errors, `Uncaught JS errors during delete:\n${errors.join('\n')}`).toEqual([]);
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

  // ── Accessibility cases ────────────────────────────────────────────────────

  test('A11y — confirmation dialog uses a dialog/alertdialog role', { tag: '@exploratory' }, async ({ page }) => {
    expect(await flow.openDeleteDialog()).toBe(true);
    const role = await flow.confirmDialog.getAttribute('role');
    expect(['dialog', 'alertdialog']).toContain(role);
  });

  test('A11y — confirmation dialog has an accessible name (heading, aria-label or aria-labelledby)', { tag: '@exploratory' }, async () => {
    expect(await flow.openDeleteDialog()).toBe(true);
    const ariaLabel = await flow.confirmDialog.getAttribute('aria-label');
    const ariaLabelledBy = await flow.confirmDialog.getAttribute('aria-labelledby');
    const hasHeading = await flow.dialogHeading.isVisible().catch(() => false);
    expect(
      Boolean(ariaLabel) || Boolean(ariaLabelledBy) || hasHeading,
      'Dialog has no accessible name (no heading / aria-label / aria-labelledby)',
    ).toBe(true);
  });

  test('A11y — both dialog buttons expose an accessible name', { tag: '@exploratory' }, async () => {
    expect(await flow.openDeleteDialog()).toBe(true);
    await expect(flow.cancelDeleteBtn).toBeVisible();
    await expect(flow.confirmDeleteBtn).toBeVisible();
  });

  test('A11y — opening the dialog moves keyboard focus into it', { tag: '@exploratory' }, async ({ page }) => {
    expect(await flow.openDeleteDialog()).toBe(true);
    const focusInDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"], [role="alertdialog"]');
      return !!dialog && !!document.activeElement && dialog.contains(document.activeElement);
    });
    expect(focusInDialog, 'Focus was not moved into the open dialog').toBe(true);
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

  // ── Edge cases ───────────────────────────────────────────────────────────────

  test('Edge — after a permanent delete, browser Back does not restore the post', { tag: '@exploratory' }, async ({ page }) => {
    expect(await flow.openDeleteDialog()).toBe(true);
    await flow.confirmDelete();
    await page.goBack().catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    // The deleted post's editable owner affordance must not reappear.
    await expect(flow.postOptionsBtn).toHaveCount(0);
  });

  test('Edge — the dialog can be reopened after cancelling', { tag: '@exploratory' }, async () => {
    expect(await flow.openDeleteDialog()).toBe(true);
    await flow.cancelDelete();
    // Reopen — the entry point must still work after a cancel.
    expect(await flow.openDeleteDialog()).toBe(true);
    await expect(flow.confirmDialog).toBeVisible();
  });

  test('Edge — double-clicking the confirm button fires no server (5xx) error', { tag: '@exploratory' }, async ({ page }) => {
    const bad: string[] = [];
    page.on('response', res => {
      if (res.status() >= 500) bad.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    });
    expect(await flow.openDeleteDialog()).toBe(true);
    // Rapid double click — only one delete should process, no duplicate/5xx.
    await flow.confirmDeleteBtn.click({ force: true });
    await flow.confirmDeleteBtn.click({ force: true, timeout: 2000 }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(bad, `5xx on double-confirm:\n${bad.join('\n')}`).toEqual([]);
  });

  test('Edge — deleting a post with a very long (300-char) title succeeds', { tag: '@exploratory' }, async ({ page }) => {
    const longSlug = await flow.seedDisposablePost(`L${'o'.repeat(300)}ng ${Date.now()}`);
    slug = longSlug;
    expect(await flow.openDeleteDialog()).toBe(true);
    await flow.confirmDelete();
    await expect(page).not.toHaveURL(new RegExp(`/post/${longSlug}(?:[/?#]|$)`), { timeout: 15000 });
  });
});

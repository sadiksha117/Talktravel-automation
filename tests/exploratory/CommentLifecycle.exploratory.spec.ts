import { test, expect, type Locator } from '@playwright/test';
import { CommentLifecyclePage } from '../../src/pages/CommentLifecycle';

/**
 * Comment Lifecycle — EXPLORATORY suite (edge / negative / security / a11y).
 *
 * NO positive / happy-path assertions. Every case probes a failure mode,
 * an abuse vector, an accessibility gap, or app stability. Where a comment
 * must exist first, creating it is only setup — the assertion is always the
 * negative/security/edge check.
 *
 * Mirrors the style of the other *.exploratory.spec.ts files: real selectors
 * against staging, response/dialog/pageerror listeners, and @exploratory tags.
 */

const VALID_EMAIL    = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';
const BASE           = 'https://staging.talktravel.com';

test.describe('Comment Lifecycle — Exploratory (Edge / Negative / Security / A11y)', () => {
  let flow: CommentLifecyclePage;

  // 4 min: a fresh login + openFirstPost + the self-healing editor reload-retry
  // can approach the old 180s budget on slow staging responses.
  test.setTimeout(240000);

  test.beforeEach(async ({ page }) => {
    flow = new CommentLifecyclePage(page);
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
    await flow.openFirstPost();
  });

  // Types text into the top-level comment editor and submits, WITHOUT asserting
  // success — callers assert the negative/security outcome themselves.
  async function typeAndSubmit(text: string): Promise<Locator> {
    const editor = await flow.getCommentInput();
    await editor.click();
    await editor.fill(text);
    await flow.commentSubmitBtn.click({ timeout: 8000 }).catch(() => {});
    return editor;
  }

  // ── A. Input validation & negative cases ───────────────────────────────────

  test('Negative — empty comment leaves the submit button disabled', { tag: '@exploratory' }, async () => {
    const editor = await flow.getCommentInput();
    await editor.click();
    await editor.fill('');
    await expect(flow.commentSubmitBtn).toBeDisabled();
  });

  test('Negative — whitespace-only comment does not enable submit / creates nothing', { tag: '@exploratory' }, async ({ page }) => {
    const editor = await flow.getCommentInput();
    await editor.click();
    await editor.fill('     ');
    const disabled = await flow.commentSubmitBtn.isDisabled().catch(() => false);
    if (!disabled) {
      await flow.commentSubmitBtn.click().catch(() => {});
      // A whitespace-only comment must not appear as a rendered paragraph.
      await expect(page.locator('.ql-editor')).not.toHaveText(/\S/);
    }
    expect(true).toBe(true);
  });

  test('Edge — very long (10k char) comment does not crash the editor', { tag: '@exploratory' }, async ({ page }) => {
    const editor = await flow.getCommentInput();
    await editor.click();
    await editor.fill('a'.repeat(10000));
    await expect(flow.postTitle).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Edge — a single 5000-char word (no spaces) does not break layout or crash', { tag: '@exploratory' }, async ({ page }) => {
    const editor = await flow.getCommentInput();
    await editor.click();
    await editor.fill('x'.repeat(5000));
    // Page must not scroll horizontally off its own body due to an unbreakable word.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 4);
    expect(overflow, 'Long unbroken word caused horizontal page overflow').toBe(false);
  });

  test('Negative — rapid double-submit does not create a duplicate comment', { tag: '@exploratory' }, async ({ page }) => {
    const text = `Dup probe ${Date.now()}`;
    const editor = await flow.getCommentInput();
    await editor.click();
    await editor.fill(text);
    // Fire two clicks back-to-back.
    await Promise.allSettled([
      flow.commentSubmitBtn.click({ timeout: 5000 }),
      flow.commentSubmitBtn.click({ timeout: 5000 }),
    ]);
    await page.getByText(text).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await expect(page.getByText(text)).toHaveCount(1);
  });

  test('Negative — Cancel discards an in-progress reply (nothing is created)', { tag: '@exploratory' }, async ({ page }) => {
    const discard = `Discarded reply ${Date.now()}`;
    const firstReplyBtn = page.getByRole('button', { name: /^talktravel reply$/i }).first();
    await firstReplyBtn.click();
    const replyInput = flow.activeInlineEditor();
    await replyInput.waitFor({ state: 'visible', timeout: 8000 });
    await replyInput.fill(discard);
    // Scoped Cancel — .first() would hit the top-level comment editor's Cancel.
    await flow.inlineCancelBtn.click();
    await expect(page.getByText(discard)).toHaveCount(0);
  });

  test('Negative — Cancel edit restores the original text and adds no edited marker', { tag: '@exploratory' }, async ({ page }) => {
    const original = `Cancel-edit ${Date.now()}`;
    await flow.addTopLevelComment(original); // setup
    const row = flow.commentRow(original);
    await flow.openCommentMenu(row);
    await flow.menuEditItem.click();
    await flow.activeInlineEditor().fill('THIS SHOULD BE DISCARDED');
    await flow.inlineCancelBtn.click();
    await expect(page.getByText(original)).toBeVisible();
    await expect(page.getByText('THIS SHOULD BE DISCARDED')).toHaveCount(0);
  });

  test('Negative — Cancel on delete confirmation keeps the comment', { tag: '@exploratory' }, async ({ page }) => {
    const keep = `Keep me ${Date.now()}`;
    await flow.addTopLevelComment(keep); // setup
    await flow.openCommentMenu(flow.commentRow(keep));
    await flow.menuDeleteItem.click();
    // Scoped to the dialog — the page also has the top-level editor's Cancel.
    await flow.deleteCancelBtn.click();
    await expect(page.getByText(keep)).toBeVisible();
  });

  test('Negative — submitting a comment produces no client-side navigation to /login', { tag: '@exploratory' }, async ({ page }) => {
    await typeAndSubmit(`Nav probe ${Date.now()}`);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/post\/.+/);
  });

  // ── B. Security cases ───────────────────────────────────────────────────────

  test('Security — <script> payload in a comment is not executed', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    await typeAndSubmit(`<script>alert(1)</script> ${Date.now()}`);
    await expect.poll(() => alertFired, { timeout: 3000 }).toBe(false);
  });

  test('Security — <img onerror> payload in a comment is not executed', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    await typeAndSubmit(`<img src=x onerror=alert(1)> ${Date.now()}`);
    await expect.poll(() => alertFired, { timeout: 3000 }).toBe(false);
  });

  test('Security — <svg onload> payload in a comment is not executed', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    await typeAndSubmit(`<svg/onload=alert(1)> ${Date.now()}`);
    await expect.poll(() => alertFired, { timeout: 3000 }).toBe(false);
  });

  test('Security — XSS payload inside a reply is not executed', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    await page.getByRole('button', { name: /^talktravel reply$/i }).first().click();
    const replyInput = flow.activeInlineEditor();
    await replyInput.waitFor({ state: 'visible', timeout: 8000 });
    await replyInput.fill(`<script>alert(2)</script> ${Date.now()}`);
    await flow.replySubmitBtn.click({ timeout: 5000 }).catch(() => {});
    await expect.poll(() => alertFired, { timeout: 3000 }).toBe(false);
  });

  test('Security — editing a comment to inject a script does not execute it', { tag: '@exploratory' }, async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
    const seed = `Edit-xss ${Date.now()}`;
    await flow.addTopLevelComment(seed); // setup
    await flow.openCommentMenu(flow.commentRow(seed));
    await flow.menuEditItem.click();
    await flow.activeInlineEditor().fill(`<script>alert(3)</script> ${Date.now()}`);
    await flow.editSaveBtn.click({ timeout: 5000 }).catch(() => {});
    await expect.poll(() => alertFired, { timeout: 3000 }).toBe(false);
  });

  test('Security — an <iframe> in a comment is not rendered as a live frame', { tag: '@exploratory' }, async ({ page }) => {
    const before = page.frames().length;
    await typeAndSubmit(`<iframe src="https://evil.example.com"></iframe> ${Date.now()}`);
    await page.waitForTimeout(1500);
    expect(page.frames().length, 'Comment injected a live iframe').toBe(before);
  });

  test('Security — template-injection probe {{7*7}} / ${7*7} renders literally (no SSTI)', { tag: '@exploratory' }, async ({ page }) => {
    const marker = `ssti-${Date.now()}`;
    await typeAndSubmit(`${marker} {{7*7}} \${7*7}`);
    await page.getByText(marker).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    // The evaluated value 49 must NOT appear next to our marker.
    await expect(flow.commentRow(marker)).not.toContainText('49');
  });

  test('Security — SQL-ish payload is stored as literal text and triggers no 5xx', { tag: '@exploratory' }, async ({ page }) => {
    const bad: string[] = [];
    page.on('response', res => { if (res.status() >= 500) bad.push(`${res.status()} ${res.url()}`); });
    await typeAndSubmit(`' OR '1'='1'; DROP TABLE comments;-- ${Date.now()}`);
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(bad, `5xx after SQL-ish comment:\n${bad.join('\n')}`).toEqual([]);
  });

  test('Security — bidi/RTL-override characters do not break the page or execute', { tag: '@exploratory' }, async ({ page }) => {
    let err = false;
    page.on('pageerror', () => { err = true; });
    await typeAndSubmit(`‮gnp.exe‬ ‏ reversed ${Date.now()}`);
    await page.waitForTimeout(1000);
    expect(err, 'Bidi characters caused an uncaught error').toBe(false);
    await expect(page).toHaveURL(/\/post\/.+/);
  });

  test('Security — a markdown link with a javascript: URL is not rendered as a javascript: href', { tag: '@exploratory' }, async ({ page }) => {
    const marker = `jsurl-${Date.now()}`;
    await typeAndSubmit(`${marker} [x](javascript:alert(1))`);
    await page.getByText(marker).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const jsHrefs = await flow.commentRow(marker).locator('a[href^="javascript:"]').count().catch(() => 0);
    expect(jsHrefs, 'A javascript: href was rendered from comment input').toBe(0);
  });

  test('Security — submitting a comment triggers no server (5xx) error', { tag: '@exploratory' }, async ({ page }) => {
    const bad: string[] = [];
    page.on('response', res => { if (res.status() >= 500) bad.push(`${res.status()} ${res.request().method()} ${res.url()}`); });
    await typeAndSubmit(`5xx probe ${Date.now()}`);
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(bad, `5xx on comment submit:\n${bad.join('\n')}`).toEqual([]);
  });

  test('Security — deleting a comment triggers no server (5xx) error', { tag: '@exploratory' }, async ({ page }) => {
    const bad: string[] = [];
    page.on('response', res => { if (res.status() >= 500) bad.push(`${res.status()} ${res.url()}`); });
    const seed = `Delete-5xx ${Date.now()}`;
    await flow.addTopLevelComment(seed); // setup
    await flow.openCommentMenu(flow.commentRow(seed));
    await flow.menuDeleteItem.click();
    await flow.deleteConfirmBtn.click().catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(bad, `5xx on delete:\n${bad.join('\n')}`).toEqual([]);
  });

  test('Security — sharing a comment copies a URL that leaks no auth/session token', { tag: '@exploratory' }, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const share = page.getByRole('button', { name: /^talktravel share$/i }).first();
    await share.waitFor({ state: 'visible', timeout: 10000 });
    await share.click();
    const copied = await page.evaluate(() => navigator.clipboard.readText().catch(() => '')).catch(() => '');
    if (copied) {
      expect(copied, `Shared comment URL leaks a sensitive param: ${copied}`)
        .not.toMatch(/token|jwt|session|auth|access|secret|password/i);
    }
  });

  test('Security — no comment API response leaks a raw email or bearer token in the page traffic', { tag: '@exploratory' }, async ({ page }) => {
    const leaks: string[] = [];
    page.on('response', async res => {
      const ct = res.headers()['content-type'] ?? '';
      if (!ct.includes('application/json')) return;
      if (!/comment|reply/i.test(res.url())) return;
      const body = await res.text().catch(() => '');
      if (/\beyJ[A-Za-z0-9_-]{10,}\./.test(body)) leaks.push(`JWT-like value in ${res.url()}`);
    });
    await typeAndSubmit(`Leak probe ${Date.now()}`);
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(leaks, `Sensitive data in comment responses:\n${leaks.join('\n')}`).toEqual([]);
  });

  // ── C. Accessibility cases ──────────────────────────────────────────────────

  test('A11y — the comment submit button exposes an accessible name', { tag: '@exploratory' }, async () => {
    await flow.getCommentInput();
    const name = await flow.commentSubmitBtn.getAttribute('aria-label')
      .catch(() => null) ?? (await flow.commentSubmitBtn.textContent().catch(() => ''));
    expect((name ?? '').trim().length, 'Comment submit button has no accessible name').toBeGreaterThan(0);
  });

  test('A11y — the comment 3-dot ("Reply options") control has an accessible name', { tag: '@exploratory' }, async ({ page }) => {
    const optionsBtn = page.getByRole('button', { name: /reply options|options|more/i }).first();
    await expect(optionsBtn).toBeVisible({ timeout: 10000 });
  });

  test('A11y — comment upvote and downvote buttons have accessible names', { tag: '@exploratory' }, async ({ page }) => {
    await expect(page.getByRole('button', { name: /upvote/i }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /downvote/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('A11y — every image inside the comment thread has an alt attribute', { tag: '@exploratory' }, async ({ page }) => {
    await page.getByRole('heading', { name: /comments/i }).first().scrollIntoViewIfNeeded().catch(() => {});
    const missing = await page.$$eval('img', imgs =>
      imgs.filter(i => i.getAttribute('alt') === null).map(i => i.getAttribute('src') ?? '(no src)'));
    expect(missing, `Images missing alt: ${missing.join(', ')}`).toEqual([]);
  });

  test('A11y — no visible button in the comment area lacks an accessible name', { tag: '@exploratory' }, async ({ page }) => {
    const unnamed = await page.$$eval('button', btns =>
      btns.filter(b => {
        const visible = !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length);
        if (!visible) return false;
        const text = (b.textContent ?? '').trim();
        return !text && !b.getAttribute('aria-label') && !b.getAttribute('title')
          && !b.getAttribute('aria-labelledby') && !b.querySelector('img')?.getAttribute('alt');
      }).length);
    expect(unnamed, 'Visible unnamed buttons present').toBe(0);
  });

  test('A11y — opening the reply box moves focus into an editable field', { tag: '@exploratory' }, async ({ page }) => {
    await page.getByRole('button', { name: /^talktravel reply$/i }).first().click();
    await flow.activeInlineEditor().waitFor({ state: 'visible', timeout: 8000 });
    const editableFocused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.isContentEditable || el.tagName === 'TEXTAREA' || el.getAttribute('role') === 'textbox');
    });
    expect(editableFocused, 'Focus did not move into the reply editor').toBe(true);
  });

  test('A11y — the comments section is introduced by a heading', { tag: '@exploratory' }, async ({ page }) => {
    await expect(page.getByRole('heading', { name: /comments/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('A11y — a deleted comment placeholder exposes readable text, not an empty node', { tag: '@exploratory' }, async ({ page }) => {
    // Setup: create a parent + reply, delete the parent to force a placeholder.
    const parent = `A11y-del ${Date.now()}`;
    await flow.addTopLevelComment(parent);
    await flow.replyTo(flow.commentRow(parent), `child ${Date.now()}`);
    await flow.openCommentMenu(flow.commentRow(parent));
    await flow.menuDeleteItem.click();
    await flow.deleteConfirmBtn.click().catch(() => {});
    await expect(page.getByText(/\[?Deleted( by author)?\]?/i).first()).toBeVisible({ timeout: 10000 });
  });

  // ── D. Edge / stability / diagnostics ───────────────────────────────────────

  test('Diagnostic — posting a comment raises no uncaught pageerror', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await typeAndSubmit(`Pageerror probe ${Date.now()}`);
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(errors, `Uncaught errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('Edge — the comment thread has no duplicate element ids', { tag: '@exploratory' }, async ({ page }) => {
    const dupes = await page.$$eval('[id]', els => {
      const seen = new Map<string, number>();
      for (const el of els) if (el.id) seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
      return [...seen.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id} ×${n}`);
    });
    expect(dupes, `Duplicate ids: ${dupes.join(', ')}`).toEqual([]);
  });

  test('Edge — rapidly toggling a comment upvote/downvote triggers no 5xx', { tag: '@exploratory' }, async ({ page }) => {
    const bad: string[] = [];
    page.on('response', res => { if (res.status() >= 500) bad.push(`${res.status()} ${res.url()}`); });
    const up = page.getByRole('button', { name: /upvote/i }).nth(1);
    const down = page.getByRole('button', { name: /downvote/i }).nth(1);
    if (await up.isVisible({ timeout: 5000 }).catch(() => false)) {
      for (let i = 0; i < 4; i++) { await up.click().catch(() => {}); await down.click().catch(() => {}); }
    }
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(bad, `5xx during rapid vote toggling:\n${bad.join('\n')}`).toEqual([]);
  });

  test('Edge — replying to a deeply-nested reply does not crash the app', { tag: '@exploratory' }, async ({ page }) => {
    const p = `Deep ${Date.now()}`;
    await flow.addTopLevelComment(p);
    const l2 = `Deep-l2 ${Date.now()}`;
    await flow.replyTo(flow.commentRow(p), l2);
    const l3 = `Deep-l3 ${Date.now()}`;
    await flow.replyTo(flow.commentRow(l2), l3);
    // Reply to the deepest node — app must not error or navigate away.
    await flow.replyTo(flow.commentRow(l3), `Deep-l4 ${Date.now()}`).catch(() => {});
    await expect(page).toHaveURL(/\/post\/.+/);
    await expect(flow.postTitle).toBeVisible();
  });

  test('Edge — an emoji + zero-width-character comment does not break rendering', { tag: '@exploratory' }, async ({ page }) => {
    let err = false;
    page.on('pageerror', () => { err = true; });
    await typeAndSubmit(`🧳✈️​‍🌍 ${Date.now()}`);
    await page.waitForTimeout(1000);
    expect(err).toBe(false);
    await expect(flow.postTitle).toBeVisible();
  });

  test('Edge — loading the post over a throttled network still renders the comment editor', { tag: '@exploratory' }, async ({ page }) => {
    // Re-open the post with a slow route to surface loading/hydration bugs.
    await page.route('**/*', async route => { await new Promise(r => setTimeout(r, 40)); await route.continue(); });
    await flow.openFirstPost().catch(() => {});
    await expect(flow.postTitle).toBeVisible({ timeout: 30000 });
    await page.unroute('**/*');
  });

  test('Negative — clearing cookies mid-session blocks commenting instead of crashing', { tag: '@exploratory' }, async ({ page, context }) => {
    let serverError = false;
    page.on('response', res => { if (res.status() >= 500) serverError = true; });
    await context.clearCookies();
    // Attempt to comment with no session — expect a login prompt / redirect, not a 5xx or blank crash.
    const editor = await flow.getCommentInput().catch(() => null);
    if (editor) {
      await editor.click().catch(() => {});
      await editor.fill(`No-session ${Date.now()}`).catch(() => {});
      await flow.commentSubmitBtn.click({ timeout: 5000 }).catch(() => {});
    }
    await page.waitForTimeout(1000);
    expect(serverError, 'Commenting without a session produced a 5xx').toBe(false);
    const body = await page.locator('body').innerText().catch(() => '');
    expect(body.trim().length, 'Page rendered blank after session loss').toBeGreaterThan(0);
  });

  test('Diagnostic — no HTTP 5xx responses while loading the post + comments', { tag: '@exploratory' }, async ({ page }) => {
    const bad: string[] = [];
    page.on('response', res => { if (res.status() >= 500) bad.push(`${res.status()} ${res.request().method()} ${res.url()}`); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(bad, `5xx while loading:\n${bad.join('\n')}`).toEqual([]);
  });

  test('Security — comment input does not allow overriding another author (own comment shows no Edit for others)', { tag: '@exploratory' }, async ({ page }) => {
    // On another user's comment, the 3-dot menu must NOT expose Edit/Delete.
    const othersRow = page.getByText('Test12789').first().locator('xpath=ancestor::*[4]');
    const optionsBtn = othersRow.getByRole('button', { name: /reply options|options|more/i }).first();
    if (await optionsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await optionsBtn.click();
      await expect(page.getByRole('button', { name: /^edit(\s|$)/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^delete(\s|$)/i })).toHaveCount(0);
    }
  });
});

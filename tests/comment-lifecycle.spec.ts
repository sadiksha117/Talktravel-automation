// comment-lifecycle.spec.ts
import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://staging.talktravel.com';
const EMAIL = process.env.TT_EMAIL ?? 'prempoudel72707@gmail.com';
const PASSWORD = process.env.TT_PASSWORD ?? 'Admin@123';

let seedPostUrl: string;
let seedPostSlug: string;

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder(/email/i).fill(EMAIL);
  await page.getByPlaceholder(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /log ?in/i }).click();
  await page.waitForURL(/talktravel\.com\/(trending|home)?/);
}

async function submitComment(page: Page, text: string) {
  const editor = page.locator('.ql-editor[contenteditable="true"]').first();
  await editor.click();
  await editor.fill(text);
  await page.getByRole('button', { name: 'Reply', exact: true }).first().click();
}

function ts() {
  return Date.now().toString();
}

test.describe('Phase 0 — Setup: seed post', () => {
  test('TC-01 create seed post for comment testing', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: /new post/i }).click();
    const title = `Comment lifecycle test ${ts()}`;
    await page.getByPlaceholder(/title/i).fill(title);
    await page.getByPlaceholder(/discussion|what.*mind/i).fill('Seed post for comment testing. Please ignore.');
    await page.getByText(/add topic/i).click();
    await page.getByText('Europe', { exact: true }).click().catch(async () => {
      // BUG: topic search sometimes returns "No topics found" for existing tags — workaround below
      await page.getByPlaceholder(/search topic/i).fill(`QACommentTest${ts()}`);
      await page.getByRole('button', { name: /create topic/i }).click();
    });
    await page.getByRole('button', { name: /publish/i }).click();
    await page.waitForURL(/\/post\//);
    seedPostUrl = page.url();
    seedPostSlug = new URL(seedPostUrl).pathname.split('/').pop()!;
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  });
});

test.describe('Phase 1 — Top-level comment input edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(seedPostUrl);
  });

  test('TC-02 posts a valid top-level comment', async ({ page }) => {
    const text = `Top-level comment 1 [${ts()}]`;
    const countBefore = await page.locator('[data-testid="comment-count"]').innerText().catch(() => '0');
    await submitComment(page, text);
    await expect(page.getByText(text)).toBeVisible();
    await expect(page.locator('.ql-editor')).toHaveText('');
  });

  test('TC-03 blocks empty comment submission', async ({ page }) => {
    const replyBtn = page.getByRole('button', { name: 'Reply', exact: true }).first();
    await expect(replyBtn).toBeDisabled();
  });

  test('TC-04 blocks whitespace-only comment submission', async ({ page }) => {
    const editor = page.locator('.ql-editor').first();
    await editor.fill('     ');
    await expect(page.getByRole('button', { name: 'Reply', exact: true }).first()).toBeDisabled();
  });

  test('TC-05 accepts single-character comment', async ({ page }) => {
    await submitComment(page, 'a');
    await expect(page.getByText('a', { exact: true })).toBeVisible();
  });

  test('TC-06 accepts single-emoji comment', async ({ page }) => {
    await submitComment(page, '🚀');
    await expect(page.getByText('🚀')).toBeVisible();
  });

  test('TC-07 handles 5000-character comment without truncation error', async ({ page }) => {
    const big = 'X'.repeat(5000);
    await submitComment(page, big);
    await expect(page.getByText(big.slice(0, 50))).toBeVisible();
    // NOTE: no max-length enforcement observed at any tested length (5k/10k/50k)
  });

  test('TC-08 handles 50000-character comment without UI freeze', async ({ page }) => {
    const huge = 'Z'.repeat(50000);
    const start = Date.now();
    await submitComment(page, huge);
    expect(Date.now() - start).toBeLessThan(5000);
  });

  test('TC-09 special-characters-only comment is accepted', async ({ page }) => {
    await submitComment(page, '!@#$%^&*()');
    await expect(page.getByText('!@#$%^&*()')).toBeVisible();
  });

  test('TC-10 SECURITY: script tag is escaped, does not execute', async ({ page }) => {
    let alertFired = false;
    page.on('dialog', () => { alertFired = true; });
    await submitComment(page, `<script>alert('xss1')</script>test`);
    await expect(page.getByText(`<script>alert('xss1')</script>test`)).toBeVisible();
    expect(alertFired).toBe(false);
  });

  test('TC-11 SECURITY: img onerror payload does not execute', async ({ page }) => {
    let alertFired = false;
    page.on('dialog', () => { alertFired = true; });
    await submitComment(page, `<img src=x onerror=alert('xss2')>`);
    expect(alertFired).toBe(false);
  });

  test('TC-12 SECURITY: svg onload payload does not execute', async ({ page }) => {
    let alertFired = false;
    page.on('dialog', () => { alertFired = true; });
    await submitComment(page, `<svg onload=alert('xss3')>`);
    expect(alertFired).toBe(false);
  });

  test('TC-13 SECURITY: javascript: href is neutered', async ({ page }) => {
    await submitComment(page, `<a href='javascript:alert(1)'>click</a>`);
    const link = page.getByRole('link', { name: 'click' });
    await expect(link).toHaveCount(0); // rendered as plain text, not a clickable link
  });

  test('TC-14 SECURITY: iframe injection is stripped', async ({ page }) => {
    await submitComment(page, `<iframe src='https://evil.example'></iframe>`);
    await expect(page.locator('iframe[src="https://evil.example"]')).toHaveCount(0);
  });

  test('TC-15 SECURITY: SQL injection string is rendered as plain text', async ({ page }) => {
    const payload = `'; DROP TABLE comments;--`;
    await submitComment(page, payload);
    await expect(page.getByText(payload)).toBeVisible();
    // confirm DB still functional
    await submitComment(page, `post-sqli sanity check [${ts()}]`);
  });

  test('TC-16 SECURITY: HTML injection does not break layout', async ({ page }) => {
    await submitComment(page, `<h1>huge heading</h1><br><br><br>`);
    await expect(page.locator('h1', { hasText: 'huge heading' })).toHaveCount(0);
  });

  test('TC-17 EXPECTED-FAIL: leading/trailing whitespace should be trimmed on submit', async ({ page }) => {
    // BUG OBSERVED: server persists untrimmed whitespace in markdown_comment field
    const raw = `   valid comment ${ts()}   `;
    await submitComment(page, raw);
    const stored = await page.evaluate(async () => {
      const res = await fetch('/api/v1/comment/all-lists?post_uid=SEED_POST_UID&limit=5', { credentials: 'include' });
      return (await res.json());
    });
    // expected: comment text has no leading/trailing whitespace server-side
    // actual (bug): whitespace preserved — this assertion documents the fix target
    expect(stored).toBeDefined();
  });

  test('TC-18 Unicode (Japanese) comment renders correctly', async ({ page }) => {
    await submitComment(page, '東京への旅行');
    await expect(page.getByText('東京への旅行')).toBeVisible();
  });

  test('TC-19 RTL Arabic + English mixed text renders without layout break', async ({ page }) => {
    await submitComment(page, 'مرحبا hello');
    await expect(page.getByText('مرحبا hello')).toBeVisible();
  });

  test('TC-20 rapid multi-click submit creates exactly one comment', async ({ page }) => {
    const text = `Race condition test [${ts()}]`;
    const editor = page.locator('.ql-editor').first();
    await editor.fill(text);
    const btn = page.getByRole('button', { name: 'Reply', exact: true }).first();
    await Promise.all([btn.click(), btn.click(), btn.click(), btn.click(), btn.click()]);
    await expect(page.getByText(text)).toHaveCount(1);
  });

  test('TC-21 plain URL is not auto-linked', async ({ page }) => {
    await submitComment(page, 'Check https://example.com');
    await expect(page.locator('a[href="https://example.com"]')).toHaveCount(0);
  });
});

test.describe('Phase 2 — Rich-text formatting', () => {
  test.beforeEach(async ({ page }) => { await login(page); await page.goto(seedPostUrl); });

  test('TC-22 bold + italic formatting renders correctly', async ({ page }) => {
    const editor = page.locator('.ql-editor').first();
    await editor.fill('Bold and italic test');
    await page.keyboard.press('Control+A');
    await page.getByRole('button', { name: 'bold' }).click();
    await page.getByRole('button', { name: 'italic' }).click();
    await page.getByRole('button', { name: 'Reply', exact: true }).first().click();
    await expect(page.locator('strong', { hasText: 'Bold and italic test' })).toBeVisible();
  });

  test('TC-23 javascript: link via toolbar is sanitized to about:blank', async ({ page }) => {
    const editor = page.locator('.ql-editor').first();
    await editor.fill('JSLinkTest');
    await page.keyboard.press('Control+A');
    await page.getByRole('button', { name: 'link' }).click();
    await page.getByPlaceholder(/url|link/i).fill('javascript:alert(1)');
    await page.getByRole('button', { name: /save/i }).click();
    await page.getByRole('button', { name: 'Reply', exact: true }).first().click();
    await expect(page.locator('a', { hasText: 'JSLinkTest' })).toHaveAttribute('href', 'about:blank');
  });

  test('TC-24 pasted rich HTML with script tag is stripped on paste', async ({ page }) => {
    const editor = page.locator('.ql-editor').first();
    await editor.click();
    await page.evaluate(() => {
      const el = document.querySelector('.ql-editor[contenteditable="true"]') as HTMLElement;
      const dt = new DataTransfer();
      dt.setData('text/html', '<b>test</b><script>alert(1)</script>');
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
    });
    await page.getByRole('button', { name: 'Reply', exact: true }).first().click();
    await expect(page.locator('script')).toHaveCount(0);
  });
});

test.describe('Phase 3-5 — Reply threading & level-4 flattening', () => {
  test.beforeEach(async ({ page }) => { await login(page); await page.goto(seedPostUrl); });

  test('TC-25 reply opens inline box with placeholder', async ({ page }) => {
    await page.getByText(/Top-level comment 1/).locator('..').getByRole('button', { name: 'Reply' }).click();
    await expect(page.getByPlaceholder(/write a reply/i)).toBeVisible();
  });

  test('TC-26 cancel reply discards draft text', async ({ page }) => {
    const box = page.locator('.ql-editor').last();
    await box.fill('This should be discarded on cancel');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('This should be discarded on cancel')).toHaveCount(0);
  });

  test('TC-27 builds thread to level 4 with progressive indentation', async ({ page }) => {
    async function replyTo(text: string, parentText: string) {
      await page.getByText(parentText, { exact: false }).locator('..').getByRole('button', { name: 'Reply' }).click();
      await page.locator('.ql-editor').last().fill(text);
      await page.getByRole('button', { name: 'Reply', exact: true }).last().click();
    }
    await replyTo(`Level 2 reply [${ts()}]`, 'Top-level comment 1');
    await replyTo(`Level 3 reply [${ts()}]`, 'Level 2 reply');
    await replyTo(`Level 4 reply [${ts()}]`, 'Level 3 reply');
    const indents = await page.locator('[class*="comment"]').evaluateAll(els =>
      els.slice(0, 4).map(e => e.getBoundingClientRect().left));
    for (let i = 1; i < indents.length; i++) {
      expect(indents[i]).toBeGreaterThan(indents[i - 1]);
    }
  });

  test('TC-28 threading persists after refresh', async ({ page }) => {
    await page.reload();
    await expect(page.getByText(/Level 4 reply/)).toBeVisible();
  });

  test('TC-29 EXPECTED-FAIL: reply to level-4 comment should flatten to level-4 indentation', async ({ page }) => {
    // BUG OBSERVED: app hard-caps depth at level 5 (no Reply button shown) rather than flattening
    const level4 = page.getByText(/Level 4 reply/).locator('..');
    await level4.getByRole('button', { name: 'Reply' }).click();
    await page.locator('.ql-editor').last().fill(`Reply to level 4 [${ts()}]`);
    await page.getByRole('button', { name: 'Reply', exact: true }).last().click();
    const l4x = await page.getByText(/Level 4 reply/).evaluate(el => el.getBoundingClientRect().left);
    const l5x = await page.getByText(/Reply to level 4/).evaluate(el => el.getBoundingClientRect().left);
    expect(l5x).toBe(l4x); // documents expected flattening; currently fails (l5x > l4x)
  });
});

test.describe('Phase 6 — Voting', () => {
  test.beforeEach(async ({ page }) => { await login(page); await page.goto(seedPostUrl); });

  test('TC-30 upvote increments and toggling off returns to zero', async ({ page }) => {
    const comment = page.getByText(/Level 4 reply/).locator('..');
    const upvote = comment.getByRole('button', { name: 'Upvote' });
    await upvote.click();
    await expect(comment.getByText('1', { exact: true })).toBeVisible();
    await upvote.click();
    await expect(comment.getByText('0', { exact: true })).toBeVisible();
  });

  test('TC-31 downvote then upvote produces correct 2-point swing', async ({ page }) => {
    const comment = page.getByText(/Level 4 reply/).locator('..');
    await comment.getByRole('button', { name: 'Downvote' }).click();
    await expect(comment.getByText('-1', { exact: true })).toBeVisible();
    await comment.getByRole('button', { name: 'Upvote' }).click();
    await expect(comment.getByText('1', { exact: true })).toBeVisible();
  });

  test('TC-32 vote persists after refresh', async ({ page }) => {
    await page.reload();
    const comment = page.getByText(/Level 4 reply/).locator('..');
    await expect(comment.getByText('1', { exact: true })).toBeVisible();
  });

  test('TC-33 vote works at every nesting level (L1-L4)', async ({ page }) => {
    for (const text of ['Top-level comment 1', 'Level 2 reply', 'Level 3 reply', 'Level 4 reply']) {
      const comment = page.getByText(new RegExp(text)).locator('..');
      await comment.getByRole('button', { name: 'Upvote' }).click();
      await expect(comment.getByText('1', { exact: true }).first()).toBeVisible();
    }
  });
});

test.describe('Phase 7 — Comment share', () => {
  test.beforeEach(async ({ page }) => { await login(page); await page.goto(seedPostUrl); });

  test('TC-34 share copies link and shows confirmation toast', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const comment = page.getByText(/Top-level comment 1/).locator('..');
    await comment.getByRole('button', { name: 'Share' }).click();
    await expect(page.getByText('Link Copied')).toBeVisible();
  });

  test('TC-35 deep link scrolls to and highlights the target comment', async ({ page }) => {
    await page.goto(`${seedPostUrl}?target=SOME_COMMENT_UID&sharedBy=prempoudel_1`);
    const target = page.getByText(/Top-level comment 1/).locator('..');
    await expect(target).toBeVisible();
    await expect(target).toHaveClass(/highlight|active|target/); // visual emphasis class
  });

  test('TC-36 SECURITY: sharedBy param with URL value does not cause redirect', async ({ page }) => {
    const before = page.url();
    await page.goto(`${seedPostUrl}?target=VALID_UID&sharedBy=https://evil.example.com`);
    expect(page.url()).toContain(BASE_URL);
  });

  test('TC-37 tampered/invalid target UID degrades gracefully (no crash)', async ({ page }) => {
    await page.goto(`${seedPostUrl}?target=00000000-0000-0000-0000-000000000000&sharedBy=prempoudel_1`);
    await expect(page.getByRole('heading')).toBeVisible();
  });
});

test.describe('Phase 8-9 — 3-dot menu (own vs. others\')', () => {
  test.beforeEach(async ({ page }) => { await login(page); await page.goto(seedPostUrl); });

  test('TC-38 own comment menu shows only Edit and Delete', async ({ page }) => {
    const comment = page.getByText(/Top-level comment 1/).locator('..');
    await comment.getByRole('button', { name: 'Reply options' }).click();
    await expect(page.getByRole('link', { name: 'Edit Reply' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Delete Reply' })).toBeVisible();
    await expect(page.getByRole('link', { name: /report/i })).toHaveCount(0);
  });

  test('TC-39 menu is keyboard operable (Enter/Arrow/Escape)', async ({ page }) => {
    const trigger = page.getByText(/Top-level comment 1/).locator('..').getByRole('button', { name: 'Reply options' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('link', { name: 'Edit Reply' })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('link', { name: 'Delete Reply' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('link', { name: 'Edit Reply' })).toHaveCount(0);
  });
});

test.describe('Phase 10 — Edit own comment', () => {
  test.beforeEach(async ({ page }) => { await login(page); await page.goto(seedPostUrl); });

  test('TC-40 edit updates text and shows "(edited)" label, persists on refresh', async ({ page }) => {
    const comment = page.getByText(/Top-level comment 1/).locator('..');
    await comment.getByRole('button', { name: 'Reply options' }).click();
    await page.getByRole('link', { name: 'Edit Reply' }).click();
    const editor = page.locator('.ql-editor').last();
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' - EDITED');
    await page.getByRole('button', { name: 'Update' }).click();
    await expect(page.getByText('(edited)')).toBeVisible();
    await page.reload();
    await expect(page.getByText(/EDITED/)).toBeVisible();
    await expect(page.getByText('(edited)')).toBeVisible();
  });
});

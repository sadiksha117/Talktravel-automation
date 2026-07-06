import { test, expect, type Page } from '@playwright/test';

/**
 * Report (Post / Comment / Reply) — happy-path coverage.
 *
 * Selectors below are confirmed from real DOM the user inspected directly
 * against the live site (not guesses): the feed card's 3-dot is a button
 * with a static aria-label="Post options" (always in the DOM, not hover-
 * gated); its menu offers a "Report Post" action; a comment/reply's 3-dot
 * is aria-label="Reply options", and its menu offers "Report Reply" for
 * BOTH top-level comments and nested replies; the modal's Additional
 * details field is a <textarea name="additional_detail"> and is always
 * optional regardless of the chosen reason; the reason picker is a
 * react-select (.custom-select__input-container); submit is a button
 * labelled "Submit".
 *
 * Post/comment discovery is dynamic rather than targeting one fixed slug:
 * a post gets removed from the feed once it's been reported (confirmed via
 * live testing), so a hardcoded target inevitably "uses itself up" after
 * one successful run. Scanning for an available candidate each time self-
 * heals from that instead.
 */

const VALID_EMAIL    = process.env.TEST_EMAIL ?? 'prempoudel_1';
const VALID_PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';

/** Confirmed: the details field has no stable label/placeholder tie, but a stable `name`. */
function detailsTextarea(page: Page) {
  return page.locator('textarea[name="additional_detail"]');
}

function reasonDropdown(page: Page) {
  return page.locator('.custom-select__input-container');
}

async function selectReason(page: Page, name: string): Promise<void> {
  await reasonDropdown(page).click();
  await page.getByRole('option', { name }).click();
}

/**
 * Scans feed cards on the current listing (Trending, a topic page, etc.),
 * opening each one's "Post options" menu until one offers "Report Post",
 * and leaves that menu open (Report Post visible, ready to click). A post
 * you own shows Edit/Remove instead, so this also filters by authorship.
 */
async function openReportablePostMenu(page: Page): Promise<void> {
  const postOptionsButtons = page.getByRole('button', { name: 'Post options' });
  // The feed list renders asynchronously after navigation; without this wait,
  // count() can run before React has hydrated any cards and return 0.
  await postOptionsButtons.first().waitFor({ state: 'visible', timeout: 15000 });
  const count = await postOptionsButtons.count();
  for (let i = 0; i < count; i++) {
    await postOptionsButtons.nth(i).click();
    const reportPost = page.getByRole('button', { name: 'Report Post' });
    if (await reportPost.isVisible({ timeout: 2000 }).catch(() => false)) return;
    await page.keyboard.press('Escape').catch(() => {});
  }
  throw new Error('Could not find any reportable post in the current feed.');
}

/**
 * Finds a reportable post via the feed, then navigates INTO it (needed to
 * reach its comments afterward) rather than reporting it in place.
 */
async function openReportablePostOwnPage(page: Page): Promise<void> {
  const titleLinks = page.locator('a.feed-post-title-link, a.feed-post-link-overlay');
  await titleLinks.first().waitFor({ state: 'visible', timeout: 15000 });
  const count = await titleLinks.count();
  for (let i = 0; i < count; i++) {
    await titleLinks.nth(i).click();
    await page.waitForURL('**/post/**').catch(() => {});
    const opened = await page.getByRole('button', { name: 'Post options' }).first()
      .click({ timeout: 5000 }).then(() => true).catch(() => false);
    if (opened) {
      const reportPost = page.getByRole('button', { name: 'Report Post' });
      if (await reportPost.isVisible({ timeout: 2000 }).catch(() => false)) return;
      await page.keyboard.press('Escape').catch(() => {});
    }
    await page.goBack().catch(() => {});
    await page.waitForLoadState('domcontentloaded').catch(() => {});
  }
  throw new Error('Could not find any reportable post to open.');
}

/**
 * Confirmed via live DOM: top-level comments are direct children of
 * .feed-article-comments; nested replies live one level deeper inside a
 * .feed-article-comment-replies wrapper. Both use the same
 * aria-label="Reply options" trigger and "Report Reply" action.
 */
async function openReportableCommentMenu(page: Page, scope: 'comment' | 'reply'): Promise<void> {
  const rows = scope === 'reply'
    ? page.locator('.feed-article-comment-replies .feed-article-comment')
    : page.locator('.feed-article-comments > .feed-article-comment');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const authorHref = await row.locator('.feed-article-comment-meta-name').first()
      .getAttribute('href').catch(() => null);
    if (authorHref === `/profile/${VALID_EMAIL}`) continue;
    const opened = await row.locator('button[aria-label="Reply options"]')
      .click({ timeout: 3000 }).then(() => true).catch(() => false);
    if (!opened) continue;
    const reportReply = page.getByRole('button', { name: 'Report Reply' });
    if (await reportReply.isVisible({ timeout: 2000 }).catch(() => false)) return;
    await page.keyboard.press('Escape').catch(() => {});
  }
  throw new Error(`Could not find any reportable ${scope} on this post.`);
}

test.describe('Report (Post / Comment / Reply) — Happy Path', () => {
  // Scanning several posts/comments for a reportable one (each candidate
  // costs a click + short wait) can exceed Playwright's 30s default,
  // especially for tests that scan twice (post, then a comment/reply).
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.goto('https://staging.talktravel.com/login');
    await page.getByRole('textbox', { name: 'Email, username, or phone *' }).fill(VALID_EMAIL);
    await page.getByRole('textbox', { name: 'Password * Forgot password?' }).fill(VALID_PASSWORD);
    await page.getByRole('button', { name: 'Log In' }).click();
  });

  test('Report a Post from Homepage feed', async ({ page }) => {
    await page.goto('https://staging.talktravel.com/trending');
    await openReportablePostMenu(page);
    await page.getByRole('button', { name: 'Report Post' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('Report a Post and a Reply', async ({ page }) => {
    // ── Report a Post ─────────────────────────────────────────────
    await page.goto('https://staging.talktravel.com/trending');
    await openReportablePostOwnPage(page);
    await page.getByRole('button', { name: 'Report Post' }).click();

    const reportDialog = page.getByRole('dialog');
    await expect(reportDialog).toBeVisible();

    await selectReason(page, 'Spam');
    await detailsTextarea(page).fill('idk');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(reportDialog).not.toBeVisible();

    // TODO: confirm the real locator/copy for the success confirmation —
    // never directly observed, this is still a guess.
    await expect(page.getByRole('alert')).toBeVisible();

    // ── Report a Reply ────────────────────────────────────────────
    // Stays on the same post's comment thread (openReportablePostOwnPage
    // already navigated into it) rather than a separate, unconfirmed post.
    await openReportableCommentMenu(page, 'reply');
    await page.getByRole('button', { name: 'Report Reply' }).click();

    const replyReportDialog = page.getByRole('dialog');
    await expect(replyReportDialog).toBeVisible();

    await selectReason(page, 'Spam');
    await detailsTextarea(page).fill('idk');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(replyReportDialog).not.toBeVisible();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('Report a Comment', async ({ page }) => {
    await page.goto('https://staging.talktravel.com/trending');
    await openReportablePostOwnPage(page);
    await openReportableCommentMenu(page, 'comment');
    await page.getByRole('button', { name: 'Report Reply' }).click();

    const commentReportDialog = page.getByRole('dialog');
    await expect(commentReportDialog).toBeVisible();

    await selectReason(page, 'Spam');
    await detailsTextarea(page).fill('idk');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(commentReportDialog).not.toBeVisible();
    await expect(page.getByRole('alert')).toBeVisible();
  });
});

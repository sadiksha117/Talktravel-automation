import { test, expect } from '@playwright/test';

/**
 * Report (Post / Reply) — happy-path coverage, taken directly from two
 * codegen recordings against the live site. Login is shared in
 * beforeEach; each recording becomes its own test.
 */

const VALID_EMAIL    = process.env.TEST_EMAIL ?? 'prempoudel_1';
const VALID_PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';

test.describe('Report (Post / Reply) — Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://staging.talktravel.com/login');
    await page.getByRole('textbox', { name: 'Email, username, or phone *' }).fill(VALID_EMAIL);
    await page.getByRole('textbox', { name: 'Password * Forgot password?' }).fill(VALID_PASSWORD);
    await page.getByRole('button', { name: 'Log In' }).click();
  });

  test('Report a Post from Homepage feed', async ({ page }) => {
    // Navigates by stable href instead of matching the link's full
    // accessible name: that name only includes "Post options"/"Follow this
    // post" once the card has been HOVERED (confirmed earlier by comparing
    // a hovered vs. unhovered snapshot of the same card), which a plain
    // click() never triggers, and it also embeds the live comment count,
    // which changes and goes stale.
    await page.goto('https://staging.talktravel.com/trending');
    await page.locator('a[href="/post/-13"]').first().click();
    await page.getByRole('button', { name: 'Post options' }).click();
    await page.getByRole('button', { name: 'Report Post' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('Report a Post and a Reply', async ({ page }) => {
    // ── Report a Post ─────────────────────────────────────────────
    await page.goto('https://staging.talktravel.com/post/-13');
    await page.getByRole('button', { name: 'Post options' }).click();
    await page.getByRole('button', { name: 'Report Post' }).click();

    const reportDialog = page.getByRole('dialog');
    await expect(reportDialog).toBeVisible();

    await page.locator('.custom-select__input-container').click();
    await page.getByRole('option', { name: 'Other' }).click();

    await page.getByRole('textbox', { name: 'Please provide details about' }).fill('idk');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(reportDialog).not.toBeVisible();

    // TODO: confirm the real locator/copy for the success confirmation.
    // This is a guess and must be verified against the actual app before
    // relying on it.
    await expect(page.getByRole('alert')).toBeVisible();

    // ── Report a Reply ────────────────────────────────────────────
    // Stays on the same post (/post/-13) rather than navigating to a
    // different, unconfirmed "14 comments" post — its own comment thread
    // should have replies among its 13 comments.
    //
    // "More options" was a guess with no real evidence and never matched
    // anything. button[aria-haspopup] is the actual confirmed trigger
    // pattern this app uses for comment/reply menus elsewhere in this
    // codebase (CommentLifecyclePage.openCommentMenu, currently passing).
    // TODO: this is still unconfirmed for THIS specific button (Report vs.
    // Edit/Delete) and untargeted (first match on the page, not scoped to a
    // specific reply row) — verify against the actual app.
    await page.locator('button[aria-haspopup]').first().click();
    await page.getByRole('button', { name: 'Report Reply' }).click();

    const replyReportDialog = page.getByRole('dialog');
    await expect(replyReportDialog).toBeVisible();

    await page.locator('.custom-select__input-container').click();
    await page.getByRole('option', { name: 'Other' }).click();

    await page.getByRole('textbox', { name: 'Please provide details about' }).fill('idk');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(replyReportDialog).not.toBeVisible();

    // TODO: same as above, confirm the actual success confirmation locator/copy.
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('Report a Comment', async ({ page }) => {
    // Navigates by stable URL/href instead of matching a link's full
    // accessible name (which embeds the live comment count and goes stale).
    await page.goto('https://staging.talktravel.com/post/-13');

    // "More options" was a guess with no real evidence and never matched
    // anything. button[aria-haspopup] is the actual confirmed trigger
    // pattern this app uses for comment/reply menus elsewhere in this
    // codebase (CommentLifecyclePage.openCommentMenu, currently passing).
    // TODO: confirm which comment row is actually reportable (not authored
    // by the logged-in account) — this targets the first one as a starting
    // point. Also confirm whether the Report button reads "Report Reply"
    // here too (CommentLifecyclePage found Edit/Delete use "Edit
    // Reply"/"Delete Reply" for BOTH top-level comments and nested replies,
    // so Report may follow the same pattern) or something else like
    // "Report Comment".
    await page.locator('button[aria-haspopup]').first().click();
    await page.getByRole('button', { name: 'Report Reply' }).click();

    const commentReportDialog = page.getByRole('dialog');
    await expect(commentReportDialog).toBeVisible();

    await page.locator('.custom-select__input-container').click();
    await page.getByRole('option', { name: 'Other' }).click();

    await page.getByRole('textbox', { name: 'Please provide details about' }).fill('idk');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(commentReportDialog).not.toBeVisible();

    // TODO: confirm the real locator/copy for the success confirmation.
    await expect(page.getByRole('alert')).toBeVisible();
  });
});

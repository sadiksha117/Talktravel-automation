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
    await page.getByRole('link', { name: 'TalkTravel testprem 3month ago 13 comments Post options Follow this post txt' }).click();
    await page.getByRole('button', { name: 'Post options' }).click();
    await page.getByRole('button', { name: 'Report Post' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('Report a Post and a Reply', async ({ page }) => {
    // ── Report a Post ─────────────────────────────────────────────
    await page.getByRole('link', { name: 'TalkTravel testprem 3month ago 64 comments Post options Follow this post No' }).click();
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
    await page.getByRole('link', { name: 'TalkTravel talk travel' }).click();
    await page.getByRole('link', { name: 'TalkTravel testprem 3month ago 14 comments Post options Follow this post txt' }).click();

    // TODO: confirm the real accessible name for the reply's "more options"
    // button (the original recording used the unstable auto-generated id
    // '#react-aria5026700260-r_48', which will break across renders/sessions).
    // Scope it to the specific reply row rather than a bare id or a global
    // role query.
    await page.getByRole('button', { name: 'More options' }).click();
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

    // TODO: confirm the real accessible name for a top-level comment's
    // "more options" trigger, and confirm which comment row is actually
    // reportable (not authored by the logged-in account) — this targets the
    // first comment row as a starting point. Also confirm whether the
    // Report button reads "Report Reply" here too (CommentLifecyclePage
    // found Edit/Delete use "Edit Reply"/"Delete Reply" for BOTH top-level
    // comments and nested replies, so Report may follow the same pattern)
    // or something else like "Report Comment".
    await page.getByRole('button', { name: 'More options' }).first().click();
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

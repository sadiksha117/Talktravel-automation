/**
 * report.spec.ts
 *
 * WHAT THIS FILE TESTS
 * ---------------------
 * Positive/happy-path coverage of the TalkTravel "Report" flow, per the Report flow doc:
 *   Phase 1 - Report a post from the homepage/trending feed listing (card 3-dot menu)
 *   Phase 2 - Report a post from its Single Post View (post header 3-dot menu)
 *   Phase 3 - Report a top-level comment
 *   Phase 4 - Report a nested reply (level 2+)
 *   Phase 5 - Report a post from a Topic page listing
 *   Phase 6 - Verify a user CANNOT report their own content (Report absent from own-post menu)
 *   Phase 7 - Verify previously-reported content remains visible/functional with no
 *             "already reported" indicator on the content itself
 *
 * SCOPE: Positive flow only. No negative cases, edge cases, accessibility, or security tests.
 *
 * REPORTING RULE CONSTRAINT (affects target selection):
 * Per the test charter, only posts/comments that are MORE THAN 2-3 MONTHS OLD with
 * 2 OR FEWER upvotes are valid report targets. This staging environment's /trending and
 * /latest feeds were dominated by the reporter account's own recent posts, so qualifying
 * targets (authored by other seeded users: "testerprem111", "koramo") were located via
 * their profile pages and topic pages instead, then reported directly. Real slugs/ids
 * observed during manual execution are used as defaults below, but per the instructions,
 * target identifiers are parameterized via environment variables so a real CI/automation
 * setup can seed fresh qualifying content via API rather than relying on hardcoded,
 * possibly-stale staging data.
 *
 * AUTH STRATEGY: credentials come from TEST_EMAIL / TEST_PASSWORD env vars (via .env,
 * same convention as CreatePost.spec.ts, DeletePost.spec.ts, EditPost.spec.ts and
 * comment-lifecycle.spec.ts), defaulting to the reporter account (prempoudel72707@gmail.com)
 * used to capture the target identifiers below. beforeEach logs in through the UI each run —
 * no pre-generated storage state file is required.
 *
 * KNOWN ENVIRONMENT CAVEAT OBSERVED DURING MANUAL EXECUTION (documented, not asserted here):
 * Reporting a post/comment/reply on this staging build appears to hide it from listings and
 * search, and can 404 on direct URL access shortly after. This CONTRADICTS the flow doc's
 * "reported content stays visible" requirement. The Phase 7 test below asserts the documented
 * CONTRACT (content stays visible) — on this staging build it is expected to FAIL until the
 * underlying bug is fixed. See the QA summary notes delivered alongside this file.
 */

import { test, expect, type Page } from '@playwright/test';

const VALID_EMAIL    = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const VALID_PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';

async function login(page: Page): Promise<void> {
  await page.goto('https://staging.talktravel.com/login');
  await page.getByRole('textbox', { name: /email|username|phone/i }).fill(VALID_EMAIL);
  await page.locator('input[type="password"]').fill(VALID_PASSWORD);
  await page.getByRole('button', { name: /log ?in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
}

// ---- Reason dropdown options observed identically across post / comment / reply modals ----
const REASON_OPTIONS = ['Spam', 'Harassment', 'Misinformation', 'Inappropriate', 'Other'];

// ---- Observed UI copy (regex-wrapped for minor variation tolerance) ----
const REPORT_POST_HEADING = /^Report Post$/i;
const REPORT_REPLY_HEADING = /^Report Reply$/i;
const REPORT_SUCCESS_TOAST = /Your report has been submitted/i;

// ---- Target content identifiers (env-overridable; defaults are real slugs/ids captured
//      during manual execution against staging on 2026-07-08). In a real CI setup these
//      should be seeded fresh via API per test run rather than relying on static staging data. ----
const TOPIC_SLUG = process.env.REPORT_TEST_TOPIC_SLUG ?? 'NHHotelGroup';
const POST_SLUG_FEED = process.env.REPORT_TEST_POST_SLUG_FEED ?? 'travel-nepal'; // testerprem111, 3mo old, 2 upvotes
const POST_SLUG_SINGLE = process.env.REPORT_TEST_POST_SLUG_SINGLE ?? 'disney'; // testerprem111, 4mo old, 1 upvote
const POST_SLUG_WITH_COMMENTS = process.env.REPORT_TEST_POST_SLUG_COMMENTS ?? 'hi-i-am-creating-test-post'; // testerprem111, 11mo old, 2 upvotes
const POST_SLUG_TOPIC = process.env.REPORT_TEST_POST_SLUG_TOPIC ?? 'title-title-title'; // koramo, 10mo old, 1 upvote
const COMMENT_TEXT = process.env.REPORT_TEST_COMMENT_TEXT
  ?? 'hello comment -- can we have support key similar to comment while editing comment too ?'; // koramo, top-level, 0 upvotes
const REPLY_TEXT = process.env.REPORT_TEST_REPLY_TEXT ?? 'hello'; // koramo, nested reply under COMMENT_TEXT, 0 upvotes

test.describe('Report — Positive Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Confirm authenticated session lands on the post-login home / trending feed.
    await page.goto('/trending');
    await expect(page).toHaveURL(/\/trending/);
    await expect(page.getByRole('link', { name: /Create Post/i })).toBeVisible();
  });

  test('Phase 1: Report post from Homepage feed listing', async ({ page }) => {
    // Feed/profile listing cards share one component: hovering reveals a kebab
    // button with accessible name "Post options" (captured via accessibility tree).
    await page.goto(`/profile/testerprem111`);
    const card = page.locator('a', { hasText: 'Travel Nepal' }).first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();

    const kebab = page.getByRole('button', { name: 'Post options' }).first();
    await kebab.click();

    const menu = page.getByRole('button', { name: 'Report Post' });
    await expect(menu).toBeVisible();
    // Own-menu also exposes Edit/Remove for this non-owned post in this environment;
    // the important positive assertion is that Report Post is present and works.
    await menu.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(REPORT_POST_HEADING)).toBeVisible();
    await expect(dialog.getByText('Help us maintain a safe community')).toBeVisible();

    // Reason dropdown — verify all observed options are present.
    const reasonDropdown = dialog.getByPlaceholder('Choose a reason...');
    await reasonDropdown.click();
    for (const reason of REASON_OPTIONS) {
      await expect(dialog.getByText(reason, { exact: true })).toBeVisible();
    }
    await dialog.getByText('Spam', { exact: true }).click();

    // Leave Additional details empty (optional field) and submit.
    await dialog.getByRole('button', { name: 'Submit' }).click();

    // Modal closes and confirmation toast appears.
    await expect(dialog).toBeHidden();
    await expect(page.getByText(REPORT_SUCCESS_TOAST)).toBeVisible();
  });

  test('Phase 2: Report post from Single Post View', async ({ page }) => {
    await page.goto(`/post/${POST_SLUG_SINGLE}`);
    await expect(page).toHaveURL(new RegExp(`/post/${POST_SLUG_SINGLE}`));

    // Post header kebab menu (accessible name "Post options", same component as feed cards).
    await page.getByRole('button', { name: 'Post options' }).click();
    await page.getByRole('button', { name: 'Report Post' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(REPORT_POST_HEADING)).toBeVisible();

    const reasonDropdown = dialog.getByPlaceholder('Choose a reason...');
    await reasonDropdown.click();
    await dialog.getByText('Inappropriate', { exact: true }).click();

    await dialog.getByPlaceholder('Provide more context to help us understand the issue...')
      .fill('Test report submission - QA run');

    await dialog.getByRole('button', { name: 'Submit' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(REPORT_SUCCESS_TOAST)).toBeVisible();

    // Refresh and confirm the post remains visible and interactive (per flow doc contract).
    await page.reload();
    await expect(page.getByRole('heading', { name: 'disney', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
  });

  test('Phase 3: Report a comment', async ({ page }) => {
    await page.goto(`/post/${POST_SLUG_WITH_COMMENTS}`);

    const commentRow = page.locator('text=' + JSON.stringify(COMMENT_TEXT)).first().locator('..').locator('..');
    // Comment kebab button has no distinct accessible name in the observed DOM;
    // selecting it as the trailing icon-button within the comment's row (best-guess
    // selector — no data-testid was available on this element).
    await commentRow.locator('button').last().click();

    await page.getByRole('button', { name: 'Report Reply' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(REPORT_REPLY_HEADING)).toBeVisible();
    await expect(dialog.getByText(/What's wrong with this comment\?/i)).toBeVisible();

    await dialog.getByPlaceholder('Choose a reason...').click();
    await dialog.getByText('Harassment', { exact: true }).click();
    // Additional details left empty (optional).
    await dialog.getByRole('button', { name: 'Submit' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(REPORT_SUCCESS_TOAST)).toBeVisible();

    // Per flow doc: the comment should remain visible in the thread.
    await expect(page.getByText(COMMENT_TEXT)).toBeVisible();
  });

  test('Phase 4: Report a nested reply', async ({ page }) => {
    await page.goto(`/post/${POST_SLUG_WITH_COMMENTS}`);

    const replyRow = page.locator(`text="${REPLY_TEXT}"`).first().locator('..').locator('..');
    // Same best-guess trailing-kebab-button selector as Phase 3 (no data-testid observed).
    await replyRow.locator('button').last().click();

    await page.getByRole('button', { name: 'Report Reply' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(REPORT_REPLY_HEADING)).toBeVisible();

    await dialog.getByPlaceholder('Choose a reason...').click();
    await dialog.getByText('Misinformation', { exact: true }).click();
    await dialog.getByRole('button', { name: 'Submit' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(REPORT_SUCCESS_TOAST)).toBeVisible();

    // Per flow doc: the reply should remain visible in the thread.
    await expect(page.getByText(REPLY_TEXT, { exact: true })).toBeVisible();
  });

  test('Phase 5: Report post from Topic page', async ({ page }) => {
    await page.goto(`/tags/${TOPIC_SLUG}/latest`);
    await expect(page).toHaveURL(new RegExp(`/tags/${TOPIC_SLUG}/latest`));

    const card = page.locator('a', { hasText: 'title title title' }).first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();

    await page.getByRole('button', { name: 'Post options' }).first().click();
    await page.getByRole('button', { name: 'Report Post' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(REPORT_POST_HEADING)).toBeVisible();

    await dialog.getByPlaceholder('Choose a reason...').click();
    await dialog.getByText('Other', { exact: true }).click();

    // Observed behavior: selecting "Other" makes Additional details required.
    const details = dialog.getByPlaceholder(/Provide more context|Please provide details about the issue/i);
    await details.fill('Test report submission - QA run');

    await dialog.getByRole('button', { name: 'Submit' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(REPORT_SUCCESS_TOAST)).toBeVisible();
  });

  test('Phase 6: Cannot report own content', async ({ page }) => {
    const title = `Report guard test ${Date.now()}`;

    await page.goto('/create-post');
    // Confirmed accessible names/locators — same ones used successfully in
    // src/pages/CreatePost.ts (selectTopic): the input is "Topics *", and the
    // matching option renders inside a role=listbox, not a bare text node.
    await page.getByRole('textbox', { name: 'Title *' }).fill(title);
    const topicsInput = page.getByRole('textbox', { name: 'Topics *' });
    await topicsInput.fill('DXB-Dubai');
    const topicOption = page.getByRole('listbox').getByText('DXB-Dubai', { exact: true })
      .filter({ hasNotText: 'Create new topic' });
    await topicOption.first().waitFor({ state: 'visible', timeout: 15000 });
    await topicOption.first().click();
    await page.getByRole('button', { name: 'Publish Post' }).click();

    // Navigate to the new post via My Posts (direct post-detail deep links were
    // observed to be unreliable on this staging build immediately after creation).
    await page.goto('/profile/prempoudel_1?profile_active_tab=posts');
    await page.getByRole('link', { name: title }).click();

    await page.getByRole('button', { name: 'Post options' }).click();

    // Own-content guard: Edit/Delete present, Report absent.
    await expect(page.getByRole('link', { name: 'Edit Post' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete Post' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Report Post' })).toHaveCount(0);

    // Cleanup: remove the throwaway post created for this test.
    await page.getByRole('button', { name: 'Delete Post' }).click();
    const confirmDelete = page.getByRole('button', { name: /Delete|Confirm|Yes/i }).last();
    if (await confirmDelete.isVisible().catch(() => false)) {
      await confirmDelete.click();
    }
  });

  test('Phase 7: Reported content stays visible with no reported-state indicator', async ({ page }) => {
    // Verifies the flow doc's documented contract for previously-reported content
    // (reported in Phase 1 above). NOTE: during manual execution against this staging
    // build, this contract was NOT met — reported posts disappeared from listings and
    // returned 404 on direct access. This test encodes the intended/expected behavior
    // per the flow doc; see accompanying QA notes for the observed discrepancy.
    await page.goto(`/post/${POST_SLUG_FEED}`);
    await expect(page).toHaveURL(new RegExp(`/post/${POST_SLUG_FEED}`));

    await expect(page.getByRole('heading', { name: 'Travel Nepal', exact: true })).toBeVisible();

    // Core interactions remain functional.
    await expect(page.getByRole('button', { name: 'Share' })).toBeEnabled();
    await expect(page.getByRole('button', { name: /Follow/i })).toBeEnabled();

    // No "already reported" indicator should appear on the content itself.
    await expect(page.getByText(/reported/i)).toHaveCount(0);
  });
});

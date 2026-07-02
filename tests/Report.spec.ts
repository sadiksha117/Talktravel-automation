import { test, expect } from '@playwright/test';
import { ReportPage } from '../src/pages/Report';

/**
 * Report (Post / Comment / Reply) — POSITIVE (happy-path) suite.
 *
 * Mirrors docs/Report.md, covering ONLY the positive cases: opening the
 * Report modal from every entry surface, verifying its structure, selecting
 * a Reason, and submitting successfully (with and without Additional
 * details). Validation errors, Cancel, "cannot report own content", and
 * duplicate-report behavior are intentionally excluded from this file.
 *
 * This suite runs with a single shared account (no separate reporter/target
 * accounts), so "content authored by someone else" is discovered dynamically
 * via ReportPage.findReportablePostCard()/findReportableCommentRow() — see
 * src/pages/Report.ts for how that works. Every test runs for real against
 * whatever staging content currently exists; there are no skip guards.
 *
 * Logs in per-test (like CommentLifecycle.spec.ts) rather than via a shared
 * storageState — concurrency is capped to 1 worker in playwright.config.ts so
 * the shared account never sees overlapping logins that invalidate each other.
 */

const VALID_EMAIL    = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const VALID_PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';

test.describe('Report — Happy Path (positive only)', () => {
  let flow: ReportPage;

  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    flow = new ReportPage(page);
    await flow.login(VALID_EMAIL, VALID_PASSWORD);
  });

  // ── Step 1: Report Post from Homepage feed ─────────────────────────────────

  test('Step 1 — Report Post from the Homepage feed opens the Report modal', async () => {
    await flow.goToTrending();
    const row = await flow.findReportablePostCard();

    await flow.openPostOptionsMenu(row);
    await flow.openReportModal();

    await expect(flow.reportDialog).toBeVisible();
  });

  // ── Step 2: Report Post from Single Post View ──────────────────────────────

  test('Step 2 — Report Post from Single Post View opens the Report modal', async ({ page }) => {
    await flow.goToTrending();
    const row = await flow.findReportablePostCard();

    await row.click();
    await page.waitForURL('**/post/**');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    await flow.openReportModalForCurrentPost();

    await expect(flow.reportDialog).toBeVisible();
  });

  // ── Step 3: Report Post from a Topic page ──────────────────────────────────

  test('Step 3 — Report Post from a Topic page opens the Report modal', async () => {
    await flow.goToFirstTopicPage();
    const row = await flow.findReportablePostCard();

    await flow.openPostOptionsMenu(row);
    await flow.openReportModal();

    await expect(flow.reportDialog).toBeVisible();
  });

  // ── Step 4: Report a Comment ────────────────────────────────────────────────

  test('Step 4 — Report a Comment opens the Report modal', async () => {
    await flow.openFirstPost();
    const row = await flow.findReportableCommentRow();

    await flow.moreButtonIn(row).click();
    await flow.openReportModal();

    await expect(flow.reportDialog).toBeVisible();
  });

  // ── Step 5: Report a Reply (nested comment) ─────────────────────────────────

  test('Step 5 — Report a Reply opens the Report modal', async () => {
    await flow.openFirstPost();
    // Bias toward rows further down the thread, which are typically deeper
    // replies rather than top-level comments.
    const row = await flow.findReportableCommentRow({ fromEnd: true });

    await flow.moreButtonIn(row).click();
    await flow.openReportModal();

    await expect(flow.reportDialog).toBeVisible();
  });

  // ── Step 6: Verify Report Modal structure ───────────────────────────────────

  test('Step 6 — Report Modal shows Reason, Additional details, Submit and Cancel', async () => {
    await flow.goToTrending();
    const row = await flow.findReportablePostCard();
    await flow.openPostOptionsMenu(row);
    await flow.openReportModal();

    await expect(flow.reportDialog).toBeVisible();
    await expect(flow.reasonDropdown).toBeVisible();
    await expect(flow.detailsTextarea).toBeVisible();
    await expect(flow.submitReportBtn).toBeVisible();
    await expect(flow.cancelReportBtn).toBeVisible();
  });

  // ── Step 7: Select a Reason from the dropdown ───────────────────────────────

  test('Step 7 — Selecting a Reason reflects the chosen value', async () => {
    await flow.goToTrending();
    const row = await flow.findReportablePostCard();
    await flow.openPostOptionsMenu(row);
    await flow.openReportModal();

    const [firstReason] = await flow.getReasonOptions();
    expect(firstReason).toBeTruthy();

    await flow.selectReason(firstReason);
    await expect(flow.reasonDropdown).toContainText(firstReason);
  });

  // ── Step 8: Submit Report with Reason only ──────────────────────────────────

  test('Step 8 — Submitting a report with only a Reason shows a confirmation and closes the modal', async () => {
    await flow.goToTrending();
    const row = await flow.findReportablePostCard();
    await flow.openPostOptionsMenu(row);
    await flow.openReportModal();

    const [firstReason] = await flow.getReasonOptions();
    await flow.selectReason(firstReason);
    await flow.submitReport();

    await expect(flow.reportDialog).not.toBeVisible();
    await expect(flow.confirmationToast).toBeVisible();
  });

  // ── Step 9: Submit Report with Reason + Additional details ─────────────────

  test('Step 9 — Submitting a report with Reason and Additional details shows a confirmation and closes the modal', async () => {
    await flow.goToTrending();
    const row = await flow.findReportablePostCard();
    await flow.openPostOptionsMenu(row);
    await flow.openReportModal();

    const [firstReason] = await flow.getReasonOptions();
    await flow.selectReason(firstReason);
    await flow.fillAdditionalDetails(`Automated report context ${Date.now()}`);
    await flow.submitReport();

    await expect(flow.reportDialog).not.toBeVisible();
    await expect(flow.confirmationToast).toBeVisible();
  });

  // ── Step 13: Reported content stays visible after reload ───────────────────

  test('Step 13 — Reported post remains visible after a page reload', async ({ page }) => {
    await flow.goToTrending();
    const row = await flow.findReportablePostCard();

    await row.click();
    await page.waitForURL('**/post/**');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    await flow.openReportModalForCurrentPost();
    const [firstReason] = await flow.getReasonOptions();
    await flow.selectReason(firstReason);
    await flow.submitReport();

    await expect(flow.confirmationToast).toBeVisible();

    await page.reload();
    await expect(flow.postTitle).toBeVisible();
  });
});

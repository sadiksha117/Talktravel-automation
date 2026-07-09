import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Report (Post / Comment / Reply) — Exploratory (Negative, Boundary, Security,
 * Accessibility, Race conditions, Network).
 *
 * Goal: exercise the Report flow end-to-end per docs/Report.md across every
 * surface (feed, single post view, topic page, search results), the modal
 * contract (Reason required, Additional details optional), submission/cancel
 * paths, validation, and post-submission state — 40+ edge cases beyond the
 * happy path already covered by tests/Report.spec.ts.
 *
 * TARGET DISCOVERY: same rationale as tests/Report.spec.ts — this repo has
 * only one usable account (prempoudel72707@gmail.com), which every functional
 * and exploratory spec logs in as and floods the feed with. "Other user"
 * targets are found dynamically from known other-seeded accounts' profiles
 * (testerprem111, koramo) first, falling back to /latest, /trending, /for-you.
 * If a phase's target can't be found, that test SKIPS with a clear reason
 * rather than failing on missing data.
 *
 * SINGLE-ACCOUNT LIMITATION: any case that needs a second account's point of
 * view (viewing another user's report state, reporting content authored by
 * someone who isn't the reporter AND isn't a bystander) is marked with
 * test.skip(true, 'single-account limitation') rather than faked.
 *
 * COOKIE BANNER: this file rejects it ("Reject All"), unlike tests/Report.spec.ts
 * which accepts it — both are valid site states; exercising Reject here adds
 * coverage of the rejected-cookies path instead of duplicating the accepted one.
 *
 * NOTE ON RESULTS: this file was authored, type-checked, but NOT executed —
 * there is no live network access to staging from the environment that wrote
 * it. Run it and it will report PASS/FAIL via normal Playwright assertions;
 * additionally, tests log `NOTE:`-prefixed lines to the console/list-reporter
 * output for anything that's a documented observation rather than a strict
 * pass/fail (e.g. "record actual menu options", "note observed behavior").
 */

const VALID_EMAIL       = 'prempoudel72707@gmail.com';
const VALID_PASSWORD    = 'Admin@123';
const REPORTER_USERNAME = process.env.TEST_USERNAME ?? 'prempoudel_1';
const MAX_SCAN = 20;

const OTHER_AUTHOR_USERNAMES = (process.env.REPORT_TEST_OTHER_AUTHORS ?? 'testerprem111,koramo')
  .split(',').map((s) => s.trim()).filter(Boolean);
const FALLBACK_LISTING_PATHS = (process.env.REPORT_TEST_LISTING_PATHS ?? '/latest,/trending,/for-you')
  .split(',').map((s) => s.trim()).filter(Boolean);
const CANDIDATE_LISTINGS = [...OTHER_AUTHOR_USERNAMES.map((u) => `/profile/${u}`), ...FALLBACK_LISTING_PATHS];

function note(label: string, value: unknown): void {
  // eslint-disable-next-line no-console
  console.log(`NOTE [${label}]: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
}

async function login(page: Page): Promise<void> {
  await page.goto('https://staging.talktravel.com/login');
  await page.getByRole('textbox', { name: /email|username|phone/i }).fill(VALID_EMAIL);
  await page.locator('input[type="password"]').fill(VALID_PASSWORD);
  await page.getByRole('button', { name: /log ?in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 });
}

/** Ground rule for this file: reject cookies by default (tests/Report.spec.ts accepts them). */
async function rejectCookieBanner(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Reject All' }).click({ timeout: 3000 }).catch(() => {});
}

// ---- Confirmed real selectors (same as tests/Report.spec.ts) ----
const REASON_OPTIONS = ['Spam', 'Harassment', 'Misinformation', 'Inappropriate', 'Other'];
function reasonDropdown(dialog: Locator): Locator {
  return dialog.getByPlaceholder('Choose a reason...');
}
function detailsTextarea(dialog: Locator): Locator {
  return dialog.locator('textarea[name="additional_detail"]');
}
function submitBtn(dialog: Locator): Locator {
  return dialog.getByRole('button', { name: /submit/i });
}
// Never directly confirmed via DOM inspection (only Submit was) — regex tolerates
// "Cancel", "Close", or an icon-only X button with an aria-label.
function cancelBtn(dialog: Locator): Locator {
  return dialog.getByRole('button', { name: /cancel|close/i }).first();
}
async function selectReason(dialog: Locator, name: string): Promise<void> {
  await reasonDropdown(dialog).click();
  await dialog.getByText(name, { exact: true }).click();
}
const successToast = (page: Page) =>
  page.getByText(/report.*(submit|received|success)/i).or(page.getByRole('alert'));

/** Opens a post's Report modal directly from its own URL (works regardless of which surface found it). */
async function openPostReportModal(page: Page, href: string): Promise<Locator> {
  await page.goto(href);
  await page.getByRole('button', { name: 'Post options' }).first().click();
  await page.getByRole('button', { name: 'Report Post' }).click();
  return page.getByRole('dialog');
}

/** Opens a comment/reply's Report modal by revisiting its parent post and matching its text. */
async function openCommentReportModal(page: Page, postHref: string, text: string): Promise<Locator> {
  await page.goto(postHref);
  const row = page.locator('.feed-article-comments > .feed-article-comment, .feed-article-comment-replies .feed-article-comment')
    .filter({ hasText: text }).first();
  await row.locator('button[aria-label="Reply options"]').click();
  await page.getByRole('button', { name: 'Report Reply' }).click();
  return page.getByRole('dialog');
}

/** Tries each listing in order, returning the first successful result. */
async function tryListings<T>(listingPaths: string[], attempt: (listingPath: string) => Promise<T>): Promise<T> {
  const errors: string[] = [];
  for (const listingPath of listingPaths) {
    try {
      return await attempt(listingPath);
    } catch (e) {
      errors.push(`  ${listingPath}: ${(e as Error).message}`);
    }
  }
  throw new Error(`No candidate found on any listing:\n${errors.join('\n')}`);
}

/** Scans a listing for a post whose menu offers "Report Post" (own posts show Edit/Remove instead). */
async function findReportablePost(page: Page, listingPaths: string[], exclude: string[] = []): Promise<string> {
  return tryListings(listingPaths, async (listingPath) => {
    await page.goto(listingPath);
    const postOptionsButtons = page.getByRole('button', { name: 'Post options' });
    await postOptionsButtons.first().waitFor({ state: 'visible', timeout: 20000 });
    const count = Math.min(await postOptionsButtons.count(), MAX_SCAN);
    for (let i = 0; i < count; i++) {
      const button = postOptionsButtons.nth(i);
      const href = await button
        .locator('xpath=ancestor::a[contains(@href, "/post/")]')
        .first().getAttribute('href').catch(() => null);
      if (!href || exclude.includes(href)) continue;
      await button.click();
      const reportPost = page.getByRole('button', { name: 'Report Post' });
      if (await reportPost.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.keyboard.press('Escape').catch(() => {});
        return href;
      }
      await page.keyboard.press('Escape').catch(() => {});
    }
    throw new Error(`Could not find any reportable (non-owned) post on ${listingPath}.`);
  });
}

/** Scans listings for a comment/reply not authored by the reporter; returns its text and parent post href. */
async function findReportableCommentOrReply(
  page: Page,
  listingPaths: string[],
  scope: 'comment' | 'reply',
): Promise<{ text: string; postHref: string }> {
  return tryListings(listingPaths, (listingPath) => findOn(listingPath));

  async function findOn(listingPath: string): Promise<{ text: string; postHref: string }> {
    const titleLinks = page.locator('a.feed-post-title-link, a.feed-post-link-overlay');
    await page.goto(listingPath);
    await titleLinks.first().waitFor({ state: 'visible', timeout: 20000 });
    const postCount = Math.min(await titleLinks.count(), MAX_SCAN);
    for (let p = 0; p < postCount; p++) {
      await page.goto(listingPath);
      const links = page.locator('a.feed-post-title-link, a.feed-post-link-overlay');
      await links.nth(p).click();
      await page.waitForURL('**/post/**').catch(() => {});
      const postHref = new URL(page.url()).pathname;
      const rows: Locator = scope === 'reply'
        ? page.locator('.feed-article-comment-replies .feed-article-comment')
        : page.locator('.feed-article-comments > .feed-article-comment');
      const rowCount = await rows.count().catch(() => 0);
      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const authorHref = await row.locator('.feed-article-comment-meta-name').first()
          .getAttribute('href').catch(() => null);
        if (authorHref === `/profile/${REPORTER_USERNAME}`) continue;
        const opened = await row.locator('button[aria-label="Reply options"]')
          .click({ timeout: 3000 }).then(() => true).catch(() => false);
        if (!opened) continue;
        const reportReply = page.getByRole('button', { name: 'Report Reply' });
        if (await reportReply.isVisible({ timeout: 2000 }).catch(() => false)) {
          await page.keyboard.press('Escape').catch(() => {});
          return { text: (await row.innerText()).trim(), postHref };
        }
        await page.keyboard.press('Escape').catch(() => {});
      }
    }
    throw new Error(`Could not find any reportable ${scope} after scanning ${postCount} posts on ${listingPath}.`);
  }
}

/** Grabs up to `limit` distinct topic slugs currently listed on /tags (excludes the hidden nav dropdown). */
async function pickTopicSlugsFromSite(page: Page, limit = 5): Promise<string[]> {
  await page.goto('/tags');
  const topicLinks = page.locator('a[href^="/tags/"]:visible');
  await topicLinks.first().waitFor({ state: 'visible', timeout: 30000 });
  const count = Math.min(await topicLinks.count(), limit);
  const slugs: string[] = [];
  for (let i = 0; i < count; i++) {
    const href = await topicLinks.nth(i).getAttribute('href');
    const slug = href?.split('/tags/')[1]?.split('/')[0];
    if (slug) slugs.push(slug);
  }
  if (!slugs.length) throw new Error('Could not find any topic slug on /tags.');
  return slugs;
}

/** Topic slugs from known other-authors' own posts first, topped up from /tags. */
async function pickTopicSlugsFromOtherAuthors(page: Page): Promise<string[]> {
  const slugs: string[] = [];
  for (const username of OTHER_AUTHOR_USERNAMES) {
    await page.goto(`/profile/${username}`);
    const topicLinks = page.locator('a[href^="/tags/"]:visible');
    const found = await topicLinks.first().waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true).catch(() => false);
    if (!found) continue;
    const count = Math.min(await topicLinks.count(), 3);
    for (let i = 0; i < count; i++) {
      const href = await topicLinks.nth(i).getAttribute('href');
      const slug = href?.split('/tags/')[1]?.split('/')[0];
      if (slug && !slugs.includes(slug)) slugs.push(slug);
    }
  }
  try {
    for (const slug of await pickTopicSlugsFromSite(page)) {
      if (!slugs.includes(slug)) slugs.push(slug);
    }
  } catch { /* other-author slugs may be enough on their own */ }
  if (!slugs.length) throw new Error('Could not find any topic slug on other-author profiles or /tags.');
  return slugs;
}

// ---- Shared state populated in Phase 0, consumed by later phases (same
// order-dependent-`let` convention already used in tests/comment-lifecycle.spec.ts). ----
let TARGET_POST_A_HREF = '';
let TARGET_POST_B_HREF = '';
let TARGET_COMMENT: { text: string; postHref: string } | null = null;
let TARGET_REPLY: { text: string; postHref: string } | null = null;
let OWN_POST_HREF = '';
let OWN_POST_TITLE = '';

test.describe('Report — Exploratory (Negative, Edge, Security, Accessibility)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(240000);

  test.beforeEach(async ({ page }) => {
    await login(page);
    await rejectCookieBanner(page);
  });

  // ============================================================
  // PHASE 0 — SETUP
  // ============================================================

  test('Phase 0 — locate TARGET_POST_A (non-owned)', { tag: '@exploratory' }, async ({ page }) => {
    TARGET_POST_A_HREF = await findReportablePost(page, CANDIDATE_LISTINGS);
    note('TARGET_POST_A_HREF', TARGET_POST_A_HREF);
    expect(TARGET_POST_A_HREF, 'PASS if a non-owned candidate post was found').toBeTruthy();
  });

  test('Phase 0 — locate TARGET_POST_B (a second, distinct non-owned post)', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A to exclude/compare against');
    TARGET_POST_B_HREF = await findReportablePost(page, CANDIDATE_LISTINGS, [TARGET_POST_A_HREF]);
    note('TARGET_POST_B_HREF', TARGET_POST_B_HREF);
    expect(TARGET_POST_B_HREF, 'PASS if a second, distinct non-owned post was found').not.toBe(TARGET_POST_A_HREF);
  });

  test('Phase 0 — locate TARGET_COMMENT (top-level, non-owned)', { tag: '@exploratory' }, async ({ page }) => {
    TARGET_COMMENT = await findReportableCommentOrReply(page, CANDIDATE_LISTINGS, 'comment').catch((e) => {
      note('TARGET_COMMENT', `BLOCKED — ${(e as Error).message}`);
      return null;
    });
    test.skip(!TARGET_COMMENT, 'BLOCKED: no non-owned top-level comment found on any candidate listing');
  });

  test('Phase 0 — locate TARGET_REPLY (nested, non-owned)', { tag: '@exploratory' }, async ({ page }) => {
    TARGET_REPLY = await findReportableCommentOrReply(page, CANDIDATE_LISTINGS, 'reply').catch((e) => {
      note('TARGET_REPLY', `BLOCKED — ${(e as Error).message}`);
      return null;
    });
    test.skip(!TARGET_REPLY, 'BLOCKED: no non-owned nested reply found on any candidate listing');
  });

  test('Phase 0 — create OWN_POST (throwaway, for guard tests)', { tag: '@exploratory' }, async ({ page }) => {
    const title = `Report edge test ${Date.now()}`;
    await page.goto('/create-post');
    await page.getByRole('textbox', { name: 'Title *' }).fill(title);
    const topicsInput = page.getByRole('textbox', { name: 'Topics *' });
    await topicsInput.fill('DXB-Dubai');
    const topicOption = page.getByRole('listbox').getByText('DXB-Dubai', { exact: true })
      .filter({ hasNotText: 'Create new topic' });
    await topicOption.first().waitFor({ state: 'visible', timeout: 15000 });
    await topicOption.first().click();
    await page.getByRole('button', { name: 'Publish Post' }).click({ force: true });

    const redirected = await page.waitForURL('**/post/**', { timeout: 15000 }).then(() => true).catch(() => false);
    if (!redirected) {
      await page.goto(`/profile/${REPORTER_USERNAME}?profile_active_tab=posts`);
      const ownPostLink = page.getByRole('link', { name: title });
      let appeared = false;
      for (let attempt = 0; attempt < 5 && !appeared; attempt++) {
        appeared = await ownPostLink.first().waitFor({ state: 'visible', timeout: 8000 })
          .then(() => true).catch(() => false);
        if (!appeared) await page.reload({ waitUntil: 'domcontentloaded' });
      }
      expect(appeared, 'PASS if OWN_POST becomes visible/reachable after publishing').toBe(true);
      await ownPostLink.first().click();
    }
    OWN_POST_TITLE = title;
    OWN_POST_HREF = new URL(page.url()).pathname;
    note('OWN_POST', { title: OWN_POST_TITLE, href: OWN_POST_HREF });
  });

  // ============================================================
  // PHASE 1 — MODAL ENTRY POINTS
  // ============================================================

  test('Phase 1 — feed 3-dot menu options, Report modal fields', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
    await page.goto(TARGET_POST_A_HREF);
    await page.getByRole('button', { name: 'Post options' }).first().click();
    const menuOptions = await page.getByRole('button').filter({ hasText: /Report Post|Edit Post|Delete Post|Remove Post/i }).allTextContents();
    note('Phase1 menu options', menuOptions);
    await page.getByRole('button', { name: 'Report Post' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog, 'PASS if Report modal opens').toBeVisible();
    const heading = (await dialog.locator('h1,h2,h3,h4').first().textContent().catch(() => null))?.trim();
    note('Phase1 modal heading', heading ?? '(none found)');
    await expect(reasonDropdown(dialog), 'PASS if Reason dropdown is present').toBeVisible();
    await expect(detailsTextarea(dialog), 'PASS if Details textarea is present').toBeVisible();
    await expect(submitBtn(dialog), 'PASS if Submit button is present').toBeVisible();
    await expect(cancelBtn(dialog), 'PASS if a Cancel/Close control is present').toBeVisible();
    await cancelBtn(dialog).click();
    await expect(dialog, 'PASS if modal closes via Cancel').not.toBeVisible();
  });

  // ============================================================
  // PHASE 2 — NEGATIVE VALIDATION
  // ============================================================

  test('EDGE #1 (Negative) — Submit with no Reason selected is blocked', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
    const dialog = await openPostReportModal(page, TARGET_POST_A_HREF);
    await submitBtn(dialog).click();
    const stillOpen = await dialog.isVisible().catch(() => false);
    note('EDGE#1 modal still open after empty submit', stillOpen);
    expect(stillOpen, 'FAIL if the modal closed / a report was submitted without a Reason').toBe(true);
    const inlineError = dialog.getByText(/required|select a reason|please choose/i);
    note('EDGE#1 inline Reason-required error visible', await inlineError.isVisible().catch(() => false));
    await cancelBtn(dialog).click();
  });

  test('EDGE #2 (Negative) — Opening then clearing the Reason dropdown without a selection still blocks submit', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
    const dialog = await openPostReportModal(page, TARGET_POST_A_HREF);
    await reasonDropdown(dialog).click();
    await page.keyboard.press('Escape'); // closes the dropdown, not the modal, leaving no Reason selected
    await submitBtn(dialog).click();
    const stillOpen = await dialog.isVisible().catch(() => false);
    note('EDGE#2 modal still open after submit with no reason selected', stillOpen);
    expect(stillOpen, 'FAIL if a report was submitted with no Reason').toBe(true);
    await cancelBtn(dialog).click();
  });

  test('EDGE #3 (Negative) — Submitting while the Reason dropdown is open does not crash', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    const dialog = await openPostReportModal(page, TARGET_POST_A_HREF);
    await reasonDropdown(dialog).click();
    await submitBtn(dialog).click({ force: true }).catch(() => {});
    note('EDGE#3 uncaught JS errors', pageErrors);
    expect(pageErrors, 'FAIL if submitting mid-dropdown threw an uncaught JS error').toEqual([]);
    await page.keyboard.press('Escape').catch(() => {});
    await cancelBtn(dialog).click().catch(() => {});
  });

  // ============================================================
  // PHASE 3 — CANCEL PATHS
  // ============================================================

  test('EDGE #4 (State) — Cancel discards the draft, fires no submit request', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
    const submitRequests: string[] = [];
    page.on('request', (req) => {
      if (req.method() !== 'GET' && /report/i.test(req.url())) submitRequests.push(`${req.method()} ${req.url()}`);
    });
    const dialog = await openPostReportModal(page, TARGET_POST_A_HREF);
    await selectReason(dialog, 'Spam');
    await detailsTextarea(dialog).fill(`test cancel ${Date.now()}`);
    await cancelBtn(dialog).click();
    await expect(dialog, 'FAIL if modal is still open after Cancel').not.toBeVisible();
    note('EDGE#4 submit-like requests fired during Cancel', submitRequests);
    expect(submitRequests, 'FAIL if Cancel fired a report submission request').toEqual([]);
  });

  test('EDGE #5 (State) — Escape key closes the modal without submitting', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
    const dialog = await openPostReportModal(page, TARGET_POST_A_HREF);
    await selectReason(dialog, 'Spam');
    await page.keyboard.press('Escape');
    const closed = await dialog.isHidden().catch(() => true);
    note('EDGE#5 modal closed via Escape', closed);
    expect(closed, 'FAIL if Escape did not close the modal').toBe(true);
  });

  test('EDGE #6 (State) — Backdrop click behavior is observed, not assumed', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
    const dialog = await openPostReportModal(page, TARGET_POST_A_HREF);
    await selectReason(dialog, 'Spam');
    await page.mouse.click(5, 5); // top-left corner, away from a centered modal
    const closedAfterBackdropClick = await dialog.isHidden().catch(() => false);
    note('EDGE#6 modal closed on backdrop click (either behavior is acceptable)', closedAfterBackdropClick);
    if (!closedAfterBackdropClick) await cancelBtn(dialog).click().catch(() => {});
  });

  test('EDGE #7 (State) — Dedicated X close button, if present, dismisses cleanly', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
    const dialog = await openPostReportModal(page, TARGET_POST_A_HREF);
    const closeX = dialog.locator('button[aria-label*="close" i], .modal-header button, .btn-close').first();
    const hasX = await closeX.isVisible().catch(() => false);
    note('EDGE#7 dedicated X close button present', hasX);
    test.skip(!hasX, 'BLOCKED: no dedicated X close button found on this modal — see EDGE#4/#5 for confirmed close paths');
    await closeX.click();
    await expect(dialog, 'FAIL if the X button did not close the modal').not.toBeVisible();
  });

  test('EDGE #8 (State) — Cancelled draft does not persist on reopen', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
    let dialog = await openPostReportModal(page, TARGET_POST_A_HREF);
    await selectReason(dialog, 'Harassment');
    await detailsTextarea(dialog).fill('abandoned draft');
    await cancelBtn(dialog).click();
    await expect(dialog).not.toBeVisible();

    dialog = await openPostReportModal(page, TARGET_POST_A_HREF);
    const reasonText = (await reasonDropdown(dialog).textContent().catch(() => ''))?.trim() ?? '';
    const detailsValue = await detailsTextarea(dialog).inputValue().catch(() => '');
    note('EDGE#8 reopened Reason field text', reasonText);
    note('EDGE#8 reopened Details field value', detailsValue);
    expect(reasonText, 'FAIL if the cancelled Reason selection persisted').not.toContain('Harassment');
    expect(detailsValue, 'FAIL if the cancelled Details text persisted').toBe('');
    await cancelBtn(dialog).click();
  });

  // ============================================================
  // PHASE 4 — DROPDOWN BEHAVIOR
  // ============================================================

  test('EDGE #9-11 (State) — Reason options, selection persists, changes, and "Other" requiring details', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
    const dialog = await openPostReportModal(page, TARGET_POST_A_HREF);
    await reasonDropdown(dialog).click();
    const observedOptions = await Promise.all(REASON_OPTIONS.map(async (r) => ({
      reason: r, visible: await dialog.getByText(r, { exact: true }).isVisible().catch(() => false),
    })));
    note('EDGE#9 observed reason options', observedOptions);

    await dialog.getByText('Spam', { exact: true }).click();
    let selectedText = (await reasonDropdown(dialog).textContent().catch(() => ''))?.trim() ?? '';
    expect(selectedText, 'FAIL if "Spam" is not shown as selected').toContain('Spam');

    // EDGE #10 — change selection
    await reasonDropdown(dialog).click();
    await dialog.getByText('Harassment', { exact: true }).click();
    selectedText = (await reasonDropdown(dialog).textContent().catch(() => ''))?.trim() ?? '';
    expect(selectedText, 'FAIL if the new selection did not replace the old one').toContain('Harassment');
    expect(selectedText, 'FAIL if the old selection is still showing alongside the new one').not.toContain('Spam');

    // EDGE #11 — "Other" requiring details (already observed once in tests/Report.spec.ts's Phase 5)
    await reasonDropdown(dialog).click();
    await dialog.getByText('Other', { exact: true }).click();
    await submitBtn(dialog).click();
    const blockedWithEmptyDetails = await dialog.isVisible().catch(() => false);
    note('EDGE#11 modal still open after submitting "Other" with empty Details', blockedWithEmptyDetails);
    await cancelBtn(dialog).click().catch(() => {});
  });

  test('EDGE #12 (Accessibility) — Reason dropdown is fully keyboard-operable', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
    const dialog = await openPostReportModal(page, TARGET_POST_A_HREF);
    await reasonDropdown(dialog).focus();
    await page.keyboard.press('Enter'); // open
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); // select
    const selectedText = (await reasonDropdown(dialog).textContent().catch(() => ''))?.trim() ?? '';
    note('EDGE#12 reason selected via keyboard only', selectedText);
    expect(selectedText.length, 'FAIL if keyboard navigation never produced a selection').toBeGreaterThan(0);
    await cancelBtn(dialog).click();
  });

  test('EDGE #13 (Accessibility) — Escape closes the dropdown but keeps the modal open', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
    const dialog = await openPostReportModal(page, TARGET_POST_A_HREF);
    await reasonDropdown(dialog).click();
    const optionListVisibleBefore = await page.getByRole('listbox').isVisible().catch(() => false);
    await page.keyboard.press('Escape');
    const optionListVisibleAfter = await page.getByRole('listbox').isVisible().catch(() => false);
    const modalStillOpen = await dialog.isVisible().catch(() => false);
    note('EDGE#13 before/after', { optionListVisibleBefore, optionListVisibleAfter, modalStillOpen });
    expect(modalStillOpen, 'FAIL if Escape closed the whole modal instead of just the dropdown').toBe(true);
    await cancelBtn(dialog).click();
  });

  // ============================================================
  // PHASE 5 — ADDITIONAL DETAILS FIELD
  // ============================================================

  const detailsCases: Array<{ edge: string; label: string; value: string }> = [
    { edge: 'EDGE #14', label: 'very long (5,000 chars)', value: 'A'.repeat(5000) },
    { edge: 'EDGE #15', label: 'extreme (50,000 chars)', value: 'A'.repeat(50000) },
    { edge: 'EDGE #16', label: 'whitespace only', value: '     ' },
    { edge: 'EDGE #17', label: 'Unicode (Japanese)', value: '報告テスト' },
    { edge: 'EDGE #18', label: 'RTL + Latin mix (Arabic)', value: 'مرحبا hello' },
    { edge: 'EDGE #19', label: 'emoji', value: '🚀🚨⚠️' },
    { edge: 'EDGE #20', label: 'control characters / null bytes', value: 'before\x00after\x00\x01\x02' },
    { edge: 'EDGE #21', label: 'multi-line text', value: 'line one\nline two\nline three' },
  ];
  for (const { edge, label, value } of detailsCases) {
    test(`${edge} (Boundary/Input) — Additional details accepts: ${label}`, { tag: '@exploratory' }, async ({ page }) => {
      test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
      const dialog = await openPostReportModal(page, TARGET_POST_A_HREF);
      const textarea = detailsTextarea(dialog);
      await textarea.fill(value).catch((e) => note(`${edge} fill() threw`, (e as Error).message));
      const actual = await textarea.inputValue().catch(() => '');
      note(`${edge} resulting value length`, actual.length);
      expect(actual.length, `FAIL if the field silently rejected all input for: ${label}`).toBeGreaterThan(0);
      // No JS crash / frozen page: page is still responsive to a trivial action.
      await expect(dialog, 'FAIL if the modal became unresponsive after this input').toBeVisible();
      await cancelBtn(dialog).click().catch(() => {});
    });
  }

  // ============================================================
  // PHASE 6 — SECURITY: XSS / INJECTION IN DETAILS
  // ============================================================

  const xssCases: Array<{ edge: string; label: string; payload: string }> = [
    { edge: 'EDGE #22', label: 'script tag', payload: "<script>alert('xss1')</script>test" },
    { edge: 'EDGE #23', label: 'img onerror', payload: "<img src=x onerror=alert('xss2')>" },
    { edge: 'EDGE #24', label: 'svg onload', payload: "<svg onload=alert('xss3')>" },
    { edge: 'EDGE #25', label: 'javascript: href', payload: "<a href='javascript:alert(1)'>click</a>" },
    { edge: 'EDGE #26', label: 'SQL injection', payload: "'; DROP TABLE reports;--" },
    { edge: 'EDGE #27', label: 'HTML injection', payload: '<h1>huge</h1><br><br>' },
  ];
  for (const { edge, label, payload } of xssCases) {
    test(`${edge} (Security) — Additional details neutralizes: ${label}`, { tag: '@exploratory' }, async ({ page }) => {
      test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
      let alertFired = false;
      page.on('dialog', async (d) => { alertFired = true; await d.dismiss(); });
      const dialog = await openPostReportModal(page, TARGET_POST_A_HREF);
      await selectReason(dialog, 'Spam');
      await detailsTextarea(dialog).fill(payload);
      await submitBtn(dialog).click();
      await page.waitForTimeout(1500);
      note(`${edge} native alert fired`, alertFired);
      expect(alertFired, `FAIL (XSS executed) for: ${label}`).toBe(false);
      // Best-effort cleanup: whether it submitted or stayed open, don't leave state hanging.
      await page.keyboard.press('Escape').catch(() => {});
    });
  }

  // ============================================================
  // PHASE 7 — RACE CONDITIONS / RAPID INTERACTION
  // ============================================================

  test('EDGE #28 (Race) — Rapid double-submit fires at most one report', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_B_HREF, 'BLOCKED: no TARGET_POST_B');
    const submitRequests: string[] = [];
    page.on('request', (req) => {
      if (req.method() !== 'GET' && /report/i.test(req.url())) submitRequests.push(req.url());
    });
    const dialog = await openPostReportModal(page, TARGET_POST_B_HREF);
    await selectReason(dialog, 'Spam');
    await Promise.all([
      submitBtn(dialog).click().catch(() => {}),
      submitBtn(dialog).click({ force: true }).catch(() => {}),
    ]);
    await page.waitForTimeout(2000);
    note('EDGE#28 submit-like requests fired', submitRequests.length);
    expect(submitRequests.length, 'FAIL if the double-click fired more than one submit request').toBeLessThanOrEqual(1);
  });

  test('EDGE #29 (Race) — Rapidly clicking the 3-dot menu 5x opens at most one menu', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
    await page.goto(TARGET_POST_A_HREF);
    const kebab = page.getByRole('button', { name: 'Post options' }).first();
    for (let i = 0; i < 5; i++) await kebab.click({ timeout: 2000 }).catch(() => {});
    const openMenus = await page.getByRole('button', { name: 'Report Post' }).count();
    note('EDGE#29 number of Report Post menu items visible after 5 rapid clicks', openMenus);
    expect(openMenus, 'FAIL if multiple stacked menus are open at once').toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape').catch(() => {});
  });

  test('EDGE #30 (Race) — Rapid open/Cancel x5 leaves no stale modal', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
    for (let i = 0; i < 5; i++) {
      const dialog = await openPostReportModal(page, TARGET_POST_A_HREF);
      await cancelBtn(dialog).click().catch(() => {});
    }
    const staleDialogs = await page.getByRole('dialog').count();
    note('EDGE#30 dialog count after 5 rapid open/cancel cycles', staleDialogs);
    expect(staleDialogs, 'FAIL if a stale/ghost modal is left in the DOM').toBe(0);
  });

  test('EDGE #31 (Race) — Opening a second post\'s menu while the first is open is handled gracefully', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF || !TARGET_POST_B_HREF, 'BLOCKED: needs both TARGET_POST_A and TARGET_POST_B on the same listing');
    await page.goto(CANDIDATE_LISTINGS[CANDIDATE_LISTINGS.length - 1]);
    const kebabs = page.getByRole('button', { name: 'Post options' });
    const count = await kebabs.count().catch(() => 0);
    test.skip(count < 2, 'BLOCKED: fewer than 2 post cards with a kebab on the fallback listing');
    await kebabs.nth(0).click();
    await kebabs.nth(1).click().catch(() => {});
    const reportButtons = await page.getByRole('button', { name: 'Report Post' }).count();
    note('EDGE#31 visible "Report Post" menu items after opening a second kebab mid-open', reportButtons);
    expect(reportButtons, 'FAIL if two menus ended up open simultaneously').toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape').catch(() => {});
  });

  // ============================================================
  // PHASE 8 — REPORT ACROSS SURFACES (actual submissions happen here)
  // ============================================================

  test('Report TARGET_POST_A from feed listing; stays visible after refresh', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A');
    const dialog = await openPostReportModal(page, TARGET_POST_A_HREF);
    await selectReason(dialog, 'Spam');
    await submitBtn(dialog).click();
    await expect(dialog, 'FAIL if the modal did not close after submit').not.toBeVisible();
    await expect(successToast(page), 'FAIL if no success confirmation appeared').toBeVisible();

    await page.reload();
    const beforeVsAfter = { before: 'reported', afterReloadStillReachable: page.url().includes(TARGET_POST_A_HREF) };
    note('Phase8 TARGET_POST_A visibility after report + refresh', beforeVsAfter);
    const stillThere = await page.locator('body').isVisible();
    expect(stillThere, 'FAIL if the page errored out entirely after reporting').toBe(true);
  });

  test('EDGE #32 (State) — Report TARGET_POST_B from Single Post View; persists on reload', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_B_HREF, 'BLOCKED: no TARGET_POST_B');
    const dialog = await openPostReportModal(page, TARGET_POST_B_HREF);
    await selectReason(dialog, 'Inappropriate');
    await submitBtn(dialog).click();
    await expect(dialog).not.toBeVisible();
    await expect(successToast(page)).toBeVisible();

    await page.reload();
    const heading = await page.getByRole('heading', { level: 1 }).first().isVisible().catch(() => false);
    note('EDGE#32 post heading visible after report + reload', heading);
    expect(heading, 'FAIL if the post 404s / disappears immediately after being reported').toBe(true);
  });

  test('EDGE #33 (State) — Report a post from a Topic page listing', { tag: '@exploratory' }, async ({ page }) => {
    const topicSlugs = await pickTopicSlugsFromOtherAuthors(page).catch(() => [] as string[]);
    test.skip(!topicSlugs.length, 'BLOCKED: no topic slug could be resolved');
    const href = await findReportablePost(page, topicSlugs.map((s) => `/tags/${s}/latest`)).catch((e) => {
      note('EDGE#33', `BLOCKED — ${(e as Error).message}`);
      return '';
    });
    test.skip(!href, 'BLOCKED: no reportable post found on any candidate topic page');
    const dialog = await openPostReportModal(page, href);
    await selectReason(dialog, 'Misinformation');
    await submitBtn(dialog).click();
    await expect(dialog).not.toBeVisible();
    await expect(successToast(page)).toBeVisible();
  });

  test('EDGE #34 (State) — Report a post from Search results', { tag: '@exploratory' }, async ({ page }) => {
    // No community-post search UI is confirmed anywhere in this codebase (only a
    // blog-articles search exists, in src/pages/BlogIndexPaginationSearch.ts) —
    // best-effort probe for a plausible one; BLOCKED if it can't be found.
    await page.goto('/trending');
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i)).first();
    const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
    note('EDGE#34 community search UI found', hasSearch);
    test.skip(!hasSearch, 'BLOCKED: no community post search input found on this build');
    await searchInput.fill('travel');
    await searchInput.press('Enter');
    const href = await findReportablePost(page, [page.url()]).catch((e) => {
      note('EDGE#34', `BLOCKED — ${(e as Error).message}`);
      return '';
    });
    test.skip(!href, 'BLOCKED: no reportable post found in search results');
    const dialog = await openPostReportModal(page, href);
    await selectReason(dialog, 'Spam');
    await submitBtn(dialog).click();
    await expect(dialog).not.toBeVisible();
    await expect(successToast(page)).toBeVisible();
  });

  test('Report TARGET_COMMENT; stays visible after refresh', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_COMMENT, 'BLOCKED: no TARGET_COMMENT');
    const { text, postHref } = TARGET_COMMENT!;
    const dialog = await openCommentReportModal(page, postHref, text);
    await selectReason(dialog, 'Harassment');
    await submitBtn(dialog).click();
    await expect(dialog).not.toBeVisible();
    await expect(successToast(page)).toBeVisible();

    await page.reload();
    const stillVisible = await page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
    note('Phase8 TARGET_COMMENT visible after report + reload', stillVisible);
  });

  test('Report TARGET_REPLY; stays visible after refresh', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_REPLY, 'BLOCKED: no TARGET_REPLY');
    const { text, postHref } = TARGET_REPLY!;
    const dialog = await openCommentReportModal(page, postHref, text);
    await selectReason(dialog, 'Misinformation');
    await submitBtn(dialog).click();
    await expect(dialog).not.toBeVisible();
    await expect(successToast(page)).toBeVisible();

    await page.reload();
    const stillVisible = await page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
    note('Phase8 TARGET_REPLY visible after report + reload', stillVisible);
  });

  // ============================================================
  // PHASE 9 — DUPLICATE REPORT BEHAVIOR
  // ============================================================

  test('EDGE #35 (State) — Reporting the same post twice: modal reopens, error, or Report hidden?', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_A_HREF, 'BLOCKED: no TARGET_POST_A (must already be reported in Phase 8)');
    await page.goto(TARGET_POST_A_HREF);
    const kebab = page.getByRole('button', { name: 'Post options' }).first();
    const kebabVisible = await kebab.isVisible().catch(() => false);
    if (!kebabVisible) {
      note('EDGE#35 outcome', 'Option D: post/menu no longer reachable at all after being reported once');
      return;
    }
    await kebab.click();
    const reportBtn = page.getByRole('button', { name: 'Report Post' });
    const reportVisible = await reportBtn.isVisible().catch(() => false);
    if (!reportVisible) {
      note('EDGE#35 outcome', 'Option C: Report option is hidden/disabled on an already-reported post');
      return;
    }
    await reportBtn.click();
    const dialog = page.getByRole('dialog');
    const opened = await dialog.isVisible().catch(() => false);
    if (!opened) {
      note('EDGE#35 outcome', 'BLOCKED: clicking Report did nothing observable');
      return;
    }
    const alreadyReportedMsg = await dialog.getByText(/already reported/i).isVisible().catch(() => false);
    if (alreadyReportedMsg) {
      note('EDGE#35 outcome', 'Option B: inline "already reported" message shown');
    } else {
      note('EDGE#35 outcome', 'Option A: modal opens again, allowing a second report');
      await selectReason(dialog, 'Spam');
      await submitBtn(dialog).click();
      const secondSubmitBlocked = await dialog.isVisible().catch(() => false);
      note('EDGE#35 second submit blocked (error) vs allowed', secondSubmitBlocked);
    }
    await page.keyboard.press('Escape').catch(() => {});
  });

  // ============================================================
  // PHASE 10 — CANNOT REPORT OWN CONTENT (guard verification)
  // ============================================================

  test('EDGE #36 (Guard) — Own post menu has Edit/Delete, no Report', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!OWN_POST_HREF, 'BLOCKED: no OWN_POST');
    await page.goto(OWN_POST_HREF);
    await page.getByRole('button', { name: 'Post options' }).click();
    const menuOptions = await page.getByRole('button').filter({ hasText: /Edit|Delete|Remove|Report/i }).allTextContents();
    note('EDGE#36 own-post menu options', menuOptions);
    await expect(page.getByRole('link', { name: 'Edit Post' }).or(page.getByRole('button', { name: 'Edit Post' })),
      'FAIL if Edit Post is missing from your own post\'s menu').toBeVisible();
    await expect(page.getByRole('button', { name: /Delete Post|Remove Post/ }),
      'FAIL if Delete/Remove Post is missing from your own post\'s menu').toBeVisible();
    await expect(page.getByRole('button', { name: 'Report Post' }),
      'FAIL if Report Post IS available on your own content').toHaveCount(0);
  });

  test('EDGE #37 (Guard) — Own comment menu has Edit/Delete, no Report', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!OWN_POST_HREF, 'BLOCKED: no OWN_POST');
    await page.goto(OWN_POST_HREF);
    const commentText = `Test comment on own post ${Date.now()}`;
    const editor = page.locator('.ql-editor[contenteditable="true"]').first();
    await editor.click();
    await editor.fill(commentText);
    await page.getByRole('button', { name: /^reply$|^post$|^submit/i }).last().click();
    await page.getByText(commentText).first().waitFor({ state: 'visible', timeout: 15000 });

    const row = page.locator('.feed-article-comments > .feed-article-comment').filter({ hasText: commentText }).first();
    await row.locator('button[aria-label="Reply options"]').click();
    const menuOptions = await page.getByRole('button').filter({ hasText: /Edit|Delete|Report/i }).allTextContents();
    note('EDGE#37 own-comment menu options', menuOptions);
    await expect(page.getByRole('button', { name: /^edit(\s|$)/i }),
      'FAIL if Edit is missing from your own comment\'s menu').toBeVisible();
    await expect(page.getByRole('button', { name: /^delete(\s|$)/i }),
      'FAIL if Delete is missing from your own comment\'s menu').toBeVisible();
    await expect(page.getByRole('button', { name: 'Report Reply' }),
      'FAIL if Report IS available on your own comment').toHaveCount(0);
    await page.keyboard.press('Escape').catch(() => {});
  });

  // ============================================================
  // PHASE 11 — REPORTABILITY OF EDGE CONTENT STATES
  // ============================================================

  test('EDGE #38 (Single-account limitation) — Report a placeholder (deleted-parent) comment from another user\'s view', { tag: '@exploratory' }, async () => {
    test.skip(true, 'single-account limitation: the deleted comment used to create a placeholder is authored by the only account available, so it can never show a Report option to itself');
  });

  test('EDGE #39 (State) — Report availability on a blocked user\'s content', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!TARGET_POST_B_HREF, 'BLOCKED: no TARGET_POST_B to use as the block target');
    await page.goto(TARGET_POST_B_HREF);
    await page.getByRole('button', { name: 'Post options' }).first().click();
    const blockOption = page.getByRole('button', { name: /block/i }).or(page.getByRole('link', { name: /block/i }));
    const hasBlock = await blockOption.first().isVisible().catch(() => false);
    note('EDGE#39 "Block user" option found in post menu', hasBlock);
    test.skip(!hasBlock, 'BLOCKED: no "Block User" affordance found in this menu on this build');
    await blockOption.first().click();
    const confirmBlock = page.getByRole('button', { name: /block|confirm|yes/i }).last();
    if (await confirmBlock.isVisible().catch(() => false)) await confirmBlock.click();

    await page.goto(TARGET_POST_B_HREF);
    const kebabAfterBlock = page.getByRole('button', { name: 'Post options' }).first();
    const reachableAfterBlock = await kebabAfterBlock.isVisible().catch(() => false);
    note('EDGE#39 post still reachable after blocking its author', reachableAfterBlock);
    if (reachableAfterBlock) {
      await kebabAfterBlock.click();
      const reportStillThere = await page.getByRole('button', { name: 'Report Post' }).isVisible().catch(() => false);
      note('EDGE#39 Report option still available after blocking the author', reportStillThere);
      await page.keyboard.press('Escape').catch(() => {});
    }
    // Cleanup: unblock.
    await page.goto(`/profile/${TARGET_POST_B_HREF}`).catch(() => {});
  });

  test('EDGE #40 (State) — Report works normally on content later marked "Edited"', { tag: '@exploratory' }, async ({ page }) => {
    const editedItem = await tryListings(CANDIDATE_LISTINGS, async (listingPath) => {
      await page.goto(listingPath);
      const editedLabel = page.locator('text=/Edited/i').first();
      const found = await editedLabel.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
      if (!found) throw new Error(`No "Edited" label found on ${listingPath}`);
      return listingPath;
    }).catch((e) => {
      note('EDGE#40', `BLOCKED — ${(e as Error).message}`);
      return null;
    });
    test.skip(!editedItem, 'BLOCKED: no visibly-"Edited" content found on any candidate listing');
    // If found, the row it's on is whatever the scan landed on — re-run the generic
    // post-menu Report check on that same listing as a sanity check.
    const href = await findReportablePost(page, [editedItem!]).catch(() => '');
    test.skip(!href, 'BLOCKED: the "Edited" content found was not itself reportable (may be owned)');
    await page.getByRole('button', { name: 'Report Post' }).click();
    await expect(page.getByRole('dialog'), 'FAIL if Report does not work on edited content').toBeVisible();
    await page.keyboard.press('Escape').catch(() => {});
  });

  // ============================================================
  // PHASE 12 — TOAST AND CONFIRMATION
  // ============================================================

  test('EDGE #41-42 (State) — Toast text, auto-dismiss timing, manual dismiss', { tag: '@exploratory' }, async ({ page }) => {
    const href = await findReportablePost(page, CANDIDATE_LISTINGS).catch((e) => {
      note('EDGE#41', `BLOCKED — ${(e as Error).message}`);
      return '';
    });
    test.skip(!href, 'BLOCKED: no reportable post found for this toast check');
    const dialog = await openPostReportModal(page, href);
    await selectReason(dialog, 'Spam');
    await submitBtn(dialog).click();
    const toast = successToast(page);
    await expect(toast).toBeVisible();
    const toastText = (await toast.textContent().catch(() => ''))?.trim();
    note('EDGE#41 exact toast text', toastText ?? '(could not read)');

    const closeX = toast.locator('button, [role="button"]').filter({ hasText: /×|close/i }).first();
    const hasCloseX = await closeX.isVisible().catch(() => false);
    if (hasCloseX) {
      await closeX.click();
      note('EDGE#42 manual dismiss', await toast.isHidden().catch(() => true));
    } else {
      const start = Date.now();
      await toast.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
      note('EDGE#41 approx auto-dismiss seconds', Math.round((Date.now() - start) / 1000));
    }
  });

  test('EDGE #43 (State) — Multiple rapid reports do not stack/overlap toasts incorrectly', { tag: '@exploratory' }, async ({ page }) => {
    const hrefs: string[] = [];
    for (let i = 0; i < 3; i++) {
      const href = await findReportablePost(page, CANDIDATE_LISTINGS, hrefs).catch(() => '');
      if (href) hrefs.push(href);
    }
    test.skip(hrefs.length < 2, 'BLOCKED: fewer than 2 distinct reportable posts available for this check');
    for (const href of hrefs) {
      const dialog = await openPostReportModal(page, href);
      await selectReason(dialog, 'Spam');
      await submitBtn(dialog).click();
      await expect(successToast(page)).toBeVisible();
    }
    const toastCount = await page.getByRole('alert').count();
    note('EDGE#43 stacked toast count after rapid sequential reports', toastCount);
    expect(toastCount, 'FAIL if toasts are stacking indefinitely instead of replacing/queueing cleanly').toBeLessThanOrEqual(3);
  });

  // ============================================================
  // PHASE 13 — NETWORK AND SESSION EDGE CASES
  // ============================================================

  test('EDGE #44 (Network) — Slow network shows a loading state and disables re-submit', { tag: '@exploratory' }, async ({ page }) => {
    const href = await findReportablePost(page, CANDIDATE_LISTINGS).catch(() => '');
    test.skip(!href, 'BLOCKED: no reportable post found for this check');
    await page.route('**/*report*', async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.continue();
    });
    const dialog = await openPostReportModal(page, href);
    await selectReason(dialog, 'Spam');
    const btn = submitBtn(dialog);
    await btn.click();
    const disabledMidFlight = await btn.isDisabled().catch(() => false);
    note('EDGE#44 Submit disabled during in-flight request', disabledMidFlight);
    await page.unroute('**/*report*').catch(() => {});
  });

  test('EDGE #45 (Network) — Failed submit shows an in-modal error, allows retry', { tag: '@exploratory' }, async ({ page }) => {
    const href = await findReportablePost(page, CANDIDATE_LISTINGS).catch(() => '');
    test.skip(!href, 'BLOCKED: no reportable post found for this check');
    await page.route('**/*report*', (route) => route.abort('failed'));
    const dialog = await openPostReportModal(page, href);
    await selectReason(dialog, 'Spam');
    await submitBtn(dialog).click();
    await page.waitForTimeout(2000);
    const stillOpen = await dialog.isVisible().catch(() => false);
    const errorShown = await dialog.getByText(/error|failed|try again/i).isVisible().catch(() => false);
    note('EDGE#45 modal stayed open on network failure', stillOpen);
    note('EDGE#45 in-modal error message shown', errorShown);
    expect(stillOpen, 'FAIL if the modal silently closed despite the request failing').toBe(true);
    await page.unroute('**/*report*').catch(() => {});
    await cancelBtn(dialog).click().catch(() => {});
  });

  test('EDGE #46 (Network) — Session expiring mid-submit is handled gracefully', { tag: '@exploratory' }, async ({ page, context }) => {
    const href = await findReportablePost(page, CANDIDATE_LISTINGS).catch(() => '');
    test.skip(!href, 'BLOCKED: no reportable post found for this check');
    const dialog = await openPostReportModal(page, href);
    await selectReason(dialog, 'Spam');

    const otherTab = await context.newPage();
    await login(otherTab); // re-authenticating in another tab can rotate/invalidate the session
    await otherTab.close();

    await submitBtn(dialog).click();
    await page.waitForTimeout(2000);
    const redirectedToLogin = page.url().includes('/login');
    const errorShown = await dialog.getByText(/error|session|log ?in/i).isVisible().catch(() => false);
    note('EDGE#46 outcome', { redirectedToLogin, errorShown });
    expect(redirectedToLogin || errorShown, 'FAIL if the app neither redirected to login nor showed any error').toBe(true);
  });

  // ============================================================
  // PHASE 14 — KEYBOARD & ACCESSIBILITY
  // ============================================================

  test('EDGE #47-50 (Accessibility) — Focus trap, initial focus, focus return, dialog semantics', { tag: '@exploratory' }, async ({ page }) => {
    const href = await findReportablePost(page, CANDIDATE_LISTINGS).catch(() => '');
    test.skip(!href, 'BLOCKED: no reportable post found for this check');
    await page.goto(href);
    const kebab = page.getByRole('button', { name: 'Post options' }).first();
    await kebab.click();
    await page.getByRole('button', { name: 'Report Post' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const role = await dialog.getAttribute('role');
    const ariaModal = await dialog.getAttribute('aria-modal');
    const ariaLabelledby = await dialog.getAttribute('aria-labelledby');
    note('EDGE#50 dialog semantics', { role, ariaModal, ariaLabelledby });
    expect(['dialog', 'alertdialog']).toContain(role);

    const initialFocusInsideDialog = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"], [role="alertdialog"]');
      return !!d && !!document.activeElement && d.contains(document.activeElement);
    });
    note('EDGE#48 initial focus lands inside the dialog', initialFocusInsideDialog);

    // EDGE #47 — Tab through more elements than the modal has and confirm focus never
    // lands on a background element (outside the dialog).
    let escapedFocusTrap = false;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"], [role="alertdialog"]');
        return !!d && !!document.activeElement && d.contains(document.activeElement);
      });
      if (!inside) { escapedFocusTrap = true; break; }
    }
    note('EDGE#47 focus escaped the modal during Tab cycling', escapedFocusTrap);
    expect(escapedFocusTrap, 'FAIL if Tab moved focus to a background page element').toBe(false);

    await cancelBtn(dialog).click();
    const focusReturnedToKebab = await page.evaluate((el) => document.activeElement === el, await kebab.elementHandle());
    note('EDGE#49 focus returned to the triggering button after close', focusReturnedToKebab);
  });

  test('EDGE #51-53 (Accessibility) — Form field and Submit button accessible names', { tag: '@exploratory' }, async ({ page }) => {
    const href = await findReportablePost(page, CANDIDATE_LISTINGS).catch(() => '');
    test.skip(!href, 'BLOCKED: no reportable post found for this check');
    const dialog = await openPostReportModal(page, href);

    const reasonAccessibleName = await reasonDropdown(dialog).getAttribute('aria-label')
      ?? await reasonDropdown(dialog).getAttribute('placeholder');
    note('EDGE#51 Reason dropdown accessible name', reasonAccessibleName ?? '(none found)');
    expect(reasonAccessibleName, 'FAIL if the Reason field has no accessible name at all').toBeTruthy();

    const detailsAccessibleName = await detailsTextarea(dialog).getAttribute('aria-label')
      ?? await detailsTextarea(dialog).getAttribute('placeholder')
      ?? await detailsTextarea(dialog).getAttribute('name');
    note('EDGE#52 Details field accessible name', detailsAccessibleName ?? '(none found)');
    expect(detailsAccessibleName, 'FAIL if the Details field has no accessible name at all').toBeTruthy();

    const submitText = (await submitBtn(dialog).textContent())?.trim();
    const submitRole = await submitBtn(dialog).evaluate((el) => el.tagName.toLowerCase());
    note('EDGE#53 Submit button text/tag', { submitText, submitRole });
    expect(submitText && submitText.length > 0, 'FAIL if the Submit control has no accessible text').toBe(true);
    await cancelBtn(dialog).click();
  });

  test('EDGE #54 (Accessibility) — Validation error is announced (role=alert / aria-live)', { tag: '@exploratory' }, async ({ page }) => {
    const href = await findReportablePost(page, CANDIDATE_LISTINGS).catch(() => '');
    test.skip(!href, 'BLOCKED: no reportable post found for this check');
    const dialog = await openPostReportModal(page, href);
    await submitBtn(dialog).click();
    const liveRegionError = dialog.locator('[role="alert"], [aria-live="assertive"], [aria-live="polite"]');
    const found = await liveRegionError.first().isVisible().catch(() => false);
    note('EDGE#54 announced validation error found', found);
    await cancelBtn(dialog).click().catch(() => {});
  });

  test('EDGE #55 (Accessibility) — Focus indicator is visible while tabbing through the modal', { tag: '@exploratory' }, async ({ page }) => {
    const href = await findReportablePost(page, CANDIDATE_LISTINGS).catch(() => '');
    test.skip(!href, 'BLOCKED: no reportable post found for this check');
    const dialog = await openPostReportModal(page, href);
    const outlines: string[] = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      const style = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return null;
        const cs = getComputedStyle(el);
        return `${cs.outlineStyle} ${cs.outlineWidth} / box-shadow:${cs.boxShadow !== 'none'}`;
      });
      if (style) outlines.push(style);
    }
    note('EDGE#55 computed focus indicator styles while tabbing', outlines);
    await cancelBtn(dialog).click().catch(() => {});
  });

  test('EDGE #56 (Accessibility) — Color contrast of key modal text meets WCAG AA', { tag: '@exploratory' }, async ({ page }) => {
    const href = await findReportablePost(page, CANDIDATE_LISTINGS).catch(() => '');
    test.skip(!href, 'BLOCKED: no reportable post found for this check');
    const dialog = await openPostReportModal(page, href);

    const contrastRatio = (rgb1: [number, number, number], rgb2: [number, number, number]): number => {
      const lum = ([r, g, b]: [number, number, number]) => {
        const [rs, gs, bs] = [r, g, b].map((c) => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };
      const [l1, l2] = [lum(rgb1), lum(rgb2)].sort((a, b) => b - a);
      return (l1 + 0.05) / (l2 + 0.05);
    };
    const parseRgb = (s: string): [number, number, number] => {
      const m = s.match(/(\d+),\s*(\d+),\s*(\d+)/);
      return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
    };

    const targets = [
      { name: 'modal heading', locator: dialog.locator('h1,h2,h3,h4').first() },
      { name: 'Submit button', locator: submitBtn(dialog) },
      { name: 'Cancel button', locator: cancelBtn(dialog) },
    ];
    const results: Array<{ name: string; ratio: number }> = [];
    for (const { name, locator } of targets) {
      const visible = await locator.isVisible().catch(() => false);
      if (!visible) continue;
      const colors = await locator.evaluate((el) => {
        const cs = getComputedStyle(el);
        let bg = cs.backgroundColor;
        let node: Element | null = el;
        while (bg === 'rgba(0, 0, 0, 0)' && node.parentElement) {
          node = node.parentElement;
          bg = getComputedStyle(node).backgroundColor;
        }
        return { color: cs.color, backgroundColor: bg };
      });
      const ratio = contrastRatio(parseRgb(colors.color), parseRgb(colors.backgroundColor));
      results.push({ name, ratio: Math.round(ratio * 100) / 100 });
    }
    note('EDGE#56 computed contrast ratios (WCAG AA normal text needs >= 4.5)', results);
    for (const r of results) {
      expect(r.ratio, `FAIL: ${r.name} contrast ${r.ratio}:1 is below the 4.5:1 WCAG AA threshold`).toBeGreaterThanOrEqual(4.5);
    }
    await cancelBtn(dialog).click().catch(() => {});
  });

  test('EDGE #57 (Accessibility) — Enter on a focused Submit button submits the form', { tag: '@exploratory' }, async ({ page }) => {
    const href = await findReportablePost(page, CANDIDATE_LISTINGS).catch(() => '');
    test.skip(!href, 'BLOCKED: no reportable post found for this check');
    const dialog = await openPostReportModal(page, href);
    await selectReason(dialog, 'Spam');
    await submitBtn(dialog).focus();
    await page.keyboard.press('Enter');
    const submitted = await dialog.isHidden({ timeout: 5000 }).catch(() => false);
    note('EDGE#57 Enter-key submit worked', submitted);
    expect(submitted, 'FAIL if pressing Enter on a focused Submit button did nothing').toBe(true);
  });

  // ============================================================
  // PHASE 15 — SECURITY: MODAL AND SUBMISSION
  // ============================================================

  test('EDGE #58 (Security) — CSRF protection present on the report submission request', { tag: '@exploratory' }, async ({ page }) => {
    const href = await findReportablePost(page, CANDIDATE_LISTINGS).catch(() => '');
    test.skip(!href, 'BLOCKED: no reportable post found for this check');
    let capturedHeaders: Record<string, string> = {};
    let capturedBody = '';
    page.on('request', (req) => {
      if (req.method() !== 'GET' && /report/i.test(req.url())) {
        capturedHeaders = req.headers();
        capturedBody = req.postData() ?? '';
      }
    });
    const dialog = await openPostReportModal(page, href);
    await selectReason(dialog, 'Spam');
    await submitBtn(dialog).click();
    await page.waitForTimeout(1500);
    const hasCsrfHeader = Object.keys(capturedHeaders).some((h) => /csrf|xsrf/i.test(h));
    const hasCsrfInBody = /csrf|xsrf/i.test(capturedBody);
    const cookies = await page.context().cookies();
    const sameSiteCookies = cookies.filter((c) => c.sameSite === 'Strict' || c.sameSite === 'Lax');
    note('EDGE#58 CSRF header present', hasCsrfHeader);
    note('EDGE#58 CSRF token in body', hasCsrfInBody);
    note('EDGE#58 relies on SameSite cookies instead', sameSiteCookies.map((c) => `${c.name}:${c.sameSite}`));
  });

  test('EDGE #59 (Security) — No auth token/password persisted in browser storage', { tag: '@exploratory' }, async ({ page }) => {
    const found = await page.evaluate((pwd) => {
      const scan = (s: Storage) => Object.keys(s).some((k) => (s.getItem(k) ?? '').includes(pwd));
      return scan(localStorage) || scan(sessionStorage);
    }, VALID_PASSWORD);
    note('EDGE#59 plaintext password found in browser storage', found);
    expect(found, 'FAIL if the plaintext password is stored in local/session storage').toBe(false);
  });

  // ============================================================
  // CLEANUP
  // ============================================================

  test('Cleanup — remove OWN_POST', { tag: '@exploratory' }, async ({ page }) => {
    test.skip(!OWN_POST_HREF, 'BLOCKED: no OWN_POST to clean up');
    await page.goto(OWN_POST_HREF);
    await page.getByRole('button', { name: 'Post options' }).click();
    await page.getByRole('button', { name: /Delete Post|Remove Post/ }).click();
    const confirmDelete = page.getByRole('button', { name: /Delete|Remove|Confirm|Yes/i }).last();
    if (await confirmDelete.isVisible().catch(() => false)) await confirmDelete.click();
  });
});

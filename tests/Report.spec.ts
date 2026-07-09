/**
 * report.spec.ts
 *
 * WHAT THIS FILE TESTS
 * ---------------------
 * Positive/happy-path coverage of the TalkTravel "Report" flow, per the Report flow doc:
 *   Phase 1 - Report a post from the homepage/latest feed listing (card 3-dot menu)
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
 * TARGET DISCOVERY IS DYNAMIC, NOT HARDCODED:
 * Earlier versions of this file pinned specific slugs/comment text captured during one
 * manual pass. Those went stale almost immediately — this staging environment's data
 * shifts between capture and run (and reporting a post appears to remove it from listings,
 * see caveat below), so a fixed slug reliably 404s by the next run. Every phase below
 * instead scans a listing for *any* currently-existing, non-owned post/comment/reply and
 * uses whichever it finds — this self-heals as staging content changes instead of needing
 * re-captured values every run.
 *
 * Known other seeded accounts' own profiles (REPORT_TEST_OTHER_AUTHORS, default
 * "testerprem111,koramo") are tried before the generic /latest feed: the reporter
 * account is the one every functional/exploratory spec in this whole suite logs in as
 * and publishes throwaway content with, which saturates /trending and /latest with its
 * own posts — a run against the generic feed alone exhausted a 20-post scan and found
 * zero non-owned candidates. A known other author's profile is guaranteed non-owned.
 *
 * AUTH STRATEGY: credentials come from TEST_EMAIL / TEST_PASSWORD env vars (via .env,
 * same convention as CreatePost.spec.ts, DeletePost.spec.ts, EditPost.spec.ts and
 * comment-lifecycle.spec.ts). beforeEach logs in through the UI each run.
 *
 * KNOWN ENVIRONMENT CAVEAT OBSERVED DURING MANUAL EXECUTION (documented, not asserted here):
 * Reporting a post/comment/reply on this staging build appears to hide it from listings and
 * can 404 on direct URL access shortly after. This CONTRADICTS the flow doc's "reported
 * content stays visible" requirement. Phase 7 below asserts the documented CONTRACT (content
 * stays visible) — on this staging build it is expected to FAIL until the underlying bug is
 * fixed.
 */

import { test, expect, type Page, type Locator } from '@playwright/test';

const VALID_EMAIL       = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const VALID_PASSWORD    = process.env.TEST_PASSWORD ?? 'Admin@123';
const REPORTER_USERNAME = process.env.TEST_USERNAME ?? 'prempoudel_1';
const MAX_SCAN = 20;

// This reporter account is the one every functional/exploratory spec in the whole
// suite (CreatePost, EditPost, DeletePost, comment-lifecycle, ...) logs in as and
// publishes throwaway content with — not just this file. That saturates /trending
// and /latest with its own posts, so scanning the generic feed for a non-owned
// candidate can exhaust MAX_SCAN and find nothing (confirmed: happened on /latest
// across every phase in one run). Known other seeded accounts' own profiles are
// guaranteed non-owned content, so try those first and fall back to the generic
// feed only if none of them have anything.
const OTHER_AUTHOR_USERNAMES = (process.env.REPORT_TEST_OTHER_AUTHORS ?? 'testerprem111,koramo')
  .split(',').map((s) => s.trim()).filter(Boolean);
// A real run found zero non-reporter comments/replies across testerprem111's profile,
// koramo's profile, AND /latest combined (20 posts scanned each) — the pool of other-
// authored content with actual engagement is thin, so cast as wide a net as possible
// rather than giving up after a couple of sources.
const FALLBACK_LISTING_PATHS = (process.env.REPORT_TEST_LISTING_PATHS ?? '/latest,/trending,/for-you')
  .split(',').map((s) => s.trim()).filter(Boolean);
const CANDIDATE_LISTINGS = [...OTHER_AUTHOR_USERNAMES.map((u) => `/profile/${u}`), ...FALLBACK_LISTING_PATHS];

async function login(page: Page): Promise<void> {
  await page.goto('https://staging.talktravel.com/login');
  await page.getByRole('textbox', { name: /email|username|phone/i }).fill(VALID_EMAIL);
  await page.locator('input[type="password"]').fill(VALID_PASSWORD);
  await page.getByRole('button', { name: /log ?in/i }).click();
  // The staging auth endpoint is occasionally slow enough to exceed 15s.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 });
}

/**
 * Confirmed present via a real failure trace: an unhandled cookie-consent
 * banner sits over the page and silently swallows clicks elsewhere (e.g. the
 * Publish Post button, feed kebab menus) instead of throwing — every other
 * spec in this suite dismisses it (see PostLoginHomepagePage.dismissCookieBanner
 * / CreatePost.exploratory.spec.ts's beforeEach); this file never did.
 */
async function dismissCookieBanner(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Accept All' }).click({ timeout: 3000 }).catch(() => {});
}

// ---- Reason dropdown options observed identically across post / comment / reply modals ----
const REASON_OPTIONS = ['Spam', 'Harassment', 'Misinformation', 'Inappropriate', 'Other'];

// ---- Observed UI copy (regex-wrapped for minor variation tolerance) ----
const REPORT_POST_HEADING = /^Report Post$/i;
const REPORT_REPLY_HEADING = /^Report Reply$/i;
// Never directly confirmed via DOM inspection — fall back to the generic alert role
// so the assertion still means something if the exact copy differs.
const successToast = (page: Page) =>
  page.getByText(/report.*(submit|received|success)/i).or(page.getByRole('alert'));

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

/**
 * Scans a feed/topic listing for a post whose "Post options" menu offers
 * "Report Post" (own posts show Edit/Remove instead — confirmed via live DOM).
 * Leaves that menu open (Report Post visible, ready to click) and returns the
 * post's own link href for later reference (e.g. Phase 7).
 */
async function findReportablePostOnListing(page: Page, listingPaths: string[]): Promise<string> {
  return tryListings(listingPaths, async (listingPath) => {
    await page.goto(listingPath);
    const postOptionsButtons = page.getByRole('button', { name: 'Post options' });
    await postOptionsButtons.first().waitFor({ state: 'visible', timeout: 20000 });
    const count = Math.min(await postOptionsButtons.count(), MAX_SCAN);
    for (let i = 0; i < count; i++) {
      const button = postOptionsButtons.nth(i);
      const href = await button
        .locator('xpath=ancestor::a[contains(@href, "/post/")]')
        .first()
        .getAttribute('href')
        .catch(() => null);
      await button.click();
      const reportPost = page.getByRole('button', { name: 'Report Post' });
      if (await reportPost.isVisible({ timeout: 2000 }).catch(() => false)) {
        return href ?? '';
      }
      await page.keyboard.press('Escape').catch(() => {});
    }
    throw new Error(`Could not find any reportable (non-owned) post on ${listingPath}.`);
  });
}

/**
 * Scans a listing, opening each post's OWN page (Single Post View) until one's
 * header "Post options" menu offers "Report Post". Leaves that menu open and
 * returns the post's heading text for later assertions.
 */
async function findReportablePostDetail(page: Page, listingPaths: string[]): Promise<string> {
  return tryListings(listingPaths, async (listingPath) => {
    const titleLinks = page.locator('a.feed-post-title-link, a.feed-post-link-overlay');
    await page.goto(listingPath);
    await titleLinks.first().waitFor({ state: 'visible', timeout: 20000 });
    const count = Math.min(await titleLinks.count(), MAX_SCAN);
    for (let i = 0; i < count; i++) {
      await page.goto(listingPath);
      const links = page.locator('a.feed-post-title-link, a.feed-post-link-overlay');
      await links.nth(i).click();
      await page.waitForURL('**/post/**').catch(() => {});
      const opened = await page.getByRole('button', { name: 'Post options' }).first()
        .click({ timeout: 5000 }).then(() => true).catch(() => false);
      if (opened) {
        const reportPost = page.getByRole('button', { name: 'Report Post' });
        if (await reportPost.isVisible({ timeout: 2000 }).catch(() => false)) {
          return (await page.getByRole('heading', { level: 1 }).first().textContent())?.trim() ?? '';
        }
        await page.keyboard.press('Escape').catch(() => {});
      }
    }
    throw new Error(`Could not find any reportable (non-owned) post detail page on ${listingPath}.`);
  });
}

/** Grabs up to `limit` distinct topic slugs currently listed on /tags. */
async function pickTopicSlugsFromSite(page: Page, limit = 5): Promise<string[]> {
  await page.goto('/tags');
  // The header's own nav dropdown also renders <a href="/tags/...."> links,
  // just hidden (class="nav-dropdown-link") until that dropdown is opened — a
  // real failure trace showed a bare a[href^="/tags/"] locator matching one of
  // those instead of a visible topic on the page. :visible filters them out.
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

/**
 * Grabs topic slugs straight off known other-authors' own posts (guaranteeing
 * those topics' listings contain at least one non-owned post), then tops up
 * with whatever else is on /tags — a single topic can turn out to be nearly
 * empty (confirmed: one run's chosen topic timed out with zero posts), so
 * callers should try several rather than committing to just one.
 */
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
  } catch {
    // Fine if /tags itself has nothing extra to add — other-author slugs may suffice.
  }
  if (!slugs.length) throw new Error('Could not find any topic slug on other-author profiles or /tags.');
  return slugs;
}

/**
 * Confirmed via live DOM: top-level comments are direct children of
 * .feed-article-comments; nested replies live one level deeper inside a
 * .feed-article-comment-replies wrapper. Both use aria-label="Reply options"
 * and a "Report Reply" menu action. Scans across posts on each listing (a
 * single post may have no comments, or no nested replies) until a non-owned
 * row of the requested scope is found; returns its visible text.
 */
async function findReportableCommentOrReply(
  page: Page,
  listingPaths: string[],
  scope: 'comment' | 'reply',
): Promise<string> {
  return tryListings(listingPaths, (listingPath) =>
    findReportableCommentOrReplyOn(page, listingPath, scope));
}

async function findReportableCommentOrReplyOn(
  page: Page,
  listingPath: string,
  scope: 'comment' | 'reply',
): Promise<string> {
  const titleLinks = page.locator('a.feed-post-title-link, a.feed-post-link-overlay');
  await page.goto(listingPath);
  await titleLinks.first().waitFor({ state: 'visible', timeout: 20000 });
  const postCount = Math.min(await titleLinks.count(), MAX_SCAN);

  for (let p = 0; p < postCount; p++) {
    await page.goto(listingPath);
    const links = page.locator('a.feed-post-title-link, a.feed-post-link-overlay');
    await links.nth(p).click();
    await page.waitForURL('**/post/**').catch(() => {});

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
        return (await row.innerText()).trim();
      }
      await page.keyboard.press('Escape').catch(() => {});
    }
  }
  throw new Error(`Could not find any reportable ${scope} after scanning ${postCount} posts on ${listingPath}.`);
}

// Phase 7 verifies the *same* post Phase 1 reports — that's the only way to test
// "stays visible after being reported" instead of "an unreported post is visible"
// (trivially true). Requires Phase 1 to run first within this file (both run in
// the same worker/order; see the equivalent seedPostUrl pattern in
// tests/comment-lifecycle.spec.ts for the existing convention this follows).
let reportedPostHref = '';

test.describe('Report — Positive Flow', () => {
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissCookieBanner(page);
    await expect(page.getByRole('link', { name: /Create Post/i })).toBeVisible();
  });

  test('Phase 1: Report post from Homepage feed listing', async ({ page }) => {
    reportedPostHref = await findReportablePostOnListing(page, CANDIDATE_LISTINGS);
    await page.getByRole('button', { name: 'Report Post' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(REPORT_POST_HEADING)).toBeVisible();

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
    await expect(dialog).not.toBeVisible();
    await expect(successToast(page)).toBeVisible();
  });

  test('Phase 2: Report post from Single Post View', async ({ page }) => {
    const title = await findReportablePostDetail(page, CANDIDATE_LISTINGS);
    await page.getByRole('button', { name: 'Report Post' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(REPORT_POST_HEADING)).toBeVisible();

    const reasonDropdown = dialog.getByPlaceholder('Choose a reason...');
    await reasonDropdown.click();
    await dialog.getByText('Inappropriate', { exact: true }).click();

    await dialog.getByPlaceholder('Provide more context to help us understand the issue...')
      .fill('Test report submission - QA run');

    await dialog.getByRole('button', { name: 'Submit' }).click();

    await expect(dialog).not.toBeVisible();
    await expect(successToast(page)).toBeVisible();

    // Refresh and confirm the post remains visible and interactive (per flow doc contract).
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
  });

  test('Phase 3: Report a comment', async ({ page }) => {
    const commentText = await findReportableCommentOrReply(page, CANDIDATE_LISTINGS, 'comment');
    await page.getByRole('button', { name: 'Report Reply' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(REPORT_REPLY_HEADING)).toBeVisible();

    await dialog.getByPlaceholder('Choose a reason...').click();
    await dialog.getByText('Harassment', { exact: true }).click();
    // Additional details left empty (optional).
    await dialog.getByRole('button', { name: 'Submit' }).click();

    await expect(dialog).not.toBeVisible();
    await expect(successToast(page)).toBeVisible();

    // Per flow doc: the comment should remain visible in the thread.
    await expect(page.getByText(commentText, { exact: false }).first()).toBeVisible();
  });

  test('Phase 4: Report a nested reply', async ({ page }) => {
    const replyText = await findReportableCommentOrReply(page, CANDIDATE_LISTINGS, 'reply');
    await page.getByRole('button', { name: 'Report Reply' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(REPORT_REPLY_HEADING)).toBeVisible();

    await dialog.getByPlaceholder('Choose a reason...').click();
    await dialog.getByText('Misinformation', { exact: true }).click();
    await dialog.getByRole('button', { name: 'Submit' }).click();

    await expect(dialog).not.toBeVisible();
    await expect(successToast(page)).toBeVisible();

    // Per flow doc: the reply should remain visible in the thread.
    await expect(page.getByText(replyText, { exact: false }).first()).toBeVisible();
  });

  test('Phase 5: Report post from Topic page', async ({ page }) => {
    // A single topic can turn out to be nearly empty (confirmed: one run's chosen
    // topic timed out with zero posts) — try several before giving up.
    const topicSlugs = await pickTopicSlugsFromOtherAuthors(page);
    await findReportablePostOnListing(page, topicSlugs.map((slug) => `/tags/${slug}/latest`));
    await page.getByRole('button', { name: 'Report Post' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(REPORT_POST_HEADING)).toBeVisible();

    await dialog.getByPlaceholder('Choose a reason...').click();
    await dialog.getByText('Other', { exact: true }).click();

    // Observed behavior: selecting "Other" makes Additional details required.
    const details = dialog.getByPlaceholder(/Provide more context|Please provide details about the issue/i);
    await details.fill('Test report submission - QA run');

    await dialog.getByRole('button', { name: 'Submit' }).click();

    await expect(dialog).not.toBeVisible();
    await expect(successToast(page)).toBeVisible();
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
    // A trace from a real failure showed a leftover modal/dialog still
    // intercepting this click after the topic dropdown closes. CreatePost's
    // own exploratory suite hits the same thing and already works around it
    // with a forced click (see CreatePost.exploratory.spec.ts) — same fix here.
    await page.getByRole('button', { name: 'Publish Post' }).click({ force: true });

    // Most create-post flows redirect straight to the new post — try that first,
    // it's a single wait rather than a hunt. A previous run found the post never
    // appeared on the profile "posts" tab across 5 reload retries (~40s), which
    // reads more like the tab/query param being wrong than pure indexing lag, so
    // that hunt is now only a fallback, not the primary path.
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
      if (!appeared) throw new Error(`New post "${title}" never appeared on the profile posts tab, and publishing did not redirect to it either.`);
      await ownPostLink.first().click();
    }

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
    // (the post Phase 1 reported above). NOTE: during manual execution against this
    // staging build, this contract was NOT met — reported posts disappeared from
    // listings and returned 404 on direct access. This test encodes the intended/
    // expected behavior per the flow doc and is expected to FAIL until that bug is
    // fixed; see the caveat in the file header.
    test.skip(!reportedPostHref, 'Phase 1 did not record a reported post to verify (did it run first, and pass?).');

    await page.goto(reportedPostHref);
    const escapedHref = reportedPostHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(page).toHaveURL(new RegExp(escapedHref));

    // Core interactions remain functional.
    await expect(page.getByRole('button', { name: 'Share' })).toBeEnabled();

    // No "already reported" indicator should appear on the content itself.
    await expect(page.getByText(/reported/i)).toHaveCount(0);
  });
});

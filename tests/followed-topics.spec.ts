// followed-topics.spec.ts
//
// ============================================================================
// WHAT THIS FILE TESTS
// ============================================================================
// Positive-flow (happy path only) coverage of the TalkTravel "Followed
// Topics" left-nav dropdown, per the "Leftnav_followedtopics.md" test doc.
//
// Scope: POSITIVE FLOW ONLY — the 8 core numbered steps from the doc
// (expand/collapse, populated state, click-through, empty state,
// follow/unfollow reflecting in the dropdown). Excludes the doc's
// "Edge cases to add as separate tests" table (rapid clicks, session
// expiry, mobile, screen readers, etc.) and the keyboard-interaction step —
// those are accessibility/edge concerns, not happy-path coverage.
//
// ----------------------------------------------------------------------------
// SELECTOR STATUS
// ----------------------------------------------------------------------------
// This session's network policy blocks outbound access to
// staging.talktravel.com, so the doc's guessed selectors were first used
// as-is and then corrected from a real Playwright run's accessibility-tree
// snapshot (shared back into the session after a local run failed):
//   - CONFIRMED: "Followed Topics" is a plain <a href="#sidebar-tags"> in an
//     unlabeled sidebar list — NOT a <button> inside nav[aria-label="Primary"]
//     as the doc guessed. Clicking it appends "#sidebar-tags" to the URL
//     (the doc's "URL does NOT change" claim does not hold for the real impl).
//   - CONFIRMED: every sidebar icon has alt="TalkTravel", which gets folded
//     into the link's accessible name (e.g. real name is "TalkTravel Followed
//     Topics") — role-name matching with `exact: true` (or an anchored regex)
//     against the visible text alone will not match. Use text-based locators
//     for sidebar items instead.
//   - CONFIRMED: topic URLs are /tags/{slug} (e.g. /tags/Europe), not
//     /topic/{slug} as the doc guessed — matches src/pages/SingleTopicView.ts.
//   - CONFIRMED: the topic detail page has a single "Follow" button (no icon)
//     that never relabels to "Unfollow" — unlike the Posts feature, where the
//     button does flip label (see followed-posts.spec.ts). Follow/unfollow
//     state is instead announced via an aria-live `status` region (observed
//     text: "Unfollowed topic"; "Followed topic" is the assumed positive
//     counterpart, unconfirmed).
//   - UNCONFIRMED (best-effort guess pending a passing run): the expanded
//     dropdown container is assumed to be #sidebar-tags (from the link's
//     href); topic row / "Browse all topics" / empty-state selectors are
//     still the doc's untouched guesses (data-testid, text=, etc.) and have
//     not yet been seen in a real expanded-dropdown snapshot.
// ============================================================================

import { test, expect, Page, Locator } from '@playwright/test';

const BASE_URL = 'https://staging.talktravel.com';
const EMAIL = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';

// Confirmed to exist via live snapshot (post tagged "Europe" -> /tags/Europe).
// The doc's own example slug ("airlines") is unconfirmed and may 404.
const TOPIC_SLUG = 'Europe';

// -------------------- Helpers --------------------

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.locator('#login-identifier').fill(EMAIL);
  await page.locator('#login-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).toHaveURL(`${BASE_URL}/trending`);
}

// Confirmed via live snapshot: this is a plain <a href="#sidebar-tags"> in the
// (unlabeled) left sidebar list, not a <button> in a nav[aria-label="Primary"].
// NOTE: every sidebar icon has alt="TalkTravel", which gets folded into the
// link's accessible name (real name is "TalkTravel Followed Topics") — so
// `exact: true` against "Followed Topics" alone never matches. Use a plain
// text locator instead of role-name matching to sidestep this site-wide
// icon-name pollution.
function navToggle(page: Page): Locator {
  return page.locator('a', { hasText: 'Followed Topics' });
}

// The link's href points at #sidebar-tags — using that as the dropdown
// container id until we can confirm it against the expanded markup.
function dropdown(page: Page): Locator {
  return page.locator('#sidebar-tags');
}

async function expandDropdown(page: Page) {
  const toggle = navToggle(page);
  await toggle.click();
  await expect(dropdown(page)).toBeVisible();
}

// Confirmed via live snapshot: the topic page has a single "Follow" button
// that never relabels to "Unfollow" — it's a static toggle action, not a
// state label. Follow/unfollow state is communicated via an aria-live
// `status` region (observed text: "Unfollowed topic"; "Followed topic" is
// the assumed positive counterpart, unconfirmed).
function topicFollowToggle(page: Page): Locator {
  return page.getByRole('button', { name: 'Follow', exact: true });
}

async function setTopicFollowState(page: Page, slug: string, wantFollowed: boolean) {
  await page.goto(`${BASE_URL}/tags/${slug}`);
  const status = page.getByRole('status');
  const wantedPattern = wantFollowed ? /^(?!.*unfollow).*follow/i : /unfollow/i;

  await topicFollowToggle(page).click();
  if (!(await status.filter({ hasText: wantedPattern }).isVisible().catch(() => false))) {
    // First click landed on the opposite state (topic was already in the
    // target state before this call) — toggle again to reach the target.
    await topicFollowToggle(page).click();
  }
  await expect(status).toHaveText(wantedPattern);
}

/** Ensures the given topic is in the "Following" state; follows it if not. */
async function ensureTopicFollowed(page: Page, slug: string) {
  await setTopicFollowState(page, slug, true);
}

async function ensureTopicUnfollowed(page: Page, slug: string) {
  await setTopicFollowState(page, slug, false);
}

// -------------------- Suite --------------------

test.describe('Left Nav — Followed Topics Dropdown — Positive Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Step 1: Clicking the Followed Topics nav item expands the dropdown', async ({ page }) => {
    const toggle = navToggle(page);

    await toggle.click();

    await expect(dropdown(page)).toBeVisible();
    // The link's real href is "#sidebar-tags" — unlike the doc's assumption,
    // this appends a hash rather than leaving the URL untouched.
    await expect(page).toHaveURL(`${BASE_URL}/trending#sidebar-tags`);
  });

  test('Step 2: Clicking the expanded Followed Topics nav item collapses the dropdown', async ({ page }) => {
    const toggle = navToggle(page);
    await expandDropdown(page);

    await toggle.click();

    await expect(dropdown(page)).not.toBeVisible();
  });

  test('Step 3: Populated dropdown lists followed topics and the Browse all topics link', async ({ page }) => {
    await ensureTopicFollowed(page, TOPIC_SLUG);
    await page.goto(`${BASE_URL}/trending`);

    await expandDropdown(page);

    const list = dropdown(page);
    await expect(list.locator('a[href^="/tags/"]').first()).toBeVisible();
    await expect(list.getByText('Browse all topics')).toBeVisible();
  });

  test('Step 4: Clicking a topic row in the dropdown opens its Single Topic View', async ({ page }) => {
    await ensureTopicFollowed(page, TOPIC_SLUG);
    await page.goto(`${BASE_URL}/trending`);
    await expandDropdown(page);

    const firstTopic = dropdown(page).locator('a[href^="/tags/"]').first();
    const href = await firstTopic.getAttribute('href');
    await firstTopic.click();

    await expect(page).toHaveURL(`${BASE_URL}${href}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('Step 5: Clicking "Browse all topics" navigates to /topics', async ({ page }) => {
    await expandDropdown(page);

    await dropdown(page).getByText('Browse all topics').click();

    await expect(page).toHaveURL(`${BASE_URL}/topics`);
  });

  test('Step 6: Empty state shows the empty message and Browse all topics link when zero topics are followed', async ({ page }) => {
    await ensureTopicUnfollowed(page, TOPIC_SLUG);
    await page.goto(`${BASE_URL}/trending`);

    await expandDropdown(page);

    const list = dropdown(page);
    await expect(list.getByText(/no followed topics/i)).toBeVisible();
    await expect(list.getByText('Browse all topics')).toBeVisible();
    await expect(list.locator('a[href^="/tags/"]')).toHaveCount(0);
  });

  test('Step 7: Following a topic from its detail page makes it appear in the dropdown', async ({ page }) => {
    await ensureTopicUnfollowed(page, TOPIC_SLUG);
    await ensureTopicFollowed(page, TOPIC_SLUG);

    await expandDropdown(page);
    await expect(dropdown(page).locator(`a[href="/tags/${TOPIC_SLUG}"]`)).toBeVisible();
  });

  test('Step 8: Unfollowing a topic from its detail page removes it from the dropdown', async ({ page }) => {
    await ensureTopicFollowed(page, TOPIC_SLUG);
    await ensureTopicUnfollowed(page, TOPIC_SLUG);

    await expandDropdown(page);
    await expect(dropdown(page).locator(`a[href="/tags/${TOPIC_SLUG}"]`)).not.toBeVisible();
  });

  test('Cleanup: unfollow the topic followed during setup', async ({ page }) => {
    await ensureTopicUnfollowed(page, TOPIC_SLUG);
  });
});

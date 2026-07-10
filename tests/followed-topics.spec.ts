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
//     as the doc guessed. #sidebar-tags is a Bootstrap `collapse` component;
//     Bootstrap's JS calls preventDefault() on the toggle, so the doc's "URL
//     does NOT change" claim DOES hold (an earlier fix here wrongly assumed
//     a URL hash was appended — reverted once a real run disproved it).
//   - CONFIRMED: every sidebar icon has alt="TalkTravel", which gets folded
//     into the link's accessible name (e.g. real name is "TalkTravel Followed
//     Topics") — role-name matching with `exact: true` (or an anchored regex)
//     against the visible text alone will not match. Use text-based locators
//     for sidebar items instead.
//   - CONFIRMED: topic URLs are /tags/{slug} (e.g. /tags/Europe), not
//     /topic/{slug} as the doc guessed — matches src/pages/SingleTopicView.ts.
//     The "Browse all topics" target is /tags, not /topics as the doc guessed.
//   - CONFIRMED: the topic detail page has a single "Follow" button (no icon)
//     that never relabels to "Unfollow" — unlike the Posts feature, where the
//     button does flip label (see followed-posts.spec.ts). Follow/unfollow
//     state is instead announced via a toast (role="status", text "Following
//     topic" / "Unfollowed topic"). getByRole('status') alone is too broad
//     (also matches an unrelated loading spinner) and old/new toasts can
//     coexist briefly, so selectors filter to toast text and read the last one.
//   - UNCONFIRMED (best-effort guess pending a passing run): topic row /
//     empty-state selectors inside the dropdown are still the doc's untouched
//     guesses (data-testid, text=, etc.) and have not yet been seen in a real
//     populated/empty dropdown snapshot.
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

// Confirmed via live snapshot: #sidebar-tags is a Bootstrap `collapse`
// component (class toggles between "collapsing" mid-transition and
// "collapse show" / "collapse"). Bootstrap's own JS calls preventDefault()
// on the toggle link, so the URL never changes, and a toggle click is
// ignored while a previous transition is still animating — so assert on
// the "show" class (settled state) rather than toBeVisible() immediately
// after a click, which raced the CSS transition in an earlier run.
function dropdown(page: Page): Locator {
  return page.locator('#sidebar-tags');
}

async function expandDropdown(page: Page) {
  await navToggle(page).click();
  await expect(dropdown(page)).toHaveClass(/\bshow\b/);
}

async function collapseDropdown(page: Page) {
  await navToggle(page).click();
  await expect(dropdown(page)).not.toHaveClass(/\bshow\b/);
}

// Confirmed via live snapshot: the topic page has a single "Follow" button
// that never relabels to "Unfollow" — it's a static toggle action, not a
// state label. Follow/unfollow state is communicated via a toast with
// role="status" (observed text: "Following topic" / "Unfollowed topic").
// getByRole('status') alone is too broad — it also matches an unrelated
// loading spinner elsewhere on the page — and old/new toasts can coexist
// in the DOM briefly, so scope to toast text and always read the last one.
function topicFollowToggle(page: Page): Locator {
  return page.getByRole('button', { name: 'Follow', exact: true });
}

function followStatusToasts(page: Page): Locator {
  return page.getByRole('status').filter({ hasText: /topic$/i });
}

async function setTopicFollowState(page: Page, slug: string, wantFollowed: boolean) {
  await page.goto(`${BASE_URL}/tags/${slug}`);
  const wantedPattern = wantFollowed ? /^(?!.*unfollow).*follow/i : /unfollow/i;
  const lastToast = followStatusToasts(page).last();

  await topicFollowToggle(page).click();
  await expect(lastToast).toBeVisible();
  const text = (await lastToast.textContent()) ?? '';
  if (!wantedPattern.test(text)) {
    // First click landed on the opposite state (topic was already in the
    // target state before this call) — toggle again to reach the target.
    await topicFollowToggle(page).click();
  }
  await expect(followStatusToasts(page).last()).toHaveText(wantedPattern);
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
    await expandDropdown(page);

    // Confirmed via live snapshot: #sidebar-tags is a Bootstrap collapse
    // component whose toggle link calls preventDefault() — the doc's
    // original "URL does NOT change" claim holds after all.
    await expect(page).toHaveURL(`${BASE_URL}/trending`);
  });

  test('Step 2: Clicking the expanded Followed Topics nav item collapses the dropdown', async ({ page }) => {
    await expandDropdown(page);
    await collapseDropdown(page);
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

  test('Step 5: Clicking "Browse all topics" navigates to /tags', async ({ page }) => {
    await expandDropdown(page);

    await dropdown(page).getByText('Browse all topics').click();

    // Confirmed via live snapshot: the real Browse Topics route is /tags
    // (matches the footer's "Topics" link), not /topics as the doc guessed.
    await expect(page).toHaveURL(`${BASE_URL}/tags`);
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

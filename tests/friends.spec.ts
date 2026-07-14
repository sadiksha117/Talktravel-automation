// friends.spec.ts
//
// ============================================================================
// WHAT THIS FILE TESTS
// ============================================================================
// Positive-flow (happy path only) coverage of the TalkTravel "Friends"
// left-nav dropdown, per the "LeftNav_Friends.md" test doc.
//
// Scope: POSITIVE FLOW ONLY — Steps 1-8 from the doc (expand/collapse,
// populated state, click-through to a friend's profile, "See all" link,
// empty state, friend-added/removed reflecting in the dropdown). Excludes
// the doc's "Edge cases to add as separate tests" table and Step 9
// (keyboard interaction) — those are accessibility/edge concerns, not
// happy-path coverage, matching the convention set by followed-topics.spec.ts.
//
// ----------------------------------------------------------------------------
// SELECTOR STATUS
// ----------------------------------------------------------------------------
// This session's network policy blocks outbound access to
// staging.talktravel.com (confirmed: `curl` to it times out), so unlike
// followed-topics.spec.ts / followed-posts.spec.ts, none of the selectors
// below have been corrected against a live DOM snapshot yet. They are the
// doc's own "Suggested Playwright selectors", used as-is. The doc itself
// states the Friends dropdown is "structurally identical to the Followed
// Topics dropdown" — and a live run against that dropdown showed its real
// markup differs substantially from its own doc's guesses (a plain
// `<a href="#sidebar-tags">` Bootstrap `collapse`, not a
// `nav[aria-label="Primary"] >> button` with `data-testid`s). Expect the
// same kind of correction to be needed here once this suite is run against
// staging — treat every locator below as UNCONFIRMED.
//
// SEEDING: the doc calls for seeding friendships via API in `beforeEach`,
// but no such endpoint/helper exists in this repo yet. Steps that need a
// specific friend count instead read the dropdown's current state and skip
// with a clear reason if the precondition isn't met, rather than asserting
// against a hardcoded count. Steps 7/8 (friend appears/disappears after an
// external action) are left as documented manual preconditions since there's
// no API or second account wired up to drive them.
// ============================================================================

import { test, expect, Page, Locator } from '@playwright/test';

const BASE_URL = 'https://staging.talktravel.com';
const EMAIL = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';

// -------------------- Helpers --------------------

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.locator('#login-identifier').fill(EMAIL);
  await page.locator('#login-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).toHaveURL(`${BASE_URL}/trending`);
}

// Doc's guess: `nav[aria-label="Primary"] >> button:has-text("Friends")` or
// `[data-testid="nav-friends"]`. UNCONFIRMED — used as-is pending a live run.
function navToggle(page: Page): Locator {
  return page.locator('[data-testid="nav-friends"]')
    .or(page.locator('nav[aria-label="Primary"] >> button:has-text("Friends")'));
}

// Doc's guess: `[data-testid="friends-dropdown"]`. UNCONFIRMED.
function dropdown(page: Page): Locator {
  return page.locator('[data-testid="friends-dropdown"]');
}

async function expandDropdown(page: Page) {
  await navToggle(page).click();
  await expect(navToggle(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(dropdown(page)).toBeVisible();
}

async function collapseDropdown(page: Page) {
  await navToggle(page).click();
  await expect(navToggle(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(dropdown(page)).not.toBeVisible();
}

function friendRows(page: Page): Locator {
  return dropdown(page).locator('a[href^="/user/"]');
}

function seeAllLink(page: Page): Locator {
  return dropdown(page).getByText('See all');
}

// -------------------- Suite --------------------

test.describe('Left Nav — Friends Dropdown — Positive Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Step 1: Clicking the Friends nav item expands the dropdown', async ({ page }) => {
    await expandDropdown(page);

    // UI-only interaction per the doc — URL should not change.
    await expect(page).toHaveURL(`${BASE_URL}/trending`);
  });

  test('Step 2: Clicking the expanded Friends nav item collapses the dropdown', async ({ page }) => {
    await expandDropdown(page);
    await collapseDropdown(page);
  });

  test('Step 3: Populated dropdown lists friends (avatar + nickname) and the See all link', async ({ page }) => {
    await expandDropdown(page);

    const rows = friendRows(page);
    const count = await rows.count();
    test.skip(count === 0, 'Test account currently has zero friends — see Step 6 for the empty-state case.');

    await expect(rows.first()).toBeVisible();
    await expect(dropdown(page).locator('[data-testid="friend-avatar"]').first()).toBeVisible();
    await expect(dropdown(page).locator('[data-testid="friend-nickname"]').first()).toBeVisible();
    await expect(seeAllLink(page)).toBeVisible();
  });

  test('Step 4: Clicking a friend row opens that friend\'s profile', async ({ page }) => {
    await expandDropdown(page);

    const firstFriend = friendRows(page).first();
    const count = await friendRows(page).count();
    test.skip(count === 0, 'Test account currently has zero friends — nothing to click through.');

    const href = await firstFriend.getAttribute('href');
    await firstFriend.click();

    await expect(page).toHaveURL(`${BASE_URL}${href}`);
    await expect(page.getByRole('button', { name: 'Friends' })).toBeVisible();
  });

  test('Step 5: Clicking "See all" navigates to /friends', async ({ page }) => {
    await expandDropdown(page);

    await seeAllLink(page).click();

    await expect(page).toHaveURL(`${BASE_URL}/friends`);
  });

  test('Step 6: Empty state shows "No friends yet" and the See all link when zero friends', async ({ page }) => {
    await expandDropdown(page);

    const count = await friendRows(page).count();
    test.skip(count > 0, 'Test account currently has friends — empty state needs a zero-friends account (auth/no-friends.json per the doc).');

    await expect(dropdown(page).getByText(/no friends yet/i)).toBeVisible();
    await expect(seeAllLink(page)).toBeVisible();
    await expect(friendRows(page)).toHaveCount(0);
  });

  test('Step 7: A friend accepted elsewhere appears in the dropdown', async ({ page }) => {
    // Precondition per the doc: a pending friend request was just accepted
    // (via a second account/context or API) before this test runs. No
    // seeding endpoint exists in this repo yet, so this is left as a
    // documented manual precondition rather than automated here.
    test.fixme(true, 'Needs friend-request seeding (API or second account) — not wired up yet.');

    await expandDropdown(page);
    await expect(friendRows(page)).not.toHaveCount(0);
  });

  test('Step 8: Unfriending elsewhere removes the friend from the dropdown', async ({ page }) => {
    // Same seeding gap as Step 7 — the doc requires unfriending via another
    // page/account first, which this repo has no helper for yet.
    test.fixme(true, 'Needs an existing friendship to remove (API or second account) — not wired up yet.');

    await expandDropdown(page);
  });
});

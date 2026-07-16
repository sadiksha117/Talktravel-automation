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
// staging.talktravel.com, so selectors were corrected using a real Playwright
// Codegen recording run and shared back into the session (rather than a live
// run from inside this sandbox):
//   - CONFIRMED: the "Friends" nav toggle is a plain `<a>` link, not a
//     `button`/`data-testid` as the doc guessed — accessible name is
//     "TalkTravel Friends" (the icon's alt="TalkTravel" gets folded in),
//     matching the exact same site-wide icon-name pollution already
//     confirmed for Followed Topics in followed-topics.spec.ts. Use a
//     text-based `<a>` locator, not role-name `exact` matching.
//   - CONFIRMED: the empty-state text is exactly "No friends yet".
//   - INFERRED, NOT YET CONFIRMED: the dropdown container. The doc's
//     `[data-testid="friends-dropdown"]` was never seen in the recording.
//     Given the doc's own claim that this dropdown is "structurally
//     identical to the Followed Topics dropdown" (a Bootstrap `collapse`
//     component toggled via `<a href="#sidebar-tags">`), `dropdown()` below
//     reads the toggle's own `href` at runtime instead of hardcoding a guessed
//     id/class — this works whether the real id is `#sidebar-friends` or
//     something else, as long as the same Bootstrap collapse pattern holds.
//     Falls back to the doc's data-testid guess if the toggle isn't an
//     `href="#..."` anchor. STILL NEEDS a real DOM snapshot of the expanded
//     panel to fully confirm (container id/class, friend row markup, avatar/
//     nickname selectors, "See all" markup).
//
// SEEDING: the doc calls for seeding friendships via API in `beforeEach`,
// but no such endpoint/helper exists in this repo yet. Steps that need a
// specific friend count instead read the dropdown's current state and skip
// with a clear reason if the precondition isn't met, rather than asserting
// against a hardcoded count. As of the last live check, the default test
// account (prempoudel_1) has zero friends, so Step 6 (empty state) is
// expected to run for real and Steps 3/4 (populated state) are expected to
// skip until a friend exists. Steps 7/8 (friend appears/disappears after an
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

// CONFIRMED via a live Codegen recording: this is a plain `<a>` link, not a
// `button`/`data-testid` as the doc guessed. Its accessible name is
// "TalkTravel Friends" (icon alt="TalkTravel" folds into the name) — mirrors
// the Followed Topics nav item exactly, so a text-based `<a>` locator is used
// instead of role-name matching to sidestep the same icon-name pollution.
function navToggle(page: Page): Locator {
  return page.locator('a', { hasText: 'Friends' });
}

// UNCONFIRMED: the actual dropdown container markup was never captured in
// the recording. Rather than hardcode a guessed id/class, this reads the
// toggle's own `href` at runtime — if it's a Bootstrap collapse anchor
// (`href="#some-id"`, the same pattern confirmed for Followed Topics), this
// resolves to the real container regardless of its exact id. Falls back to
// the doc's data-testid guess otherwise.
async function dropdown(page: Page): Promise<Locator> {
  const href = await navToggle(page).getAttribute('href');
  if (href && href.startsWith('#')) {
    return page.locator(href);
  }
  return page.locator('[data-testid="friends-dropdown"]');
}

async function expandDropdown(page: Page) {
  await navToggle(page).click();
  await expect(await dropdown(page)).toBeVisible();
}

async function collapseDropdown(page: Page) {
  await navToggle(page).click();
  await expect(await dropdown(page)).not.toBeVisible();
}

function friendRows(list: Locator): Locator {
  return list.locator('a[href^="/user/"]');
}

// CONFIRMED via a live Codegen recording: "See all" is a `link` role with
// exact accessible name "See all" (no icon-name pollution on this one).
function seeAllLink(list: Locator): Locator {
  return list.getByRole('link', { name: 'See all', exact: true });
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
    const list = await dropdown(page);

    const rows = friendRows(list);
    const count = await rows.count();
    test.skip(count === 0, 'Test account currently has zero friends — see Step 6 for the empty-state case.');

    await expect(rows.first()).toBeVisible();
    await expect(list.locator('[data-testid="friend-avatar"]').first()).toBeVisible();
    await expect(list.locator('[data-testid="friend-nickname"]').first()).toBeVisible();
    await expect(seeAllLink(list)).toBeVisible();
  });

  test('Step 4: Clicking a friend row opens that friend\'s profile', async ({ page }) => {
    await expandDropdown(page);
    const list = await dropdown(page);

    const rows = friendRows(list);
    const count = await rows.count();
    test.skip(count === 0, 'Test account currently has zero friends — nothing to click through.');

    const firstFriend = rows.first();
    const href = await firstFriend.getAttribute('href');
    await firstFriend.click();

    await expect(page).toHaveURL(`${BASE_URL}${href}`);
    await expect(page.getByRole('button', { name: 'Friends' })).toBeVisible();
  });

  test('Step 5: Clicking "See all" navigates to /friends', async ({ page }) => {
    await expandDropdown(page);
    const list = await dropdown(page);

    await seeAllLink(list).click();

    await expect(page).toHaveURL(`${BASE_URL}/friends`);
  });

  test('Step 6: Empty state shows "No friends yet" and the See all link when zero friends', async ({ page }) => {
    await expandDropdown(page);
    const list = await dropdown(page);

    const rows = friendRows(list);
    const count = await rows.count();
    test.skip(count > 0, 'Test account currently has friends — empty state needs a zero-friends account (auth/no-friends.json per the doc).');

    // CONFIRMED exact copy via live recording: "No friends yet".
    await expect(list.getByText('No friends yet')).toBeVisible();
    await expect(seeAllLink(list)).toBeVisible();
    await expect(rows).toHaveCount(0);
  });

  test('Step 7: A friend accepted elsewhere appears in the dropdown', async ({ page }) => {
    // Precondition per the doc: a pending friend request was just accepted
    // (via a second account/context or API) before this test runs. No
    // seeding endpoint exists in this repo yet, so this is left as a
    // documented manual precondition rather than automated here.
    test.fixme(true, 'Needs friend-request seeding (API or second account) — not wired up yet.');

    await expandDropdown(page);
    const list = await dropdown(page);
    await expect(friendRows(list)).not.toHaveCount(0);
  });

  test('Step 8: Unfriending elsewhere removes the friend from the dropdown', async ({ page }) => {
    // Same seeding gap as Step 7 — the doc requires unfriending via another
    // page/account first, which this repo has no helper for yet.
    test.fixme(true, 'Needs an existing friendship to remove (API or second account) — not wired up yet.');

    await expandDropdown(page);
  });
});

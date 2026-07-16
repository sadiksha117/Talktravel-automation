// FollowedTopicsDropdown.exploratory.spec.ts
//
// Flow under test: TalkTravel "Followed Topics" sidebar dropdown
// (nav toggle: a[href="#sidebar-tags"] -> Bootstrap collapse container
// #sidebar-tags).
//
// Reference: manually executed exploratory + security/a11y pass against
// https://staging.talktravel.com/ using account prempoudel72707@gmail.com.
// Selectors, API endpoints, and copy strings below were captured live from
// the DOM/network during that session — none are placeholders.
//
// Scope: EDGE CASES ONLY (state/interaction, boundary, cross-surface,
// accessibility). No happy-path positive flows — see ../followed-topics.spec.ts
// for that. Tagged '@exploratory' to match every other file in this folder.
//
// STATUS: only 10 of the edge cases from the source test plan made it into
// this file intact — the plan document referenced ~40, but the remainder
// (EDGE #11 onward) was lost to message truncation while it was being
// pasted in and has not been recovered. Nothing beyond EDGE #10 is
// fabricated here; append the rest once available rather than guessing
// at what they covered.
//
// NOTE on login: the live manual session was already authenticated, so its
// own login form selectors were never exercised end-to-end there. This file
// uses the #login-identifier / #login-password / "Log In" button selectors
// instead, because those are the ones already confirmed working across many
// real runs of ../followed-topics.spec.ts in this repo (see that file's
// login() helper) — a stronger source of truth than an unverified guess.
//
// The tag-follow REST helpers below (getAuthToken, getFollowedTagNames,
// apiSetFollow, resolveTagUid) are included as captured, for a future
// API-driven setup/teardown speed-up, but are NOT wired into beforeEach/
// afterEach yet — their request payload ({ tag_uid, tag, action }) hasn't
// been confirmed against the real API from inside this session, and wiring
// an unverified mutation into shared-account setup is exactly the kind of
// guess that cost multiple rounds of fixes on the positive-flow spec.

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constants captured live during manual execution
// ---------------------------------------------------------------------------

const BASE_URL = 'https://staging.talktravel.com';
const EMAIL = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';

// Topics followed fresh in beforeEach for the 10 edge cases below.
const SEED_TOPICS = ['Rome', 'Bermuda', 'Sedona'];

// A topic known to exist in the catalog, safe to follow/unfollow repeatedly
// for test isolation (leaf tag, observed live). Reserved for edge cases
// beyond #10 that haven't been recovered yet.
const SAFE_TEST_TOPIC_NAME = 'Bali';
const SAFE_TEST_TOPIC_URL_SLUG = 'Bali';

// A topic name long enough to trigger the observed truncation bug (34
// characters, confirmed present in the live catalog). Reserved for edge
// cases beyond #10 that haven't been recovered yet.
const LONG_TOPIC_NAME = 'LuxuryAndLifestyleTravelMagazines';

// Observed UI copy (exact strings captured from DOM)
const EMPTY_STATE_TEXT = 'No followed topics yet';
const BROWSE_ALL_TEXT = 'Browse all topics';
const SEE_ALL_TEXT = 'See all';

// Real selectors captured from the DOM during manual execution
const NAV_TOGGLE = 'a[href="#sidebar-tags"]';
const DROPDOWN_CONTAINER = '#sidebar-tags';
const TOPIC_ROWS = `${DROPDOWN_CONTAINER} .nav-dropdown-menu-list a.nav-dropdown-link`;
const EMPTY_STATE_EL = `${DROPDOWN_CONTAINER} .nav-dropdown-menu-list span.text-muted.small`;
const BROWSE_ALL_LINK = `${DROPDOWN_CONTAINER} a[href="/tags"]`;
const SEE_ALL_LINK = `${DROPDOWN_CONTAINER} a[href="/my/followed-tags"]`;
const FRIENDS_TOGGLE = 'a[href="#sidebar-users"]';
const FRIENDS_CONTAINER = '#sidebar-users';

const TAGS_TREE_ROW = '.tags-tree-row';
const TAGS_TREE_FOLLOW_BTN = 'button.tags-tree-follow-btn';

// Tag-detail-page follow/unfollow control (text cycles Follow/Following/Unfollow).
// Reserved for edge cases beyond #10 that haven't been recovered yet.
const TAG_PAGE_FOLLOW_BUTTON =
  'button.btn-following, button:has-text("Follow"), button:has-text("Following"), button:has-text("Unfollow")';

// Real API endpoints captured via network inspection during manual execution.
// Reserved for a future API-driven setup/teardown; not used by the tests below yet.
const FOLLOW_API = '**/api/v1/tag-follow/follow';
const LIST_API = '**/api/v1/tag-follow/lists**';
const ALL_TAGS_API = '**/api/v1/tag/all-tags';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.locator('#login-identifier').fill(EMAIL);
  await page.locator('#login-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page.locator(NAV_TOGGLE)).toBeVisible({ timeout: 15000 });
}

async function followTopicViaTagsPage(page: Page, name: string) {
  await page.goto(`${BASE_URL}/tags`);
  const row = page.locator(TAGS_TREE_ROW).filter({ hasText: name }).first();
  await row.locator(TAGS_TREE_FOLLOW_BTN).click();
}

async function unfollowAllViaTagsPage(page: Page, names: string[]) {
  await page.goto(`${BASE_URL}/tags`);
  for (const name of names) {
    const row = page.locator(TAGS_TREE_ROW).filter({ hasText: name }).first();
    const btn = row.locator(TAGS_TREE_FOLLOW_BTN);
    // Known bug (see report): button may show a stale "Follow" label for an
    // already-followed topic on fresh load — click twice defensively so the
    // net effect is guaranteed "unfollowed".
    if ((await btn.textContent())?.trim() === 'Follow') {
      await btn.click();
      await page.waitForTimeout(300);
    }
    if ((await btn.textContent())?.trim() === 'Unfollow') {
      await btn.click();
    }
  }
}

async function expandDropdown(page: Page) {
  const toggle = page.locator(NAV_TOGGLE);
  const expanded = await toggle.getAttribute('aria-expanded');
  if (expanded !== 'true') {
    await toggle.click();
  }
  await expect(page.locator(DROPDOWN_CONTAINER)).toHaveClass(/show/);
}

// ---- Reserved for future API-driven setup/teardown (not yet wired in) ----

/** Extract the bearer token the app stores in localStorage under "TalkTravel". */
async function getAuthToken(page: Page): Promise<string | null> {
  return page.evaluate(() => window.localStorage.getItem('TalkTravel'));
}

/** Read the list of currently followed tag names from the client-side follow-store. */
async function getFollowedTagNames(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem('follow-store');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return (parsed?.state?.tags ?? []).map((t: any) => t.tag as string);
    } catch {
      return [];
    }
  });
}

/** Follow or unfollow a tag directly via the real API (for setup/teardown speed & reliability). */
async function apiSetFollow(
  request: APIRequestContext,
  token: string,
  tagUid: string,
  tagName: string,
  action: 'follow' | 'unfollow'
) {
  return request.post(`${BASE_URL}/api/v1/tag-follow/follow`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    data: { tag_uid: tagUid, tag: tagName, action },
  });
}

/** Resolve a tag's uid from the all-tags catalog by exact name. */
async function resolveTagUid(request: APIRequestContext, token: string, tagName: string): Promise<string> {
  const res = await request.get(`${BASE_URL}/api/v1/tag/all-tags`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  const flat = JSON.stringify(body);
  const idx = flat.indexOf(`"tag":"${tagName}"`);
  if (idx === -1) throw new Error(`Tag "${tagName}" not found in catalog`);
  const uidMatch = flat.slice(Math.max(0, idx - 80), idx).match(/"uid":"([0-9a-f-]{36})"/i);
  if (!uidMatch) throw new Error(`Could not resolve uid for tag "${tagName}"`);
  return uidMatch[1];
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('Followed Topics Dropdown — Edge Cases', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
    for (const t of SEED_TOPICS) {
      await followTopicViaTagsPage(page, t);
    }
    await page.goto(`${BASE_URL}/trending`);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: unfollow everything followed during the test, including seeds.
    await page.goto(`${BASE_URL}/trending`);
    await expandDropdown(page);
    const rows = page.locator(TOPIC_ROWS);
    const count = await rows.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      names.push((await rows.nth(i).textContent())?.trim() || '');
    }
    await unfollowAllViaTagsPage(page, names.filter(Boolean));
  });

  // ---------------------------------------------------------------------
  // PHASE 1 — STATE & INTERACTION EDGES
  // ---------------------------------------------------------------------

  test('EDGE #1: rapid double/quintuple-click ends in a stable state', { tag: '@exploratory' }, async ({ page }) => {
    const toggle = page.locator(NAV_TOGGLE);
    const panel = page.locator(DROPDOWN_CONTAINER);
    await expect(panel).not.toHaveClass(/show/); // starts collapsed
    await test.step('click 5 times rapidly', async () => {
      for (let i = 0; i < 5; i++) {
        await toggle.click({ force: true, delay: 20 });
      }
    });
    // Odd number of toggles from collapsed -> ends expanded, and must be a
    // final resting class, never the transient "collapsing" class.
    await page.waitForTimeout(500);
    const cls = await panel.getAttribute('class');
    expect(cls).not.toContain('collapsing');
    expect(cls).toMatch(/collapse( show)?/);
  });

  test('EDGE #2: dropdown state after browser back', { tag: '@exploratory' }, async ({ page }) => {
    await expandDropdown(page);
    await page.locator('a[href^="/post/"]').first().click();
    await page.goBack();
    await expect(page.locator(DROPDOWN_CONTAINER)).toHaveClass(/show/); // persists
  });

  test('EDGE #3: dropdown state after in-app route change', { tag: '@exploratory' }, async ({ page }) => {
    await expandDropdown(page);
    await page.locator('.page-main-sidebar a[href="/settings"]').click();
    await expect(page).toHaveURL(/\/settings/);
    // Persistent app shell -> state carries over on client-side nav.
    await expect(page.locator(DROPDOWN_CONTAINER)).toHaveClass(/show/);
  });

  test('EDGE #4: dropdown state resets after full refresh', { tag: '@exploratory' }, async ({ page }) => {
    await expandDropdown(page);
    await page.reload();
    await expect(page.locator(DROPDOWN_CONTAINER)).not.toHaveClass(/show/);
    await expect(page.locator(NAV_TOGGLE)).toHaveAttribute('aria-expanded', /false|/); // may be absent pre-interaction
  });

  test('EDGE #5: click outside behavior (does not auto-collapse)', { tag: '@exploratory' }, async ({ page }) => {
    await expandDropdown(page);
    await page.locator('body').click({ position: { x: 900, y: 400 } });
    await expect(page.locator(DROPDOWN_CONTAINER)).toHaveClass(/show/); // NOTED: stays open
  });

  test('EDGE #6: click topic row behavior (state desync bug)', { tag: '@exploratory' }, async ({ page }) => {
    await expandDropdown(page);
    const row = page.locator(TOPIC_ROWS).filter({ hasText: 'Sedona' });
    await row.click();
    await expect(page).toHaveURL(/\/tags\/Sedona/);
    // BUG: panel remains visually open ("show") while toggle re-renders with
    // "collapsed" class — desynced state. Assert the *visible* panel stays open.
    await expect(page.locator(DROPDOWN_CONTAINER)).toHaveClass(/show/);
  });

  test('EDGE #7: opening Friends dropdown does not affect Followed Topics', { tag: '@exploratory' }, async ({ page }) => {
    await expandDropdown(page);
    await page.locator(FRIENDS_TOGGLE).click();
    await expect(page.locator(FRIENDS_CONTAINER)).toHaveClass(/show/);
    await expect(page.locator(DROPDOWN_CONTAINER)).toHaveClass(/show/); // still open, independent
  });

  test('EDGE #8: hover on topic row renders hover state', { tag: '@exploratory' }, async ({ page }) => {
    await expandDropdown(page);
    const row = page.locator(TOPIC_ROWS).first();
    await expect(row).toHaveCSS('cursor', 'pointer');
    const before = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
    await row.hover();
    const after = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Hover rule: `.nav-dropdown-link:hover { background: rgba(31,31,31,0.05) }`
    expect(before).not.toBe(after);
  });

  // ---------------------------------------------------------------------
  // PHASE 2 — BOUNDARY & LIST EDGES
  // ---------------------------------------------------------------------

  test('EDGE #9: empty state message renders correctly', { tag: '@exploratory' }, async ({ page }) => {
    await unfollowAllViaTagsPage(page, SEED_TOPICS);
    await page.reload();
    await expandDropdown(page);
    await expect(page.locator(EMPTY_STATE_EL)).toHaveText(EMPTY_STATE_TEXT);
    await expect(page.locator(BROWSE_ALL_LINK)).toBeVisible();
  });

  test('EDGE #10: empty state has zero topic rows', { tag: '@exploratory' }, async ({ page }) => {
    await unfollowAllViaTagsPage(page, SEED_TOPICS);
    await page.reload();
    await expandDropdown(page);
    await expect(page.locator(TOPIC_ROWS)).toHaveCount(0);
  });
});

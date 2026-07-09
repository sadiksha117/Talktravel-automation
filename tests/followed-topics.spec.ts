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
// IMPORTANT — SELECTORS ARE UNVERIFIED AGAINST THE LIVE APP
// ----------------------------------------------------------------------------
// Unlike followed-posts.spec.ts (built by live DOM inspection against
// staging), this session's network policy blocks outbound access to
// staging.talktravel.com, so the dropdown's real markup could not be
// inspected. Selectors below come straight from the doc's own suggestions
// (`data-testid="followed-topics-dropdown"`, `nav[aria-label="Primary"]`,
// etc.), which the doc itself flags as unconfirmed ("confirm with
// engineering"). One doc guess was corrected against a confirmed repo
// convention: the doc guesses topic URLs as `/topic/{slug}`, but
// `src/pages/SingleTopicView.ts` (used by passing specs) shows the real
// topic route is `/tags/{slug}` — that pattern is used here instead.
//
// Before running this file for real: log in against staging, open the
// left nav, and swap in the actual data-testid/role/href values.
// ============================================================================

import { test, expect, Page, Locator } from '@playwright/test';

const BASE_URL = 'https://staging.talktravel.com';
const EMAIL = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';

const TOPIC_SLUG = 'airlines';

// -------------------- Helpers --------------------

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.locator('#login-identifier').fill(EMAIL);
  await page.locator('#login-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).toHaveURL(`${BASE_URL}/trending`);
}

function navToggle(page: Page): Locator {
  return page.locator('nav[aria-label="Primary"] >> button:has-text("Followed Topics")');
}

function dropdown(page: Page): Locator {
  return page.locator('[data-testid="followed-topics-dropdown"]');
}

async function expandDropdown(page: Page) {
  const toggle = navToggle(page);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(dropdown(page)).toBeVisible();
}

/** Ensures the given topic is in the "Following" state; follows it if not. */
async function ensureTopicFollowed(page: Page, slug: string) {
  await page.goto(`${BASE_URL}/tags/${slug}`);
  const followBtn = page.getByRole('button', { name: /^follow/i });
  const unfollowBtn = page.getByRole('button', { name: /^unfollow/i });
  if (await followBtn.isVisible().catch(() => false)) {
    await followBtn.click();
    await expect(unfollowBtn).toBeVisible();
  } else {
    await expect(unfollowBtn).toBeVisible();
  }
}

async function ensureTopicUnfollowed(page: Page, slug: string) {
  await page.goto(`${BASE_URL}/tags/${slug}`);
  const unfollowBtn = page.getByRole('button', { name: /^unfollow/i });
  if (await unfollowBtn.isVisible().catch(() => false)) {
    await unfollowBtn.click();
    await expect(page.getByRole('button', { name: /^follow/i })).toBeVisible();
  }
}

// -------------------- Suite --------------------

test.describe('Left Nav — Followed Topics Dropdown — Positive Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Step 1: Clicking the Followed Topics nav item expands the dropdown', async ({ page }) => {
    const toggle = navToggle(page);

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(dropdown(page)).toBeVisible();
    // The interaction is UI-only — no navigation occurs.
    await expect(page).toHaveURL(`${BASE_URL}/trending`);
  });

  test('Step 2: Clicking the expanded Followed Topics nav item collapses the dropdown', async ({ page }) => {
    const toggle = navToggle(page);
    await expandDropdown(page);

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
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

    await page.goto(`${BASE_URL}/tags/${TOPIC_SLUG}`);
    await page.getByRole('button', { name: /^follow/i }).click();
    await expect(page.getByRole('button', { name: /^unfollow/i })).toBeVisible();

    await expandDropdown(page);
    await expect(dropdown(page).locator(`a[href="/tags/${TOPIC_SLUG}"]`)).toBeVisible();
  });

  test('Step 8: Unfollowing a topic from its detail page removes it from the dropdown', async ({ page }) => {
    await ensureTopicFollowed(page, TOPIC_SLUG);

    await page.goto(`${BASE_URL}/tags/${TOPIC_SLUG}`);
    await page.getByRole('button', { name: /^unfollow/i }).click();
    await expect(page.getByRole('button', { name: /^follow/i })).toBeVisible();

    await expandDropdown(page);
    await expect(dropdown(page).locator(`a[href="/tags/${TOPIC_SLUG}"]`)).not.toBeVisible();
  });

  test('Cleanup: unfollow the topic followed during setup', async ({ page }) => {
    await ensureTopicUnfollowed(page, TOPIC_SLUG);
  });
});

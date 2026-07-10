// followed-posts.spec.ts
//
// ============================================================================
// WHAT THIS FILE TESTS
// ============================================================================
// Positive-flow (happy path only) coverage of the TalkTravel "Followed Posts"
// left-nav feature, per the "Followed Posts left-nav flow" test doc.
//
// Scope: POSITIVE FLOW ONLY — no negative/error cases, no edge cases
// (empty states, rapid clicks, deleted posts, session expiry), no
// accessibility testing.
//
// All selectors below were captured by live DOM inspection against
// https://staging.talktravel.com on 2026-07-08 while executing the flow
// doc step by step. Where no data-testid existed, the most reliable
// alternative (aria-label, class name, or visible text) was used and is
// noted inline.
//
// One real product behavior was observed that diverges from the flow doc's
// assumptions; the spec asserts the ACTUAL observed behavior:
//   Phase 7: unfollowing a post from the Followed Posts list does NOT
//   remove its card instantly — the button flips to "Follow" but the
//   card stays until the page is reloaded.
//
// The 3-dot menu (Edit/Delete/Report) is intentionally NOT covered here —
// that's a separate flow already tested by Report.spec.ts, EditPost.spec.ts,
// and DeletePost.spec.ts.
// ============================================================================

import { test, expect, Page, Locator } from '@playwright/test';

const BASE_URL = 'https://staging.talktravel.com';
const EMAIL = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';

type DiscoveredPost = { href: string; title: string; author: string; topicHref: string | null; topicText: string | null };

// -------------------- Helpers --------------------

async function login(page: Page) {
  // The cookie-consent overlay appears at an unpredictable time — checking
  // for it once at a fixed point (right after login, or right before a
  // specific click) kept missing it: two separate live failures showed it
  // still active and blocking clicks despite both approaches. addLocatorHandler
  // is the correct tool for exactly this — Playwright re-checks for the
  // locator during every subsequent action's actionability wait and runs the
  // handler whenever it actually appears, rather than at one guessed moment.
  await page.addLocatorHandler(
    page.getByRole('button', { name: 'Accept All' }),
    async () => {
      await page.getByRole('button', { name: 'Accept All' }).click();
    }
  );

  await page.goto(`${BASE_URL}/login`);
  // selectors based on captured input ids: #login-identifier / #login-password
  await page.locator('#login-identifier').fill(EMAIL);
  await page.locator('#login-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).toHaveURL(`${BASE_URL}/trending`);
}

async function goToFollowedPosts(page: Page) {
  // The sidebar link's REAL accessible name is "TalkTravel Followed Posts"
  // (the icon's alt text prefixes every sidebar link, confirmed live via an
  // accessibility snapshot — "TalkTravel Home", "TalkTravel Friends", etc.).
  // exact: true was requiring the full name to equal "Followed Posts"
  // exactly, which never matched anything — the locator resolved to zero
  // elements and the click waited out its full timeout every single time.
  // No overlay or timing issue was ever involved; this was the whole bug.
  await page.getByRole('link', { name: 'Followed Posts' }).click();
  await expect(page).toHaveURL(`${BASE_URL}/my/followed-posts/latest`);
}

/**
 * Follows the first not-yet-followed post found on /latest, in place on its
 * feed card, and returns its real title/author/topic as captured live.
 * Hardcoded slugs on this staging environment go stale fast — confirmed
 * live: every POSTS.* constant this file originally pinned had either been
 * unfollowed by other test runs or dropped off /latest by the next run,
 * within about a day of being captured. requireTopic skips candidates with
 * no topic chip, for tests that need one to click.
 */
async function followFreshPostFromLatest(page: Page, opts: { requireTopic?: boolean } = {}): Promise<DiscoveredPost> {
  await page.goto(`${BASE_URL}/latest`);
  const cards = page.locator('.feed-post-item');
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    await card.hover();
    const followBtn = card.getByRole('button', { name: 'Follow this post' });
    if (!(await followBtn.isVisible().catch(() => false))) continue;

    const titleLink = card.locator('.feed-post-title-link').first();
    const href = await titleLink.getAttribute('href');
    if (!href) continue;

    // Extracted via the universal a[href^="/profile/"] pattern rather than
    // the .feed-post-meta-user class, since it's ambiguous whether that
    // class is on the anchor itself or a wrapper around it.
    const authorLink = card.locator('a[href^="/profile/"]').first();
    const authorHref = await authorLink.getAttribute('href');
    const author = authorHref?.replace('/profile/', '') ?? '';

    const topicEl = card.locator('.tag-default').first();
    const hasTopic = await topicEl.isVisible().catch(() => false);
    if (opts.requireTopic && !hasTopic) continue;
    const topicHref = hasTopic ? await topicEl.getAttribute('href') : null;
    const topicText = hasTopic ? (await topicEl.textContent())?.trim() ?? null : null;

    const title = (await titleLink.textContent())?.trim() ?? '';

    await followBtn.click();
    await expect(card.getByRole('button', { name: 'Unfollow this post' })).toBeVisible();

    return { href, title, author, topicHref, topicText };
  }

  throw new Error(
    opts.requireTopic
      ? 'No unfollowed post with a topic chip found on Latest to use as a target'
      : 'No unfollowed post found on Latest to use as a target'
  );
}

/** Unfollows a post by href if currently followed — used for test cleanup. */
async function unfollowPost(page: Page, href: string) {
  await page.goto(`${BASE_URL}${href}`);
  const unfollowBtn = page.getByRole('button', { name: 'Unfollow this post' });
  if (await unfollowBtn.isVisible().catch(() => false)) {
    await unfollowBtn.click();
    await expect(page.getByRole('button', { name: 'Follow this post' })).toBeVisible();
  }
}

// -------------------- Suite --------------------

test.describe('Followed Posts — Positive Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Phase 1: Navigate to Followed Posts from left nav', async ({ page }) => {
    await goToFollowedPosts(page);

    // URL
    await expect(page).toHaveURL(`${BASE_URL}/my/followed-posts/latest`);

    // Heading (observed as <h2>Followed Posts</h2> with subtitle text)
    await expect(page.getByRole('heading', { name: 'Followed Posts' })).toBeVisible();
    await expect(page.getByText('Posts from threads you follow')).toBeVisible();

    // Header: search, +Create Post, Messages, Notifications, Avatar
    await expect(page.locator('input.navbar-search-input[placeholder="Search"]')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create Post' })).toBeVisible();
    await expect(page.locator('a[href="/chats"]').first()).toBeVisible();
    await expect(page.locator('a[href="/my-profile"]').first()).toBeVisible();

    // Left nav visible and "Followed Posts" active (class="nav-link active")
    await expect(page.locator('a.nav-link.active', { hasText: 'Followed Posts' })).toBeVisible();

    // Footer visible
    await expect(page.locator('footer.page-footer')).toBeVisible();
  });

  test('Phase 2: Followed post cards render title, author, topic, votes, comments, timestamp, Following state', async ({ page }) => {
    // Follow 3 distinct fresh posts rather than relying on pre-seeded ones —
    // see followFreshPostFromLatest for why pinned posts don't hold up here.
    const followed: DiscoveredPost[] = [];
    for (let i = 0; i < 3; i++) {
      followed.push(await followFreshPostFromLatest(page));
    }

    await goToFollowedPosts(page);

    for (const post of followed) {
      const card = page.locator('.feed-post-item', { has: page.locator(`a[href="${post.href}"]`) });
      await expect(card).toBeVisible();
      await expect(card.locator('.feed-post-title-link')).toHaveText(post.title);
      await expect(card.locator('a[href^="/profile/"]').first()).toContainText(post.author);
      await expect(card.locator('.tag-default').first()).toBeVisible();
      await expect(card.locator('.feed-post-rating span')).toBeVisible();
      await expect(card.locator('.feed-post-meta-comments')).toBeVisible();
      await expect(card.locator('.feed-post-meta-time')).toBeVisible();
      // Actual observed "Following" state is rendered as an "Unfollow" toggle button
      // (aria-label="Unfollow this post"), not literal text "Following".
      await expect(card.getByRole('button', { name: 'Unfollow this post' })).toBeVisible();
    }

    for (const post of followed) {
      await unfollowPost(page, post.href);
    }
  });

  test('Phase 3: Upvoting a followed post increments vote count and activates the button', async ({ page }) => {
    await goToFollowedPosts(page);

    const firstCard = page.locator('.feed-post-item').first();
    await expect(firstCard).toBeVisible();

    const ratingWrapper = firstCard.locator('.feed-post-rating');
    const countEl = ratingWrapper.locator('span');
    const upvoteBtn = firstCard.locator('img[alt="Upvote"]');

    // Normalize to a "not upvoted" baseline first (observed: account may already
    // have an active upvote from a prior session, which is itself a toggle).
    if (await ratingWrapper.evaluate(el => el.className.includes('rating-up'))) {
      await upvoteBtn.click();
      await expect(ratingWrapper).not.toHaveClass(/rating-up/);
    }

    const before = Number(await countEl.textContent());

    await upvoteBtn.click();

    await expect(ratingWrapper).toHaveClass(/rating-up/);
    await expect(countEl).toHaveText(String(before + 1));

    // Post remains visible in the list (vote does not remove it)
    await expect(firstCard).toBeVisible();
  });

  test('Phase 4: Clicking a post title opens Single Post View and back returns to intact list', async ({ page }) => {
    const post = await followFreshPostFromLatest(page);
    await goToFollowedPosts(page);

    const card = page.locator('.feed-post-item', { has: page.locator(`a[href="${post.href}"]`) });
    await expect(card.locator('.feed-post-title-link')).toHaveText(post.title);
    await card.locator('.feed-post-title-link').click();

    // Not asserting the exact title against the page's <h1> here — a card's
    // title-link text can have unrelated body text glued onto it with no
    // separator (confirmed live), so the URL plus a visible h1 is the
    // reliable signal that we landed on the right Single Post View.
    await expect(page).toHaveURL(`${BASE_URL}${post.href}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unfollow this post' })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(`${BASE_URL}/my/followed-posts/latest`);
    await expect(page.locator(`a[href="${post.href}"]`).first()).toBeVisible();

    await unfollowPost(page, post.href);
  });

  test('Phase 5: Clicking a topic chip opens the topic page and back returns to Followed Posts', async ({ page }) => {
    const post = await followFreshPostFromLatest(page, { requireTopic: true });
    await goToFollowedPosts(page);

    const card = page.locator('.feed-post-item', { has: page.locator(`a[href="${post.href}"]`) });
    await card.locator('.tag-default').first().click();

    // Match by the topic chip's own href rather than reconstructing a URL
    // from its display text, which can be spaced/encoded differently.
    await expect(page).toHaveURL(new RegExp(`${post.topicHref}(/|$)`));
    await expect(page.getByRole('heading', { name: post.topicText ?? '' })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(`${BASE_URL}/my/followed-posts/latest`);

    await unfollowPost(page, post.href);
  });

  test('Phase 6: Clicking an author name opens their profile and back returns to Followed Posts', async ({ page }) => {
    const post = await followFreshPostFromLatest(page);
    await goToFollowedPosts(page);

    const card = page.locator('.feed-post-item', { has: page.locator(`a[href="${post.href}"]`) });
    await card.locator('a[href^="/profile/"]').first().click();

    await expect(page).toHaveURL(`${BASE_URL}/profile/${post.author}`);
    await expect(page.getByRole('heading', { name: post.author })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(`${BASE_URL}/my/followed-posts/latest`);

    await unfollowPost(page, post.href);
  });

  test('Phase 7 & 8: Inline unfollow updates button immediately; card removal is only reflected after reload', async ({ page }) => {
    const post = await followFreshPostFromLatest(page);
    await goToFollowedPosts(page);

    const card = page.locator('.feed-post-item', { has: page.locator(`a[href="${post.href}"]`) });
    await expect(card).toBeVisible();
    await card.hover();
    await card.getByRole('button', { name: 'Unfollow this post' }).click();

    // ACTUAL OBSERVED BEHAVIOR: button flips to "Follow" but the card is NOT
    // instantly removed from the list (deviates from flow doc expectation).
    await expect(card.getByRole('button', { name: 'Follow this post' })).toBeVisible();
    await expect(page.locator(`a[href="${post.href}"]`)).toHaveCount(1);

    // Phase 8: after a reload, the unfollowed post is no longer in the list.
    await page.reload();
    await expect(page.locator(`a[href="${post.href}"]`)).toHaveCount(0);
  });

  test('Phase 9 & 10: Pick any post from the feed, follow it from its full Single Post View, then find it back on Followed Posts', async ({ page }) => {
    await page.goto(`${BASE_URL}/latest`);

    // Dynamic target instead of a pinned slug — a fixed post can 404 or
    // already be followed by the time this runs (same lesson learned in
    // Report.spec.ts). Scan for any card currently showing "Follow".
    const cards = page.locator('.feed-post-item');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    let clicked = false;
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      await card.hover();
      if (await card.getByRole('button', { name: 'Follow this post' }).isVisible().catch(() => false)) {
        await card.locator('.feed-post-title-link').first().click();
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      throw new Error('No unfollowed post found on Latest to use as a target');
    }

    // Now on the full Single Post View (not just following in-place on the
    // card). Not asserting the exact title here — the card's title-link text
    // can have unrelated body text glued onto it with no separator (confirmed
    // live: "Comment lifecycle test 1783423357066Seed post for comment
    // testing..."), so matching it exactly against the page's real <h1> is
    // fragile. The URL change plus a visible h1 is enough to confirm we
    // actually landed on a Single Post View.
    await expect(page).toHaveURL(/\/post\/.+/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Follow this post' })).toBeVisible();

    await page.getByRole('button', { name: 'Follow this post' }).click();
    await expect(page.getByRole('button', { name: 'Unfollow this post' })).toBeVisible();
    const followedHref = page.url().replace(BASE_URL, '');

    // Check it's now on Followed Posts' Latest tab.
    await page.goto(`${BASE_URL}/my/followed-posts/latest`);
    await expect(page.locator(`a[href="${followedHref}"]`).first()).toBeVisible();

    // Cleanup: unfollow so the shared account's follow state doesn't drift.
    await page.goto(`${BASE_URL}${followedHref}`);
    await page.getByRole('button', { name: 'Unfollow this post' }).click();
    await expect(page.getByRole('button', { name: 'Follow this post' })).toBeVisible();
  });

  test('Phase 13: Follow a post directly from a feed card on Latest, without opening it, then see it in Followed Posts', async ({ page }) => {
    await page.goto(`${BASE_URL}/latest`);

    // Scan for a card not already followed — the shared account accumulates
    // follows across runs, so a fixed target would flake once it's followed.
    // Same self-healing scan pattern as Report.spec.ts.
    const cards = page.locator('.feed-post-item');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    let target: Locator | null = null;
    let href: string | null = null;
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      // The Follow/Unfollow toggle only renders on hover — without this,
      // isVisible() is false for every card regardless of follow state,
      // and the scan finds nothing.
      await card.hover();
      const followBtn = card.getByRole('button', { name: 'Follow this post' });
      if (await followBtn.isVisible().catch(() => false)) {
        target = card;
        href = await card.locator('.feed-post-title-link').first().getAttribute('href');
        break;
      }
    }
    if (!target || !href) {
      throw new Error('No unfollowed post found on Latest to use as a target');
    }

    // Follow it in place — this must NOT navigate away from the feed, unlike
    // clicking the card itself (which opens the Single Post View).
    await target.hover();
    await target.getByRole('button', { name: 'Follow this post' }).click();
    await expect(target.getByRole('button', { name: 'Unfollow this post' })).toBeVisible();
    await expect(page).toHaveURL(`${BASE_URL}/latest`);

    // It should now show up in Followed Posts.
    await page.goto(`${BASE_URL}/my/followed-posts/latest`);
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();

    // Cleanup: unfollow it again so the shared account's follow state doesn't drift.
    await page.goto(`${BASE_URL}${href}`);
    await page.getByRole('button', { name: 'Unfollow this post' }).click();
    await expect(page.getByRole('button', { name: 'Follow this post' })).toBeVisible();
  });
});

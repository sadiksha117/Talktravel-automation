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
// Two real product behaviors were observed that diverge from the flow
// doc's assumptions; the spec asserts the ACTUAL observed behavior:
//   1) Phase 7: unfollowing a post from the Followed Posts list does NOT
//      remove its card instantly — the button flips to "Follow" but the
//      card stays until the page is reloaded.
//   2) Phase 12: the 3-dot menu on a post NOT authored by the logged-in
//      user shows "Report Post" AND "Edit Post"/"Remove Post", because
//      this test account holds Moderator/Admin privileges.
// ============================================================================

import { test, expect, Page, Locator } from '@playwright/test';

const BASE_URL = 'https://staging.talktravel.com';
const EMAIL = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';

// Known seeded posts on staging used throughout the flow (captured during execution)
const POSTS = {
  ownFirst: { slug: '/post/hiii-hskh', title: 'hiii hskh', author: 'prempoudel_1' },
  secondPost: { slug: '/post/pokhara-2', title: 'Pokhara', author: 'Test12789', topic: 'Hotelscom' },
  thirdPost: { slug: '/post/new-post-29', title: 'New post', author: 'silver-express' },
  setupA: { slug: '/post/hi-6', title: 'hi', author: 'silver-express' },
  setupB: { slug: '/post/hello-tt', title: 'hello TT', author: 'Rumi' },
  setupC: { slug: '/post/ok', title: 'Ok', author: 'Jajanumsoda' },
};

// -------------------- Helpers --------------------

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  // selectors based on captured input ids: #login-identifier / #login-password
  await page.locator('#login-identifier').fill(EMAIL);
  await page.locator('#login-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).toHaveURL(`${BASE_URL}/trending`);
}

/**
 * The cookie-consent overlay renders with a short async delay after the page
 * paints — confirmed live via a failure snapshot: it was NOT present right
 * after login(), yet showed up (and was the active/focused element,
 * swallowing clicks on anything underneath) by the time goToFollowedPosts()
 * tried to click the nav link a moment later. Dismissing it once far
 * upstream in login() is therefore too early; call this immediately before
 * whatever action it might block instead.
 */
async function dismissCookieBanner(page: Page) {
  const acceptCookiesBtn = page.getByRole('button', { name: 'Accept All' });
  if (await acceptCookiesBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await acceptCookiesBtn.click();
  }
}

async function goToFollowedPosts(page: Page) {
  await dismissCookieBanner(page);
  // The sidebar link's accessible name is "Followed Posts" (distinct from the
  // in-page "Latest" sub-tab which shares the same href).
  await page.getByRole('link', { name: 'Followed Posts', exact: true }).click();
  await expect(page).toHaveURL(`${BASE_URL}/my/followed-posts/latest`);
}

/** Ensures a given post (by slug) is in the "Following" state; follows it if not. */
async function ensureFollowed(page: Page, slug: string) {
  await page.goto(`${BASE_URL}${slug}`);
  const followBtn = page.getByRole('button', { name: 'Follow this post' });
  const unfollowBtn = page.getByRole('button', { name: 'Unfollow this post' });
  if (await followBtn.isVisible().catch(() => false)) {
    await followBtn.click();
    await expect(unfollowBtn).toBeVisible();
  } else {
    await expect(unfollowBtn).toBeVisible();
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
    // Ensure the 3 setup posts (followed in Phase 0) are present for this check
    await ensureFollowed(page, POSTS.setupA.slug);
    await ensureFollowed(page, POSTS.setupB.slug);
    await ensureFollowed(page, POSTS.setupC.slug);

    await goToFollowedPosts(page);

    for (const post of [POSTS.setupA, POSTS.setupB, POSTS.setupC]) {
      const card = page.locator('.feed-post-item', { has: page.locator(`a[href="${post.slug}"]`) });
      await expect(card).toBeVisible();
      await expect(card.locator('.feed-post-title-link')).toHaveText(post.title);
      await expect(card.locator('.feed-post-meta-user')).toContainText(post.author);
      await expect(card.locator('.tag-default').first()).toBeVisible();
      await expect(card.locator('.feed-post-rating span')).toBeVisible();
      await expect(card.locator('.feed-post-meta-comments')).toBeVisible();
      await expect(card.locator('.feed-post-meta-time')).toBeVisible();
      // Actual observed "Following" state is rendered as an "Unfollow" toggle button
      // (aria-label="Unfollow this post"), not literal text "Following".
      await expect(card.getByRole('button', { name: 'Unfollow this post' })).toBeVisible();
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
    await goToFollowedPosts(page);

    const secondCard = page.locator('.feed-post-item').nth(1);
    await expect(secondCard.locator('.feed-post-title-link')).toHaveText(POSTS.secondPost.title);
    await secondCard.locator('.feed-post-title-link').click();

    await expect(page).toHaveURL(`${BASE_URL}${POSTS.secondPost.slug}`);
    await expect(page.getByRole('heading', { name: POSTS.secondPost.title, level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unfollow this post' })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(`${BASE_URL}/my/followed-posts/latest`);
    await expect(page.locator('.feed-post-item').nth(1).locator('.feed-post-title-link')).toHaveText(POSTS.secondPost.title);
  });

  test('Phase 5: Clicking a topic chip opens the topic page and back returns to Followed Posts', async ({ page }) => {
    await goToFollowedPosts(page);

    const secondCard = page.locator('.feed-post-item').nth(1);
    await secondCard.locator('.tag-default', { hasText: POSTS.secondPost.topic }).click();

    await expect(page).toHaveURL(new RegExp(`/tags/${POSTS.secondPost.topic}`));
    await expect(page.getByRole('heading', { name: POSTS.secondPost.topic })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(`${BASE_URL}/my/followed-posts/latest`);
  });

  test('Phase 6: Clicking an author name opens their profile and back returns to Followed Posts', async ({ page }) => {
    await goToFollowedPosts(page);

    const secondCard = page.locator('.feed-post-item').nth(1);
    await secondCard.locator('.feed-post-meta-user', { hasText: POSTS.secondPost.author }).click();

    await expect(page).toHaveURL(`${BASE_URL}/profile/${POSTS.secondPost.author}`);
    await expect(page.getByRole('heading', { name: POSTS.secondPost.author })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(`${BASE_URL}/my/followed-posts/latest`);
  });

  test('Phase 7 & 8: Inline unfollow updates button immediately; card removal is only reflected after reload', async ({ page }) => {
    await ensureFollowed(page, POSTS.thirdPost.slug);
    await goToFollowedPosts(page);

    const thirdCard = page.locator('.feed-post-item', { has: page.locator(`a[href="${POSTS.thirdPost.slug}"]`) });
    await expect(thirdCard).toBeVisible();
    await thirdCard.hover();
    await thirdCard.getByRole('button', { name: 'Unfollow this post' }).click();

    // ACTUAL OBSERVED BEHAVIOR: button flips to "Follow" but the card is NOT
    // instantly removed from the list (deviates from flow doc expectation).
    await expect(thirdCard.getByRole('button', { name: 'Follow this post' })).toBeVisible();
    await expect(page.locator(`a[href="${POSTS.thirdPost.slug}"]`)).toHaveCount(1);

    // Phase 8: after a reload, the unfollowed post is no longer in the list.
    await page.reload();
    await expect(page.locator(`a[href="${POSTS.thirdPost.slug}"]`)).toHaveCount(0);
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

  test('Phase 11: 3-dot menu on own post shows Edit/Delete and never Report', async ({ page }) => {
    await goToFollowedPosts(page);

    const ownCard = page.locator('.feed-post-item', { has: page.locator(`a[href="${POSTS.ownFirst.slug}"]`) });
    await ownCard.hover();
    await ownCard.getByRole('button', { name: 'Post options' }).click();

    await expect(page.getByText('Edit Post', { exact: true })).toBeVisible();
    await expect(page.getByText('Delete Post', { exact: true })).toBeVisible();
    await expect(page.getByText('Report Post', { exact: true })).not.toBeVisible();

    // Close menu without action
    await page.keyboard.press('Escape');
    await expect(page.getByText('Edit Post', { exact: true })).not.toBeVisible();
  });

  test('Phase 12: 3-dot menu on others post shows Report (and, for this moderator account, also Edit/Remove)', async ({ page }) => {
    await goToFollowedPosts(page);

    const othersCard = page.locator('.feed-post-item', { has: page.locator(`a[href="${POSTS.secondPost.slug}"]`) });
    await othersCard.hover();
    await othersCard.getByRole('button', { name: 'Post options' }).click();

    await expect(page.getByText('Report Post', { exact: true })).toBeVisible();

    // ACTUAL OBSERVED BEHAVIOR: this test account has Moderator/Admin
    // privileges (confirmed via the account menu's "Admin Dashboard" /
    // "Moderator Dashboard" entries), so "Edit Post" and "Remove Post" are
    // ALSO shown here — unlike a regular, non-moderator user would see.
    await expect(page.getByText('Edit Post', { exact: true })).toBeVisible();
    await expect(page.getByText('Remove Post', { exact: true })).toBeVisible();

    // Close menu without action
    await page.keyboard.press('Escape');
    await expect(page.getByText('Report Post', { exact: true })).not.toBeVisible();
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
      // The Follow/Unfollow toggle and "Post options" only render on hover
      // (same as Phase 11/12) — without this, isVisible() is false for
      // every card regardless of follow state, and the scan finds nothing.
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

  test('Cleanup: unfollow posts followed during setup', async ({ page }) => {
    for (const post of [POSTS.setupA, POSTS.setupB, POSTS.setupC]) {
      await page.goto(`${BASE_URL}${post.slug}`);
      const unfollowBtn = page.getByRole('button', { name: 'Unfollow this post' });
      if (await unfollowBtn.isVisible().catch(() => false)) {
        await unfollowBtn.click();
        await expect(page.getByRole('button', { name: 'Follow this post' })).toBeVisible();
      }
    }

    await page.goto(`${BASE_URL}/my/followed-posts/latest`);
    for (const post of [POSTS.setupA, POSTS.setupB, POSTS.setupC]) {
      await expect(page.locator(`a[href="${post.slug}"]`)).toHaveCount(0);
    }
  });
});

// liked-posts.spec.ts
//
// ============================================================================
// WHAT THIS FILE TESTS
// ============================================================================
// Positive-flow (happy path only) coverage of the TalkTravel "Liked Posts"
// left-nav feature, per docs/LeftNav_LikedPost.md.
//
// Scope: POSITIVE FLOW ONLY — no negative/error cases, no edge cases (empty
// state, rapid clicks, deleted posts, session expiry, pagination), no
// accessibility testing, no 3-dot menu (Edit/Delete/Report already covered
// by Report.spec.ts, EditPost.spec.ts, DeletePost.spec.ts).
//
// ============================================================================
// IMPORTANT — UNVERIFIED AGAINST THE LIVE SITE
// ============================================================================
// Unlike tests/followed-posts.spec.ts (whose selectors were captured by live
// DOM inspection against https://staging.talktravel.com), this file could
// NOT be verified live: this session's network egress policy blocks
// staging.talktravel.com (and talktravel.com) outright — CONNECT attempts
// return 403 from the org's proxy, confirmed via /__agentproxy/status.
//
// Everything below is a best-effort port from:
//   1. docs/LeftNav_LikedPost.md (the flow doc — itself marks the URL and
//      several behaviors as unconfirmed).
//   2. tests/followed-posts.spec.ts's REAL, live-captured selectors — the
//      flow doc explicitly states Liked Posts "is otherwise structured like
//      the Homepage feed — same cards, same interactions" as Followed Posts,
//      so `.feed-post-item`, `.feed-post-rating`, `.feed-post-title-link`,
//      etc. are reused here on that basis, not independently confirmed.
//
// Known unconfirmed items (flagged inline where they matter):
//   - LIKED_POSTS_URL: guessed as /my/liked-posts/latest by analogy to the
//     real Followed Posts URL (/my/followed-posts/latest). The flow doc
//     lists /liked-posts, /my/liked, /likes, /upvoted as other candidates.
//   - The left-nav link's accessible name ("Liked Posts") is assumed, not
//     observed.
//   - Whether Unlike removes the card INSTANTLY or only after reload is
//     unconfirmed — followed-posts.spec.ts found Followed Posts deviates
//     from its own flow doc here (unfollow needs a reload to disappear).
//     This file asserts the flow doc's stated behavior (instant removal);
//     if a live run shows otherwise, mirror the followed-posts.spec.ts
//     Phase 7/8 pattern (assert card stays, reload, then assert it's gone).
//
// TODO before trusting this suite: run it once against staging with network
// access restored, and correct BASE_URL/LIKED_POSTS_URL/selectors/nav link
// name from the actual DOM, the same way followed-posts.spec.ts was built.
// ============================================================================

import { test, expect, Page, Locator } from '@playwright/test';

const BASE_URL = 'https://staging.talktravel.com';
const LIKED_POSTS_URL = `${BASE_URL}/my/liked-posts/latest`; // UNCONFIRMED — see header
const EMAIL = process.env.TEST_EMAIL ?? 'prempoudel72707@gmail.com';
const PASSWORD = process.env.TEST_PASSWORD ?? 'Admin@123';

type DiscoveredPost = { href: string; title: string; author: string; topicHref: string | null; topicText: string | null };

// -------------------- Helpers --------------------

async function login(page: Page) {
  await page.addLocatorHandler(
    page.getByRole('button', { name: 'Accept All' }),
    async () => {
      await page.getByRole('button', { name: 'Accept All' }).click();
    }
  );

  await page.goto(`${BASE_URL}/login`);
  await page.locator('#login-identifier').fill(EMAIL);
  await page.locator('#login-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).toHaveURL(`${BASE_URL}/trending`);
}

async function goToLikedPosts(page: Page) {
  // Nav link accessible name assumed as "Liked Posts" — confirm live.
  await page.getByRole('link', { name: 'Liked Posts' }).click();
  await expect(page).toHaveURL(LIKED_POSTS_URL);
}

/**
 * Finds (without liking) the first not-yet-upvoted post on /latest and
 * returns its title/author/topic plus an href-anchored Locator to act on.
 * Mirrors findUnfollowedPostOnLatest in followed-posts.spec.ts — re-locates
 * by href rather than index for the same reason: /latest sorts by recency,
 * so a new post landing mid-scan can shift indices.
 */
async function findUnlikedPostOnLatest(
  page: Page,
  opts: { requireTopic?: boolean } = {}
): Promise<DiscoveredPost & { card: Locator }> {
  await page.goto(`${BASE_URL}/latest`);

  for (let attempt = 0; attempt < 2; attempt++) {
    const cards = page.locator('.feed-post-item');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const ratingWrapper = card.locator('.feed-post-rating');
      const alreadyUpvoted = await ratingWrapper.evaluate(el => el.className.includes('rating-up'));
      if (alreadyUpvoted) continue;

      const titleLink = card.locator('.feed-post-title-link').first();
      const href = await titleLink.getAttribute('href');
      if (!href) continue;

      const authorLink = card.locator('a[href^="/profile/"]').first();
      const authorHref = await authorLink.getAttribute('href');
      const author = authorHref?.replace('/profile/', '') ?? '';

      const topicEl = card.locator('.tag-default').first();
      const hasTopic = await topicEl.isVisible().catch(() => false);
      if (opts.requireTopic && !hasTopic) continue;
      const topicHref = hasTopic ? await topicEl.getAttribute('href') : null;
      const topicText = hasTopic ? (await topicEl.textContent())?.trim() ?? null : null;

      const title = (await titleLink.textContent())?.trim() ?? '';

      const stableCard = page.locator('.feed-post-item', { has: page.locator(`a[href="${href}"]`) });
      return { card: stableCard, href, title, author, topicHref, topicText };
    }

    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(1000);
  }

  throw new Error(
    opts.requireTopic
      ? 'No unliked post with a topic chip found on Latest to use as a target'
      : 'No unliked post found on Latest to use as a target'
  );
}

/** Upvotes (likes) a fresh post in place on its /latest feed card and returns it. */
async function likeFreshPostFromLatest(page: Page, opts: { requireTopic?: boolean } = {}): Promise<DiscoveredPost> {
  const { card, ...post } = await findUnlikedPostOnLatest(page, opts);
  const ratingWrapper = card.locator('.feed-post-rating');
  await card.locator('img[alt="Upvote"]').click();
  await expect(ratingWrapper).toHaveClass(/rating-up/);
  return post;
}

/** Unlikes a post by href if currently upvoted — used for test cleanup. */
async function unlikePost(page: Page, href: string) {
  await page.goto(`${BASE_URL}${href}`);
  const ratingWrapper = page.locator('.feed-post-rating').first();
  const isLiked = await ratingWrapper.evaluate(el => el.className.includes('rating-up'));
  if (isLiked) {
    await page.locator('img[alt="Upvote"]').first().click();
    await expect(ratingWrapper).not.toHaveClass(/rating-up/);
  }
}

// -------------------- Suite --------------------

test.describe('Liked Posts — Positive Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Step 1: Navigate to Liked Posts from left nav', async ({ page }) => {
    await goToLikedPosts(page);

    await expect(page).toHaveURL(LIKED_POSTS_URL);
    await expect(page.getByRole('heading', { name: 'Liked Posts' })).toBeVisible();

    // Header: search, +Create Post, Messages, Profile avatar
    await expect(page.locator('input.navbar-search-input[placeholder="Search"]')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create Post' })).toBeVisible();
    await expect(page.locator('a[href="/chats"]').first()).toBeVisible();
    await expect(page.locator('a[href="/my-profile"]').first()).toBeVisible();

    // Left nav "Liked Posts" active
    await expect(page.locator('a.nav-link.active', { hasText: 'Liked Posts' })).toBeVisible();

    await expect(page.locator('footer.page-footer')).toBeVisible();
  });

  test('Step 2: Liked post cards render title, author, topic, votes, comments, timestamp, active Upvote state', async ({ page }) => {
    const liked: DiscoveredPost[] = [];
    for (let i = 0; i < 3; i++) {
      liked.push(await likeFreshPostFromLatest(page));
    }

    await goToLikedPosts(page);

    for (const post of liked) {
      const card = page.locator('.feed-post-item', { has: page.locator(`a[href="${post.href}"]`) });
      await expect(card).toBeVisible();
      await expect(card.locator('.feed-post-title-link')).toHaveText(post.title);
      await expect(card.locator('a[href^="/profile/"]').first()).toContainText(post.author);
      await expect(card.locator('.tag-default').first()).toBeVisible();
      await expect(card.locator('.feed-post-rating span')).toBeVisible();
      await expect(card.locator('.feed-post-meta-comments')).toBeVisible();
      await expect(card.locator('.feed-post-meta-time')).toBeVisible();
      await expect(card.locator('.feed-post-rating')).toHaveClass(/rating-up/);
    }

    for (const post of liked) {
      await unlikePost(page, post.href);
    }
  });

  test('Step 9: Clicking a post title opens Single Post View and back returns to intact list', async ({ page }) => {
    const post = await likeFreshPostFromLatest(page);
    await goToLikedPosts(page);

    const card = page.locator('.feed-post-item', { has: page.locator(`a[href="${post.href}"]`) });
    await expect(card.locator('.feed-post-title-link')).toHaveText(post.title);
    await card.locator('.feed-post-title-link').click();

    await expect(page).toHaveURL(`${BASE_URL}${post.href}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.feed-post-rating')).toHaveClass(/rating-up/);

    await page.goBack();
    await expect(page).toHaveURL(LIKED_POSTS_URL);
    await expect(page.locator(`a[href="${post.href}"]`).first()).toBeVisible();

    await unlikePost(page, post.href);
  });

  test('Step 12: Clicking a topic chip opens the topic page and back returns to Liked Posts', async ({ page }) => {
    const post = await likeFreshPostFromLatest(page, { requireTopic: true });
    await goToLikedPosts(page);

    const card = page.locator('.feed-post-item', { has: page.locator(`a[href="${post.href}"]`) });
    await card.locator('.tag-default').first().click();

    await expect(page).toHaveURL(new RegExp(`${post.topicHref}(/|$)`));
    await expect(page.getByRole('heading', { name: post.topicText ?? '' })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(LIKED_POSTS_URL);

    await unlikePost(page, post.href);
  });

  test('Step 13: Clicking an author name opens their profile and back returns to Liked Posts', async ({ page }) => {
    const post = await likeFreshPostFromLatest(page);
    await goToLikedPosts(page);

    const card = page.locator('.feed-post-item', { has: page.locator(`a[href="${post.href}"]`) });
    await card.locator('a[href^="/profile/"]').first().click();

    await expect(page).toHaveURL(`${BASE_URL}/profile/${post.author}`);
    await expect(page.getByRole('heading', { name: post.author })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(LIKED_POSTS_URL);

    await unlikePost(page, post.href);
  });

  test('Step 8: Follow does NOT remove a post from Liked Posts (like and follow are independent)', async ({ page }) => {
    const post = await likeFreshPostFromLatest(page);
    await goToLikedPosts(page);

    const card = page.locator('.feed-post-item', { has: page.locator(`a[href="${post.href}"]`) });
    await expect(card).toBeVisible();
    await card.hover();
    await card.getByRole('button', { name: 'Follow this post' }).click();
    await expect(card.getByRole('button', { name: 'Unfollow this post' })).toBeVisible();

    // Still liked and still in the list — following is independent of liking.
    await expect(card).toBeVisible();
    await expect(card.locator('.feed-post-rating')).toHaveClass(/rating-up/);

    // Cleanup: unfollow and unlike.
    await card.getByRole('button', { name: 'Unfollow this post' }).click();
    await unlikePost(page, post.href);
  });

  test('Step 3 & 4: Unlike (toggle Upvote off) removes the post from the list and it persists after refresh', async ({ page }) => {
    const post = await likeFreshPostFromLatest(page);
    await goToLikedPosts(page);

    const card = page.locator('.feed-post-item', { has: page.locator(`a[href="${post.href}"]`) });
    await expect(card).toBeVisible();
    await card.locator('img[alt="Upvote"]').click();

    // Flow doc states removal is instant. If a live run shows the card
    // persisting until reload (as observed for Followed Posts' unfollow),
    // relax this assertion to check the count decrement only, then reload
    // before asserting absence — see the header note above.
    await expect(page.locator(`a[href="${post.href}"]`)).toHaveCount(0);

    await page.reload();
    await expect(page.locator(`a[href="${post.href}"]`)).toHaveCount(0);
  });

  test('Step 6: Re-liking a post from its Single Post View makes it reappear in Liked Posts', async ({ page }) => {
    const found = await findUnlikedPostOnLatest(page);
    await page.goto(`${BASE_URL}${found.href}`);

    await expect(page).toHaveURL(/\/post\/.+/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.feed-post-rating')).not.toHaveClass(/rating-up/);

    await page.locator('img[alt="Upvote"]').first().click();
    await expect(page.locator('.feed-post-rating')).toHaveClass(/rating-up/);

    await page.goto(LIKED_POSTS_URL);
    await expect(page.locator(`a[href="${found.href}"]`).first()).toBeVisible();

    await unlikePost(page, found.href);
  });
});

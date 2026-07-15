# TalkTravel — Flow: Left Nav — Liked Posts (Post-Login)

> **Purpose:** Reference for Playwright automation of the Liked Posts surface — the left-navigation destination that lists all posts the user has liked (upvoted). Covers navigating to the page, verifying list rendering, interacting with each post (vote toggle, follow, 3-dot menu, click-through), the inline Unlike action that removes a post from the list, the empty state, and post-Unlike propagation across the app.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged in

> **Prerequisite:** Tests require an authenticated session via `storageState`. Some tests require the user to already have liked (upvoted) at least one post (seed via API in `beforeEach` for reliability).

> **Terminology note:** "Like" and "Upvote" are the same action in TalkTravel. This flow uses the terms interchangeably — the source doc's "Liked Posts" refers to posts the user has upvoted. Downvotes do NOT add posts to this list.

---

## Flow overview

```
Any post-login page  →  Left nav  →  Liked Posts
                                          ↓
                        List of posts the user has upvoted (newest-first by default)
                                          ↓
   For each post in the list:
      Toggle Upvote OFF (Unlike)   →  post removed from THIS list
      Follow / Unfollow            →  toggles follow state (does NOT remove from list)
      3-dot menu                   →  Report (others) OR Edit/Delete (own)
      Click post body / title      →  opens Single Post View
      Click topic chip             →  opens Single Topic View
      Click author                 →  opens author profile
```

Liked Posts is a personalized feed of posts the user has upvoted. Its distinctive behavior mirrors Followed Posts: clicking the active Upvote button (which toggles the like off) instantly removes the post from THIS list, though the post continues to exist everywhere else. Switching from an upvote to a downvote also removes the post from this list (the upvote is gone). The list is otherwise structured like the Homepage feed — same cards, same interactions, same 3-dot menu rules.

---

## Step 1 — Navigate to Liked Posts from left nav

**Action:** From any post-login page, click `Liked Posts` in the left navigation.
**Expected URL:** `/liked-posts` (confirm exact pattern with engineering — could also be `/my/liked`, `/likes`, `/upvoted`).

### Elements that must be visible
- **Header:** search bar, `+ Create Post`, Messages, Notifications bell, Profile avatar
- **Left navigation:** with `Liked Posts` visually active/highlighted
- **Page heading:** e.g., *"Liked Posts"* (H1)
- **List of post cards** (or empty state if no likes)
- **Footer**

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Left nav `Liked Posts` link | `nav[aria-label="Primary"] >> text=Liked Posts` |
| Page heading | `main h1` or `[data-testid="page-heading"]` |
| Post card | `[data-testid="post-card"]` |
| Empty state | `[data-testid="empty-state"]` or `text=/no liked posts|haven't liked/i` |

### Assertions
- `await page.locator('nav[aria-label="Primary"] >> text=Liked Posts').click()`
- `await expect(page).toHaveURL(/\/liked-posts/)`
- `await expect(page.locator('main h1')).toContainText(/Liked Posts/i)`

---

## Step 2 — Verify list rendering with at least one liked post

**Action:** With the user having liked at least one post (seed via API), navigate to Liked Posts.

### Behavior
- Each liked post appears as a card in the list.
- Cards show the same structure as Homepage feed: title, author, topic chips, vote count, comment count, timestamp.
- **Upvote button on each card shows the active state** (since the user has upvoted it by definition).
- Sorted newest-first by default (confirm with engineering; sort could be by like-time or post creation).

### Assertions
- `await expect(page.locator('[data-testid="post-card"]')).toHaveCount(/* seeded count */)`
- `await expect(page.locator('[data-testid="post-card"]').first().locator('[data-testid="upvote"]')).toHaveAttribute('aria-pressed', 'true')`

---

## Step 3 — Unlike a post (toggle upvote OFF) removes it from the list

**Action:** On any post in the list, click the Upvote button (which is currently active).

### Behavior
- Upvote toggles OFF.
- Vote count decrements by 1.
- Post is **removed from the Liked Posts list** (the card disappears).
- The count of liked posts decrements.
- The post itself continues to exist on Homepage, topic pages, and everywhere else.
- No confirmation dialog — action is immediate.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Upvote button (active) | `[data-testid="post-card"] >> [data-testid="upvote"][aria-pressed="true"]` |

### Assertions
- `const post = page.locator('[data-testid="post-card"]').first()`
- `const postId = await post.getAttribute('data-post-id')`
- `const countBefore = await page.locator('[data-testid="post-card"]').count()`
- `await post.locator('[data-testid="upvote"]').click()`
- `await expect(page.locator(`[data-testid="post-card"][data-post-id="${postId}"]`)).not.toBeVisible()`
- `await expect(page.locator('[data-testid="post-card"]')).toHaveCount(countBefore - 1)`

---

## Step 4 — Unlike persists after refresh

**Action:** After unliking a post (Step 3), refresh the page.

### Behavior
- The unliked post remains OFF the Liked Posts list.
- The change is persistent (not just visual).

### Assertions
- `await page.reload()`
- `await expect(page.locator(`[data-testid="post-card"][data-post-id="${postId}"]`)).not.toBeVisible()`

---

## Step 5 — Unliked post still exists elsewhere

**Action:** After unliking a post, navigate to Homepage or its Single Post View.

### Behavior
- The post is still accessible.
- On its Single Post View, the Upvote button now shows the inactive state.
- Vote count reflects the decrement.

### Assertions
- `await page.goto(`https://talktravel.com/post/${postSlug}`)`
- `await expect(page.locator('article h1')).toBeVisible()`
- `await expect(page.locator('[data-testid="post-upvote"]')).toHaveAttribute('aria-pressed', 'false')`

---

## Step 6 — Re-like a post from elsewhere, verify it reappears in Liked Posts

**Action:** From the Single Post View or Homepage, click Upvote on a post. Return to Liked Posts.

### Behavior
- The post is added back to the Liked Posts list.
- It appears in the list on next visit (or immediately if the list updates in real-time).

### Assertions
- `// On a post's Single Post View`
- `await page.locator('[data-testid="post-upvote"]').click()`
- `await expect(page.locator('[data-testid="post-upvote"]')).toHaveAttribute('aria-pressed', 'true')`
- `await page.goto('https://talktravel.com/liked-posts')`
- `await expect(page.locator(`[data-testid="post-card"][data-post-id="${postId}"]`)).toBeVisible()`

---

## Step 7 — Switching from Upvote to Downvote removes from Liked Posts

**Action:** On any post in the Liked Posts list, click the Downvote button (the upvote is currently active).

### Behavior
- Upvote toggles OFF; Downvote toggles ON.
- Vote count adjusts by −2 (removes the +1 upvote, applies −1 downvote).
- Post is removed from Liked Posts (it's no longer liked).
- Post does NOT get added to any "Downvoted Posts" list (there is no such list in the app).

### Assertions
- `const post = page.locator('[data-testid="post-card"]').first()`
- `const postId = await post.getAttribute('data-post-id')`
- `await post.locator('[data-testid="downvote"]').click()`
- `await expect(page.locator(`[data-testid="post-card"][data-post-id="${postId}"]`)).not.toBeVisible()`

---

## Step 8 — Follow / Unfollow does NOT remove from Liked Posts

**Action:** On any post in the list, click the Follow button.

### Behavior
- Follow state toggles.
- Post **remains in the Liked Posts list** (following and liking are independent).

### Assertions
- `const post = page.locator('[data-testid="post-card"]').first()`
- `await post.hover()` (if Follow only shows on hover)
- `await post.locator('button:has-text("Follow")').click()`
- `await expect(post.locator('button:has-text("Following")')).toBeVisible()`
- `await expect(post).toBeVisible()` (still in list)

---

## Step 9 — Click a post title to open Single Post View

**Action:** Click any post card's title or body.
**Expected URL:** `/post/{slug}`

### Behavior
- Opens the Single Post View for that post.
- Upvote button on the post view shows the active state.
- Browser back returns to `/liked-posts` with the list intact.

### Assertions
- `const post = page.locator('[data-testid="post-card"]').first()`
- `await post.click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/)`
- `await expect(page.locator('[data-testid="post-upvote"]')).toHaveAttribute('aria-pressed', 'true')`

---

## Step 10 — 3-dot menu on a post (owner vs non-owner)

**Action:** Click the 3-dot menu on a liked post.

### Behavior
- **If the post is authored by the current user:** menu shows `Edit Post` and `Delete Post`.
- **If authored by another user:** menu shows only `Report Post`.

### Assertions
- `// For a post authored by another user`
- `await post.locator('button[aria-label="More"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Report")')).toBeVisible()`
- `await expect(page.locator('[role="menuitem"]:has-text("Edit Post")')).not.toBeVisible()`

---

## Step 11 — Empty state (no posts liked)

**Action:** With the user having liked ZERO posts, navigate to Liked Posts.

### Behavior
- No post cards shown.
- Empty state message appears (e.g., *"You haven't liked any posts yet"*).
- Optional CTA: *"Browse Trending"* or *"Explore posts"* — confirm with engineering.

### Assertions
- `// Precondition: user has liked 0 posts`
- `await page.goto('https://talktravel.com/liked-posts')`
- `await expect(page.locator('[data-testid="post-card"]')).toHaveCount(0)`
- `await expect(page.locator('text=/haven\'t liked|no liked posts/i')).toBeVisible()`

---

## Step 12 — Click a topic chip inside a liked post

**Action:** On any post card, click a topic chip.
**Expected URL:** `/topic/{slug}`

### Behavior
- Opens the Single Topic View for that topic.

### Assertions
- `await page.locator('[data-testid="post-card"] >> [data-testid="topic-chip"]').first().click()`
- `await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+/)`

---

## Step 13 — Click an author username/avatar

**Action:** Click the author name or avatar on any post card.
**Expected URL:** `/user/{username}`

### Behavior
- Opens the author's user profile (post-login view).

### Assertions
- `await page.locator('[data-testid="post-card"] >> [data-testid="author-link"]').first().click()`
- `await expect(page).toHaveURL(/\/user\/[a-zA-Z0-9_-]+/)`

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'auth/verified.json' });

test.describe('Left Nav — Liked Posts', () => {

  test.beforeEach(async ({ request }) => {
    // Seed: make the test user upvote 3 posts via API
    await likePostsViaApi(3);
  });

  test.afterEach(async ({ request }) => {
    await unlikeAllPostsViaApi();
  });

  test('Navigate to Liked Posts and see the list', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> text=Liked Posts').click();
    await expect(page).toHaveURL(/\/liked-posts/);
    await expect(page.locator('main h1')).toContainText(/Liked Posts/i);
    await expect(page.locator('[data-testid="post-card"]')).toHaveCount(3);
  });

  test('Every post in the list shows active Upvote state', async ({ page }) => {
    await page.goto('https://talktravel.com/liked-posts');
    const posts = await page.locator('[data-testid="post-card"]').all();
    for (const post of posts) {
      await expect(post.locator('[data-testid="upvote"]')).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('Unlike removes post from list instantly', async ({ page }) => {
    await page.goto('https://talktravel.com/liked-posts');
    const post = page.locator('[data-testid="post-card"]').first();
    const postId = await post.getAttribute('data-post-id');

    await post.locator('[data-testid="upvote"]').click();
    await expect(page.locator(`[data-testid="post-card"][data-post-id="${postId}"]`)).not.toBeVisible();
    await expect(page.locator('[data-testid="post-card"]')).toHaveCount(2);
  });

  test('Unlike persists after refresh', async ({ page }) => {
    await page.goto('https://talktravel.com/liked-posts');
    const post = page.locator('[data-testid="post-card"]').first();
    const postId = await post.getAttribute('data-post-id');
    await post.locator('[data-testid="upvote"]').click();

    await page.reload();
    await expect(page.locator(`[data-testid="post-card"][data-post-id="${postId}"]`)).not.toBeVisible();
  });

  test('Switching to Downvote removes post from Liked Posts', async ({ page }) => {
    await page.goto('https://talktravel.com/liked-posts');
    const post = page.locator('[data-testid="post-card"]').first();
    const postId = await post.getAttribute('data-post-id');

    await post.locator('[data-testid="downvote"]').click();
    await expect(page.locator(`[data-testid="post-card"][data-post-id="${postId}"]`)).not.toBeVisible();
  });

  test('Follow does NOT remove post from Liked Posts', async ({ page }) => {
    await page.goto('https://talktravel.com/liked-posts');
    const post = page.locator('[data-testid="post-card"]').first();
    const postId = await post.getAttribute('data-post-id');

    await post.hover();
    await post.locator('button:has-text("Follow")').click();
    await expect(post.locator('button:has-text("Following")')).toBeVisible();
    await expect(page.locator(`[data-testid="post-card"][data-post-id="${postId}"]`)).toBeVisible();
  });

  test('Click a post opens Single Post View', async ({ page }) => {
    await page.goto('https://talktravel.com/liked-posts');
    await page.locator('[data-testid="post-card"]').first().click();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
    await expect(page.locator('[data-testid="post-upvote"]')).toHaveAttribute('aria-pressed', 'true');
  });
});

test('Empty state when user has liked zero posts', async ({ browser }) => {
  const context = await browser.newContext({ storageState: 'auth/no-likes.json' });
  const page = await context.newPage();
  await page.goto('https://talktravel.com/liked-posts');
  await expect(page.locator('[data-testid="post-card"]')).toHaveCount(0);
  await expect(page.locator('text=/haven\'t liked|no liked posts/i')).toBeVisible();
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Direct navigation to `/liked-posts` | Page loads correctly |
| 2 | Direct navigation while logged out | Redirects to `/login` |
| 3 | Like a post, immediately visit Liked Posts | Post appears in the list |
| 4 | Unlike a post, immediately re-like it (from elsewhere) | Post reappears in the list |
| 5 | Unlike a post that's since been deleted permanently | Post already gone; graceful handling |
| 6 | Unlike a post replaced with "Deleted by author" placeholder | Post may still appear with placeholder content (confirm) |
| 7 | Very long list (100+ liked posts) | List paginates OR uses infinite scroll (confirm) |
| 8 | List sort order | Most-recently-liked first (confirm mechanism) |
| 9 | List refreshes when a new like happens elsewhere | Real-time OR requires manual refresh (confirm) |
| 10 | Rapid double-click on Upvote (Unlike) | Only one toggle processed |
| 11 | Unlike on slow network | Upvote button shows loading; post removed only after server confirms |
| 12 | Unlike fails (network error) | Post stays in list; error toast shown |
| 13 | Author-blocked user's post in Liked Posts | Post visible OR filtered (confirm with engineering) |
| 14 | Own posts appear in Liked Posts (if user likes their own post) | Confirm — self-upvote may or may not be allowed |
| 15 | 3-dot menu on a post authored by current user | Shows Edit/Delete instead of Report |
| 16 | Switching Upvote → Downvote → Upvote again in quick succession | Post is removed, then re-added correctly |
| 17 | Session expires while on the page | Next action redirects to Login |
| 18 | Two browser tabs: unlike in one, view in the other | Other tab updates on refresh OR real-time (confirm) |
| 19 | Post's Upvote state visible on Single Post View matches Liked Posts | Yes — consistent state everywhere |
| 20 | Unlike via Single Post View removes from Liked Posts | Yes — confirm on next visit |
| 21 | Post with deleted author | Post still appears in Liked Posts with "Deleted user" attribution |
| 22 | Mobile viewport (~375px) | Cards stack vertically; nav collapses |
| 23 | Reduced motion preference | No animation on card removal |
| 24 | Slow network | Loading skeleton in list area |
| 25 | Jetfuel implications on Unlike | Confirm whether Jetfuel is deducted for unliking (source doc: +1 for upvote — reversing may or may not subtract) |

---

## Known issues to watch for

- The Liked Posts URL is unconfirmed. Confirm with engineering (`/liked-posts`, `/my/liked`, `/likes`, `/upvoted`).
- The list sort order is unspecified — confirm whether it's like-time or post-creation-time newest-first.
- Whether the list uses pagination, infinite scroll, or a fixed-length load is unspecified.
- The empty state copy is unspecified — use regex matcher.
- Whether unliking triggers any confirmation dialog is unspecified — the source doc implies inline instant action.
- Real-time list updates (a new like from elsewhere) may or may not be implemented.
- Placeholder-state posts (deleted with comments) — whether they appear in Liked Posts is unspecified.
- Whether self-upvote (upvoting one's own post) is allowed is unspecified. If it's blocked, own posts should never appear in Liked Posts.
- Jetfuel behavior on unlike is unspecified (does the +1 Jetfuel get reverted?).
- "Like" vs "Upvote" terminology inconsistency — the source doc calls this surface "Liked Posts" but uses "Upvote" everywhere else. Tests should assert on `data-testid="upvote"` (or equivalent) regardless of the surface's label.

---

## Notes for the automation engineer

- **Seed likes via API** in `beforeEach` for consistent test setup. Don't rely on the current like state of the account.
- **Cleanup in `afterEach`** by unliking all posts, or by using a disposable staging account.
- **Two accounts.** `auth/verified.json` (with seeded likes) and `auth/no-likes.json` (with zero likes) for empty-state tests.
- **Capture post IDs from `data-post-id`** attributes to reliably assert removal after Unlike.
- **For instant Unlike assertions**, use `expect(...).not.toBeVisible()` with a reasonable timeout (2–3 seconds) to accommodate network round-trips.
- **For the empty state**, use a regex matcher since exact copy may vary.
- **Avoid relying on visual list order** — sort behavior is unconfirmed. Assert on the presence/absence of specific posts by ID rather than by position.
- **For 3-dot menu tests**, prefer ARIA roles over class names.
- **For the switching-to-Downvote test** (Step 7), the assertion is that the post disappears from Liked Posts — do NOT assert it appears anywhere else, since there's no Downvoted Posts list.
- **The Follow-doesn't-remove test** (Step 8) is important — it confirms that Like and Follow are independent actions. Include it explicitly.
- **For Jetfuel-related tests** (edge case #25), keep them separate from the main flow tests, since Jetfuel is eventually consistent and adds flakiness.
- **List count assertions** are useful but can be flaky if seed data drifts. Prefer asserting on specific post IDs where possible.
- **The Upvote button is the "Unlike" action** — this dual meaning is the key mechanic. Make sure the sample test comments this clearly for future maintainers.
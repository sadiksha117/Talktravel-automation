# TalkTravel — Flow: Left Nav — Followed Posts (Post-Login)

> **Purpose:** Reference for Playwright automation of the Followed Posts surface — the left-navigation destination that lists all posts the user follows. Covers navigating to the page, verifying the list renders correctly, interacting with each post (vote, follow toggle, 3-dot menu, click-through), the inline Unfollow action that removes a post from the list, the empty state when no posts are followed, and the post-Unfollow propagation across the app.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged in

> **Prerequisite:** Tests require an authenticated session via `storageState`. Some tests require the user to already be following at least one post (seed via API in `beforeEach` for reliability).

---

## Flow overview

```
Any post-login page  →  Left nav  →  Followed Posts
                                          ↓
                        List of posts the user follows (newest-first by default)
                                          ↓
   For each post in the list:
      Vote (Upvote / Downvote)  →  count updates
      Follow / Unfollow toggle  →  Unfollow removes the post from THIS list
      3-dot menu                →  Report (others) OR Edit/Delete (own)
      Click post body / title   →  opens Single Post View
      Click topic chip          →  opens Single Topic View
      Click author              →  opens author profile
```

Followed Posts is a personalized feed of posts the user has actively followed. Its most distinctive behavior is the inline Unfollow: clicking Unfollow instantly removes the post from the list (though the post itself continues to exist elsewhere). The list otherwise behaves like the Homepage feed — same card structure, same interactions, same 3-dot menu rules.

---

## Step 1 — Navigate to Followed Posts from left nav

**Action:** From any post-login page, click `Followed Posts` in the left navigation.
**Expected URL:** `/followed-posts` (confirm exact pattern with engineering — could also be `/my/followed`, `/following/posts`).

### Elements that must be visible
- **Header:** search bar, `+ Create Post`, Messages, Notifications bell, Profile avatar
- **Left navigation:** with `Followed Posts` visually active/highlighted
- **Page heading:** e.g., *"Followed Posts"* (H1)
- **List of post cards** (or empty state if no posts followed)
- **Footer** (same as Homepage)

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Left nav `Followed Posts` link | `nav[aria-label="Primary"] >> text=Followed Posts` |
| Page heading | `main h1` or `[data-testid="page-heading"]` |
| Post card | `[data-testid="post-card"]` |
| Empty state | `[data-testid="empty-state"]` or `text=/no.*followed|nothing to show/i` |

### Assertions
- `await page.locator('nav[aria-label="Primary"] >> text=Followed Posts').click()`
- `await expect(page).toHaveURL(/\/followed-posts/)`
- `await expect(page.locator('main h1')).toContainText(/Followed Posts/i)`

---

## Step 2 — Verify list rendering with at least one followed post

**Action:** With the user following at least one post (seed via API), navigate to Followed Posts.

### Behavior
- Each followed post appears as a card in the list.
- Cards show the same structure as Homepage feed: title, author, topic chips, vote count, comment count, timestamp.
- Follow button on each card shows the `Following` state (since the user follows it by definition).
- Sorted newest-first by default (confirm with engineering; may also be sorted by follow time).

### Assertions
- `await expect(page.locator('[data-testid="post-card"]')).toHaveCount(/* seeded count */)`
- `await expect(page.locator('[data-testid="post-card"]').first().locator('button:has-text("Following")')).toBeVisible()`

---

## Step 3 — Vote (Upvote) on a followed post

**Action:** Click Upvote on any post in the Followed Posts list.

### Behavior
- Vote count increments by 1.
- Upvote button becomes visually active.
- Post remains in the Followed Posts list (voting is independent of following).

### Assertions
- `const post = page.locator('[data-testid="post-card"]').first()`
- `const initial = parseInt(await post.locator('[data-testid="vote-count"]').textContent())`
- `await post.locator('[data-testid="upvote"]').click()`
- `await expect(post.locator('[data-testid="vote-count"]')).toHaveText(String(initial + 1))`
- `await expect(post).toBeVisible()`

---

## Step 4 — Inline Unfollow removes post from the list

**Action:** On any post in the list, click `Following` (which toggles to Unfollow) or click the explicit `Unfollow` button/action.

### Behavior
- Post is unfollowed instantly.
- Post is **removed from the Followed Posts list** (the card disappears).
- The count of followed posts decrements.
- The post itself continues to exist on Homepage, topic pages, and everywhere else.
- Confirmation: no dialog — action is immediate.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Follow/Unfollow toggle | `[data-testid="post-card"] >> button:has-text("Following")` |

### Assertions
- `const post = page.locator('[data-testid="post-card"]').first()`
- `const postId = await post.getAttribute('data-post-id')`
- `const countBefore = await page.locator('[data-testid="post-card"]').count()`
- `await post.locator('button:has-text("Following")').click()`
- `await expect(page.locator(`[data-testid="post-card"][data-post-id="${postId}"]`)).not.toBeVisible()`
- `await expect(page.locator('[data-testid="post-card"]')).toHaveCount(countBefore - 1)`

---

## Step 5 — Unfollowed post is no longer in Followed Posts after refresh

**Action:** After unfollowing a post (Step 4), refresh the page.

### Behavior
- The unfollowed post remains OFF the Followed Posts list.
- The change is persistent (not just visual).

### Assertions
- `await page.reload()`
- `await expect(page.locator(`[data-testid="post-card"][data-post-id="${postId}"]`)).not.toBeVisible()`

---

## Step 6 — Unfollowed post still exists elsewhere

**Action:** After unfollowing a post, navigate to Homepage or its Single Post View.

### Behavior
- The post is still accessible.
- On Homepage feed, it appears normally (or may not, depending on tab; check Trending or Latest to confirm).
- On its Single Post View, the Follow button now shows `Follow` (not `Following`) — reflecting the new unfollowed state.

### Assertions
- `await page.goto(`https://talktravel.com/post/${postSlug}`)`
- `await expect(page.locator('article h1')).toBeVisible()`
- `await expect(page.locator('button:has-text("Follow")')).toBeVisible()`
- `await expect(page.locator('button:has-text("Following")')).not.toBeVisible()`

---

## Step 7 — Re-follow a post from elsewhere, verify it reappears in Followed Posts

**Action:** From the Single Post View or Homepage, click Follow on a post. Return to Followed Posts.

### Behavior
- The post is added back to the Followed Posts list.
- It appears in the list on next visit (or immediately if the list updates in real-time).

### Assertions
- `// On a post's Single Post View`
- `await page.locator('button:has-text("Follow")').click()`
- `await expect(page.locator('button:has-text("Following")')).toBeVisible()`
- `await page.goto('https://talktravel.com/followed-posts')`
- `await expect(page.locator(`[data-testid="post-card"][data-post-id="${postId}"]`)).toBeVisible()`

---

## Step 8 — Click a post title to open Single Post View

**Action:** Click any post card's title or body.
**Expected URL:** `/post/{slug}`

### Behavior
- Opens the Single Post View for that post.
- Follow button on the post view shows `Following` state (since the user follows it).
- Browser back returns to `/followed-posts` with the list intact.

### Assertions
- `const post = page.locator('[data-testid="post-card"]').first()`
- `await post.click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/)`
- `await expect(page.locator('button:has-text("Following")')).toBeVisible()`

---

## Step 9 — 3-dot menu on a post (owner vs non-owner)

**Action:** Click the 3-dot menu on a followed post.

### Behavior
- **If the post is authored by the current user:** menu shows `Edit Post` and `Delete Post`.
- **If authored by another user:** menu shows only `Report Post`.

### Assertions
- `// For a post authored by another user`
- `await post.locator('button[aria-label="More"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Report")')).toBeVisible()`
- `await expect(page.locator('[role="menuitem"]:has-text("Edit Post")')).not.toBeVisible()`

---

## Step 10 — Empty state (no posts followed)

**Action:** With the user following ZERO posts, navigate to Followed Posts.

### Behavior
- No post cards shown.
- An empty state message appears (e.g., *"You're not following any posts yet"*).
- Optional CTA: *"Browse Trending"* or *"Explore posts"* — confirm with engineering.

### Assertions
- `// Precondition: user follows 0 posts`
- `await page.goto('https://talktravel.com/followed-posts')`
- `await expect(page.locator('[data-testid="post-card"]')).toHaveCount(0)`
- `await expect(page.locator('text=/not following any posts|no followed posts/i')).toBeVisible()`

---

## Step 11 — Click a topic chip inside a followed post

**Action:** On any post card, click a topic chip.
**Expected URL:** `/topic/{slug}`

### Behavior
- Opens the Single Topic View for that topic.

### Assertions
- `await page.locator('[data-testid="post-card"] >> [data-testid="topic-chip"]').first().click()`
- `await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+/)`

---

## Step 12 — Click an author username/avatar

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

test.describe('Left Nav — Followed Posts', () => {

  test.beforeEach(async ({ request }) => {
    // Seed: make the test user follow 3 posts via API
    await followPostsViaApi(3);
  });

  test.afterEach(async ({ request }) => {
    // Cleanup: unfollow all seeded posts
    await unfollowAllPostsViaApi();
  });

  test('Navigate to Followed Posts and see the list', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> text=Followed Posts').click();
    await expect(page).toHaveURL(/\/followed-posts/);
    await expect(page.locator('main h1')).toContainText(/Followed Posts/i);
    await expect(page.locator('[data-testid="post-card"]')).toHaveCount(3);
  });

  test('Unfollow removes post from list instantly', async ({ page }) => {
    await page.goto('https://talktravel.com/followed-posts');
    const post = page.locator('[data-testid="post-card"]').first();
    const postId = await post.getAttribute('data-post-id');

    await post.locator('button:has-text("Following")').click();
    await expect(page.locator(`[data-testid="post-card"][data-post-id="${postId}"]`)).not.toBeVisible();
    await expect(page.locator('[data-testid="post-card"]')).toHaveCount(2);
  });

  test('Unfollow persists after refresh', async ({ page }) => {
    await page.goto('https://talktravel.com/followed-posts');
    const post = page.locator('[data-testid="post-card"]').first();
    const postId = await post.getAttribute('data-post-id');
    await post.locator('button:has-text("Following")').click();

    await page.reload();
    await expect(page.locator(`[data-testid="post-card"][data-post-id="${postId}"]`)).not.toBeVisible();
  });

  test('Vote on a followed post keeps it in the list', async ({ page }) => {
    await page.goto('https://talktravel.com/followed-posts');
    const post = page.locator('[data-testid="post-card"]').first();
    await post.locator('[data-testid="upvote"]').click();
    await expect(post).toBeVisible();
    await expect(post.locator('[data-testid="upvote"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Click post opens Single Post View', async ({ page }) => {
    await page.goto('https://talktravel.com/followed-posts');
    await page.locator('[data-testid="post-card"]').first().click();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
    await expect(page.locator('button:has-text("Following")')).toBeVisible();
  });
});

test('Empty state when user follows zero posts', async ({ browser }) => {
  // Use a separate account known to follow nothing
  const context = await browser.newContext({ storageState: 'auth/empty-follows.json' });
  const page = await context.newPage();
  await page.goto('https://talktravel.com/followed-posts');
  await expect(page.locator('[data-testid="post-card"]')).toHaveCount(0);
  await expect(page.locator('text=/not following|no followed/i')).toBeVisible();
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Direct navigation to `/followed-posts` | Page loads correctly |
| 2 | Direct navigation while logged out | Redirects to `/login` |
| 3 | Follow a post, immediately visit Followed Posts | Post appears in the list |
| 4 | Unfollow a post, immediately re-follow it | Post reappears in the list |
| 5 | Unfollow while post has been deleted permanently | Post already gone; graceful handling |
| 6 | Unfollow while post has been replaced with "Deleted by author" placeholder | Post appears in list with placeholder content — confirm |
| 7 | Very long list (100+ followed posts) | List paginates OR uses infinite scroll (confirm) |
| 8 | List sort order | Newest-first by default; confirm sort mechanism |
| 9 | List refreshes when a new followed post is added elsewhere | Real-time update OR requires manual refresh (confirm) |
| 10 | Rapid double-click on Unfollow | Only one unfollow processed |
| 11 | Unfollow on slow network | Button shows loading; post removed only after server confirms |
| 12 | Unfollow fails (network error) | Post stays in list; error toast shown |
| 13 | Author-blocked user's post in Followed Posts | Post visible OR filtered (confirm with engineering) |
| 14 | Own posts appear in Followed Posts (if user follows themselves) | Not applicable — cannot follow own posts (confirm) |
| 15 | 3-dot menu on a post authored by current user (in Followed Posts) | Shows Edit/Delete instead of Report |
| 16 | Session expires while on the page | Next action redirects to Login |
| 17 | Two browser tabs: unfollow in one, view in the other | Other tab updates on refresh OR real-time (confirm) |
| 18 | Post's Follow state visible on Single Post View matches Followed Posts | Yes — consistent state everywhere |
| 19 | Unfollow via Single Post View (not from this page) removes it from Followed Posts | Yes — confirm on next visit |
| 20 | Mobile viewport (~375px) | Cards stack vertically; nav collapses |
| 21 | Reduced motion preference | No animation on card removal |
| 22 | Slow network | Loading skeleton in list area |

---

## Known issues to watch for

- The Followed Posts URL is unconfirmed. Confirm with engineering (`/followed-posts`, `/my/followed`, etc.).
- The list sort order is unspecified — confirm whether it's follow-time or post-creation-time newest-first.
- Whether the list uses pagination, infinite scroll, or a fixed-length load is unspecified.
- The empty state copy is unspecified — use regex matcher.
- Whether unfollowed posts trigger any confirmation dialog is unspecified — the source doc implies inline instant action.
- Real-time list updates (a new followed post added from elsewhere) may or may not be implemented.
- 3-dot menu options may vary slightly by surface — confirm "Report" vs "Report Post".
- Placeholder-state posts (deleted with comments) — whether they appear in Followed Posts is unspecified.

---

## Notes for the automation engineer

- **Seed follows via API** in `beforeEach` for consistent test setup. Don't rely on the current follow state of the account.
- **Cleanup in `afterEach`** by unfollowing all posts, or by using a disposable staging account.
- **Two accounts.** `auth/verified.json` (with seeded follows) and `auth/empty-follows.json` (with zero follows) for testing the empty state.
- **Capture post IDs from `data-post-id`** attributes to reliably assert removal after Unfollow.
- **For instant Unfollow assertions**, use `expect(...).not.toBeVisible()` with a reasonable timeout (2–3 seconds) to accommodate network round-trips.
- **For the empty state**, use a regex matcher (`text=/not following|no followed/i`) since exact copy may vary.
- **Avoid relying on visual list order** — sort behavior is unconfirmed. Assert on the presence/absence of specific posts by ID rather than by position.
- **For 3-dot menu tests**, prefer ARIA roles over class names.
- **List count assertions** are useful but can be flaky if seed data drifts. Prefer asserting on specific post IDs rather than absolute counts where possible.
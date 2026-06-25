# TalkTravel — Flow: Delete Post (Post-Login)

> **Purpose:** Reference for Playwright automation of the Delete Post flow — opening the delete action from any owner entry surface, confirming via dialog, and verifying the two distinct outcomes: posts WITH comments get a "Deleted by author" placeholder (post remains accessible with comments intact); posts WITHOUT comments are permanently removed (post is gone from all surfaces). Includes Cancel path, owner-only enforcement, and propagation checks across feed, topic pages, and My Posts.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged in, **must be the post author**

> **Prerequisite:** Tests require a verified account that has at least one published post. Most tests need **two seeded posts**: one with comments (for the placeholder branch) and one without (for the permanent-removal branch). Seed via API in `beforeEach` or `beforeAll`.

---

## Flow overview

```
Owner identifies delete entry point:
   Homepage feed         → 3-dots → Delete Post   ─┐
   Single Post View      → 3-dots → Delete Post   ─┼─→  Delete confirmation dialog
   My Posts (left nav)   → 3-dots → Delete        ─┘             │
                                                                  ↓
                                          ┌──────────────────┬────────────┐
                                          │   Cancel         │   Delete   │
                                          └──────────────────┴────────────┘
                                                  ↓                  ↓
                                          No change          Branch by comment presence
                                                                     ↓
                                  ┌──────────────────────────────────┴─────────────────────────────┐
                                  ↓                                                                  ↓
                       Post HAS comments                                              Post has NO comments
                       Content replaced with                                          Post removed permanently
                       "Deleted by author" placeholder                                from feed, topic pages,
                       Comments remain visible                                        My Posts, search results
                       Post URL still resolves                                        Post URL → 404 / "Post not found"
```

Delete Post is **owner-only** and **irreversible**. The action's outcome depends on whether the post has comments: with comments, the post's content is replaced by a placeholder but the URL and comment thread are preserved; without comments, the post is permanently removed from every surface. A confirmation dialog appears between the menu click and the deletion to guard against accidents.

---

## Step 1 — Open Delete Post via 3-dot menu on Homepage feed

**Action:** From the Homepage feed (logged in as the post author), find your own post. Click the 3-dot menu. Click `Delete Post`.

### Behavior
- The 3-dot menu on own posts shows `Edit Post` and `Delete Post` (no `Report`).
- Clicking `Delete Post` opens a confirmation dialog (does NOT delete immediately).

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| 3-dot menu on post card | `[data-testid="post-card"] >> button[aria-label="More"]` |
| Delete Post menu item | `[role="menuitem"]:has-text("Delete Post")` |
| Confirmation dialog | `[role="dialog"]` or `[role="alertdialog"]` |
| Delete (confirm) button in dialog | `[role="dialog"] >> button:has-text("Delete")` |
| Cancel button in dialog | `[role="dialog"] >> button:has-text("Cancel")` |

### Assertions
- `const ownPost = page.locator('[data-testid="post-card"][data-author="<current-user>"]').first()`
- `await ownPost.locator('button[aria-label="More"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Delete Post")')).toBeVisible()`
- `await page.locator('[role="menuitem"]:has-text("Delete Post")').click()`
- `await expect(page.locator('[role="dialog"]')).toBeVisible()`

---

## Step 2 — Open Delete Post via Single Post View

**Action:** Open one of your own posts directly. Click the 3-dot menu on the post (not on a comment). Click `Delete Post`.

### Behavior
- Same confirmation dialog opens as Step 1.

### Assertions
- `await page.goto('https://talktravel.com/post/<my-seed-post-slug>')`
- `await page.locator('[data-testid="post-more"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Delete Post")').click()`
- `await expect(page.locator('[role="dialog"]')).toBeVisible()`

---

## Step 3 — Open Delete Post via My Posts (left nav)

**Action:** Click left nav `My Posts`. From the list, click 3-dots on any post. Click `Delete`.

### Behavior
- Same confirmation dialog opens.

### Assertions
- `await page.locator('nav[aria-label="Primary"] >> text=My Posts').click()`
- `await page.locator('[data-testid="post-card"]').first().locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Delete")').click()`
- `await expect(page.locator('[role="dialog"]')).toBeVisible()`

---

## Step 4 — Verify confirmation dialog structure

**Action:** With the dialog open, inspect its contents.

### Elements that must be visible
- **Dialog heading** — e.g., *"Delete this post?"* (exact copy unconfirmed)
- **Dialog body** — warning text, e.g., *"This action cannot be undone."* (or similar; confirm with engineering)
- **Cancel button** — secondary
- **Delete button** — primary, often styled in red/destructive

### Assertions
- `await expect(page.locator('[role="dialog"]')).toBeVisible()`
- `await expect(page.locator('[role="dialog"] >> button:has-text("Cancel")')).toBeVisible()`
- `await expect(page.locator('[role="dialog"] >> button:has-text("Delete")')).toBeVisible()`

---

## Step 5 — Cancel the deletion

**Action:** With the confirmation dialog open, click `Cancel`.

### Behavior
- Dialog closes.
- The post is NOT deleted.
- No state changes anywhere — post remains intact on feed, topic pages, My Posts.
- User returns to the page they were on (no navigation).

### Assertions
- `await page.locator('[role="dialog"] >> button:has-text("Cancel")').click()`
- `await expect(page.locator('[role="dialog"]')).not.toBeVisible()`
- `// Verify post still present at original URL`

---

## Step 6 — Delete a post WITH comments → "Deleted by author" placeholder

**Action:** Use a seed post that has at least one comment. Open the confirmation dialog. Click `Delete`.

### Behavior
- Dialog closes.
- **Post content is replaced with a "Deleted by author" placeholder.**
- Post Title, Discussion body, and External Link are removed or replaced.
- Topic chips may remain or be hidden (confirm with engineering).
- **Comments remain fully visible and interactive** — vote, reply, share still work on comments.
- Post URL still resolves to a valid Single Post View.
- Post does NOT disappear from the feed entirely — it shows the placeholder content.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Deleted placeholder body | `text=/Deleted by author/i` or `[data-testid="post-deleted-placeholder"]` |
| Comments thread (still visible) | `[data-testid="comment"]` |

### Assertions
- `// Seed: post with at least 1 comment, slug = postWithComments`
- `await page.goto(`https://talktravel.com/post/${postWithComments}`)`
- `await page.locator('[data-testid="post-more"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Delete Post")').click()`
- `await page.locator('[role="dialog"] >> button:has-text("Delete")').click()`
- `await expect(page.locator('text=/Deleted by author/i')).toBeVisible()`
- `await expect(page.locator('[data-testid="comment"]').first()).toBeVisible()`
- `// URL should still resolve`
- `await expect(page).toHaveURL(new RegExp(`/post/${postWithComments}`))`

---

## Step 7 — Delete a post WITHOUT comments → permanent removal

**Action:** Use a seed post that has zero comments. Open the confirmation dialog. Click `Delete`.

### Behavior
- Dialog closes.
- **Post is removed permanently** from feed, topic pages, My Posts, and search results.
- User is redirected — likely to the previous page (My Posts, Homepage, or topic page).
- Direct navigation to the deleted post URL returns 404 or "Post not found" state.
- Post URL is fully invalid; it cannot be edited, voted on, or commented on.

### Assertions
- `// Seed: post with 0 comments, slug = postWithoutComments`
- `await page.goto(`https://talktravel.com/post/${postWithoutComments}`)`
- `await page.locator('[data-testid="post-more"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Delete Post")').click()`
- `await page.locator('[role="dialog"] >> button:has-text("Delete")').click()`
- `// User is redirected away from the post`
- `await expect(page).not.toHaveURL(new RegExp(`/post/${postWithoutComments}`))`
- `// Direct navigation now fails`
- `await page.goto(`https://talktravel.com/post/${postWithoutComments}`)`
- `await expect(page.locator('text=/not found|404/i')).toBeVisible()`

---

## Step 8 — Deleted post (with placeholder) cannot be edited or interacted with

**Action:** On a post that's been deleted with the placeholder, attempt to open its 3-dot menu or interact with it.

### Behavior
- 3-dot menu either does not appear OR shows no actionable items.
- Vote / Follow / Share buttons on the post are hidden or disabled.
- Comments retain their own 3-dot menus and full interaction (vote, reply, share, edit, delete, report).
- The placeholder is visible to all users (logged in or out).

### Assertions
- `// On a placeholder-state post page`
- `await expect(page.locator('text=/Deleted by author/i')).toBeVisible()`
- `await expect(page.locator('[data-testid="post-upvote"]')).not.toBeVisible()` (or `.toBeDisabled()`)
- `await expect(page.locator('[data-testid="post-more"]')).not.toBeVisible()` (confirm with engineering)
- `// Comments still interactive`
- `await expect(page.locator('[data-testid="comment"] >> [data-testid="comment-upvote"]').first()).toBeEnabled()`

---

## Step 9 — Deleted post (permanent) cannot be reached

**Action:** Attempt to navigate to or search for a permanently-deleted post.

### Behavior
- Direct URL → 404 / "Post not found".
- Search results do NOT include the deleted post.
- Feed, topic pages, My Posts do NOT show the deleted post.
- Any cached references (notifications, shared links) lead to the 404 state.

### Assertions
- `await page.goto(`https://talktravel.com/post/${permanentlyDeletedSlug}`)`
- `await expect(page.locator('text=/not found|404/i')).toBeVisible()`
- `// Search`
- `await page.goto('https://talktravel.com/')`
- `await page.locator('[data-testid="header-search"]').fill('<unique seed title>')`
- `await page.keyboard.press('Enter')`
- `await expect(page.locator(`[data-testid="post-card"]:has-text("<unique seed title>")`)).toHaveCount(0)`

---

## Step 10 — Propagation: deleted post disappears from all surfaces

**Action:** Delete a post (either branch). Visit Homepage, all tagged topic pages, and My Posts.

### Behavior
- **Permanent delete (no comments):** post is gone from all surfaces.
- **Placeholder delete (with comments):**
  - Homepage feed: post may still appear with the placeholder OR be hidden (confirm).
  - Topic pages: same as Homepage.
  - My Posts: post still appears with placeholder content.
  - Single Post View: placeholder content + comments visible.

### Assertions
- `// After delete with comments`
- `await page.goto('https://talktravel.com/')`
- `// Either the placeholder card is visible, or the post is filtered out — confirm with engineering`
- ``
- `// After permanent delete`
- `await page.goto('https://talktravel.com/')`
- `await expect(page.locator(`[data-testid="post-card"]:has-text("<deleted title>")`)).toHaveCount(0)`

---

## Step 11 — Non-owner cannot delete

**Action:** Log in as a different user. Open the post. Click the 3-dot menu.

### Behavior
- Menu shows only `Report` (no `Delete Post`).
- There is no other surface from which non-owners can trigger delete.

### Assertions
- `// As non-owner`
- `await page.goto('https://talktravel.com/post/<owners-post-slug>')`
- `await page.locator('[data-testid="post-more"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Report")')).toBeVisible()`
- `await expect(page.locator('[role="menuitem"]:has-text("Delete Post")')).not.toBeVisible()`

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'auth/owner.json' });

test.describe('Delete Post', () => {

  let postWithComments;
  let postWithoutComments;

  test.beforeEach(async ({ request }) => {
    // Seed two posts via API
    postWithComments = await seedPostViaApi({
      title: `With comments ${Date.now()}`,
      topics: ['Airlines'],
      seedComments: 2,
    });
    postWithoutComments = await seedPostViaApi({
      title: `No comments ${Date.now()}`,
      topics: ['Airlines'],
    });
  });

  test('Confirmation dialog appears and Cancel preserves post', async ({ page }) => {
    await page.goto(`https://talktravel.com/post/${postWithoutComments}`);
    await page.locator('[data-testid="post-more"]').click();
    await page.locator('[role="menuitem"]:has-text("Delete Post")').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await page.locator('[role="dialog"] >> button:has-text("Cancel")').click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Post still exists
    await page.reload();
    await expect(page.locator('article h1')).toBeVisible();
  });

  test('Delete with comments → placeholder shown, comments preserved', async ({ page }) => {
    await page.goto(`https://talktravel.com/post/${postWithComments}`);
    await page.locator('[data-testid="post-more"]').click();
    await page.locator('[role="menuitem"]:has-text("Delete Post")').click();
    await page.locator('[role="dialog"] >> button:has-text("Delete")').click();

    await expect(page.locator('text=/Deleted by author/i')).toBeVisible();
    await expect(page.locator('[data-testid="comment"]').first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/post/${postWithComments}`));
  });

  test('Delete without comments → permanently removed', async ({ page }) => {
    await page.goto(`https://talktravel.com/post/${postWithoutComments}`);
    await page.locator('[data-testid="post-more"]').click();
    await page.locator('[role="menuitem"]:has-text("Delete Post")').click();
    await page.locator('[role="dialog"] >> button:has-text("Delete")').click();

    // User redirected away
    await expect(page).not.toHaveURL(new RegExp(`/post/${postWithoutComments}`));

    // Direct nav returns 404
    await page.goto(`https://talktravel.com/post/${postWithoutComments}`);
    await expect(page.locator('text=/not found|404/i')).toBeVisible();
  });

  test('Deleted post (placeholder) cannot be edited', async ({ page }) => {
    await page.goto(`https://talktravel.com/post/${postWithComments}`);
    await page.locator('[data-testid="post-more"]').click();
    await page.locator('[role="menuitem"]:has-text("Delete Post")').click();
    await page.locator('[role="dialog"] >> button:has-text("Delete")').click();

    // After delete: 3-dot menu should be gone or no Edit option
    const moreVisible = await page.locator('[data-testid="post-more"]').isVisible();
    if (moreVisible) {
      await page.locator('[data-testid="post-more"]').click();
      await expect(page.locator('[role="menuitem"]:has-text("Edit Post")')).not.toBeVisible();
    }
  });
});

test('Non-owner cannot delete', async ({ browser }) => {
  const context = await browser.newContext({ storageState: 'auth/non-owner.json' });
  const page = await context.newPage();

  await page.goto(`https://talktravel.com/post/<owners-post-slug>`);
  await page.locator('[data-testid="post-more"]').click();
  await expect(page.locator('[role="menuitem"]:has-text("Delete Post")')).not.toBeVisible();
  await expect(page.locator('[role="menuitem"]:has-text("Report")')).toBeVisible();
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Delete post via 3-dots on Homepage feed | Same outcome as Single Post View |
| 2 | Delete post via 3-dots on My Posts | Same outcome |
| 3 | Click Delete in dialog, then click Cancel before action completes | Race-condition — Delete should win OR both blocked (confirm) |
| 4 | Click Delete twice rapidly in dialog | Only one delete request fires; no duplicate processing |
| 5 | Delete on slow network | Loading state on Delete button; dialog stays open until response |
| 6 | Delete with session expired | Action fails; redirects to login (confirm) |
| 7 | Delete fails (network/server error) | Error toast; post remains intact; dialog stays or closes (confirm) |
| 8 | Browser back after delete (permanent) | Should NOT restore post; should land on the redirect destination |
| 9 | Browser back after delete (placeholder) | Returns to previous page; post still shows placeholder |
| 10 | Press Esc while dialog is open | Dialog closes; same as Cancel |
| 11 | Click outside dialog (overlay click) | Dialog closes OR stays open (confirm) |
| 12 | Delete a post that's currently displayed in another browser tab | Other tab sees placeholder/404 on next interaction or refresh |
| 13 | Delete a post that someone is currently commenting on | The new comment may succeed (post becomes placeholder), or fail with error (confirm) |
| 14 | Comments on a placeholder post — can still be edited/deleted/voted | Yes (comments are independent of post lifecycle) |
| 15 | Reply to a comment on a placeholder post | Allowed — comments remain fully interactive |
| 16 | Search for deleted post's title (permanent) | No results returned |
| 17 | Search for deleted post's title (placeholder) | Result returned (confirm — depends on whether placeholders are indexed) |
| 18 | Direct URL to placeholder post in incognito | Loads placeholder content + comments |
| 19 | Direct URL to permanently deleted post in incognito | 404 / "Post not found" |
| 20 | Shared link to placeholder post on social media | Opens placeholder view; no error |
| 21 | Notification linking to a permanently deleted post | Click leads to 404 (confirm graceful handling) |
| 22 | Delete a post, then create a new post with the same title | New post is independent — slug differs |
| 23 | Delete a post that has just been edited | Delete succeeds; "Edited" label is irrelevant on placeholder |
| 24 | Delete multiple of your own posts in sequence | Each delete works independently |
| 25 | Jetfuel earned on deleted post (was +5 for creating) | Jetfuel is NOT reverted on delete (confirm) |
| 26 | Comments on a placeholder post earn Jetfuel for commenters | Confirm with engineering |
| 27 | Topic page count of posts in topic | Decreases by 1 when post is permanently deleted; placeholder behavior — confirm |
| 28 | Mobile viewport (~375px) | Dialog renders centered with touch-friendly buttons |
| 29 | Reduced motion preference | No animation on dialog open/close |
| 30 | Keyboard navigation in dialog (Tab + Enter) | Both Cancel and Delete are reachable and actionable via keyboard |

---

## Known issues to watch for

- The exact copy of the confirmation dialog (heading, body warning) is unspecified — use regex matchers or fixture-driven assertions.
- "Deleted by author" placeholder copy may vary slightly (e.g., "Post deleted by author", "Deleted"). Use `text=/Deleted/i`.
- Whether the placeholder card appears in the Homepage / topic feed listings or is filtered out is unclear from the source doc. Confirm with engineering.
- Whether topic chips remain visible on a placeholder post is unspecified.
- Whether placeholder posts are indexed by search is unspecified.
- Whether Jetfuel earned from creating a post is reverted on delete is unspecified (default assumption: no reversion).
- Esc-key and overlay-click dismissal behavior on the dialog is unspecified.
- The redirect destination after a permanent delete is unconfirmed — could be Homepage, My Posts, or browser back.
- For a placeholder post, whether the post's vote buttons are hidden, disabled, or simply non-functional is unspecified.
- Non-owner direct URL attempts to delete (e.g., crafting a delete API call) should be blocked at the API layer — out of scope for UI tests but worth a separate API test.

---

## Notes for the automation engineer

- **Seed two posts per test run.** One with comments (for placeholder branch), one without (for permanent branch). Easiest approach: API seed in `beforeEach`.
```js
  async function seedPostViaApi({ title, topics, seedComments = 0 }) {
    // POST to staging API to create a post, then optionally seed N comments via additional calls
    // Returns the new post's slug
  }
```
- **Two accounts required.** `auth/owner.json` (post author) and `auth/non-owner.json` (for the non-owner-cannot-delete test).
- **Use timestamped post titles** (`Test post ${Date.now()}`) so seed data is identifiable for batch cleanup.
- **Cleanup is minimal for permanent delete** (the post is already gone). For placeholder posts, consider an admin API to hard-delete them after tests, or accept the accumulation in staging.
- **Avoid hardcoded slugs.** Always capture the seed post's slug at runtime.
- **For the confirmation dialog**, prefer `role="dialog"` or `role="alertdialog"` selectors over class names.
- **For the placeholder copy**, use a regex matcher (`text=/Deleted by author|Deleted/i`).
- **For the 404 state**, use a regex matcher (`text=/not found|404/i`).
- **For propagation tests**, allow up to 5 seconds for feed caches to update after a delete:
```js
  await expect(page.locator(`[data-testid="post-card"]:has-text("${title}")`)).toHaveCount(0, { timeout: 5000 });
```
- **Network-failure tests** (edge case #7) can be simulated with Playwright route interception:
```js
  await page.route('**/api/posts/*', route => route.abort());
```
- **Comments-on-placeholder tests** are valuable but require careful seed data: the seed must include comments and the post must transition to placeholder state before the comment interactions are tested.
- **For non-owner tests, use `browser.newContext({ storageState: 'auth/non-owner.json' })`** rather than logging out and back in — much faster.
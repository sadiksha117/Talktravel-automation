# TalkTravel — Flow: Post-Login Single Post View (Logged In)

> **Purpose:** Reference for Playwright automation of the post-login Single Post View — opening a post, voting / following / sharing, adding and threading comments up to 4 levels deep, sorting comments Newest/Oldest, verifying the Edited timestamp, and exercising the 3-dot menu in both owner and non-owner roles.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged in
> **Prerequisite:** Tests require an authenticated session. Use `storageState` saved from a logged-in browser context, or log in via the Login flow in `beforeEach`. Some tests require two accounts (owner + non-owner).

---

## Flow overview

```
Homepage / Topic / Profile / Search  →  Click post  →  Single Post View (/post/{slug})
                                                            ↓
   Post-level actions:
      Upvote / Downvote        →  count + Jetfuel update
      Follow / Unfollow        →  state toggles
      Share                    →  link copied / share intent opened
      3-dot (owner)            →  Edit / Delete
      3-dot (non-owner)        →  Report
      Click author             →  user profile
      Click topic chip         →  topic page
      Click external link card →  opens target URL in new tab

   Comment thread:
      Add Comment (rich text)  →  publishes (+2 Jetfuel)
      Reply on comment         →  threaded reply (max 4 levels)
      Upvote / Downvote        →  comment vote count updates
      Share on comment         →  direct link to that comment
      Sort by Newest / Oldest  →  thread reorders; selection persists
      3-dot (own)              →  Edit (shows Edited label) / Delete
      3-dot (others)           →  Report
```

The Single Post View is the primary content surface. Every post-level interaction (vote, follow, share, edit/delete) is mirrored at the comment level with one extra rule: comments support **threaded replies up to 4 levels deep**. Replies past level 4 stay flattened at level 4.

---

## Step 1 — Open a Single Post View

**Action:** From the Homepage feed (or any surface that lists posts), click a post card.
**Expected URL:** `/post/{slug}`

### Elements that must be visible
- Header: search, `+ Create Post`, Messages, Notifications, Profile avatar
- Left navigation
- Post header: title (H1), author (avatar + username), topic chips, post timestamp
- Post body content (rich text, optional inline images, optional external link preview card)
- Post action row: Upvote / Downvote with count, Follow button, Share button, 3-dot menu
- Comment input box with rich-text tools
- Comment thread (if comments exist) with sort dropdown (Newest / Oldest)
- Footer

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Post H1 | `article h1` or `main h1` |
| Author link | `[data-testid="post-author"]` or `article >> a[href^="/user/"]` |
| Topic chip on post | `article >> [data-testid="topic-chip"]` |
| Upvote (post) | `[data-testid="post-upvote"]` |
| Downvote (post) | `[data-testid="post-downvote"]` |
| Vote count (post) | `[data-testid="post-vote-count"]` |
| Follow button | `button:has-text("Follow")` or `[data-testid="follow-post"]` |
| Share button | `button:has-text("Share")` or `[data-testid="share-post"]` |
| 3-dot menu (post) | `[data-testid="post-more"]` or `article >> button[aria-label="More"]` |
| External link preview card | `[data-testid="external-link-card"]` |
| Comment input box | `[data-testid="comment-input"]` or `textarea[placeholder*="comment"]` |
| Sort dropdown | `[data-testid="comment-sort"]` |
| Comment row | `[data-testid="comment"]` |

### Assertions
- `await page.locator('[data-testid="post-card"]').first().click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/)`
- `await expect(page.locator('article h1')).toBeVisible()`
- `await expect(page.locator('[data-testid="post-upvote"]')).toBeVisible()`
- `await expect(page.locator('[data-testid="comment-input"]')).toBeVisible()`

---

## Step 2 — Upvote the post

**Action:** Click the post Upvote button.

### Behavior
- Vote count increments by 1.
- Upvote button visually active.
- User earns +1 Jetfuel.

### Assertions
- `const initial = parseInt(await page.locator('[data-testid="post-vote-count"]').textContent())`
- `await page.locator('[data-testid="post-upvote"]').click()`
- `await expect(page.locator('[data-testid="post-vote-count"]')).toHaveText(String(initial + 1))`
- `await expect(page.locator('[data-testid="post-upvote"]')).toHaveAttribute('aria-pressed', 'true')`

---

## Step 3 — Downvote the post (switch from upvote)

**Action:** With Upvote currently active, click Downvote.

### Behavior
- Vote count adjusts by −2 (removes the +1 and applies −1).
- Downvote button becomes active; Upvote becomes inactive.

### Assertions
- `const beforeSwitch = parseInt(await page.locator('[data-testid="post-vote-count"]').textContent())`
- `await page.locator('[data-testid="post-downvote"]').click()`
- `await expect(page.locator('[data-testid="post-vote-count"]')).toHaveText(String(beforeSwitch - 2))`
- `await expect(page.locator('[data-testid="post-downvote"]')).toHaveAttribute('aria-pressed', 'true')`

---

## Step 4 — Follow / Unfollow the post

**Action:** Click the `Follow` button on the post action row.

### Behavior
- Button toggles to `Following`.
- Post appears in Left Nav → Followed Posts.
- Click again → unfollows; post removed from Followed Posts.

### Assertions
- `await page.locator('button:has-text("Follow")').click()`
- `await expect(page.locator('button:has-text("Following")')).toBeVisible()`

---

## Step 5 — Share the post

**Action:** Click the `Share` button.

### Behavior
- A shareable link is copied to the clipboard OR a share intent dialog opens (confirm with engineering — copy-to-clipboard is most common).
- Toast confirmation appears (e.g., "Link copied").

### Assertions
- `await page.locator('button:has-text("Share")').click()`
- `await expect(page.locator('text=/Link copied|Copied/')).toBeVisible()`
- `// Optional: verify clipboard content matches /\/post\/[a-z0-9-]+/`

---

## Step 6 — 3-dot menu on a post NOT authored by the current user (Report)

**Action:** Open a post by another author. Click the 3-dot menu.

### Behavior
- Menu opens with only `Report` option (no Edit / Delete).
- Clicking `Report` opens the Report modal (Reason mandatory, Additional details optional, Submit Report / Cancel).
- Submit without selecting a reason → inline error.
- Submit with reason → confirmation toast; modal closes.
- Cancel → modal closes; no change.

### Assertions
- `await page.locator('[data-testid="post-more"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Report")')).toBeVisible()`
- `await expect(page.locator('[role="menuitem"]:has-text("Edit")')).not.toBeVisible()`
- `await page.locator('[role="menuitem"]:has-text("Report")').click()`
- `await expect(page.locator('[role="dialog"]')).toBeVisible()`

---

## Step 7 — 3-dot menu on a post authored by the current user (Edit / Delete)

**Action:** Navigate to one of your own posts (via My Posts or directly). Click the 3-dot menu.

### Behavior
- Menu opens with `Edit` and `Delete` options (no Report).
- `Edit` → navigates to the Edit Post page (covered by Edit / Delete Post flow).
- `Delete` → opens confirmation modal:
  - **If post has comments:** content replaced with "Deleted by author" placeholder; comments remain visible.
  - **If post has no comments:** post removed permanently.

### Assertions
- `await page.locator('[data-testid="post-more"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Edit")')).toBeVisible()`
- `await expect(page.locator('[role="menuitem"]:has-text("Delete")')).toBeVisible()`
- `await expect(page.locator('[role="menuitem"]:has-text("Report")')).not.toBeVisible()`

---

## Step 8 — Click external link preview card

**Action:** If the post has an external link, click the preview card.

### Behavior
- Opens the target URL in a new tab (`target="_blank"`).
- Current page remains on the Single Post View.

### Assertions
- `const [newTab] = await Promise.all([`
- `  page.context().waitForEvent('page'),`
- `  page.locator('[data-testid="external-link-card"]').click(),`
- `])`
- `await newTab.waitForLoadState()`
- `expect(newTab.url()).not.toContain('talktravel.com')`

---

## Step 9 — Add a top-level comment

**Action:** Type text in the comment input box and click `Reply` (or Submit).

### Behavior
- New comment appears at the top of the thread (Newest sort default).
- User earns +2 Jetfuel.
- Comment author is the current user.
- Comment timestamp shown.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Comment input | `[data-testid="comment-input"]` |
| Submit comment | `button:has-text("Reply")` or `[data-testid="comment-submit"]` |
| Comment row | `[data-testid="comment"]` |

### Assertions
- `await page.locator('[data-testid="comment-input"]').fill('Test comment from automation')`
- `await page.locator('[data-testid="comment-submit"]').click()`
- `await expect(page.locator('[data-testid="comment"]').first()).toContainText('Test comment from automation')`

---

## Step 10 — Reply to a comment (level 2)

**Action:** Click `Reply` under an existing top-level comment. Type text and submit.

### Behavior
- Reply box opens inline directly under the parent comment.
- Submission creates a nested reply at level 2 (indented).
- Page auto-scrolls to the new reply.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Reply button on comment | `[data-testid="comment"] >> button:has-text("Reply")` |
| Inline reply input | `[data-testid="comment-reply-input"]` |
| Reply submit | `[data-testid="comment-reply-submit"]` |
| Nested reply | `[data-testid="comment"][data-level="2"]` or `[data-testid="comment"] [data-testid="comment"]` |

### Assertions
- `const firstComment = page.locator('[data-testid="comment"]').first()`
- `await firstComment.locator('button:has-text("Reply")').click()`
- `await page.locator('[data-testid="comment-reply-input"]').fill('Level 2 reply')`
- `await page.locator('[data-testid="comment-reply-submit"]').click()`
- `await expect(firstComment.locator('[data-testid="comment"]').first()).toContainText('Level 2 reply')`

---

## Step 11 — Threaded replies up to level 4

**Action:** Reply to a level-2 reply (creates level 3). Reply to that (level 4). Then reply to the level-4 reply.

### Behavior
- Levels 2, 3, 4 each indent further than the previous.
- A reply to a level-4 comment **stays flattened at level 4** (no level 5 indentation).
- The reply itself is added correctly; only the visual depth caps at 4.

### Assertions
- `// After creating level 3 and 4 replies via the same Reply flow as Step 10`
- `await expect(page.locator('[data-testid="comment"][data-level="3"]').first()).toBeVisible()`
- `await expect(page.locator('[data-testid="comment"][data-level="4"]').first()).toBeVisible()`
- `// After replying to level-4 comment:`
- `await expect(page.locator('[data-testid="comment"][data-level="5"]')).toHaveCount(0)`
- `await expect(page.locator('[data-testid="comment"][data-level="4"]')).toHaveCount(/* original + 1 */)`

---

## Step 12 — Upvote a comment

**Action:** Click Upvote on any comment.

### Behavior
- Comment vote count increments.
- Upvote button visually active.

### Assertions
- `const comment = page.locator('[data-testid="comment"]').first()`
- `const initial = parseInt(await comment.locator('[data-testid="comment-vote-count"]').textContent())`
- `await comment.locator('[data-testid="comment-upvote"]').click()`
- `await expect(comment.locator('[data-testid="comment-vote-count"]')).toHaveText(String(initial + 1))`

---

## Step 13 — Share a comment

**Action:** Click Share on any comment.

### Behavior
- Direct link to that comment is copied to clipboard (`/post/{slug}#comment-{id}` or similar).
- Toast confirmation appears.

### Assertions
- `await page.locator('[data-testid="comment"]').first().locator('button:has-text("Share")').click()`
- `await expect(page.locator('text=/Link copied|Copied/')).toBeVisible()`

---

## Step 14 — Sort comments: Newest → Oldest

**Action:** Click the sort dropdown. Select `Oldest`.

### Behavior
- Comment thread reorders by oldest-first.
- Selection persists on refresh.

### Assertions
- `await page.locator('[data-testid="comment-sort"]').click()`
- `await page.locator('[role="option"]:has-text("Oldest")').click()`
- `await expect(page.locator('[data-testid="comment-sort"]')).toContainText('Oldest')`
- `// (Optional) capture first comment timestamp, refresh, confirm order preserved`

---

## Step 15 — Edit own comment (Edited label)

**Action:** Click 3-dot on a comment authored by the current user. Select `Edit`. Modify text. Save.

### Behavior
- Inline editable box appears with original text pre-filled.
- After saving, comment shows updated text and an `Edited` label or timestamp.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| 3-dot on comment | `[data-testid="comment"] >> button[aria-label="More"]` |
| Edit option | `[role="menuitem"]:has-text("Edit")` |
| Inline edit textarea | `[data-testid="comment-edit-input"]` |
| Save button | `[data-testid="comment-edit-save"]` |
| Edited label | `[data-testid="edited-label"]` or `text=/Edited/i` |

### Assertions
- `const myComment = page.locator('[data-testid="comment"][data-author="<current-user>"]').first()`
- `await myComment.locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Edit")').click()`
- `await myComment.locator('[data-testid="comment-edit-input"]').fill('Edited text by automation')`
- `await myComment.locator('[data-testid="comment-edit-save"]').click()`
- `await expect(myComment).toContainText('Edited text by automation')`
- `await expect(myComment.locator('[data-testid="edited-label"]')).toBeVisible()`

---

## Step 16 — Delete own comment

**Action:** Click 3-dot on a comment authored by the current user. Select `Delete`. Confirm.

### Behavior
- Confirmation dialog opens (Delete / Cancel).
- **If comment has child replies:** content replaced with "Deleted by author" placeholder; child replies remain.
- **If comment has no child replies:** removed permanently.

### Assertions
- `await myComment.locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Delete")').click()`
- `await page.locator('[role="dialog"] >> button:has-text("Delete")').click()`
- `// If had children:`
- `await expect(myComment).toContainText('Deleted by author')`
- `// If no children:`
- `await expect(myComment).not.toBeVisible()`

---

## Step 17 — Report another user's comment

**Action:** Click 3-dot on a comment NOT authored by the current user. Select `Report`.

### Behavior
- Report modal opens (Reason mandatory dropdown, Additional details optional, Submit Report / Cancel).
- Same modal contract as post-level report.

### Assertions
- `await page.locator('[data-testid="comment"]').first().locator('button[aria-label="More"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Report")')).toBeVisible()`
- `await page.locator('[role="menuitem"]:has-text("Report")').click()`
- `await expect(page.locator('[role="dialog"]')).toBeVisible()`

---

## Step 18 — Click author / topic chip on the post

**Action:** Click the post author username (or avatar). Then go back. Click a topic chip.

### Behavior
- Author click → opens author's user profile (post-login).
- Topic chip click → opens topic detail page (post-login).

### Assertions
- `await page.locator('[data-testid="post-author"]').click()`
- `await expect(page).toHaveURL(/\/user\/[a-zA-Z0-9_-]+/)`
- `await page.goBack()`
- `await page.locator('[data-testid="topic-chip"]').first().click()`
- `await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+/)`

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'auth/loggedIn.json' });

test('Open post, vote, follow', async ({ page }) => {
  await page.goto('https://talktravel.com/');
  await page.locator('[data-testid="post-card"]').first().click();
  await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);

  // Upvote
  const initial = parseInt(await page.locator('[data-testid="post-vote-count"]').textContent());
  await page.locator('[data-testid="post-upvote"]').click();
  await expect(page.locator('[data-testid="post-vote-count"]')).toHaveText(String(initial + 1));

  // Follow
  await page.locator('button:has-text("Follow")').click();
  await expect(page.locator('button:has-text("Following")')).toBeVisible();
});

test('Add comment and reply (level 2)', async ({ page }) => {
  await page.goto('https://talktravel.com/');
  await page.locator('[data-testid="post-card"]').first().click();

  // Top-level comment
  await page.locator('[data-testid="comment-input"]').fill('Top-level comment');
  await page.locator('[data-testid="comment-submit"]').click();
  const firstComment = page.locator('[data-testid="comment"]').first();
  await expect(firstComment).toContainText('Top-level comment');

  // Reply to it
  await firstComment.locator('button:has-text("Reply")').click();
  await page.locator('[data-testid="comment-reply-input"]').fill('Level 2 reply');
  await page.locator('[data-testid="comment-reply-submit"]').click();
  await expect(firstComment.locator('[data-testid="comment"]').first()).toContainText('Level 2 reply');
});

test('Threaded replies cap at level 4', async ({ page }) => {
  await page.goto('https://talktravel.com/post/seed-thread-post'); // seed post with thread up to level 4

  // Reply to existing level-4 comment
  const level4 = page.locator('[data-testid="comment"][data-level="4"]').first();
  await level4.locator('button:has-text("Reply")').click();
  await page.locator('[data-testid="comment-reply-input"]').fill('Reply to level 4');
  await page.locator('[data-testid="comment-reply-submit"]').click();

  // Reply should be added at level 4 (flattened), not level 5
  await expect(page.locator('[data-testid="comment"][data-level="5"]')).toHaveCount(0);
  await expect(page.locator('text=Reply to level 4')).toBeVisible();
});

test('Sort comments — Newest then Oldest', async ({ page }) => {
  await page.goto('https://talktravel.com/post/seed-multi-comment-post');

  // Default Newest — capture first comment
  const newestFirst = await page.locator('[data-testid="comment"]').first().getAttribute('data-comment-id');

  // Switch to Oldest
  await page.locator('[data-testid="comment-sort"]').click();
  await page.locator('[role="option"]:has-text("Oldest")').click();
  const oldestFirst = await page.locator('[data-testid="comment"]').first().getAttribute('data-comment-id');

  expect(newestFirst).not.toBe(oldestFirst);
});

test('3-dot menu on own vs others\' post', async ({ page }) => {
  // Own post
  await page.goto('https://talktravel.com/post/my-own-seed-post');
  await page.locator('[data-testid="post-more"]').click();
  await expect(page.locator('[role="menuitem"]:has-text("Edit")')).toBeVisible();
  await expect(page.locator('[role="menuitem"]:has-text("Delete")')).toBeVisible();
  await expect(page.locator('[role="menuitem"]:has-text("Report")')).not.toBeVisible();

  // Others' post
  await page.goto('https://talktravel.com/post/another-users-post');
  await page.locator('[data-testid="post-more"]').click();
  await expect(page.locator('[role="menuitem"]:has-text("Report")')).toBeVisible();
  await expect(page.locator('[role="menuitem"]:has-text("Edit")')).not.toBeVisible();
});

test('Edit own comment shows Edited label', async ({ page }) => {
  await page.goto('https://talktravel.com/post/seed-post-with-my-comment');
  const myComment = page.locator('[data-testid="comment"][data-author="automation_user"]').first();

  await myComment.locator('button[aria-label="More"]').click();
  await page.locator('[role="menuitem"]:has-text("Edit")').click();
  await myComment.locator('[data-testid="comment-edit-input"]').fill('Edited comment text');
  await myComment.locator('[data-testid="comment-edit-save"]').click();

  await expect(myComment).toContainText('Edited comment text');
  await expect(myComment.locator('[data-testid="edited-label"]')).toBeVisible();
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Direct navigation to `/post/{valid-slug}` | Post loads correctly; comment thread loads |
| 2 | Direct navigation to `/post/nonexistent-slug` | Graceful 404 or "Post not found" state |
| 3 | Direct navigation to `/post/{slug}#comment-{id}` | Page loads scrolled to that comment; comment is highlighted |
| 4 | Upvote then click Upvote again (toggle off) | Vote count returns to original; button no longer active |
| 5 | Downvote then click Downvote again (toggle off) | Vote count returns to original |
| 6 | Switch from Downvote to Upvote on same post | Count adjusts by +2 |
| 7 | Click Follow then Unfollow rapidly | State toggles back to default; no duplicate state |
| 8 | Click Share — clipboard read access denied (headless) | Test should mock or grant clipboard permission |
| 9 | Post with no external link | External link card not rendered |
| 10 | Post with external link | Card opens target URL in new tab |
| 11 | Post with deleted author | Author block shows "Deleted user" placeholder OR generic avatar |
| 12 | Post with 0 comments | "No comments yet" empty state; comment input still visible |
| 13 | Post with many comments (50+) | Thread paginates OR uses load-more (confirm) |
| 14 | Submit empty comment | Submit button disabled OR inline error |
| 15 | Submit comment with only whitespace | Treated as empty |
| 16 | Submit comment with very long text (>5000 chars) | Either truncated, scrollable, or rejected (confirm) |
| 17 | Reply to a reply (level 3) | New reply appears at level 3 |
| 18 | Reply to a level-4 reply | New reply appears at level 4 (flattened, not level 5) |
| 19 | Edit a comment that has child replies | Edit succeeds; child replies remain |
| 20 | Delete a comment that has child replies | "Deleted by author" placeholder shown; child replies remain |
| 21 | Delete a comment with no children | Removed permanently |
| 22 | Delete a post with comments | "Deleted by author" placeholder on post body; comments remain |
| 23 | Delete a post with no comments | Post removed; redirects to previous page or homepage |
| 24 | Report submitted without selecting reason | Inline error; modal stays open |
| 25 | Report submitted successfully | Confirmation toast; modal closes; post remains visible |
| 26 | Sort comments Newest → Oldest → refresh | Sort selection persists |
| 27 | Open `/post/{slug}` in incognito (logged out) | Pre-login view (covered by pre-login Post View flow) |
| 28 | Session expires while viewing post | Next interaction redirects to Login |
| 29 | Two browser tabs: vote in one, check the other | Vote count updates on refresh OR real-time (confirm) |
| 30 | Edit own comment, save, then edit again | Both edits accepted; only one Edited label shown |
| 31 | Rich-text formatting in comment (bold/italic/list) | Renders correctly in published comment |
| 32 | Image insertion in comment | Image uploads and renders in comment (confirm support) |
| 33 | Comment input with `@mention` or `#topic` | Mention/topic chip created (confirm behavior) |
| 34 | Vote on a comment by a blocked user | Either blocked OR shown with restricted state (confirm) |
| 35 | Mobile viewport (~375px) | Layout reflows; thread indentation reduces; comment input sticky at bottom |
| 36 | Reduced motion preference | No animation on comment add/scroll |
| 37 | Slow network | Loading skeletons for comments; optimistic UI for votes (confirm) |
| 38 | Open Share, click Cancel/dismiss | No clipboard write; no state change |

---

## Known issues to watch for

- The `Reply` button on the comment input is shared between top-level comments and replies — make sure tests target the correct one in the DOM tree.
- Threaded reply depth (4 levels) is enforced visually; the backend may still accept deeper nesting. Tests should focus on the rendered indentation cap.
- `Edited` label appearance varies — could be inline text ("Edited"), a timestamp ("Edited 2m ago"), or an icon. Confirm production rendering.
- "Deleted by author" placeholder copy may differ slightly — use a regex matcher (`/Deleted/i`).
- 3-dot menu visibility for own vs others' content relies on backend authorship checks. Tests must use distinct accounts to verify both branches.
- Share button behavior depends on browser clipboard permissions. In headless mode, grant clipboard access in Playwright context.
- External link preview cards are generated server-side; if the linked URL is unreachable, the card may render with a fallback or be omitted.
- Comment sort selection may persist via local storage, URL param, or backend preference — confirm before relying on cross-session persistence.
- Vote counts and Jetfuel updates may be eventually consistent. Allow short waits before asserting Jetfuel deltas in the user profile.
- Real-time updates (live vote count changes, live new comments) may or may not be implemented. Tests should be tolerant of both polling and websocket models.

---

## Notes for the automation engineer

- **Two accounts are required.** Set up `auth/owner.json` (a user with at least one published post) and `auth/visitor.json` (a different user) so you can test both 3-dot menu branches and self-vs-others comment rules.
- Use `storageState` per test or per `test.describe` block — much faster than logging in each time.
- For threaded reply tests, seed a post with a pre-existing 4-level thread to avoid recreating the tree each run. Alternatively, build the tree in a `beforeAll` fixture.
- Capture comment IDs from `data-comment-id` attributes when verifying sort order or edit/delete behavior. Don't rely on text content alone — duplicate text can collide.
- For Edited label tests, use a regex matcher rather than exact text since the label may include a timestamp.
- For Share / clipboard tests, grant clipboard read/write permissions in the Playwright context:
```js
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });
```
- For external link tests, use `context.waitForEvent('page')` to capture the new tab.
- Clean up after destructive tests — comments/posts created during tests should be deleted in `afterEach` to avoid polluting the dataset, OR run against a disposable test environment.
- For Report submission, do NOT actually submit reports against production posts — use a staging environment or seed reportable test posts.
- Confirm with engineering whether vote counts are absolute (final value from server) or optimistic (incremented client-side). Assertions may need to allow short retry windows.
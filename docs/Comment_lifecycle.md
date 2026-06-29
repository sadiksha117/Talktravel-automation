# TalkTravel — Flow: Comment Lifecycle (Post-Login)

> **Purpose:** Reference for Playwright automation of the comment lifecycle — adding top-level comments, replying with threading up to 4 levels deep (with flattening past level 4), editing own comments (with "Edited" label), deleting own comments (placeholder vs permanent rules), and the cross-cutting interactions (vote, share). Excludes Report behavior, which lives in its own flow doc.
> **Base URL:** `https://staking.talktravel.com/`
> **Auth state:** Logged in, **verified account required**

> **Prerequisite:** Tests require an authenticated session via `storageState`. Some tests require two accounts (owner of a comment + visitor) to verify own-vs-others UI branches.

---

## Flow overview

```
On a Single Post View:
   Comment input box (rich text)
        ↓ submit
   Top-level comment posted (+2 Jetfuel)
        ↓
   Reply button under comment        →  reply box opens inline
        ↓ submit
   Level 2 reply (nested under parent, indented)
        ↓ continue replying...
   Level 3 → level 4 (each deeper indent)
   Reply at level 4 stays AT level 4 (no level 5 indentation; the reply itself is created)

On any comment (own or others'):
   Upvote / Downvote          →  vote count updates
   Share                      →  link to that specific comment copied

On own comments:
   3-dot → Edit               →  inline editor with original text
        ↓ save
   Comment updates + "Edited" label appears
   3-dot → Delete             →  confirmation dialog
        ↓ confirm
   Branch by child replies:
      Has children            →  "Deleted by author" placeholder; children remain
      No children             →  removed permanently

On others' comments:
   3-dot → Report             →  covered by Report flow doc (separate)
```

The comment surface lives entirely on the Single Post View. Add, Reply, Vote, Share, Edit, Delete all happen within that page. The threading rule (max 4 levels visible indentation) and the delete behavior (placeholder vs permanent based on child presence) mirror the post-level rules — the same engineering pattern applied at a different scope.

---

## Step 1 — Add a top-level comment

**Action:** Open a Single Post View. Type text in the comment input box. Click `Reply` (or Submit).

### Behavior
- New comment appears at the top of the thread (default sort: Newest).
- Author = current user; timestamp shown.
- User earns +2 Jetfuel for the new comment.
- The comment input box clears.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Comment input box | `[data-testid="comment-input"]` or `textarea[placeholder*="comment"]` |
| Submit button | `button:has-text("Reply")` or `[data-testid="comment-submit"]` |
| Comment row | `[data-testid="comment"]` |
| Comment author | `[data-testid="comment"] >> [data-testid="comment-author"]` |
| Comment timestamp | `[data-testid="comment"] >> [data-testid="comment-timestamp"]` |

### Assertions
- `const text = `Top-level comment ${Date.now()}``
- `await page.locator('[data-testid="comment-input"]').fill(text)`
- `await page.locator('[data-testid="comment-submit"]').click()`
- `await expect(page.locator('[data-testid="comment"]').first()).toContainText(text)`
- `await expect(page.locator('[data-testid="comment-input"]')).toHaveValue('')`

---

## Step 2 — Rich-text formatting in a comment

**Action:** In the comment input, use toolbar buttons to apply bold, italic, list, or link formatting before submitting.

### Behavior
- Toolbar supports bold / italic / underline / quote / list / link / image insert (same toolbar as post Discussion editor).
- Formatted text renders correctly in the published comment.

### Assertions
- `await page.locator('[data-testid="comment-input"]').click()`
- `await page.keyboard.type('Bold text')`
- `await page.keyboard.press('Control+A')`
- `await page.locator('button[aria-label="Bold"]').click()`
- `await page.locator('[data-testid="comment-submit"]').click()`
- `await expect(page.locator('[data-testid="comment"]').first().locator('strong')).toBeVisible()`

---

## Step 3 — Validation: empty / whitespace-only comment

**Action:** Click Submit with the comment input empty, or filled with only whitespace.

### Behavior
- Submit button is disabled OR submitting shows an inline error.
- No comment is created.

### Assertions
- `await page.locator('[data-testid="comment-input"]').fill('')`
- `await expect(page.locator('[data-testid="comment-submit"]')).toBeDisabled()`
- `// OR if not disabled:`
- `// await page.locator('[data-testid="comment-submit"]').click()`
- `// await expect(page.locator('text=/cannot be empty|enter a comment/i')).toBeVisible()`

---

## Step 4 — Reply to a comment (level 2)

**Action:** Click `Reply` under any top-level comment. Type text and submit.

### Behavior
- An inline reply box opens directly below the parent comment.
- Submission creates a nested reply at level 2 (indented relative to parent).
- Page auto-scrolls to the new reply.
- The reply box closes after submit.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Reply button on comment | `[data-testid="comment"] >> button:has-text("Reply")` |
| Inline reply input | `[data-testid="comment-reply-input"]` |
| Reply submit | `[data-testid="comment-reply-submit"]` |
| Nested comment (level N) | `[data-testid="comment"][data-level="N"]` |

### Assertions
- `const parent = page.locator('[data-testid="comment"]').first()`
- `await parent.locator('button:has-text("Reply")').click()`
- `await page.locator('[data-testid="comment-reply-input"]').fill('Level 2 reply')`
- `await page.locator('[data-testid="comment-reply-submit"]').click()`
- `await expect(parent.locator('[data-testid="comment"]').first()).toContainText('Level 2 reply')`
- `await expect(page.locator('[data-testid="comment-reply-input"]')).not.toBeVisible()`

---

## Step 5 — Cancel a reply

**Action:** Click `Reply` to open the inline box. Type some text. Click `Cancel` (or click elsewhere).

### Behavior
- Reply box closes.
- No reply is created.
- The typed text is discarded.

### Assertions
- `await parent.locator('button:has-text("Reply")').click()`
- `await page.locator('[data-testid="comment-reply-input"]').fill('Discarded reply')`
- `await page.locator('[data-testid="comment-reply-cancel"]').click()` (or click outside)
- `await expect(page.locator('[data-testid="comment-reply-input"]')).not.toBeVisible()`
- `await expect(parent.locator('[data-testid="comment"]').filter({ hasText: 'Discarded reply' })).toHaveCount(0)`

---

## Step 6 — Build a thread to level 4

**Action:** Reply to a level-2 reply (creates level 3). Reply to that (creates level 4).

### Behavior
- Each level increases visual indentation.
- Level 2, 3, 4 all rendered with progressively deeper indentation.
- Each reply inherits all comment interactions (vote, share, 3-dots, reply).

### Assertions
- `await expect(page.locator('[data-testid="comment"][data-level="2"]').first()).toBeVisible()`
- `await expect(page.locator('[data-testid="comment"][data-level="3"]').first()).toBeVisible()`
- `await expect(page.locator('[data-testid="comment"][data-level="4"]').first()).toBeVisible()`

---

## Step 7 — Reply at level 4 stays at level 4 (flattening rule)

**Action:** Reply to an existing level-4 comment.

### Behavior
- The reply is CREATED (not blocked).
- It appears at level 4 — NOT level 5.
- Backend may store it as a level-5 descendant, but the UI flattens it to level 4 indentation.
- This rule prevents deeply nested threads from becoming visually unreadable.

### Assertions
- `const level4 = page.locator('[data-testid="comment"][data-level="4"]').first()`
- `await level4.locator('button:has-text("Reply")').click()`
- `await page.locator('[data-testid="comment-reply-input"]').fill('Reply to level 4')`
- `await page.locator('[data-testid="comment-reply-submit"]').click()`
- `await expect(page.locator('text=Reply to level 4')).toBeVisible()`
- `await expect(page.locator('[data-testid="comment"][data-level="5"]')).toHaveCount(0)`

---

## Step 8 — Upvote a comment

**Action:** Click the Upvote button on any comment.

### Behavior
- Vote count increments by 1.
- Upvote button visually active.
- Commenter (if not the current user) gains engagement Jetfuel; current user gains +1 Jetfuel for upvoting.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Comment upvote | `[data-testid="comment"] >> [data-testid="comment-upvote"]` |
| Comment downvote | `[data-testid="comment"] >> [data-testid="comment-downvote"]` |
| Comment vote count | `[data-testid="comment-vote-count"]` |

### Assertions
- `const comment = page.locator('[data-testid="comment"]').first()`
- `const initial = parseInt(await comment.locator('[data-testid="comment-vote-count"]').textContent())`
- `await comment.locator('[data-testid="comment-upvote"]').click()`
- `await expect(comment.locator('[data-testid="comment-vote-count"]')).toHaveText(String(initial + 1))`

---

## Step 9 — Downvote a comment (switch from upvote)

**Action:** With Upvote currently active, click Downvote on the same comment.

### Behavior
- Vote count adjusts by −2 (removes the +1, applies −1).
- Downvote button becomes active; Upvote becomes inactive.

### Assertions
- `const before = parseInt(await comment.locator('[data-testid="comment-vote-count"]').textContent())`
- `await comment.locator('[data-testid="comment-downvote"]').click()`
- `await expect(comment.locator('[data-testid="comment-vote-count"]')).toHaveText(String(before - 2))`

---

## Step 10 — Share a comment

**Action:** Click `Share` on any comment.

### Behavior
- A direct link to that comment is copied to the clipboard (format: `/post/{slug}#comment-{id}` or similar).
- Toast confirmation: *"Link copied"*.

### Assertions
- `await page.locator('[data-testid="comment"]').first().locator('button:has-text("Share")').click()`
- `await expect(page.locator('text=/Link copied|Copied/')).toBeVisible()`

---

## Step 11 — 3-dot menu on own comment

**Action:** Click the 3-dot menu on a comment authored by the current user.

### Behavior
- Menu shows `Edit` and `Delete` (no `Report`).

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| 3-dot menu on comment | `[data-testid="comment"] >> button[aria-label="More"]` |
| Edit option | `[role="menuitem"]:has-text("Edit")` |
| Delete option | `[role="menuitem"]:has-text("Delete")` |

### Assertions
- `const myComment = page.locator('[data-testid="comment"][data-author="<current-user>"]').first()`
- `await myComment.locator('button[aria-label="More"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Edit")')).toBeVisible()`
- `await expect(page.locator('[role="menuitem"]:has-text("Delete")')).toBeVisible()`
- `await expect(page.locator('[role="menuitem"]:has-text("Report")')).not.toBeVisible()`

---

## Step 12 — 3-dot menu on another user's comment

**Action:** Click the 3-dot menu on a comment NOT authored by the current user.

### Behavior
- Menu shows only `Report` (no `Edit` or `Delete`).
- Clicking `Report` triggers the Report flow (separate doc).

### Assertions
- `const othersComment = page.locator('[data-testid="comment"]:not([data-author="<current-user>"])').first()`
- `await othersComment.locator('button[aria-label="More"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Report")')).toBeVisible()`
- `await expect(page.locator('[role="menuitem"]:has-text("Edit")')).not.toBeVisible()`
- `await expect(page.locator('[role="menuitem"]:has-text("Delete")')).not.toBeVisible()`

---

## Step 13 — Edit own comment (Edited label appears)

**Action:** Open 3-dot menu on own comment. Click `Edit`. Modify the text. Click Save.

### Behavior
- An inline editable box appears, pre-filled with the original comment text.
- After Save, the comment displays the updated text.
- An `Edited` label/timestamp appears next to the original timestamp.
- The edit replaces the original text — there's no version history visible to other users.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Inline edit textarea | `[data-testid="comment-edit-input"]` |
| Save button | `[data-testid="comment-edit-save"]` |
| Cancel edit button | `[data-testid="comment-edit-cancel"]` |
| Edited label | `[data-testid="edited-label"]` or `text=/Edited/i` |

### Assertions
- `await myComment.locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Edit")').click()`
- `await expect(myComment.locator('[data-testid="comment-edit-input"]')).toHaveValue(/* original text */)`
- `await myComment.locator('[data-testid="comment-edit-input"]').fill('Edited by automation')`
- `await myComment.locator('[data-testid="comment-edit-save"]').click()`
- `await expect(myComment).toContainText('Edited by automation')`
- `await expect(myComment.locator('[data-testid="edited-label"]')).toBeVisible()`

---

## Step 14 — Cancel an edit

**Action:** Open the edit input. Modify the text. Click `Cancel`.

### Behavior
- Inline editor closes.
- Original comment text is restored.
- No `Edited` label is added.

### Assertions
- `await myComment.locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Edit")').click()`
- `const originalText = await myComment.locator('[data-testid="comment-edit-input"]').inputValue()`
- `await myComment.locator('[data-testid="comment-edit-input"]').fill('This will be discarded')`
- `await myComment.locator('[data-testid="comment-edit-cancel"]').click()`
- `await expect(myComment.locator('[data-testid="comment-edit-input"]')).not.toBeVisible()`
- `await expect(myComment).toContainText(originalText)`
- `await expect(myComment).not.toContainText('This will be discarded')`

---

## Step 15 — Multiple edits show single Edited label

**Action:** Edit a comment. Edit it again.

### Behavior
- Both edits succeed.
- Only ONE `Edited` label is shown (its timestamp updates to reflect the most recent edit).
- The label is NOT duplicated or stacked.

### Assertions
- `// First edit`
- `await myComment.locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Edit")').click()`
- `await myComment.locator('[data-testid="comment-edit-input"]').fill('First edit')`
- `await myComment.locator('[data-testid="comment-edit-save"]').click()`
- `// Second edit`
- `await myComment.locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Edit")').click()`
- `await myComment.locator('[data-testid="comment-edit-input"]').fill('Second edit')`
- `await myComment.locator('[data-testid="comment-edit-save"]').click()`
- `await expect(myComment.locator('[data-testid="edited-label"]')).toHaveCount(1)`

---

## Step 16 — Delete own comment with NO child replies (permanent)

**Action:** Open 3-dot menu on own comment that has no replies. Click `Delete`. Confirm.

### Behavior
- Confirmation dialog opens (Delete / Cancel).
- On Delete: comment is removed permanently from the thread.
- Comment count on the post may decrement.

### Assertions
- `await myComment.locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Delete")').click()`
- `await expect(page.locator('[role="dialog"]')).toBeVisible()`
- `await page.locator('[role="dialog"] >> button:has-text("Delete")').click()`
- `await expect(myComment).not.toBeVisible()`

---

## Step 17 — Delete own comment WITH child replies (placeholder)

**Action:** Open 3-dot menu on own comment that has at least one reply. Click `Delete`. Confirm.

### Behavior
- Confirmation dialog opens.
- On Delete:
  - The comment's content is replaced with a `Deleted by author` placeholder.
  - The comment row itself stays in the thread.
  - All child replies remain fully visible and interactive.
  - The comment's vote / share / 3-dot are removed or disabled on the placeholder.

### Assertions
- `// Seed: a comment with at least one reply, captured as parentCommentWithReplies`
- `await parentCommentWithReplies.locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Delete")').click()`
- `await page.locator('[role="dialog"] >> button:has-text("Delete")').click()`
- `await expect(parentCommentWithReplies).toContainText(/Deleted by author/i)`
- `await expect(parentCommentWithReplies.locator('[data-testid="comment"]').first()).toBeVisible()` (child reply still there)

---

## Step 18 — Cancel a delete

**Action:** Open the confirmation dialog. Click `Cancel`.

### Behavior
- Dialog closes.
- Comment is NOT deleted.
- No state changes.

### Assertions
- `await myComment.locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Delete")').click()`
- `await page.locator('[role="dialog"] >> button:has-text("Cancel")').click()`
- `await expect(page.locator('[role="dialog"]')).not.toBeVisible()`
- `await expect(myComment).toBeVisible()`

---

## Step 19 — Sort comments: Newest ↔ Oldest

**Action:** Click the comment sort dropdown. Select `Oldest`. Then switch back to `Newest`.

### Behavior
- Thread reorders by oldest-first (or newest-first).
- The selection persists across page refresh (confirm with engineering — local storage / URL / backend).
- Thread structure (replies under parents) is preserved; only top-level ordering changes.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Sort dropdown | `[data-testid="comment-sort"]` |
| Newest option | `[role="option"]:has-text("Newest")` |
| Oldest option | `[role="option"]:has-text("Oldest")` |

### Assertions
- `await page.locator('[data-testid="comment-sort"]').click()`
- `await page.locator('[role="option"]:has-text("Oldest")').click()`
- `await expect(page.locator('[data-testid="comment-sort"]')).toContainText('Oldest')`

---

## Step 20 — Comment counts and Jetfuel

**Action:** After posting a comment, verify the user's Jetfuel count increased by 2.

### Behavior
- Each new comment earns +2 Jetfuel for the commenter.
- Vote interactions earn +1 (upvote) / −1 (downvote) for the voter.
- The post owner may also receive engagement Jetfuel (confirm with engineering).
- Jetfuel updates may be eventually consistent; allow brief wait or refresh.

### Assertions
- `// Capture before`
- `await page.goto('https://talktravel.com/user/<my-username>')`
- `const before = parseInt(await page.locator('[data-testid="jetfuel-count"]').textContent())`
- `// ... add a comment ...`
- `await page.goto('https://talktravel.com/user/<my-username>')`
- `const after = parseInt(await page.locator('[data-testid="jetfuel-count"]').textContent())`
- `expect(after).toBe(before + 2)`

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'auth/verified.json' });

let seedPostSlug;

test.beforeEach(async ({ request }) => {
  seedPostSlug = await seedPostViaApi({ title: `Comment test ${Date.now()}`, topics: ['Airlines'] });
});

test('Add top-level comment', async ({ page }) => {
  await page.goto(`https://talktravel.com/post/${seedPostSlug}`);
  const text = `Top-level ${Date.now()}`;
  await page.locator('[data-testid="comment-input"]').fill(text);
  await page.locator('[data-testid="comment-submit"]').click();
  await expect(page.locator('[data-testid="comment"]').first()).toContainText(text);
});

test('Reply creates a level-2 nested comment', async ({ page }) => {
  await page.goto(`https://talktravel.com/post/${seedPostSlug}`);
  await page.locator('[data-testid="comment-input"]').fill('Parent');
  await page.locator('[data-testid="comment-submit"]').click();

  const parent = page.locator('[data-testid="comment"]').first();
  await parent.locator('button:has-text("Reply")').click();
  await page.locator('[data-testid="comment-reply-input"]').fill('Level 2');
  await page.locator('[data-testid="comment-reply-submit"]').click();
  await expect(parent.locator('[data-testid="comment"]').first()).toContainText('Level 2');
});

test('Threading caps at level 4', async ({ page }) => {
  // Use a seed post pre-populated with a 4-level deep thread
  await page.goto('https://talktravel.com/post/seed-4-level-thread');
  const level4 = page.locator('[data-testid="comment"][data-level="4"]').first();
  await level4.locator('button:has-text("Reply")').click();
  await page.locator('[data-testid="comment-reply-input"]').fill('Reply to level 4');
  await page.locator('[data-testid="comment-reply-submit"]').click();

  await expect(page.locator('text=Reply to level 4')).toBeVisible();
  await expect(page.locator('[data-testid="comment"][data-level="5"]')).toHaveCount(0);
});

test('Edit own comment shows Edited label', async ({ page }) => {
  await page.goto(`https://talktravel.com/post/${seedPostSlug}`);
  await page.locator('[data-testid="comment-input"]').fill('Original');
  await page.locator('[data-testid="comment-submit"]').click();

  const myComment = page.locator('[data-testid="comment"]').first();
  await myComment.locator('button[aria-label="More"]').click();
  await page.locator('[role="menuitem"]:has-text("Edit")').click();
  await myComment.locator('[data-testid="comment-edit-input"]').fill('Edited');
  await myComment.locator('[data-testid="comment-edit-save"]').click();

  await expect(myComment).toContainText('Edited');
  await expect(myComment.locator('[data-testid="edited-label"]')).toBeVisible();
});

test('Delete own comment without replies → permanent', async ({ page }) => {
  await page.goto(`https://talktravel.com/post/${seedPostSlug}`);
  await page.locator('[data-testid="comment-input"]').fill('To be deleted');
  await page.locator('[data-testid="comment-submit"]').click();

  const myComment = page.locator('[data-testid="comment"]').first();
  await myComment.locator('button[aria-label="More"]').click();
  await page.locator('[role="menuitem"]:has-text("Delete")').click();
  await page.locator('[role="dialog"] >> button:has-text("Delete")').click();

  await expect(myComment).not.toBeVisible();
});

test('Delete own comment with replies → placeholder; replies preserved', async ({ page }) => {
  await page.goto(`https://talktravel.com/post/${seedPostSlug}`);

  // Create parent comment
  await page.locator('[data-testid="comment-input"]').fill('Parent comment');
  await page.locator('[data-testid="comment-submit"]').click();
  const parent = page.locator('[data-testid="comment"]').first();

  // Reply to it
  await parent.locator('button:has-text("Reply")').click();
  await page.locator('[data-testid="comment-reply-input"]').fill('Child reply');
  await page.locator('[data-testid="comment-reply-submit"]').click();

  // Delete the parent
  await parent.locator('button[aria-label="More"]').first().click();
  await page.locator('[role="menuitem"]:has-text("Delete")').click();
  await page.locator('[role="dialog"] >> button:has-text("Delete")').click();

  await expect(parent).toContainText(/Deleted by author/i);
  await expect(parent.locator('[data-testid="comment"]:has-text("Child reply")')).toBeVisible();
});

test('3-dot menu on own vs others\' comment', async ({ browser }) => {
  // Own comment
  const ownerContext = await browser.newContext({ storageState: 'auth/owner.json' });
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto(`https://talktravel.com/post/${seedPostSlug}`);
  await ownerPage.locator('[data-testid="comment-input"]').fill('Owner comment');
  await ownerPage.locator('[data-testid="comment-submit"]').click();

  // Others' view
  const visitorContext = await browser.newContext({ storageState: 'auth/visitor.json' });
  const visitorPage = await visitorContext.newPage();
  await visitorPage.goto(`https://talktravel.com/post/${seedPostSlug}`);
  await visitorPage.locator('[data-testid="comment"]:has-text("Owner comment")').locator('button[aria-label="More"]').click();
  await expect(visitorPage.locator('[role="menuitem"]:has-text("Report")')).toBeVisible();
  await expect(visitorPage.locator('[role="menuitem"]:has-text("Edit")')).not.toBeVisible();
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Submit comment that's only emojis | Treated as valid; published |
| 2 | Comment with @mention or #topic | Mention chip created / topic linked (confirm support) |
| 3 | Comment with inline image | Image renders correctly in published comment (if supported) |
| 4 | Comment with inline link | Link is clickable in published comment |
| 5 | Very long comment (>5000 chars) | Truncated, scrollable, or rejected (confirm) |
| 6 | Comment with rich formatting persists through edit | Edit preserves formatting |
| 7 | Reply to a level-3 comment creates level 4 | Yes — fourth level reached |
| 8 | Reply to a level-4 comment creates flattened reply | Yes — appears at level 4, no level 5 |
| 9 | Edit a level-4 reply | Edit succeeds; Edited label appears |
| 10 | Delete a level-2 reply that itself has level-3 children | Becomes placeholder; level-3 children preserved |
| 11 | Delete a level-2 reply with no children | Removed permanently |
| 12 | Edit a comment that has the placeholder state (already deleted) | Edit option should NOT be available |
| 13 | Reply to a placeholder ("Deleted by author") comment | Confirm whether reply is allowed on placeholders |
| 14 | Vote on a placeholder comment | Confirm whether vote is allowed |
| 15 | Comment count on post decrements when permanent delete | Yes |
| 16 | Comment count on post stays same when placeholder delete | Confirm with engineering |
| 17 | Sort Newest → Oldest → refresh | Sort selection persists |
| 18 | Submit comment on slow network | Button shows loading state; no double-submit |
| 19 | Session expires mid-comment | Submission fails; redirect to login (confirm) |
| 20 | Two browser tabs: comment in one, view in the other | Other tab updates via real-time OR on refresh |
| 21 | Comment by a user who later deletes their account | Comment may show "Deleted user" attribution |
| 22 | Comment by a user who blocked the viewer | Comment hidden or shown with restricted state (confirm) |
| 23 | Edit comment when post is in placeholder state | Edit should still work — comments are independent |
| 24 | Reply on a comment whose post is in placeholder state | Reply should still work — confirm |
| 25 | Direct URL `/post/{slug}#comment-{id}` | Loads page scrolled to comment; comment highlighted |
| 26 | Share copies comment-specific URL | URL contains comment ID anchor |
| 27 | Comment input keyboard shortcut (e.g., Cmd+Enter to submit) | Submit triggered |
| 28 | Cancel inline edit by pressing Esc | Edit box closes; original text restored |
| 29 | Mobile viewport (~375px) | Thread indentation reduces; reply input may go full-width |
| 30 | Reduced motion preference | No animation on comment add/scroll |
| 31 | Slow network | Loading skeletons for comments; optimistic UI for votes (confirm) |
| 32 | Comment edit response slow | Button shows loading; user cannot double-save |

---

## Known issues to watch for

- The exact threading-depth rule (4 levels visible, deeper flattened) is enforced visually; backend may accept arbitrary nesting. Tests focus on the rendered depth via `data-level` attribute or class indentation.
- "Deleted by author" placeholder copy varies — use a regex matcher.
- The `Edited` label format is unspecified — could be inline text, with timestamp, or icon. Use regex.
- Comment sort persistence mechanism (local storage / URL / backend) is unspecified.
- Whether the post owner receives Jetfuel for receiving comments is unconfirmed.
- Whether comments on placeholder posts behave any differently is unspecified.
- The Cancel-edit and Cancel-reply UI affordances may be buttons OR keyboard Esc OR click-outside — confirm with engineering.
- Real-time comment arrival (a different user comments while you're viewing) may or may not be implemented. Tests should be tolerant of both.
- Vote on comment by a deleted user — backend behavior unclear (allow / block / silently ignore).
- Image insert in comment is mentioned in the source doc; the specific limit / supported formats / upload UX is unspecified.

---

## Notes for the automation engineer

- **Two accounts minimum.** `auth/owner.json` (a user who posts comments) and `auth/visitor.json` (a user viewing those comments) to verify own-vs-others UI branches. For threading and delete-with-children, the owner is sufficient.
- **Seed thread fixtures.** For level-4 threading tests, seed a post with a pre-built 4-level deep thread via API in `beforeEach` or `beforeAll`. Reconstructing the thread manually every test is slow and brittle.
- **Use timestamped comment text** (`Top-level ${Date.now()}`) for unique identification across test runs.
- **Capture comment IDs from `data-comment-id` attributes** when verifying sort order or post-delete state. Don't rely on text content alone — duplicates collide.
- **For Edited label**, use a regex matcher (`text=/Edited/i`).
- **For placeholder copy**, use a regex matcher (`text=/Deleted by author|Deleted/i`).
- **For Cancel UI**, write tests against both potential affordances: explicit Cancel button AND Esc keyboard shortcut, then trim based on what engineering implements.
- **Cleanup.** Each test creates new comments; they accumulate over time. Either delete via API in `afterEach`, run on a disposable env, or accept the pollution.
- **For Jetfuel assertions**, refresh the profile page after the action and allow a short wait for eventual consistency:
```js
  await page.waitForTimeout(500);
  await page.goto(profileUrl);
```
- **For 3-dot menu tests**, prefer ARIA roles (`role="menuitem"`) over class names.
- **For clipboard tests** (Share), grant permissions in Playwright context:
```js
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });
```
- **Avoid hardcoded slugs.** Always capture seed post slug at runtime.
- **For two-account tests, use `browser.newContext({ storageState: ... })`** rather than logout/login, much faster.
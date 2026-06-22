# TalkTravel — Flow: Edit Post (Post-Login)

> **Purpose:** Reference for Playwright automation of the Edit Post flow — opening the edit form for an owned post from any entry surface, verifying form pre-fill, editing all four fields (Title / Discussion / External Link / Topics), validating field rules, submitting via `Update Post`, exiting via `Cancel`, and confirming that the "Edited" timestamp appears and that updates propagate across all surfaces (feed, topic pages, My Posts).
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged in, **must be the post author**

> **Prerequisite:** Tests require a verified account that has at least one published post. Use `storageState` from a logged-in account, and seed at least one post (via API or a pre-test fixture) before exercising this flow.

---

## Flow overview

```
Owner identifies edit entry point:
   Homepage feed         → 3-dots → Edit Post     ─┐
   Single Post View      → 3-dots → Edit Post     ─┼─→  Edit Post page (/post/{slug}/edit)
   My Posts (left nav)   → 3-dots → Edit          ─┘

On the Edit Post page:
   Form pre-fills with existing Title, Discussion, External Link, Topics
        ↓
   User edits any fields (same rules as Create Post: Title*, Topics* min 1 / max 5)
        ↓
   ┌───────────────────────┐         ┌──────────────────┐
   │ Click Update Post     │         │ Click Cancel     │
   └───────────────────────┘         └──────────────────┘
        ↓                                   ↓
   Validates → saves                  Exits without saving
        ↓                                   ↓
   Redirects to /post/{slug}          Returns to previous page
   "Edited" label appears
   Updates visible across feed, topic pages, My Posts
```

Edit Post is **owner-only**. The form is identical in structure to Create Post but pre-filled with the post's current values. The same validation rules apply: Title is required, Topics must contain at least 1 and at most 5 chips, duplicate topics are blocked, and the External Link URL must be valid. Successful update redirects to the Single Post View, which now shows an `Edited` label/timestamp alongside the original post timestamp.

---

## Step 1 — Open Edit Post via 3-dot menu on Homepage feed

**Action:** From the Homepage feed (logged in as the post author), find your own post. Click the 3-dot menu. Click `Edit Post`.
**Expected URL:** `/post/{slug}/edit` (confirm exact pattern with engineering — may also be `/edit-post/{slug}` or include a query param).

### Behavior
- The 3-dot menu on own posts shows `Edit Post` and `Delete Post` (no `Report`).
- Clicking `Edit Post` navigates to the edit form, pre-filled with the post's current values.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| 3-dot menu on post card | `[data-testid="post-card"] >> button[aria-label="More"]` |
| Edit Post menu item | `[role="menuitem"]:has-text("Edit Post")` |

### Assertions
- `// Filter to a post authored by current user`
- `const ownPost = page.locator('[data-testid="post-card"][data-author="<current-user>"]').first()`
- `await ownPost.locator('button[aria-label="More"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Edit Post")')).toBeVisible()`
- `await page.locator('[role="menuitem"]:has-text("Edit Post")').click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+\/edit/)`

---

## Step 2 — Open Edit Post via Single Post View

**Action:** Open one of your own posts directly (Single Post View). Click the 3-dot menu in the post header. Click `Edit Post`.
**Expected URL:** `/post/{slug}/edit`

### Behavior
- Same destination as Step 1.
- 3-dot menu on the post itself (not on a comment) shows `Edit Post` and `Delete Post`.

### Assertions
- `await page.goto('https://talktravel.com/post/<my-seed-post-slug>')`
- `await page.locator('[data-testid="post-more"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Edit Post")').click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+\/edit/)`

---

## Step 3 — Open Edit Post via My Posts (left nav)

**Action:** Click left nav `My Posts`. From the list, click 3-dots on any post. Click `Edit`.
**Expected URL:** `/post/{slug}/edit`

### Behavior
- Same destination as Steps 1 and 2.
- This is the most common entry point when the user explicitly wants to edit something they've authored.

### Assertions
- `await page.locator('nav[aria-label="Primary"] >> text=My Posts').click()`
- `await page.locator('[data-testid="post-card"]').first().locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Edit")').click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+\/edit/)`

---

## Step 4 — Verify form is pre-filled with existing values

**Action:** On the Edit Post page, inspect each form field.

### Behavior
Form must be populated with the current values of the post:
- **Title** — original post title.
- **Discussion** — original post body with all formatting preserved (bold / italic / lists / images / inline links).
- **External Link** — original URL if one was attached, blank otherwise.
- **Topics** — all originally-tagged topics shown as chips.
- **Buttons** — `Update Post` (primary) and `Cancel`.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Title input | `[data-testid="post-title"]` |
| Discussion editor | `[data-testid="post-discussion"] [contenteditable="true"]` |
| External Link input | `[data-testid="external-link"]` |
| Topics input | `[data-testid="topics-input"]` |
| Selected topic chip | `[data-testid="topic-chip-selected"]` |
| Update Post button | `button:has-text("Update Post")` |
| Cancel button | `button:has-text("Cancel")` |

### Assertions
- `await expect(page.locator('[data-testid="post-title"]')).not.toHaveValue('')`
- `await expect(page.locator('[data-testid="post-discussion"] [contenteditable="true"]')).not.toBeEmpty()`
- `await expect(page.locator('[data-testid="topic-chip-selected"]')).toHaveCount(/* original topic count */)`
- `await expect(page.locator('button:has-text("Update Post")')).toBeVisible()`
- `await expect(page.locator('button:has-text("Cancel")')).toBeVisible()`

---

## Step 5 — Edit the Title

**Action:** Clear the Title field. Type a new title.

### Behavior
- Field accepts new text.
- Original value is replaced (not appended).

### Assertions
- `await page.locator('[data-testid="post-title"]').fill('Edited title by automation')`
- `await expect(page.locator('[data-testid="post-title"]')).toHaveValue('Edited title by automation')`

---

## Step 6 — Edit the Discussion (rich text)

**Action:** Click into the Discussion editor. Append text. Apply formatting via the toolbar.

### Behavior
- Existing rich-text content is editable.
- New formatting can be applied alongside existing formatting.
- Image insert continues to work.

### Assertions
- `const editor = page.locator('[data-testid="post-discussion"] [contenteditable="true"]')`
- `await editor.click()`
- `await page.keyboard.press('Control+End')` (or `Meta+End` on Mac)
- `await editor.type(' Additional edited content.')`
- `await expect(editor).toContainText('Additional edited content.')`

---

## Step 7 — Edit the External Link

**Action:** Clear the External Link field (if populated). Enter a new valid URL. Click `Fetch Title` if desired.

### Behavior
- External Link can be added, changed, or removed.
- `Fetch Title` button re-fetches and overwrites the Title (Title remains editable after).

### Assertions
- `await page.locator('[data-testid="external-link"]').fill('https://www.example.com')`
- `await expect(page.locator('[data-testid="external-link"]')).toHaveValue('https://www.example.com')`

---

## Step 8 — Edit Topics: add a new topic

**Action:** Click the Topics input. Type a topic name. Select from the dropdown.

### Behavior
- New chip added below existing chips.
- Total chips must stay within 1–5.
- Duplicate topics blocked (same rule as Create Post).
- Parent + child resolution behaves the same (child wins).

### Assertions
- `await page.locator('[data-testid="topics-input"]').fill('Solo Travel')`
- `await page.locator('[role="option"]:has-text("Solo Travel")').first().click()`
- `await expect(page.locator('[data-testid="topic-chip-selected"]:has-text("Solo Travel")')).toBeVisible()`

---

## Step 9 — Edit Topics: remove an existing topic

**Action:** Click the `X` button on any selected topic chip.

### Behavior
- Chip is removed.
- Topic is no longer associated with the post on Update.
- Cannot remove the last topic if it would leave the post with 0 topics — validation will fire on Update.

### Assertions
- `const firstChip = page.locator('[data-testid="topic-chip-selected"]').first()`
- `await firstChip.locator('button[aria-label="Remove"]').click()`
- `await expect(firstChip).not.toBeVisible()`

---

## Step 10 — Update Post: happy path

**Action:** With Title, Topics, and at least one other field edited, click `Update Post`.
**Expected URL:** `/post/{slug}` (the Single Post View of the now-updated post).

### Behavior
- Form submits.
- Browser redirects to the Single Post View.
- Post header shows the new Title.
- Post body shows the updated Discussion.
- New topic chips reflect the updated selection.
- An `Edited` label / timestamp appears alongside the original post date.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Edited label on Single Post View | `[data-testid="edited-label"]` or `text=/Edited/i` |

### Assertions
- `await page.locator('button:has-text("Update Post")').click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+(?!\/edit)/)`
- `await expect(page.locator('article h1')).toContainText('Edited title by automation')`
- `await expect(page.locator('[data-testid="edited-label"]')).toBeVisible()`

---

## Step 11 — Cancel: exit without saving

**Action:** With unsaved edits in the form, click `Cancel`.
**Expected URL:** previous page (most likely the Single Post View or Homepage).

### Behavior
- Edits are discarded.
- User returns to the previous page.
- _(Optional, confirm with engineering)_ A "Discard changes?" confirmation may appear if the form has been modified.
- The original post data is unchanged.

### Assertions
- `await page.locator('[data-testid="post-title"]').fill('This change will be discarded')`
- `await page.locator('button:has-text("Cancel")').click()`
- `await expect(page).not.toHaveURL(/\/edit$/)`
- `// Reopen the post and verify the title was not changed`

---

## Step 12 — Validation: Title required

**Action:** Clear the Title field entirely. Click `Update Post`.

### Behavior
- Inline error on the Title field (e.g., *"Title is required"*).
- Update does NOT happen; user remains on the edit page.

### Assertions
- `await page.locator('[data-testid="post-title"]').fill('')`
- `await page.locator('button:has-text("Update Post")').click()`
- `await expect(page).toHaveURL(/\/edit$/)`
- `await expect(page.locator('text=/title.*required/i')).toBeVisible()`

---

## Step 13 — Validation: at least one Topic required

**Action:** Remove all topic chips. Click `Update Post`.

### Behavior
- Inline error on Topics field (e.g., *"Select at least one topic"*).
- Update blocked.

### Assertions
- `// Remove all chips`
- `for (const chip of await page.locator('[data-testid="topic-chip-selected"]').all()) {`
- `  await chip.locator('button[aria-label="Remove"]').click()`
- `}`
- `await page.locator('button:has-text("Update Post")').click()`
- `await expect(page).toHaveURL(/\/edit$/)`
- `await expect(page.locator('text=/topic.*required|at least one topic/i')).toBeVisible()`

---

## Step 14 — Validation: invalid External Link URL

**Action:** Replace the External Link with an invalid string (e.g., `not-a-url`). Click `Update Post` OR `Fetch Title`.

### Behavior
- Inline error appears (e.g., *"Invalid URL"*).
- Update / Fetch blocked.

### Assertions
- `await page.locator('[data-testid="external-link"]').fill('not-a-url')`
- `await page.locator('button:has-text("Fetch Title")').click()`
- `await expect(page.locator('text=/invalid.*url|valid url/i')).toBeVisible()`

---

## Step 15 — Verify "Edited" label appears on Single Post View

**Action:** After a successful update, inspect the post header on the Single Post View.

### Behavior
- An `Edited` label or `Edited {timestamp}` appears alongside the original timestamp.
- This label persists on every subsequent view of the post.
- Subsequent edits do NOT add a second label — the existing label updates its timestamp.

### Assertions
- `await expect(page.locator('[data-testid="edited-label"]')).toBeVisible()`
- `// Optional: assert timestamp format`

---

## Step 16 — Updates propagate across surfaces

**Action:** After a successful update, navigate to other surfaces where the post appears.

### Behavior
- **Homepage feed:** updated Title and topics reflected.
- **Topic detail page** (for each tagged topic): post appears with updated values.
- **My Posts:** updated Title shown.
- **Search results** (if the post matches a query): updated values appear.

### Assertions
- `await page.goto('https://talktravel.com/')`
- `await expect(page.locator('[data-testid="post-card"]:has-text("Edited title by automation")').first()).toBeVisible()`
- `await page.goto('https://talktravel.com/topic/<one-of-the-topics>')`
- `await page.locator('[role="tab"]:has-text("Latest")').click()`
- `await expect(page.locator('[data-testid="post-card"]:has-text("Edited title by automation")').first()).toBeVisible()`

---

## Step 17 — Non-owner cannot edit

**Action:** Log in as a different user. Open the post (Single Post View). Click the 3-dot menu.

### Behavior
- Menu shows only `Report` (no `Edit Post` or `Delete Post`).
- Direct navigation to `/post/{slug}/edit` for a post the user does not own should redirect or show an error.

### Assertions
- `// As non-owner`
- `await page.goto('https://talktravel.com/post/<owners-post-slug>')`
- `await page.locator('[data-testid="post-more"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Report")')).toBeVisible()`
- `await expect(page.locator('[role="menuitem"]:has-text("Edit Post")')).not.toBeVisible()`
- `// Direct URL attempt`
- `await page.goto('https://talktravel.com/post/<owners-post-slug>/edit')`
- `await expect(page).not.toHaveURL(/\/edit$/)` (should redirect or 403)

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'auth/owner.json' });

test.describe('Edit Post', () => {

  let seedPostSlug;

  test.beforeAll(async ({ request }) => {
    // Seed a post via API to ensure we have one to edit
    seedPostSlug = await seedPostViaApi({ title: 'Original title', topics: ['Airlines'] });
  });

  test('Form is pre-filled with existing values', async ({ page }) => {
    await page.goto(`https://talktravel.com/post/${seedPostSlug}/edit`);
    await expect(page.locator('[data-testid="post-title"]')).toHaveValue('Original title');
    await expect(page.locator('[data-testid="topic-chip-selected"]:has-text("Airlines")')).toBeVisible();
  });

  test('Update Post — happy path', async ({ page }) => {
    await page.goto(`https://talktravel.com/post/${seedPostSlug}/edit`);
    await page.locator('[data-testid="post-title"]').fill('Edited title by automation');
    await page.locator('button:has-text("Update Post")').click();

    await expect(page).toHaveURL(new RegExp(`/post/${seedPostSlug}(?!/edit)`));
    await expect(page.locator('article h1')).toContainText('Edited title by automation');
    await expect(page.locator('[data-testid="edited-label"]')).toBeVisible();
  });

  test('Cancel discards edits', async ({ page }) => {
    await page.goto(`https://talktravel.com/post/${seedPostSlug}/edit`);
    await page.locator('[data-testid="post-title"]').fill('Should not save');
    await page.locator('button:has-text("Cancel")').click();
    await expect(page).not.toHaveURL(/\/edit$/);

    // Verify original title is unchanged
    await page.goto(`https://talktravel.com/post/${seedPostSlug}`);
    await expect(page.locator('article h1')).not.toContainText('Should not save');
  });

  test('Validation — Title required', async ({ page }) => {
    await page.goto(`https://talktravel.com/post/${seedPostSlug}/edit`);
    await page.locator('[data-testid="post-title"]').fill('');
    await page.locator('button:has-text("Update Post")').click();
    await expect(page).toHaveURL(/\/edit$/);
    await expect(page.locator('text=/title.*required/i')).toBeVisible();
  });

  test('Validation — at least one Topic required', async ({ page }) => {
    await page.goto(`https://talktravel.com/post/${seedPostSlug}/edit`);
    const chips = await page.locator('[data-testid="topic-chip-selected"]').all();
    for (const chip of chips) {
      await chip.locator('button[aria-label="Remove"]').click();
    }
    await page.locator('button:has-text("Update Post")').click();
    await expect(page).toHaveURL(/\/edit$/);
    await expect(page.locator('text=/topic.*required|at least one topic/i')).toBeVisible();
  });
});

test('Non-owner cannot edit', async ({ browser }) => {
  const context = await browser.newContext({ storageState: 'auth/non-owner.json' });
  const page = await context.newPage();

  await page.goto(`https://talktravel.com/post/<owners-post-slug>`);
  await page.locator('[data-testid="post-more"]').click();
  await expect(page.locator('[role="menuitem"]:has-text("Edit Post")')).not.toBeVisible();
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Direct navigation to `/post/{slug}/edit` (logged-in owner) | Form loads pre-filled |
| 2 | Direct navigation to `/post/{slug}/edit` (logged-in non-owner) | Redirects to Single Post View or 403 |
| 3 | Direct navigation to `/post/{slug}/edit` (logged out) | Redirects to `/login` |
| 4 | Direct navigation to `/post/nonexistent/edit` | 404 or error state |
| 5 | Direct navigation to `/post/{deleted-slug}/edit` | "Post not found" or redirect |
| 6 | Open Edit, refresh page mid-edit | Form resets to original DB values (no draft persistence) — confirm |
| 7 | Update Post with no changes (no field modified) | Update succeeds OR rejected with "No changes to save" (confirm) |
| 8 | Update Post and immediately edit again | Both edits save; only one Edited label shown (timestamp updates) |
| 9 | Update Post then immediately delete | Delete works; post still goes through Delete flow normally |
| 10 | Edit Title with whitespace only | Treated as empty → validation error |
| 11 | Edit Title with very long text (>500 chars) | Truncated or rejected (confirm) |
| 12 | Edit Discussion to remove all content (empty body) | Allowed if Title + Topics still valid |
| 13 | Edit Topics — add a 6th topic | Blocked with "Maximum 5 topics" message |
| 14 | Edit Topics — add a duplicate of an existing chip | Silently ignored (no second chip created) |
| 15 | Edit Topics — add a brand new topic via "Create new" | Topic is created and added as chip |
| 16 | Edit Topics — parent + child resolution | Same as Create Post: only child remains |
| 17 | Edit External Link to be empty (remove the link) | Saves with no external link |
| 18 | Edit External Link to invalid URL | Validation error |
| 19 | Edit External Link, click Fetch Title — overwrites Title | Title field updates |
| 20 | Update Post on slow network | Loading state on button; no double-submit |
| 21 | Update Post when session expires mid-form | Redirects to login with form data lost (confirm) |
| 22 | Browser back from Edit Post page | Returns to previous page (with discard prompt if dirty form — confirm) |
| 23 | Cancel with no changes | Returns immediately, no discard prompt |
| 24 | Cancel with unsaved changes | "Discard changes?" prompt appears (confirm) |
| 25 | Edited label persists across logout / re-login / different user view | Label remains visible to all viewers |
| 26 | Edit a post that has comments | Comments remain intact after update |
| 27 | Edit a post that has been deleted by author (has placeholder) | Edit option should NOT be available — post is "Deleted by author" |
| 28 | Edit a post whose original topic was deleted/renamed | Topic chip handling — confirm with engineering |
| 29 | Mobile viewport (~375px) | Form fields stack vertically; toolbar may collapse |
| 30 | Reduced motion preference | No animation on chip add/remove |
| 31 | Updates propagate to feed within seconds | Feed cache may delay — confirm acceptable lag |
| 32 | Updates propagate to topic page within seconds | Same as above |

---

## Known issues to watch for

- The Edit Post URL pattern is unconfirmed (`/post/{slug}/edit`, `/edit-post/{slug}`, query param). Confirm with engineering.
- Whether a "Discard changes?" prompt appears on Cancel/Back when the form is dirty is unspecified in the source doc.
- Whether Update Post with no field changes is allowed or rejected is unspecified.
- The `Edited` label rendering (text only, timestamp, icon) is unspecified — use regex matchers.
- Draft persistence on refresh is unspecified — assume no draft persistence unless confirmed.
- Updated post propagation to feed/topic pages may have a cache lag (seconds to a minute). Tests may need explicit waits or refresh.
- Non-owner direct URL access behavior (redirect vs 403) is unspecified.
- The 3-dot menu copy varies by surface — "Edit Post" on the feed/Single Post View, "Edit" in My Posts list. Confirm exact strings.
- If the Discussion editor uses a complex library (Slate, ProseMirror, Tiptap), pre-fill rendering may not match the original exactly. Confirm.

---

## Notes for the automation engineer

- **Seed a fresh post per test run.** Don't reuse the same post across tests, since edits accumulate and the "original" state drifts. Either:
  - Use a `beforeEach` to seed a fresh post via API.
  - Use a `beforeAll` to seed one post, then reset its content via API in `afterEach`.
- **Two accounts required.** `auth/owner.json` for tests of own-post edit behavior, `auth/non-owner.json` for verifying non-owner cannot edit.
- **Capture original values before editing.** This makes assertions about pre-fill (Step 4) and cancel (Step 11) reliable across test runs.
- **For the `Edited` label**, use a regex matcher (`text=/Edited/i`) — the exact format (with or without timestamp) may vary.
- **For validation copy**, use regex matchers:
  - Title: `text=/title.*required/i`
  - Topics: `text=/topic.*required|at least one topic/i`
  - URL: `text=/invalid.*url|valid url/i`
- **For propagation tests (Step 16)**, allow up to 5 seconds for feed/topic caches to reflect the update. Use `expect(...).toBeVisible({ timeout: 5000 })`.
- **For the Cancel-with-changes test** (Step 11 / edge case #24), confirm with engineering whether a discard prompt fires. If it does, handle the prompt explicitly in the test.
- **Cleanup.** Each test that publishes an edit doesn't add data, but the seed post may accumulate "Edited" history. Delete seed posts after the test suite via the Delete Post flow or admin API.
- **Avoid hardcoded slugs.** Always capture the seed post's slug at runtime; never embed a slug from a previous run.
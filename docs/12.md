# TalkTravel — Flow: Create Post (Post-Login)

> **Purpose:** Reference for Playwright automation of the Create Post flow — opening the Create New Post page, filling Title / Discussion / External Link / Topics, exercising the rich-text editor and the External Link "Fetch Title" feature, testing topic selection rules (max 5, parent+child resolves to child, duplicates blocked, new topic creation), validating required fields, and verifying post-publish outcomes (redirect, My Posts, relevant topic page, +5 Jetfuel).
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged in, **verified account required**

> **Prerequisite:** This flow requires a verified account. Unverified accounts may have Create Post gated until verification completes. Use a stored `storageState` from a logged-in verified account. Credentials must come from `.env` (gitignored) or CI secrets — never from source code or commits.

---

## Flow overview

```
+ Create Post (header)         ─┐
Topic Detail → + New Post      ─┼─→ Create New Post page (/create-post)
                                │
   Form fields:
      Title*                — required, freeform text
      Discussion            — rich text (bold/italic/underline/quote/list/link/image)
      External Link         — optional URL + Fetch Title button → populates Title (editable)
      Topics*               — searchable, max 5, parent+child → child, duplicates blocked,
                              create new if no match, pre-selected if entered from topic page

   Actions:
      Publish Post          → redirects to Single Post View (+5 Jetfuel)
      Cancel                → returns to previous page, nothing saved
```

The Create Post page is the single content-creation surface. The Topics control has the most complex rules in the flow: max 5, hierarchy resolution (parent + child collapses to child), de-duplication, new-topic creation, and pre-selection when entered from a Topic Detail page. Publish redirects to the new post's Single Post View and updates My Posts, the relevant topic pages, and the user's Jetfuel count.

---

## Step 1 — Open Create Post page via header button

**Action:** From the post-login Homepage (or any post-login page), click the `+ Create Post` button in the header.
**Expected URL:** `/create-post` (confirm exact pattern with engineering — may also be `/new-post` or `/post/new`).

### Elements that must be visible on the Create Post page
- **Title** input — single-line text field, required (marked with `*`)
- **Discussion** rich-text editor with toolbar (bold / italic / underline / quote / list / link / insert image)
- **External Link** input — URL field with `Fetch Title` button alongside
- **Topics** input — searchable, with chip-list display below for selected topics
- **Actions:** `Publish Post` (primary), `Cancel`

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| `+ Create Post` button (header) | `[data-testid="create-post"]` or `text=Create Post` |
| Title input | `[data-testid="post-title"]` or `input[name="title"]` |
| Discussion editor | `[data-testid="post-discussion"]` or `[contenteditable="true"]` |
| Toolbar — bold | `button[aria-label="Bold"]` |
| Toolbar — italic | `button[aria-label="Italic"]` |
| Toolbar — underline | `button[aria-label="Underline"]` |
| Toolbar — quote | `button[aria-label="Quote"]` |
| Toolbar — list | `button[aria-label="List"]` |
| Toolbar — link | `button[aria-label="Insert link"]` |
| Toolbar — image | `button[aria-label="Insert image"]` |
| External Link input | `[data-testid="external-link"]` or `input[name="externalLink"]` |
| Fetch Title button | `button:has-text("Fetch Title")` |
| Topics input | `[data-testid="topics-input"]` or `input[placeholder*="topic"]` |
| Selected topic chip | `[data-testid="topic-chip-selected"]` |
| Publish Post button | `button:has-text("Publish Post")` |
| Cancel button | `button:has-text("Cancel")` |

### Assertions
- `await page.locator('[data-testid="create-post"]').click()`
- `await expect(page).toHaveURL(/\/create-post/)`
- `await expect(page.locator('[data-testid="post-title"]')).toBeVisible()`
- `await expect(page.locator('[data-testid="post-discussion"]')).toBeVisible()`
- `await expect(page.locator('[data-testid="external-link"]')).toBeVisible()`
- `await expect(page.locator('[data-testid="topics-input"]')).toBeVisible()`
- `await expect(page.locator('button:has-text("Publish Post")')).toBeVisible()`
- `await expect(page.locator('button:has-text("Cancel")')).toBeVisible()`

---

## Step 2 — Open Create Post via Topic Detail page (pre-selected topic)

**Action:** From any Single Topic View (e.g., `/topic/airlines`), click the `+ New Post` button on the page.
**Expected URL:** `/create-post` with the topic already selected.

### Behavior
- Page loads with the originating topic already added as a chip in the Topics field.
- User can add up to 4 more topics, or remove the pre-selected one if desired.

### Assertions
- `await page.goto('https://talktravel.com/topic/airlines')`
- `await page.locator('button:has-text("New Post")').click()`
- `await expect(page).toHaveURL(/\/create-post/)`
- `await expect(page.locator('[data-testid="topic-chip-selected"]:has-text("Airlines")')).toBeVisible()`

---

## Step 3 — Title field (required)

**Action:** Type a title in the Title field. Verify text is accepted.

### Behavior
- Field accepts freeform text.
- Required indicator visible (asterisk or "required" label).
- Submitting without a Title triggers validation error (covered in Step 12).

### Assertions
- `await page.locator('[data-testid="post-title"]').fill('Automation test post title')`
- `await expect(page.locator('[data-testid="post-title"]')).toHaveValue('Automation test post title')`

---

## Step 4 — Discussion rich-text editor (formatting)

**Action:** Click into the Discussion editor. Type text. Apply bold, italic, and a bulleted list via the toolbar.

### Behavior
- Editor accepts text input.
- Toolbar buttons toggle formatting (bold, italic, underline, quote, list, link, image).
- Formatted text renders in the editor preview.
- Image insertion opens a file picker or URL prompt (confirm with engineering).

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Discussion content | `[data-testid="post-discussion"] [contenteditable="true"]` |
| Bold formatted text | `[data-testid="post-discussion"] strong` |
| Italic formatted text | `[data-testid="post-discussion"] em` |
| List in editor | `[data-testid="post-discussion"] ul, [data-testid="post-discussion"] ol` |

### Assertions
- `const editor = page.locator('[data-testid="post-discussion"] [contenteditable="true"]')`
- `await editor.click()`
- `await editor.type('First line of automation discussion.')`
- `// Apply bold to selected text`
- `await page.keyboard.press('Control+A')` (or `Meta+A` on Mac)
- `await page.locator('button[aria-label="Bold"]').click()`
- `await expect(editor.locator('strong')).toBeVisible()`

---

## Step 5 — External Link with Fetch Title

**Action:** Paste a valid URL into the External Link field. Click `Fetch Title`.

### Behavior
- The page fetches the URL's `<title>` tag (or OpenGraph title).
- The Title field is auto-populated with the fetched title.
- Title remains editable after fetch.

### Assertions
- `await page.locator('[data-testid="external-link"]').fill('https://www.bbc.com/travel')`
- `await page.locator('button:has-text("Fetch Title")').click()`
- `await expect(page.locator('[data-testid="post-title"]')).not.toHaveValue('')`
- `// Title field should contain the fetched page title`

---

## Step 6 — Topics: search and select existing topic

**Action:** Click the Topics input. Type `air` (partial match).

### Behavior
- Dropdown opens showing matching topics (e.g., `Airlines`, `Airports`).
- Clicking a topic adds it as a chip below the input.
- Input clears after selection, ready for the next topic.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Topics dropdown | `[role="listbox"]` |
| Topic option in dropdown | `[role="option"]` |
| Selected topic chip | `[data-testid="topic-chip-selected"]` |
| Remove chip button | `[data-testid="topic-chip-selected"] >> button[aria-label="Remove"]` |

### Assertions
- `await page.locator('[data-testid="topics-input"]').click()`
- `await page.locator('[data-testid="topics-input"]').fill('air')`
- `await expect(page.locator('[role="option"]:has-text("Airlines")')).toBeVisible()`
- `await page.locator('[role="option"]:has-text("Airlines")').click()`
- `await expect(page.locator('[data-testid="topic-chip-selected"]:has-text("Airlines")')).toBeVisible()`

---

## Step 7 — Topics: create a new topic (no match in dropdown)

**Action:** Type a topic name that doesn't exist (e.g., `AutomationTestTopic123`).

### Behavior
- Dropdown shows a "Create new topic" option (or similar) with the typed string.
- Clicking it creates the topic and adds it as a chip.
- New topic is now available for future posts.

### Assertions
- `await page.locator('[data-testid="topics-input"]').fill('AutomationTestTopic123')`
- `await expect(page.locator('[role="option"]:has-text("Create")').first()).toBeVisible()`
- `await page.locator('[role="option"]:has-text("Create")').first().click()`
- `await expect(page.locator('[data-testid="topic-chip-selected"]:has-text("AutomationTestTopic123")')).toBeVisible()`

---

## Step 8 — Topics: parent + child selection resolves to child

**Action:** Select a parent topic (e.g., `Travel`) and a child topic (e.g., `Coolcation`) from the same hierarchy.

### Behavior
- Only the **child** topic is retained as a chip.
- Parent topic is automatically removed (or never added).
- This prevents redundant hierarchy in the post's topic list.

### Assertions
- `// Select parent`
- `await page.locator('[data-testid="topics-input"]').fill('Travel')`
- `await page.locator('[role="option"]:has-text("Travel")').first().click()`
- `// Select child of same parent`
- `await page.locator('[data-testid="topics-input"]').fill('Coolcation')`
- `await page.locator('[role="option"]:has-text("Coolcation")').first().click()`
- `// Only child remains`
- `await expect(page.locator('[data-testid="topic-chip-selected"]:has-text("Coolcation")')).toBeVisible()`
- `await expect(page.locator('[data-testid="topic-chip-selected"]:has-text("Travel")')).not.toBeVisible()`

---

## Step 9 — Topics: max 5 limit

**Action:** Select 5 topics. Attempt to add a 6th.

### Behavior
- After 5 chips are present, adding a 6th is blocked.
- A message appears (e.g., *"Maximum 5 topics allowed"*).
- Topics input may be disabled, or the 6th option is rejected silently with a toast.

### Assertions
- `// Add 5 topics`
- `for (const topic of ['Airlines', 'Hotels', 'Food', 'Solo Travel', 'Backpacking']) {`
- `  await page.locator('[data-testid="topics-input"]').fill(topic)`
- `  await page.locator(`[role="option"]:has-text("${topic}")`).first().click()`
- `}`
- `await expect(page.locator('[data-testid="topic-chip-selected"]')).toHaveCount(5)`
- `// Attempt 6th`
- `await page.locator('[data-testid="topics-input"]').fill('Adventure')`
- `await page.locator('[role="option"]:has-text("Adventure")').first().click()`
- `await expect(page.locator('text=/maximum.*5|5 topics/i')).toBeVisible()`
- `await expect(page.locator('[data-testid="topic-chip-selected"]')).toHaveCount(5)`

---

## Step 10 — Topics: duplicates blocked

**Action:** Add a topic. Try to add the same topic again.

### Behavior
- The duplicate is not added.
- Chip count remains the same.
- No error toast required, but the second selection is silently ignored.

### Assertions
- `await page.locator('[data-testid="topics-input"]').fill('Airlines')`
- `await page.locator('[role="option"]:has-text("Airlines")').first().click()`
- `await expect(page.locator('[data-testid="topic-chip-selected"]:has-text("Airlines")')).toHaveCount(1)`
- `// Try again`
- `await page.locator('[data-testid="topics-input"]').fill('Airlines')`
- `await page.locator('[role="option"]:has-text("Airlines")').first().click()`
- `await expect(page.locator('[data-testid="topic-chip-selected"]:has-text("Airlines")')).toHaveCount(1)`

---

## Step 11 — Cancel button

**Action:** With form partially filled, click `Cancel`.
**Expected URL:** previous page (Homepage, topic page, wherever the user came from).

### Behavior
- Form is discarded; no post is created.
- User returns to the previous page.
- _(Optional, confirm with engineering)_ A "Discard changes?" confirmation dialog may appear if the form has unsaved content.

### Assertions
- `await page.locator('[data-testid="post-title"]').fill('Will be discarded')`
- `await page.locator('button:has-text("Cancel")').click()`
- `// Confirm discard if dialog appears`
- `// await page.locator('[role="dialog"] >> button:has-text("Discard")').click()`
- `await expect(page).not.toHaveURL(/\/create-post/)`

---

## Step 12 — Validation: missing Title

**Action:** Fill Topics but leave Title empty. Click `Publish Post`.

### Behavior
- Inline error on Title field (e.g., *"Title is required"*).
- Publish does NOT happen; user remains on Create Post page.

### Assertions
- `await page.locator('[data-testid="topics-input"]').fill('Airlines')`
- `await page.locator('[role="option"]:has-text("Airlines")').first().click()`
- `await page.locator('button:has-text("Publish Post")').click()`
- `await expect(page).toHaveURL(/\/create-post/)`
- `await expect(page.locator('text=/title.*required/i')).toBeVisible()`

---

## Step 13 — Validation: missing Topics

**Action:** Fill Title but add no topics. Click `Publish Post`.

### Behavior
- Inline error on Topics field (e.g., *"Select at least one topic"*).
- Publish blocked; user remains on the page.

### Assertions
- `await page.locator('[data-testid="post-title"]').fill('Title only, no topics')`
- `await page.locator('button:has-text("Publish Post")').click()`
- `await expect(page).toHaveURL(/\/create-post/)`
- `await expect(page.locator('text=/topic.*required|at least one topic/i')).toBeVisible()`

---

## Step 14 — Validation: invalid External Link URL

**Action:** Type an invalid URL in External Link (e.g., `not-a-real-url`). Click `Fetch Title`.

### Behavior
- Error appears on External Link field (e.g., *"Invalid URL"*).
- Fetch does NOT run; Title remains unchanged.

### Assertions
- `await page.locator('[data-testid="external-link"]').fill('not-a-real-url')`
- `await page.locator('button:has-text("Fetch Title")').click()`
- `await expect(page.locator('text=/invalid url|valid url/i')).toBeVisible()`

---

## Step 15 — Publish: happy path (full form)

**Action:** Fill Title, Discussion, External Link (valid), 2 topics. Click `Publish Post`.
**Expected URL:** `/post/{slug}` of the newly created post.

### Behavior
- Form submits.
- Browser redirects to the Single Post View of the new post.
- Post is now live and visible to other users.
- User earns +5 Jetfuel for creating the post.

### Assertions
- `await page.locator('[data-testid="post-title"]').fill('E2E full post')`
- `await page.locator('[data-testid="post-discussion"] [contenteditable="true"]').type('Discussion body content.')`
- `await page.locator('[data-testid="external-link"]').fill('https://www.example.com')`
- `await page.locator('[data-testid="topics-input"]').fill('Airlines')`
- `await page.locator('[role="option"]:has-text("Airlines")').first().click()`
- `await page.locator('button:has-text("Publish Post")').click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/)`
- `await expect(page.locator('article h1')).toContainText('E2E full post')`

---

## Step 16 — Publish: minimal valid (Title + 1 topic only)

**Action:** Fill only Title and 1 topic. Click `Publish Post`.

### Behavior
- Publish succeeds — only Title and Topics are required.
- Discussion and External Link are optional.

### Assertions
- `await page.locator('[data-testid="post-title"]').fill('Minimal post')`
- `await page.locator('[data-testid="topics-input"]').fill('Airlines')`
- `await page.locator('[role="option"]:has-text("Airlines")').first().click()`
- `await page.locator('button:has-text("Publish Post")').click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/)`

---

## Step 17 — After publish: post appears in My Posts

**Action:** After publishing, navigate to left nav → `My Posts`.

### Behavior
- The newly created post appears at the top of the My Posts list (newest first).
- Clicking it opens the Single Post View.

### Assertions
- `await page.locator('nav[aria-label="Primary"] >> text=My Posts').click()`
- `await expect(page.locator('[data-testid="post-card"]:has-text("E2E full post")').first()).toBeVisible()`

---

## Step 18 — After publish: post appears in relevant topic page

**Action:** Navigate to the topic that was tagged on the post (e.g., `/topic/airlines`).

### Behavior
- The new post appears in the topic's post list (under Trending, Latest, or both depending on engagement).
- Most reliable check: switch to the `Latest` sub-tab; the new post should appear at the top.

### Assertions
- `await page.goto('https://talktravel.com/topic/airlines')`
- `await page.locator('[role="tab"]:has-text("Latest")').click()`
- `await expect(page.locator('[data-testid="post-card"]:has-text("E2E full post")').first()).toBeVisible()`

---

## Step 19 — After publish: +5 Jetfuel earned

**Action:** Note the user's Jetfuel count before publishing. After publishing, visit own profile and check the count.

### Behavior
- Jetfuel count increases by 5 (one post = +5 Jetfuel).
- Tier may promote if the new total crosses a threshold.

### Assertions
- `// Capture before`
- `await page.goto('https://talktravel.com/user/<my-username>')`
- `const before = parseInt(await page.locator('[data-testid="jetfuel-count"]').textContent())`
- `// ...create post...`
- `await page.goto('https://talktravel.com/user/<my-username>')`
- `const after = parseInt(await page.locator('[data-testid="jetfuel-count"]').textContent())`
- `expect(after).toBe(before + 5)`

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

// Storage state from a verified, logged-in account
test.use({ storageState: 'auth/verified.json' });

test.describe('Create Post', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('[data-testid="create-post"]').click();
    await expect(page).toHaveURL(/\/create-post/);
  });

  test('Publish happy path — Title + Topic only', async ({ page }) => {
    const title = `Automation post ${Date.now()}`;
    await page.locator('[data-testid="post-title"]').fill(title);
    await page.locator('[data-testid="topics-input"]').fill('Airlines');
    await page.locator('[role="option"]:has-text("Airlines")').first().click();
    await page.locator('button:has-text("Publish Post")').click();

    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
    await expect(page.locator('article h1')).toContainText(title);
  });

  test('Validation — Title required', async ({ page }) => {
    await page.locator('[data-testid="topics-input"]').fill('Airlines');
    await page.locator('[role="option"]:has-text("Airlines")').first().click();
    await page.locator('button:has-text("Publish Post")').click();
    await expect(page).toHaveURL(/\/create-post/);
    await expect(page.locator('text=/title.*required/i')).toBeVisible();
  });

  test('Validation — at least one Topic required', async ({ page }) => {
    await page.locator('[data-testid="post-title"]').fill('Title only');
    await page.locator('button:has-text("Publish Post")').click();
    await expect(page).toHaveURL(/\/create-post/);
    await expect(page.locator('text=/topic.*required|at least one topic/i')).toBeVisible();
  });

  test('Topics — max 5 limit enforced', async ({ page }) => {
    const topics = ['Airlines', 'Hotels', 'Food', 'Solo Travel', 'Backpacking'];
    for (const t of topics) {
      await page.locator('[data-testid="topics-input"]').fill(t);
      await page.locator(`[role="option"]:has-text("${t}")`).first().click();
    }
    await expect(page.locator('[data-testid="topic-chip-selected"]')).toHaveCount(5);

    // Attempt 6th
    await page.locator('[data-testid="topics-input"]').fill('Adventure');
    await page.locator('[role="option"]:has-text("Adventure")').first().click();
    await expect(page.locator('text=/maximum.*5|5 topics/i')).toBeVisible();
    await expect(page.locator('[data-testid="topic-chip-selected"]')).toHaveCount(5);
  });

  test('Topics — duplicate not added', async ({ page }) => {
    await page.locator('[data-testid="topics-input"]').fill('Airlines');
    await page.locator('[role="option"]:has-text("Airlines")').first().click();
    await page.locator('[data-testid="topics-input"]').fill('Airlines');
    await page.locator('[role="option"]:has-text("Airlines")').first().click();
    await expect(page.locator('[data-testid="topic-chip-selected"]:has-text("Airlines")')).toHaveCount(1);
  });

  test('Cancel returns without saving', async ({ page }) => {
    await page.locator('[data-testid="post-title"]').fill('Will be discarded');
    await page.locator('button:has-text("Cancel")').click();
    await expect(page).not.toHaveURL(/\/create-post/);
  });
});

test('Topic Detail → + New Post pre-selects topic', async ({ page }) => {
  await page.goto('https://talktravel.com/topic/airlines');
  await page.locator('button:has-text("New Post")').click();
  await expect(page).toHaveURL(/\/create-post/);
  await expect(page.locator('[data-testid="topic-chip-selected"]:has-text("Airlines")')).toBeVisible();
});

test('External Link Fetch Title populates Title', async ({ page }) => {
  await page.goto('https://talktravel.com/create-post');
  await page.locator('[data-testid="external-link"]').fill('https://www.bbc.com/travel');
  await page.locator('button:has-text("Fetch Title")').click();
  await expect(page.locator('[data-testid="post-title"]')).not.toHaveValue('');
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Direct navigation to `/create-post` (verified user) | Page loads normally |
| 2 | Direct navigation to `/create-post` (unverified user) | Redirects to `/verify-account` OR shows verification prompt |
| 3 | Direct navigation to `/create-post` (logged out) | Redirects to `/login` |
| 4 | Title with whitespace only | Treated as empty → validation error |
| 5 | Title with very long text (>500 chars) | Truncated, scrollable, or rejected (confirm) |
| 6 | Discussion with no formatting (plain text) | Publishes successfully |
| 7 | Discussion with all formatting types applied | All render correctly in published post |
| 8 | Discussion with inline image | Image uploads and renders in published post |
| 9 | Discussion with inserted link | Link renders correctly and is clickable in published post |
| 10 | External Link — valid URL with no fetchable title | Title field stays empty; user can type manually |
| 11 | External Link — URL returning error 404 | Error message; Title not populated |
| 12 | External Link — URL with title fetched, then user edits title | Edited title is what publishes |
| 13 | Topics — type partial match showing multiple results | Dropdown shows all; user picks one |
| 14 | Topics — remove a chip via X button | Chip removed; count decreases |
| 15 | Topics — remove all chips after adding | Publish blocked (Topics required) |
| 16 | Topics — keyboard navigation in dropdown (Arrow Up/Down + Enter) | Selection works via keyboard |
| 17 | Topics — search query that matches nothing | "Create new topic" option appears |
| 18 | Topics — newly created topic appears in dropdown for other users immediately | (System behavior — confirm) |
| 19 | Topics — child topic selected first, then parent | Child remains; parent is auto-removed or rejected |
| 20 | Publish clicked rapidly (double-click) | Only one post created |
| 21 | Publish on slow network | Button shows loading state; user cannot double-publish |
| 22 | Publish with very long Discussion (10,000 chars) | Either accepted or rejected with limit message (confirm) |
| 23 | Browser back during Create Post | "Discard changes?" prompt OR exits silently (confirm) |
| 24 | Refresh page mid-form | Form is reset (no draft persistence) — confirm with engineering |
| 25 | Cancel with empty form | Returns immediately, no discard prompt |
| 26 | Cancel with filled form | "Discard changes?" prompt appears (confirm) |
| 27 | Session expires mid-form | Publish fails with auth error; redirects to login |
| 28 | Mobile viewport (~375px) | Form fields stack vertically; toolbar may collapse |
| 29 | Reduced motion preference | No animation on chip add/remove |
| 30 | Slow network | Loading skeleton on Fetch Title and Topics dropdown |
| 31 | Post-publish redirect — Single Post View | New post is fully interactive (vote, follow, share, comment available) |
| 32 | Post-publish Jetfuel doesn't increment immediately | Allow short wait OR refresh profile page before asserting |
| 33 | Post-publish — newly created topic appears in Browse Topics | (Confirm system behavior; may be cached briefly) |
| 34 | Insert image — file > 15 MB | Rejected with size error |
| 35 | Insert image — unsupported file type | Rejected with type error |

---

## Known issues to watch for

- The exact Create Post URL is unconfirmed (`/create-post`, `/new-post`, `/post/new`). Confirm with engineering.
- "Discard changes?" prompt on Cancel/Back is unspecified in the source doc. Confirm whether it exists for non-empty forms.
- Rich-text editor implementation (Slate, ProseMirror, Tiptap, contenteditable) affects how Playwright should interact. Confirm with engineering.
- The Topics parent-child hierarchy resolution is enforced client-side; backend may accept either parent or child. Test only the UI behavior.
- The "Create new topic" option appearance is unconfirmed — could be a special row in the dropdown, a button, or auto-create on Enter.
- Validation error copy is unconfirmed for both Title-missing and Topics-missing cases. Use regex matchers.
- External Link "Fetch Title" depends on the target URL being reachable from the TalkTravel backend. Use stable, well-known URLs (e.g., `bbc.com/travel`) in tests.
- Jetfuel increment may be eventually consistent. Allow a short wait or refresh before asserting the new count.
- Image insertion may use a file picker (Playwright: `setInputFiles`) or a URL prompt. Confirm.
- Post-publish redirect URL slug is generated server-side; never assume a specific slug format beyond `/post/[a-z0-9-]+`.

---

## Notes for the automation engineer

- **Credentials handling.** Store the verified test account credentials in a gitignored `.env` file and CI secrets:
```env
  TEST_VERIFIED_EMAIL=...
  TEST_VERIFIED_PASSWORD=...
```
  Reference via `process.env.TEST_VERIFIED_EMAIL`. Add a `.env.example` template so other engineers know what variables to set. Never commit real credentials.
- **storageState strategy.** Log in once via UI or API, save `storageState` to `auth/verified.json`, then `test.use({ storageState: 'auth/verified.json' })` in every Create Post test. Much faster than logging in each time.
- **Test data cleanup.** Each test creates a new post, which will accumulate. Either:
  - Delete created posts in `afterEach` (use the Delete Post flow).
  - Run against a disposable test environment that resets nightly.
  - Use timestamped titles (`Automation post ${Date.now()}`) so they're identifiable for batch cleanup.
- **Topic seed data.** Tests reference topics like `Airlines`, `Hotels`, `Food`. Ensure these exist in the staging environment before tests run. Seed via API if not present.
- **Newly created topics.** Step 7 creates a brand-new topic. This pollutes the topic namespace. Use unique names (`AutomationTestTopic${Date.now()}`) and clean up via admin API or accept the pollution in a disposable env.
- **Rich-text editor interactions.** Playwright's `keyboard.press` and `keyboard.type` work for most contenteditable editors, but custom React-based editors (Slate, ProseMirror) may need `page.dispatchEvent` for specific operations. Confirm editor library with engineering.
- **Validation copy.** Use regex matchers for error messages, since exact strings may change:
  - Title: `text=/title.*required/i`
  - Topics: `text=/topic.*required|at least one topic/i`
  - URL: `text=/invalid.*url|valid url/i`
  - Max topics: `text=/maximum.*5|5 topics/i`
- **Jetfuel assertions.** Capture the count before publish, refresh the profile page after publish, then assert `+5`. Avoid race conditions by adding a short wait between publish and assertion if Jetfuel is eventually consistent.
- **Fetch Title testing.** Use a small set of stable URLs known to return predictable titles. Avoid URLs that may go offline or change titles.
- **Image upload.** If using `setInputFiles`, store test images in a `fixtures/` folder (e.g., `fixtures/test-image.jpg`). Keep them small (< 1 MB) to avoid slow tests.
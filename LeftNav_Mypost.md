# TalkTravel — Flow: Left Nav — My Posts (Owner View)

> **Purpose:** Reference for Playwright automation of the My Posts surface — the left-navigation destination that opens the user's own profile page with the Posts tab pre-selected. Shows only posts authored by the current user, with owner-only actions (Edit / Delete via the 3-dot menu). Covers navigation, list rendering, owner 3-dot menu variants, the Edit Profile entry point, tab switching to Comments, and the empty state when the user has no posts.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged in

> **Prerequisite:** Tests require an authenticated session via `storageState`. Most tests need the user to have at least one published post (seed via API in `beforeEach`); the empty-state test needs an account with zero posts.

---

## Flow overview

```
Any post-login page  →  Left nav  →  My Posts
                                          ↓
                       Opens /user/<my-username>?tab=posts
                       (My Profile page, Posts tab pre-selected)
                                          ↓
   Profile header:
      Avatar, nickname
      Badges strip + "See all badges"
      "Edit Profile" button          → opens /settings
      About User sidebar (bio, Jetfuel, Tier, progress)

   Tabs at the top: Posts (X) [active] | Comments (X)

   Posts list (own posts, newest-first):
      Each post card: title, topic chips, vote count, comment count, timestamp
      Vote / Follow interactions work normally
      3-dot menu: Edit Post | Delete Post (NO Report — it's your own post)

   Empty state (0 posts):
      "You haven't posted yet..." with CTA to Create Post
```

My Posts is not a standalone page — it's the user's own profile with the Posts tab pre-selected. This means the surface is structurally the same as viewing another user's profile, but with two critical differences: **only own posts appear**, and the **3-dot menu shows Edit/Delete instead of Report**. The `Edit Profile` button in the header is the entry point to Settings.

---

## Step 1 — Navigate to My Posts from left nav

**Action:** From any post-login page, click `My Posts` in the left navigation.
**Expected URL:** `/user/{my-username}?tab=posts` OR `/my-posts` (confirm exact pattern with engineering — the URL scheme has two plausible variants).

### Elements that must be visible
- **Header:** search bar, `+ Create Post`, Messages, Notifications bell, Profile avatar
- **Left navigation:** with `My Posts` visually active/highlighted
- **Profile header:** avatar, username, badges strip, `See all badges` link, `Edit Profile` button
- **Tabs:** `Posts (X)` [active] and `Comments (X)`
- **Post list** (own posts) OR empty state
- **About User sidebar** with bio, Jetfuel, Tier, progress
- **Footer**

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Left nav `My Posts` link | `nav[aria-label="Primary"] >> text=My Posts` |
| Profile avatar | `[data-testid="profile-avatar"]` |
| Profile username (H1) | `main h1` |
| Badges strip | `[data-testid="badges-strip"]` |
| See all badges | `text=See all badges` |
| Edit Profile button | `button:has-text("Edit Profile")` or `[data-testid="edit-profile"]` |
| Posts tab | `[role="tab"]:has-text("Posts")` |
| Comments tab | `[role="tab"]:has-text("Comments")` |
| Post card | `[data-testid="post-card"]` |
| About User sidebar | `aside:has-text("About")` |
| Empty state | `text=/haven\'t posted yet/i` |

### Assertions
- `await page.locator('nav[aria-label="Primary"] >> text=My Posts').click()`
- `await expect(page).toHaveURL(/\/user\/[a-zA-Z0-9_-]+/)`
- `await expect(page.locator('[role="tab"]:has-text("Posts")')).toHaveAttribute('aria-selected', 'true')`
- `await expect(page.locator('button:has-text("Edit Profile")')).toBeVisible()`

---

## Step 2 — Verify only OWN posts appear in the list

**Action:** With the user having published at least one post, navigate to My Posts. Inspect each post card's author.

### Behavior
- Every post in the list is authored by the current user.
- No posts by other authors appear.
- List sort: newest-first (confirm with engineering).

### Assertions
- `const posts = await page.locator('[data-testid="post-card"]').all()`
- `for (const post of posts) {`
- `  const author = await post.getAttribute('data-author')`
- `  expect(author).toBe('<current-username>')`
- `}`

---

## Step 3 — Post count in Posts tab matches list length

**Action:** Read the number in the Posts tab label (e.g., "Posts (5)"). Count the rendered post cards.

### Behavior
- The number in the tab matches the count of rendered cards.
- Count updates when a post is created, deleted, or restored.

### Assertions
- `const tabText = await page.locator('[role="tab"]:has-text("Posts")').textContent()`
- `const tabCount = parseInt(tabText.match(/\((\d+)\)/)[1])`
- `const listCount = await page.locator('[data-testid="post-card"]').count()`
- `expect(tabCount).toBe(listCount)`

---

## Step 4 — 3-dot menu on own post shows Edit + Delete (NO Report)

**Action:** Click the 3-dot menu on any post in the list.

### Behavior
- Dropdown opens with two options: `Edit Post` and `Delete Post`.
- `Report` option is NOT present (users cannot report their own content).

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| 3-dot menu on post card | `[data-testid="post-card"] >> button[aria-label="More"]` |
| Edit option | `[role="menuitem"]:has-text("Edit")` |
| Delete option | `[role="menuitem"]:has-text("Delete")` |

### Assertions
- `const post = page.locator('[data-testid="post-card"]').first()`
- `await post.locator('button[aria-label="More"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Edit")')).toBeVisible()`
- `await expect(page.locator('[role="menuitem"]:has-text("Delete")')).toBeVisible()`
- `await expect(page.locator('[role="menuitem"]:has-text("Report")')).not.toBeVisible()`

---

## Step 5 — Edit Post entry point

**Action:** Click the 3-dot menu → `Edit Post` (or `Edit`).
**Expected URL:** `/post/{slug}/edit` (or equivalent — confirm with engineering).

### Behavior
- Navigates to the Edit Post page (covered by the Edit Post flow doc).
- Form is pre-filled with the current post's Title, Discussion, External Link, Topics.

### Assertions
- `await post.locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Edit")').click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+\/edit/)`

---

## Step 6 — Delete Post entry point (confirmation dialog)

**Action:** Click the 3-dot menu → `Delete Post` (or `Delete`).

### Behavior
- A confirmation dialog opens (Delete / Cancel).
- The post is NOT deleted immediately — must confirm.
- Full delete behavior (placeholder vs permanent) is covered by the Delete Post flow doc.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Confirmation dialog | `[role="dialog"]` |
| Delete confirm button | `[role="dialog"] >> button:has-text("Delete")` |
| Cancel button | `[role="dialog"] >> button:has-text("Cancel")` |

### Assertions
- `await post.locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Delete")').click()`
- `await expect(page.locator('[role="dialog"]')).toBeVisible()`
- `await expect(page.locator('[role="dialog"] >> button:has-text("Delete")')).toBeVisible()`
- `await expect(page.locator('[role="dialog"] >> button:has-text("Cancel")')).toBeVisible()`

---

## Step 7 — After successful delete, post list updates

**Action:** Confirm delete on a post. Return to My Posts view.

### Behavior
- **If post had no comments:** post is permanently removed from the list. Posts tab count decrements.
- **If post had comments:** post appears in the list with "Deleted by author" placeholder content. Posts tab count may stay the same OR decrement (confirm with engineering).

### Assertions
- `const initialCount = await page.locator('[data-testid="post-card"]').count()`
- `// After delete flow completes`
- `// If permanent:`
- `await expect(page.locator('[data-testid="post-card"]')).toHaveCount(initialCount - 1)`
- `// If placeholder:`
- `// await expect(page.locator('[data-testid="post-card"]:has-text("Deleted by author")')).toBeVisible()`

---

## Step 8 — Click Edit Profile button

**Action:** Click the `Edit Profile` button in the profile header.
**Expected URL:** `/settings` (or `/settings/account` — confirm with engineering).

### Behavior
- Navigates to the Settings page with Account Settings tab active by default (covered by Settings flow doc).

### Assertions
- `await page.locator('button:has-text("Edit Profile")').click()`
- `await expect(page).toHaveURL(/\/settings/)`

---

## Step 9 — Switch to Comments tab

**Action:** Click the `Comments` tab.

### Behavior
- Tab switches to the My Comments view (covered by the My Comments flow doc).
- URL may update (e.g., `?tab=comments`).
- List shows own comments with parent post snippets.

### Assertions
- `await page.locator('[role="tab"]:has-text("Comments")').click()`
- `await expect(page.locator('[role="tab"]:has-text("Comments")')).toHaveAttribute('aria-selected', 'true')`
- `await expect(page.locator('[role="tab"]:has-text("Posts")')).toHaveAttribute('aria-selected', 'false')`

---

## Step 10 — Click a post card to open Single Post View

**Action:** Click any post card body or title.
**Expected URL:** `/post/{slug}`

### Behavior
- Opens the Single Post View for the post.
- On the Single Post View, the 3-dot menu also shows Edit/Delete (since this is own post).

### Assertions
- `const post = page.locator('[data-testid="post-card"]').first()`
- `await post.click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/)`
- `// Verify 3-dot on the Single Post View also shows Edit/Delete`
- `await page.locator('[data-testid="post-more"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Edit")')).toBeVisible()`

---

## Step 11 — About User sidebar (own profile view)

**Action:** Inspect the About User sidebar.

### Elements that must be visible
- Bio text (may be empty if user hasn't set one)
- Jetfuel count (numeric)
- Tier label (e.g., `Coach`, `Economy`, `Economy Plus`) with airplane icon
- Progress line: `X Jetfuel until [next tier]` OR `Next tier at Y Jetfuel`

### Assertions
- `await expect(page.locator('aside:has-text("About")')).toBeVisible()`
- `await expect(page.locator('[data-testid="jetfuel-count"]')).toBeVisible()`
- `await expect(page.locator('[data-testid="profile-tier"]')).toBeVisible()`

---

## Step 12 — Badges strip on own profile

**Action:** Inspect the badges strip in the profile header.

### Behavior
- Shows all badges the user has earned.
- Each badge is clickable → opens `/badge/{BadgeName}`.
- "See all badges" link → opens `/badges` page.
- If no badges earned: strip may be hidden OR show placeholder.

### Assertions
- `await expect(page.locator('[data-testid="badges-strip"]')).toBeVisible()`
- `await page.locator('[data-testid="badges-strip"] >> [data-testid="badge"]').first().click()`
- `await expect(page).toHaveURL(/\/badge\/[A-Za-z]+/)`

---

## Step 13 — Empty state (no posts published)

**Action:** With the user having ZERO posts, navigate to My Posts.

### Behavior
- No post cards shown.
- Empty state message appears — e.g., *"You haven't posted yet..."*
- Optional CTA: *"Create your first post"* → opens Create Post page.
- Posts tab count: `Posts (0)`.

### Assertions
- `// Precondition: user has 0 posts`
- `await page.goto('https://talktravel.com/user/<my-username>?tab=posts')`
- `await expect(page.locator('[data-testid="post-card"]')).toHaveCount(0)`
- `await expect(page.locator('text=/haven\'t posted yet/i')).toBeVisible()`
- `await expect(page.locator('[role="tab"]:has-text("Posts (0)")')).toBeVisible()`

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'auth/verified.json' });

test.describe('Left Nav — My Posts', () => {

  test.beforeEach(async ({ request }) => {
    // Seed: create 3 posts authored by the test user
    await seedOwnPostsViaApi(3);
  });

  test.afterEach(async ({ request }) => {
    await deleteAllOwnPostsViaApi();
  });

  test('Navigate to My Posts and see own posts only', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> text=My Posts').click();
    await expect(page.locator('[role="tab"]:has-text("Posts")')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-testid="post-card"]')).toHaveCount(3);

    // Verify every post is authored by current user
    const posts = await page.locator('[data-testid="post-card"]').all();
    for (const post of posts) {
      const author = await post.getAttribute('data-author');
      expect(author).toBe('<current-username>');
    }
  });

  test('3-dot menu on own post shows Edit + Delete (no Report)', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> text=My Posts').click();
    const post = page.locator('[data-testid="post-card"]').first();
    await post.locator('button[aria-label="More"]').click();
    await expect(page.locator('[role="menuitem"]:has-text("Edit")')).toBeVisible();
    await expect(page.locator('[role="menuitem"]:has-text("Delete")')).toBeVisible();
    await expect(page.locator('[role="menuitem"]:has-text("Report")')).not.toBeVisible();
  });

  test('Edit Post navigates to edit page', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> text=My Posts').click();
    const post = page.locator('[data-testid="post-card"]').first();
    await post.locator('button[aria-label="More"]').click();
    await page.locator('[role="menuitem"]:has-text("Edit")').click();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+\/edit/);
  });

  test('Delete Post opens confirmation dialog', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> text=My Posts').click();
    const post = page.locator('[data-testid="post-card"]').first();
    await post.locator('button[aria-label="More"]').click();
    await page.locator('[role="menuitem"]:has-text("Delete")').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[role="dialog"] >> button:has-text("Delete")')).toBeVisible();
  });

  test('Edit Profile navigates to Settings', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> text=My Posts').click();
    await page.locator('button:has-text("Edit Profile")').click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test('Switch to Comments tab', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> text=My Posts').click();
    await page.locator('[role="tab"]:has-text("Comments")').click();
    await expect(page.locator('[role="tab"]:has-text("Comments")')).toHaveAttribute('aria-selected', 'true');
  });

  test('Posts tab count matches list length', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> text=My Posts').click();
    const tabText = await page.locator('[role="tab"]:has-text("Posts")').textContent();
    const tabCount = parseInt(tabText.match(/\((\d+)\)/)[1]);
    const listCount = await page.locator('[data-testid="post-card"]').count();
    expect(tabCount).toBe(listCount);
  });
});

test('Empty state when user has zero posts', async ({ browser }) => {
  const context = await browser.newContext({ storageState: 'auth/no-posts.json' });
  const page = await context.newPage();
  await page.goto('https://talktravel.com/');
  await page.locator('nav[aria-label="Primary"] >> text=My Posts').click();
  await expect(page.locator('[data-testid="post-card"]')).toHaveCount(0);
  await expect(page.locator('text=/haven\'t posted yet/i')).toBeVisible();
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Direct navigation to `/user/<my-username>?tab=posts` | Same as clicking left-nav My Posts |
| 2 | Navigate to My Posts while logged out | Redirects to `/login` |
| 3 | Create a new post, immediately visit My Posts | New post appears at the top; Posts count increments |
| 4 | Delete a post with no comments | Post permanently removed from list; count decrements |
| 5 | Delete a post with comments | Post replaced with "Deleted by author" placeholder; may stay in list or leave (confirm) |
| 6 | Edit a post | Post content updates; "Edited" label appears on the Single Post View |
| 7 | Follow / Unfollow own post from another surface | State may or may not toggle — confirm whether users can follow their own posts |
| 8 | Vote (upvote/downvote) own post | Confirm whether self-vote is allowed |
| 9 | Click own author link / avatar on a post card | Navigates to same profile (no-op OR reloads) — confirm |
| 10 | Click a topic chip on own post | Opens Single Topic View |
| 11 | Very long list (100+ own posts) | List paginates OR uses infinite scroll (confirm) |
| 12 | List sort order | Newest-first by post creation date (confirm) |
| 13 | Rapid Delete → Cancel → Delete → Confirm | Only the confirmed delete takes effect |
| 14 | Delete on slow network | Confirmation dialog shows loading; post removed only after server confirms |
| 15 | Delete fails (network error) | Post stays in list; error toast shown |
| 16 | Session expires while on page | Next action redirects to Login |
| 17 | Two browser tabs: delete in one, view in the other | Other tab updates on refresh OR real-time (confirm) |
| 18 | Edit Profile opens Settings with Account tab active | Confirm default tab is Account, not Notifications/Privacy/Content |
| 19 | Badges strip empty (user has no badges yet) | Strip may be hidden OR show placeholder |
| 20 | Bio empty on About User sidebar | Bio area hidden OR shows placeholder ("No bio yet") |
| 21 | Jetfuel = 0 (new user) | Tier shows starting tier (e.g., Coach); progress shows "X Jetfuel until Economy" |
| 22 | Mobile viewport (~375px) | Cards stack vertically; sidebar may move below feed |
| 23 | Reduced motion preference | No animation on tab switch |
| 24 | Slow network | Loading skeleton in list area |
| 25 | Post deleted from another surface, refresh My Posts | Post is gone (permanent) or shows placeholder (with comments) |

---

## Known issues to watch for

- The My Posts URL is unconfirmed. Could be `/user/<username>?tab=posts` OR `/my-posts` OR both routes work. Confirm with engineering.
- The Edit Profile button's destination is unconfirmed — likely `/settings` with Account tab active, but confirm.
- Whether the Posts tab count decrements when a post is replaced with a placeholder (vs permanent delete) is unspecified.
- The list sort order is unspecified — most likely newest-first by post creation.
- Whether the list uses pagination, infinite scroll, or a fixed-length load is unspecified.
- The empty state copy is unspecified — use regex matcher.
- Whether users can follow / upvote / downvote their own posts is unspecified. If not allowed, those buttons may be hidden or disabled on own posts.
- Whether a post with the "Deleted by author" placeholder stays in My Posts or is filtered out is unspecified.
- Real-time updates (creating a post in another tab and having it appear in My Posts without refresh) may not be implemented.

---

## Notes for the automation engineer

- **Seed own posts via API** in `beforeEach` for consistent test state. UI-based post creation is slow and adds flakiness.
- **Cleanup in `afterEach`** by deleting all seeded posts via API, OR use a disposable staging account.
- **Two account types.** `auth/verified.json` (with seeded own posts) and `auth/no-posts.json` (zero posts) for empty-state tests.
- **Capture own username at test time** via `storageState` metadata or a helper — don't hardcode it.
- **For post authorship assertions** (Step 2), use `data-author` attributes or a similar reliable marker.
- **For post tab count assertions** (Step 3), regex-extract the number from the tab label text rather than asserting on exact strings.
- **For 3-dot menu tests**, prefer ARIA roles (`role="menuitem"`) over class names.
- **For empty state copy**, use regex matchers since exact wording may vary.
- **For Delete tests, note that this doc only covers up to the confirmation dialog** — the full delete behavior (placeholder vs permanent) is verified by the Delete Post flow doc. Don't duplicate that testing here.
- **Do NOT assume the tab URL includes `?tab=posts`** — engineering may implement it as URL-driven, state-driven, or a mix.
- **For the Edit Profile → Settings transition**, don't assert on specific settings fields here; that's covered by the Settings flow doc.
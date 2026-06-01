# TalkTravel — Flow: User Profile View (Pre-Login)

> **Purpose:** Reference for Playwright automation of one pre-login flow — opening another user's profile page while logged out, switching Posts/Comments tabs, verifying the About User sidebar, and confirming all action buttons (Add Friend, Chat, Follow, More) redirect to Login.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged out

---

## Flow overview

```
Homepage (/trending)       →  Click author avatar/name      →  User Profile (/user/{username})
Single Post View           →  Click author avatar/name      →  User Profile (/user/{username})
Single Post View (comment) →  Click commenter avatar/name   →  User Profile (/user/{username})

Inside User Profile:
   Switch tab (Posts ↔ Comments)
   Click a post  →  Single Post View
   Click a comment  →  Single Post View scrolled to that comment
   Click a topic chip inside a post  →  Single Topic View
   Click a badge  →  Single Badge Detail page
   Click "See all badges"  →  All Badges page
   Click Add Friend / Chat / Follow / More  →  redirect to /login
```

Three main entry points lead to the user profile: clicking an author from the homepage feed, from a single post view, or from a comment. All gated actions on the profile redirect to Login. Posts/Comments tabs and the About User sidebar are read-only and fully visible while logged out.

---

## Step 1 — Enter profile from the Homepage feed

**Action:** From `/trending`, click any author username or avatar on a post card.
**Expected URL:** `/user/{username}` (confirm pattern with engineering — could also be `/profile/{username}` or `/u/{username}`).

### Elements that must be visible
- Header (same as all pre-login pages): TalkTravel logo, `Community`, `Blog`, `FAQ`, `Log in`, `Join Free`
- Profile header block: avatar, username
- Badges strip: all earned badges for this user
- `See all badges` link
- Action buttons: `Add Friend`, `Chat`, `Follow` (or `Unfollow` depending on state shown to logged-out users), `More` (3-dots menu)
- Tabs: `Posts` (with count), `Comments` (with count)
- Post list rendered under the active tab
- About User sidebar: bio, Jetfuel count, Tier label (with icon), `X Jetfuel until [next tier]` progress line
- Footer

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Profile username (H1) | `main h1` or `[data-testid="profile-username"]` |
| Avatar | `[data-testid="profile-avatar"]` or `main img:first-of-type` |
| Badges strip | `[data-testid="badges-strip"]` |
| Single badge | `[data-testid="badges-strip"] >> [data-testid="badge"]` |
| `See all badges` link | `text=See all badges` |
| `Add Friend` button | `button:has-text("Add Friend")` or `[data-testid="add-friend"]` |
| `Chat` button | `button:has-text("Chat")` or `[data-testid="chat"]` |
| `Follow` button | `button:has-text("Follow")` or `[data-testid="follow-user"]` |
| `More` (3-dots) button | `button[aria-label="More"]` or `[data-testid="profile-more"]` |
| Posts tab | `[role="tab"]:has-text("Posts")` |
| Comments tab | `[role="tab"]:has-text("Comments")` |
| Post card in list | `[data-testid="post-card"]` |
| About User sidebar | `aside[data-testid="about-user"]` or `aside:has-text("About")` |
| Bio | `[data-testid="profile-bio"]` |
| Jetfuel count | `[data-testid="jetfuel-count"]` |
| Tier label | `[data-testid="profile-tier"]` |
| Progress line | `[data-testid="tier-progress"]` |

### Assertions
- `await page.locator('[data-testid="author-link"]').first().click()`
- `await expect(page).toHaveURL(/\/user\/[a-zA-Z0-9_-]+/)`
- `await expect(page.locator('main h1')).toBeVisible()`
- `await expect(page.locator('[data-testid="profile-avatar"]')).toBeVisible()`
- `await expect(page.locator('[data-testid="badges-strip"]')).toBeVisible()`
- `await expect(page.locator('button:has-text("Add Friend")')).toBeVisible()`
- `await expect(page.locator('button:has-text("Chat")')).toBeVisible()`
- `await expect(page.locator('button:has-text("Follow")')).toBeVisible()`
- `await expect(page.locator('[role="tab"]:has-text("Posts")')).toHaveAttribute('aria-selected', 'true')`
- `await expect(page.locator('aside:has-text("About")')).toBeVisible()`

---

## Step 2 — Enter profile from a Single Post View

**Action:** From any Single Post View, click the post author's username or avatar.
**Expected URL:** `/user/{username}`

### Behavior
- Lands on the same User Profile page as Step 1.
- All elements (header, badges, action buttons, tabs, sidebar, footer) render identically.

### Assertions
- `await page.locator('article >> [data-testid="author-link"]').click()`
- `await expect(page).toHaveURL(/\/user\/[a-zA-Z0-9_-]+/)`
- `await expect(page.locator('main h1')).toBeVisible()`

---

## Step 3 — Enter profile from a comment

**Action:** From any Single Post View, scroll to the comments section and click a commenter's username or avatar.
**Expected URL:** `/user/{username}` (the commenter's profile, not the post author's).

### Behavior
- Lands on the commenter's User Profile page.
- Page renders identically to Steps 1 and 2.

### Assertions
- `await page.locator('[data-testid="comment"] >> [data-testid="author-link"]').first().click()`
- `await expect(page).toHaveURL(/\/user\/[a-zA-Z0-9_-]+/)`

---

## Step 4 — Verify About User sidebar

**Action:** On the User Profile page, inspect the About User sidebar.

### Elements that must be visible in the sidebar
- Bio text (may be empty for users who haven't filled one in)
- Jetfuel count (numeric)
- Tier label (e.g., `Coach`, `Economy`, `Economy Plus`) with airplane icon
- Progress line: `X Jetfuel until [next tier]`
- Next tier threshold: `Next tier at Y Jetfuel` (may be combined with the progress line)

### Assertions
- `await expect(page.locator('aside:has-text("About")')).toBeVisible()`
- `await expect(page.locator('[data-testid="jetfuel-count"]')).toBeVisible()`
- `await expect(page.locator('[data-testid="profile-tier"]')).toBeVisible()`
- `await expect(page.locator('[data-testid="tier-progress"]')).toContainText(/Jetfuel until/)`

---

## Step 5 — Switch tab (Posts → Comments)

**Action:** Click the `Comments` tab.
**Expected URL:** stays on `/user/{username}` (tab state may be reflected as `?tab=comments` — confirm with engineering).

### Behavior
- Comment list re-renders, showing comments authored by this user, each with a parent post snippet.
- `Comments` becomes the active tab; `Posts` becomes inactive.
- Each comment row shows the comment text and a link to the parent post.
- Upvote/Downvote buttons are visible on each comment (display only when logged out; redirect to Login when clicked).

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Comments tab | `[role="tab"]:has-text("Comments")` |
| Comment row | `[data-testid="profile-comment"]` |
| Parent post snippet | `[data-testid="profile-comment"] >> [data-testid="parent-post-link"]` |
| Vote button on comment | `[data-testid="profile-comment"] >> [data-testid="upvote"]` |

### Assertions
- `await page.locator('[role="tab"]:has-text("Comments")').click()`
- `await expect(page.locator('[role="tab"]:has-text("Comments")')).toHaveAttribute('aria-selected', 'true')`
- `await expect(page.locator('[role="tab"]:has-text("Posts")')).toHaveAttribute('aria-selected', 'false')`
- `await expect(page.locator('[data-testid="profile-comment"]').first()).toBeVisible()`

---

## Step 6 — Click a post in the Posts tab

**Action:** With the Posts tab active, click any post in the list.
**Expected URL:** `/post/{slug}` (confirm pattern with engineering).

### Behavior
- Navigates to the Single Post View for that post.
- Browser back returns to the profile page with the Posts tab still active.

### Assertions
- `await page.locator('[role="tab"]:has-text("Posts")').click()`
- `const firstPost = page.locator('[data-testid="post-card"]').first()`
- `const postTitle = await firstPost.locator('h2, h3').first().textContent()`
- `await firstPost.click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/)`
- `await expect(page.locator('h1')).toContainText(postTitle.trim())`

---

## Step 7 — Click a comment in the Comments tab

**Action:** With the Comments tab active, click any comment row (or its parent post snippet).
**Expected URL:** `/post/{slug}` with the page scrolled to the specific comment (deep link or anchor — confirm pattern with engineering, e.g. `/post/{slug}#comment-{id}`).

### Behavior
- Opens the Single Post View linked to that comment.
- Page scrolls to the comment (or comment is visually highlighted).
- Upvote/Downvote buttons on the comment are visible.

### Assertions
- `await page.locator('[role="tab"]:has-text("Comments")').click()`
- `await page.locator('[data-testid="profile-comment"]').first().click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+(#comment-[a-z0-9-]+)?/)`

---

## Step 8 — Click a topic chip inside a post on the profile

**Action:** With the Posts tab active, click a topic chip on a post card (e.g., `#Airlines`).
**Expected URL:** `/topic/{slug}`

### Behavior
- Opens the Single Topic View for that topic (covered by the Single Topic View pre-login flow).

### Assertions
- `await page.locator('[data-testid="post-card"] >> [data-testid="topic-chip"]').first().click()`
- `await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+/)`

---

## Step 9 — Click a single badge in the badges strip

**Action:** Click any badge in the badges strip on the profile header.
**Expected URL:** `/badge/{BadgeName}` (e.g., `/badge/FrequentFlyer`)

### Behavior
- Opens the Single Badge Detail page for that badge.
- Pre-login state: page shows "Not unlocked yet" or locked state messaging since the visitor has no progress.

### Assertions
- `await page.locator('[data-testid="badges-strip"] >> [data-testid="badge"]').first().click()`
- `await expect(page).toHaveURL(/\/badge\/[A-Za-z]+/)`

---

## Step 10 — Click "See all badges"

**Action:** Click the `See all badges` link in the profile header.
**Expected URL:** `/badges`

### Behavior
- Opens the All Badges page listing all community badges.

### Assertions
- `await page.locator('text=See all badges').click()`
- `await expect(page).toHaveURL(/\/badges$/)`

---

## Step 11 — Attempt gated action: Add Friend → redirect to Login

**Action:** Click the `Add Friend` button while logged out.
**Expected URL after click:** `/login`

### Behavior
- Friend request is not sent.
- Browser navigates to the Login page.
- _(Optional, confirm with engineering)_ A `redirect_to` query param may be appended so the user returns to the profile page after successful login.

### Assertions
- `await page.locator('button:has-text("Add Friend")').click()`
- `await expect(page).toHaveURL(/\/login/)`

---

## Step 12 — Attempt gated action: Chat → redirect to Login

**Action:** Click the `Chat` button while logged out.
**Expected URL after click:** `/login`

### Behavior
- Chat conversation is not opened.
- Browser navigates to the Login page.

### Assertions
- `await page.locator('button:has-text("Chat")').click()`
- `await expect(page).toHaveURL(/\/login/)`

---

## Step 13 — Attempt gated action: Follow → redirect to Login

**Action:** Click the `Follow` button while logged out.
**Expected URL after click:** `/login`

### Behavior
- Follow state is not registered.
- Browser navigates to the Login page.

### Assertions
- `await page.locator('button:has-text("Follow")').click()`
- `await expect(page).toHaveURL(/\/login/)`

---

## Step 14 — Attempt gated action: More (3-dots) menu → redirect to Login

**Action:** Click the `More` (3-dots) button while logged out.
**Expected URL after click:** `/login`

### Behavior
- The dropdown menu does NOT open (or opens briefly then closes on selection).
- Clicking any item in the menu (Block User, Report, etc.) redirects to `/login`.
- Confirm with engineering whether the menu opens at all in logged-out state, or if the button itself short-circuits to Login.

### Assertions
- `await page.locator('button[aria-label="More"]').click()`
- `await expect(page).toHaveURL(/\/login/)`

> If the menu DOES open in pre-login, add a follow-up: click any menu item and assert `/login` redirect.

---

## Step 15 — Attempt gated action: Vote on a comment in Comments tab → redirect to Login

**Action:** With the Comments tab active, click Upvote (or Downvote) on any comment row.
**Expected URL after click:** `/login`

### Behavior
- Vote is not registered.
- Browser navigates to the Login page.

### Assertions
- `await page.locator('[role="tab"]:has-text("Comments")').click()`
- `await page.locator('[data-testid="profile-comment"] >> [data-testid="upvote"]').first().click()`
- `await expect(page).toHaveURL(/\/login/)`

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

test('User Profile View (pre-login) — navigation + tabs + sidebar', async ({ page }) => {
  // Step 1 — Enter profile from homepage
  await page.goto('https://talktravel.com/trending');
  await page.locator('[data-testid="author-link"]').first().click();
  await expect(page).toHaveURL(/\/user\/[a-zA-Z0-9_-]+/);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('[data-testid="badges-strip"]')).toBeVisible();
  await expect(page.locator('button:has-text("Add Friend")')).toBeVisible();
  await expect(page.locator('button:has-text("Chat")')).toBeVisible();
  await expect(page.locator('button:has-text("Follow")')).toBeVisible();

  // Step 4 — Verify About User sidebar
  await expect(page.locator('aside:has-text("About")')).toBeVisible();
  await expect(page.locator('[data-testid="jetfuel-count"]')).toBeVisible();
  await expect(page.locator('[data-testid="profile-tier"]')).toBeVisible();
  await expect(page.locator('[data-testid="tier-progress"]')).toContainText(/Jetfuel until/);

  // Step 5 — Switch to Comments tab
  await page.locator('[role="tab"]:has-text("Comments")').click();
  await expect(page.locator('[role="tab"]:has-text("Comments")')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-testid="profile-comment"]').first()).toBeVisible();

  // Step 6 — Switch back to Posts and click a post
  await page.locator('[role="tab"]:has-text("Posts")').click();
  const firstPost = page.locator('[data-testid="post-card"]').first();
  const postTitle = await firstPost.locator('h2, h3').first().textContent();
  await firstPost.click();
  await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
  await expect(page.locator('h1')).toContainText(postTitle.trim());
});

test('Gated actions on profile redirect to login', async ({ page }) => {
  await page.goto('https://talktravel.com/trending');
  await page.locator('[data-testid="author-link"]').first().click();
  const profileUrl = page.url();

  // Add Friend → /login
  await page.locator('button:has-text("Add Friend")').click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto(profileUrl);

  // Chat → /login
  await page.locator('button:has-text("Chat")').click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto(profileUrl);

  // Follow → /login
  await page.locator('button:has-text("Follow")').click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto(profileUrl);

  // More (3-dots) → /login
  await page.locator('button[aria-label="More"]').click();
  await expect(page).toHaveURL(/\/login/);
});

test('Badges navigation from profile', async ({ page }) => {
  await page.goto('https://talktravel.com/trending');
  await page.locator('[data-testid="author-link"]').first().click();

  // Single badge → /badge/{name}
  await page.locator('[data-testid="badges-strip"] >> [data-testid="badge"]').first().click();
  await expect(page).toHaveURL(/\/badge\/[A-Za-z]+/);
  await page.goBack();

  // See all badges → /badges
  await page.locator('text=See all badges').click();
  await expect(page).toHaveURL(/\/badges$/);
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Direct navigation to `/user/{valid-username}` | Page loads with Posts tab active by default; no auth redirect |
| 2 | Direct navigation to `/user/nonexistent-username` | Graceful 404 or "User not found" state |
| 3 | Direct navigation to a deleted/banned user's profile | "This user is unavailable" or 404 state |
| 4 | Profile entered via homepage vs post vs comment | Identical rendering across all three entry paths |
| 5 | Switch Posts ↔ Comments multiple times | Lists re-render correctly each time; no stale state |
| 6 | Refresh while Comments tab is active | Tab state restored OR resets to Posts (confirm with engineering) |
| 7 | Profile with zero posts | Posts tab shows empty state: "No posts yet" (or similar) |
| 8 | Profile with zero comments | Comments tab shows empty state: "No comments yet" |
| 9 | Profile with empty bio | Bio area hidden OR shows placeholder ("No bio yet") |
| 10 | Profile of a brand-new user (Jetfuel = 0) | Sidebar shows 0 Jetfuel, Coach tier, progress to next tier |
| 11 | Profile of a top-tier user (Jetfuel at max tier) | Progress line shows max tier reached or empty progress |
| 12 | Profile with no badges earned | Badges strip hidden OR shows "No badges yet" placeholder |
| 13 | Profile with many badges (10+) | Strip scrolls horizontally OR truncates with "See all badges" |
| 14 | Click `See all badges` from profile | Opens `/badges` page |
| 15 | Click a single badge | Opens `/badge/{BadgeName}` page |
| 16 | Click `Add Friend` | Redirects to `/login` |
| 17 | Click `Chat` | Redirects to `/login` |
| 18 | Click `Follow` | Redirects to `/login` |
| 19 | Click `More` (3-dots) | Redirects to `/login` (or menu opens; confirm) |
| 20 | Click Upvote on a comment in Comments tab | Redirects to `/login` |
| 21 | Click Downvote on a comment in Comments tab | Redirects to `/login` |
| 22 | Click parent post link in a Comments row | Opens Single Post View scrolled to the comment |
| 23 | Click a topic chip on a post in Posts tab | Opens Single Topic View |
| 24 | Click another author on a post in Posts tab | Should NOT be possible — posts in Posts tab are all authored by this profile. Confirm with engineering. |
| 25 | Browser back from a post inside the profile | Returns to profile with Posts tab still active |
| 26 | Click TalkTravel logo from profile | Returns to `/trending` |
| 27 | Click `Community` in header from profile | Returns to `/trending` |
| 28 | Click `Log in` from profile | Navigates to `/login` |
| 29 | Click `Join Free` from profile | Navigates to `/register` |
| 30 | Rapid double-click on Add Friend / Follow | Only one redirect to `/login` triggered |
| 31 | Very long username | Truncated with ellipsis in header (tooltip on hover) |
| 32 | Very long bio | Wrapped or truncated with "Read more" |
| 33 | Mobile viewport (~375px) | Layout reflows; sidebar may move below content; cards stack vertically |
| 34 | Reduced motion preference | No animation on tab switch |
| 35 | Slow network | Loading skeleton appears in post/comment list area |
| 36 | Open `/user/{username}` in incognito tab via shared link | Loads identically; deep-link integrity preserved |

---

## Known issues to watch for

- The `Follow` button may render different copy depending on backend state for logged-out users — could be `Follow`, `+ Follow`, or `Unfollow` (the source doc lists both Follow and Unfollow). Confirm the canonical pre-login copy.
- The `More` (3-dots) button behavior in pre-login is ambiguous in the source doc — it may open the menu and gate each item, or short-circuit to Login on click. Confirm with engineering.
- Tab state persistence is unclear — may reset to Posts on reload, persist via local storage, or be URL-driven (`?tab=comments`). Confirm before writing brittle assertions.
- The badges strip may render as a horizontally scrolling list when a user has many badges. Use viewport-aware selectors.
- Author links appear in multiple places (post header, post card, comment header). Use scoped selectors to target the intended one.
- If a cookie banner appears on first visit, it will block clicks on the page. Handle in `beforeEach`.
- Jetfuel count and progress values are dynamic — never hardcode specific numbers in assertions; use regex matchers.

---

## Notes for the automation engineer

- Never hardcode a username, post slug, or badge name — capture from the URL or DOM at runtime.
- For sidebar assertions, use text-pattern matchers (`toContainText(/Jetfuel/)`) rather than exact strings, since counts and progress values change.
- For tab assertions, prefer ARIA attributes (`aria-selected`) over class names — they're more stable across UI revisions.
- For gated-action tests, isolate each action in its own test or use `page.goto(profileUrl)` between actions to return to the profile after each Login redirect.
- The post list under the Posts tab and the comment list under the Comments tab may load lazily. Use `await expect(...).toBeVisible()` rather than fixed waits.
- Clear local storage / cookies in `beforeEach` to ensure consistent default state (Posts tab active, no persisted prefs).
- For Step 7 (clicking a comment opens parent post scrolled to comment), confirm the URL pattern with engineering — could be `/post/{slug}#comment-{id}` or `/post/{slug}?commentId={id}`.
- When testing the badges strip on different users, expect variability — some users will have 0 badges, others 10+. Tests should handle both gracefully.
# TalkTravel — Flow: Post-Login Homepage (Logged In)

> **Purpose:** Reference for Playwright automation of the post-login Homepage — landing on `/` after login, switching the Trending / Latest / For You tabs, toggling Card / Compact view, interacting with feed posts (vote, follow, 3-dot menu with owner vs non-owner variants), and using the Create Post / Popular This Week / logo entry points.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged in

> **Prerequisite:** Tests in this flow require an authenticated session. Use `storageState` saved from a logged-in browser context, or log in via the Login flow in a `beforeEach` setup hook.

---

## Flow overview

```
Login success  →  Homepage (Trending tab active by default)
                   ↓
              Switch tab (Trending ↔ Latest ↔ For You)
              Toggle view (Card ↔ Compact)
              Click post / topic / author  →  respective detail pages
              Vote (Upvote/Downvote)        →  count updates
              Follow / Unfollow             →  state toggles
              3-dot menu                    →  Report (others) OR Edit/Delete (own)
              Popular This Week post click  →  Single Post View
              + Create Post                 →  Create Post page
              Logo click                    →  back to Homepage (Trending)
```

After login the visitor lands on the Homepage. The Trending tab is active by default. Three feed tabs (Trending / Latest / For You) and two view modes (Card / Compact) persist across refresh and navigation. Every post in the feed exposes vote, follow, share, and a 3-dot menu whose contents differ for own posts (Edit / Delete) vs others' posts (Report).

---

## Step 1 — Land on the Homepage after login

**Action:** Complete login (or load page with authenticated `storageState`). Navigate to `/`.
**Expected URL:** `/` (or `/trending` — confirm with engineering whether post-login route differs from pre-login).

### Elements that must be visible
- **Header:** full-width search bar, `+ Create Post` button, Messages icon, Notifications bell (with unread badge if any), Profile avatar
- **Left navigation:** Home, Followed Posts, Followed Topics, Friends, Liked Posts, My Posts, My Comments, Messages, My Profile, Settings, Logout
- **Feed tabs:** `Trending` (active by default), `Latest`, `For You`
- **View toggle:** `Card` (default), `Compact`
- **Feed:** list of post cards
- **Sidebar:** `Popular This Week`
- **Footer**

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Header search bar | `header >> input[type="search"]` or `[data-testid="header-search"]` |
| `+ Create Post` button | `text=Create Post` or `[data-testid="create-post"]` |
| Messages icon | `[data-testid="messages-icon"]` or `a[href="/chats"]` |
| Notifications bell | `[data-testid="notifications-bell"]` |
| Profile avatar | `[data-testid="header-avatar"]` |
| Left nav container | `nav[aria-label="Primary"]` or `[data-testid="left-nav"]` |
| Trending tab | `[role="tab"]:has-text("Trending")` |
| Latest tab | `[role="tab"]:has-text("Latest")` |
| For You tab | `[role="tab"]:has-text("For You")` |
| Card view toggle | `button[aria-label="Card view"]` |
| Compact view toggle | `button[aria-label="Compact view"]` |
| Post card | `[data-testid="post-card"]` |
| Popular This Week sidebar | `aside:has-text("Popular This Week")` |

### Assertions
- `await expect(page).toHaveURL(/\/(trending)?$/)`
- `await expect(page.locator('[data-testid="create-post"]')).toBeVisible()`
- `await expect(page.locator('[data-testid="notifications-bell"]')).toBeVisible()`
- `await expect(page.locator('[data-testid="header-avatar"]')).toBeVisible()`
- `await expect(page.locator('nav[aria-label="Primary"]')).toBeVisible()`
- `await expect(page.locator('[role="tab"]:has-text("Trending")')).toHaveAttribute('aria-selected', 'true')`
- `await expect(page.locator('[role="tab"]:has-text("For You")')).toBeVisible()`
- `await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible()`

---

## Step 2 — Switch tab: Trending → Latest

**Action:** Click the `Latest` tab.
**Expected URL:** stays on `/` (tab state may be reflected as `?tab=latest` — confirm with engineering).

### Behavior
- Feed re-renders with posts in reverse chronological order.
- `Latest` becomes active; `Trending` becomes inactive.
- Card / Compact view mode is preserved across the switch.

### Assertions
- `await page.locator('[role="tab"]:has-text("Latest")').click()`
- `await expect(page.locator('[role="tab"]:has-text("Latest")')).toHaveAttribute('aria-selected', 'true')`
- `await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible()`

---

## Step 3 — Switch tab: Latest → For You

**Action:** Click the `For You` tab.
**Expected URL:** stays on `/`.

### Behavior
- Feed re-renders with personalized recommendations based on:
  - Followed posts
  - Followed topics
  - Friends' activity
  - Trending posts (high-engagement signals)
- `For You` becomes active.
- View mode preserved.

### Assertions
- `await page.locator('[role="tab"]:has-text("For You")').click()`
- `await expect(page.locator('[role="tab"]:has-text("For You")')).toHaveAttribute('aria-selected', 'true')`
- `await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible()`

---

## Step 4 — Toggle view: Card → Compact

**Action:** Click the `Compact` view toggle.
**Expected URL:** stays on `/`.

### Behavior
- Feed re-renders with condensed rows.
- Compact toggle becomes active; Card becomes inactive.
- Active tab (Trending / Latest / For You) preserved.

### Assertions
- `await page.locator('button[aria-label="Compact view"]').click()`
- `await expect(page.locator('button[aria-label="Compact view"]')).toHaveAttribute('aria-pressed', 'true')`
- `await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible()`

---

## Step 5 — Persistence check (refresh and navigate)

**Action:** With `For You` tab + `Compact` view selected, reload the page. Then navigate to any single post view and click the logo to return.

### Behavior
- After reload, `For You` tab and `Compact` view remain selected.
- After navigating away and returning via logo, both preferences are still applied.

### Assertions
- `await page.reload()`
- `await expect(page.locator('[role="tab"]:has-text("For You")')).toHaveAttribute('aria-selected', 'true')`
- `await expect(page.locator('button[aria-label="Compact view"]')).toHaveAttribute('aria-pressed', 'true')`

---

## Step 6 — Vote on a post (Upvote)

**Action:** Click the Upvote button on any post card.
**Expected URL:** stays on `/`.

### Behavior
- Vote count increments by 1.
- Upvote button becomes visually active (filled/colored).
- User earns +1 Jetfuel for the upvote.
- _(Optional)_ Author of the post receives engagement Jetfuel.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Upvote button on post card | `[data-testid="post-card"] >> [data-testid="upvote"]` |
| Downvote button on post card | `[data-testid="post-card"] >> [data-testid="downvote"]` |
| Vote count | `[data-testid="vote-count"]` |

### Assertions
- `const firstPost = page.locator('[data-testid="post-card"]').first()`
- `const initialCount = parseInt(await firstPost.locator('[data-testid="vote-count"]').textContent())`
- `await firstPost.locator('[data-testid="upvote"]').click()`
- `await expect(firstPost.locator('[data-testid="vote-count"]')).toHaveText(String(initialCount + 1))`
- `await expect(firstPost.locator('[data-testid="upvote"]')).toHaveAttribute('aria-pressed', 'true')`

---

## Step 7 — Vote on a post (Downvote)

**Action:** Click the Downvote button on a different post card.

### Behavior
- Vote count decrements by 1.
- Downvote button becomes visually active.
- User loses 1 Jetfuel for the downvote (−1 Jetfuel rule).

### Assertions
- `const secondPost = page.locator('[data-testid="post-card"]').nth(1)`
- `const initialCount = parseInt(await secondPost.locator('[data-testid="vote-count"]').textContent())`
- `await secondPost.locator('[data-testid="downvote"]').click()`
- `await expect(secondPost.locator('[data-testid="vote-count"]')).toHaveText(String(initialCount - 1))`

---

## Step 8 — Follow / Unfollow a post

**Action:** Hover over a post card; the `Follow` button appears. Click it.
**Expected URL:** stays on `/`.

### Behavior
- Button toggles to a `Following` state.
- Post is added to the user's Followed Posts (visible under left nav).
- Clicking `Following` again unfollows.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Follow button on hover | `[data-testid="post-card"] >> button:has-text("Follow")` |
| Following state | `[data-testid="post-card"] >> button:has-text("Following")` |

### Assertions
- `const post = page.locator('[data-testid="post-card"]').first()`
- `await post.hover()`
- `await post.locator('button:has-text("Follow")').click()`
- `await expect(post.locator('button:has-text("Following")')).toBeVisible()`

---

## Step 9 — Click a post to open Single Post View

**Action:** Click any post card body or title.
**Expected URL:** `/post/{slug}` (confirm pattern with engineering).

### Behavior
- Opens the Single Post View (covered in the Post-Login Single Post View flow).
- Browser back returns to the Homepage with tab and view state preserved.

### Assertions
- `const firstPost = page.locator('[data-testid="post-card"]').first()`
- `const postTitle = await firstPost.locator('h2, h3').first().textContent()`
- `await firstPost.click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/)`
- `await expect(page.locator('h1')).toContainText(postTitle.trim())`

---

## Step 10 — Click a topic chip

**Action:** Click a topic chip on a post card.
**Expected URL:** `/topic/{slug}`

### Behavior
- Opens the Single Topic View (post-login version).

### Assertions
- `await page.locator('[data-testid="post-card"] >> [data-testid="topic-chip"]').first().click()`
- `await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+/)`

---

## Step 11 — Click another user's avatar/username

**Action:** Click an author username or avatar on a post card.
**Expected URL:** `/user/{username}` (or `/profile/{username}`)

### Behavior
- Opens that user's profile (post-login view — Add Friend / Chat / Follow / Block / Report all functional).

### Assertions
- `await page.locator('[data-testid="post-card"] >> [data-testid="author-link"]').first().click()`
- `await expect(page).toHaveURL(/\/user\/[a-zA-Z0-9_-]+/)`

---

## Step 12 — Click own avatar/username on own post

**Action:** Find a post authored by the current user; click the avatar or username.
**Expected URL:** own profile page.

### Behavior
- Opens own profile page (My Profile view).

### Assertions
- `// Find a post where author matches current user — capture username from header avatar first`
- `await expect(page).toHaveURL(/\/user\/[a-zA-Z0-9_-]+/)`

---

## Step 13 — 3-dot menu on another author's post (Report)

**Action:** Click the 3-dot menu on a post NOT authored by the current user.

### Behavior
- Dropdown opens with `Report` option.
- Clicking `Report` opens the Report modal.
- Report modal contains: Reason (mandatory dropdown), Additional details (optional textarea), Submit Report / Cancel.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| 3-dot menu on post | `[data-testid="post-card"] >> button[aria-label="More"]` |
| Report option | `[role="menuitem"]:has-text("Report")` |
| Report modal | `[role="dialog"][aria-label="Report"]` |
| Reason dropdown | `[data-testid="report-reason"]` |
| Additional details textarea | `[data-testid="report-details"]` |
| Submit Report button | `button:has-text("Submit Report")` |
| Cancel button | `[role="dialog"] >> button:has-text("Cancel")` |

### Assertions
- `// Pick a post not authored by current user`
- `await page.locator('[data-testid="post-card"]').first().locator('button[aria-label="More"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Report")')).toBeVisible()`
- `await page.locator('[role="menuitem"]:has-text("Report")').click()`
- `await expect(page.locator('[role="dialog"]')).toBeVisible()`
- `await expect(page.locator('[data-testid="report-reason"]')).toBeVisible()`

---

## Step 14 — 3-dot menu on own post (Edit / Delete)

**Action:** Navigate to My Posts via left nav. Click the 3-dot menu on a post authored by the current user.

### Behavior
- Dropdown opens with two options: `Edit Post`, `Delete Post`.
- `Edit Post` → opens the Edit Post page (covered in Edit/Delete Post flow).
- `Delete Post` → opens a confirmation modal (Delete / Cancel).

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Edit option | `[role="menuitem"]:has-text("Edit Post")` |
| Delete option | `[role="menuitem"]:has-text("Delete Post")` |
| Delete confirmation modal | `[role="dialog"][aria-label="Delete"]` |

### Assertions
- `await page.goto('https://talktravel.com/my-posts')` (or click left nav `My Posts`)
- `await page.locator('[data-testid="post-card"]').first().locator('button[aria-label="More"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Edit Post")')).toBeVisible()`
- `await expect(page.locator('[role="menuitem"]:has-text("Delete Post")')).toBeVisible()`

---

## Step 15 — Click a post in `Popular This Week` sidebar

**Action:** Click any post entry in the sidebar.
**Expected URL:** `/post/{slug}`

### Behavior
- Opens the Single Post View (same as Step 9).

### Assertions
- `await page.locator('aside:has-text("Popular This Week") >> a').first().click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/)`

---

## Step 16 — Click `+ Create Post` button

**Action:** Click `+ Create Post` in the header.
**Expected URL:** `/create-post` (or similar — confirm with engineering).

### Behavior
- Navigates to the Create Post page (covered by Create Post flow).

### Assertions
- `await page.locator('[data-testid="create-post"]').click()`
- `await expect(page).toHaveURL(/\/create-post/)`

---

## Step 17 — Logo click returns to Homepage (Trending tab)

**Action:** From any Single Post View, click the TalkTravel logo.
**Expected URL:** `/` (or `/trending`).

### Behavior
- Returns to Homepage. Trending tab becomes active (overrides previously selected tab).
- _(Confirm with engineering whether logo click resets to Trending or restores last-active tab.)_

### Assertions
- `await page.locator('header >> a[href="/"]').click()`
- `await expect(page).toHaveURL(/\/(trending)?$/)`
- `await expect(page.locator('[role="tab"]:has-text("Trending")')).toHaveAttribute('aria-selected', 'true')`

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

// Assumes storageState with a logged-in session
test.use({ storageState: 'auth/loggedIn.json' });

test('Post-login Homepage — tabs, view toggle, persistence', async ({ page }) => {
  await page.goto('https://talktravel.com/');
  await expect(page.locator('[role="tab"]:has-text("Trending")')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-testid="create-post"]')).toBeVisible();

  // Switch to Latest
  await page.locator('[role="tab"]:has-text("Latest")').click();
  await expect(page.locator('[role="tab"]:has-text("Latest")')).toHaveAttribute('aria-selected', 'true');

  // Switch to For You
  await page.locator('[role="tab"]:has-text("For You")').click();
  await expect(page.locator('[role="tab"]:has-text("For You")')).toHaveAttribute('aria-selected', 'true');

  // Toggle Compact view
  await page.locator('button[aria-label="Compact view"]').click();
  await expect(page.locator('button[aria-label="Compact view"]')).toHaveAttribute('aria-pressed', 'true');

  // Persistence check
  await page.reload();
  await expect(page.locator('[role="tab"]:has-text("For You")')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('button[aria-label="Compact view"]')).toHaveAttribute('aria-pressed', 'true');
});

test('Post-login Homepage — vote and follow', async ({ page }) => {
  await page.goto('https://talktravel.com/');
  const post = page.locator('[data-testid="post-card"]').first();

  // Upvote
  const initialCount = parseInt(await post.locator('[data-testid="vote-count"]').textContent());
  await post.locator('[data-testid="upvote"]').click();
  await expect(post.locator('[data-testid="vote-count"]')).toHaveText(String(initialCount + 1));

  // Follow
  await post.hover();
  await post.locator('button:has-text("Follow")').click();
  await expect(post.locator('button:has-text("Following")')).toBeVisible();
});

test('Post-login Homepage — 3-dot menu on others vs own post', async ({ page }) => {
  // On Homepage feed (others' posts)
  await page.goto('https://talktravel.com/');
  await page.locator('[data-testid="post-card"]').first().locator('button[aria-label="More"]').click();
  await expect(page.locator('[role="menuitem"]:has-text("Report")')).toBeVisible();
  await expect(page.locator('[role="menuitem"]:has-text("Edit Post")')).not.toBeVisible();
  await page.keyboard.press('Escape');

  // On My Posts (own posts)
  await page.locator('nav[aria-label="Primary"] >> text=My Posts').click();
  await page.locator('[data-testid="post-card"]').first().locator('button[aria-label="More"]').click();
  await expect(page.locator('[role="menuitem"]:has-text("Edit Post")')).toBeVisible();
  await expect(page.locator('[role="menuitem"]:has-text("Delete Post")')).toBeVisible();
  await expect(page.locator('[role="menuitem"]:has-text("Report")')).not.toBeVisible();
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Open `/` immediately after login | Lands on Homepage with Trending tab active |
| 2 | For You tab with no followed posts/topics/friends | Falls back to trending/high-engagement content; no empty state |
| 3 | For You tab when user is brand new (no signals) | Shows trending content; no error |
| 4 | Switch tabs rapidly (Trending → Latest → For You) | Each switch re-renders correctly; no stale state |
| 5 | Refresh page on Latest + Compact | Both preferences restored |
| 6 | Click logo from any page | Returns to `/` with Trending tab active (confirm reset vs restore behavior) |
| 7 | Upvote a post twice rapidly | Toggles off OR registers single vote (confirm behavior) |
| 8 | Switch vote from upvote to downvote on same post | Count adjusts by 2 (−2: removes +1, adds −1) |
| 9 | Follow then immediately unfollow | State toggles back; no error |
| 10 | Click 3-dot on a post by a user who later deletes account | Menu still opens; Report may show error or grey-out |
| 11 | Open Report modal, click Submit without selecting reason | Error message; modal stays open |
| 12 | Open Report modal, click Cancel | Modal closes; no state change |
| 13 | Click `+ Create Post` while on Compact view | Returns user with same view preserved after publish |
| 14 | Click Notifications bell | Opens dropdown panel (covered in Notifications flow) |
| 15 | Click Messages icon | Navigates to `/chats` (covered in DM flow) |
| 16 | Click own avatar in header | Opens dropdown OR navigates to own profile (confirm) |
| 17 | Header search bar with active query | Navigates to `/search` results page (covered in Search flow) |
| 18 | Popular This Week is empty | Sidebar hidden OR shows "Nothing popular this week" |
| 19 | Feed fails to load | Error state with `Retry` action |
| 20 | Infinite scroll on feed (if implemented) | Loads more posts as user scrolls; loading indicator visible |
| 21 | Click an author who blocked the current user | Profile loads but with restricted view (confirm with product) |
| 22 | Click a topic chip the user already follows | Topic page loads; Follow button shows "Following" state |
| 23 | Mobile viewport (~375px) | Left nav collapses to hamburger; sidebar moves below feed |
| 24 | Reduced motion preference | No animation on tab switch or vote |
| 25 | Slow network | Loading skeletons appear in feed |
| 26 | Two browser tabs open: vote in one, check the other | Vote count updates in real-time OR on refresh (confirm) |
| 27 | Session expires while on Homepage | Next action redirects to Login |
| 28 | Logout and return | Lands on pre-login Homepage (covered in Logout flow) |

---

## Known issues to watch for

- Post-login Homepage URL may be `/` or `/trending` — confirm with engineering. Pre-login auto-redirects `/` to `/trending`; post-login behavior may differ.
- Tab state persistence mechanism (local storage / cookie / URL query) is unconfirmed. Same for view mode.
- `Follow` button on post cards only appears on hover in Card view. In Compact view, it may always be visible or hidden behind an overflow menu. Confirm.
- 3-dot menu options are role-based: Report shown for others' posts, Edit/Delete shown for own posts. Tests must verify both branches against the correct user context.
- For You tab logic is opaque — tests can only verify the tab loads, not the relevance of recommendations.
- Jetfuel counter updates may be eventually consistent; allow small wait or refresh before asserting Jetfuel changes.
- Notification bell unread count may decrement when posts are interacted with; isolate vote tests from notification tests.
- If a cookie banner appears for new sessions, dismiss in `beforeEach`.

---

## Notes for the automation engineer

- Use `storageState` (saved authenticated session) rather than re-logging in for every test — much faster.
- Maintain at least two test accounts: one with posts authored (for Edit/Delete tests), one without (for vote/report tests on others' content).
- For Step 14 (own post 3-dot menu), ensure the test account has at least one published post. Seed via API or use a setup fixture.
- Vote counts are dynamic — capture initial count via DOM, then assert relative changes (+1, −1) rather than absolute values.
- For 3-dot menu tests, prefer ARIA roles (`role="menuitem"`) over class names.
- Tab and view persistence may interfere across tests. Clear local storage / cookies in `beforeEach` OR explicitly reset preferences.
- For Popular This Week sidebar tests, the sidebar content rotates weekly; never hardcode titles.
- If the feed uses infinite scroll, set a viewport tall enough to load initial items, or use `scrollIntoViewIfNeeded`.
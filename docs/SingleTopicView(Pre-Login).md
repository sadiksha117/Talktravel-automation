# TalkTravel — Flow: Single Topic View (Pre-Login)

> **Purpose:** Reference for Playwright automation of one pre-login flow — opening a topic detail page, switching its sub-tabs (Trending / Popular / Latest), navigating topic-to-topic, and verifying that gated actions (Follow Topic, +New Post, Vote) redirect to Login.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged out

---

## Flow overview

```
Homepage (/trending)  →  Click topic chip  →  Single Topic View (/topic/{slug})
Single Post View      →  Click topic chip  →  Single Topic View (/topic/{slug})

Inside Single Topic View:
   Switch sub-tab (Trending ↔ Popular ↔ Latest)
   Click a post  →  Single Post View
   Click another topic chip inside a post  →  another Single Topic View
   Click Follow Topic / +New Post / Vote  →  redirect to /login
```

Two main entry points lead to the topic detail page: clicking a topic chip from the Homepage feed, or clicking a topic chip from inside a Single Post View. Both land on the same destination. Sub-tabs inside the topic page refine the post list (Trending / Popular / Latest). All high-intent actions are gated and redirect to Login.

---

## Step 1 — Enter the topic page from the Homepage

**Action:** From `/trending`, click any topic chip on a post card (e.g., `#Airlines`).
**Expected URL:** `/topic/{slug}` (e.g., `/topic/airlines`)

### Elements that must be visible
- Header (same as all pre-login pages): TalkTravel logo, `Community`, `Blog`, `FAQ`, `Log in`, `Join Free`
- Topic header block: topic title (H1), topic description, follower count (if shown)
- Action buttons: `Follow Topic`, `+ New Post`
- Sub-tabs: `Trending` (default), `Popular`, `Latest`
- Post list rendered according to the active sub-tab
- Footer

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Topic title (H1) | `main h1` or `[data-testid="topic-title"]` |
| Topic description | `[data-testid="topic-description"]` |
| Follow Topic button | `button:has-text("Follow Topic")` or `[data-testid="follow-topic"]` |
| `+ New Post` button | `button:has-text("New Post")` or `[data-testid="new-post"]` |
| Trending sub-tab | `[role="tab"]:has-text("Trending")` |
| Popular sub-tab | `[role="tab"]:has-text("Popular")` |
| Latest sub-tab | `[role="tab"]:has-text("Latest")` |
| Post card (generic) | `[data-testid="post-card"]` or `article` |
| First post card | `[data-testid="post-card"]:first-of-type` |
| Topic chip inside a post card | `[data-testid="topic-chip"]` |

### Assertions
- `await page.locator('[data-testid="topic-chip"]').first().click()`
- `await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+/)`
- `await expect(page.locator('main h1')).toBeVisible()`
- `await expect(page.locator('button:has-text("Follow Topic")')).toBeVisible()`
- `await expect(page.locator('button:has-text("New Post")')).toBeVisible()`
- `await expect(page.locator('[role="tab"]:has-text("Trending")')).toHaveAttribute('aria-selected', 'true')`
- `await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible()`

---

## Step 2 — Enter the topic page from a Single Post View

**Action:** From any Single Post View, click a topic chip in the post header.
**Expected URL:** `/topic/{slug}`

### Behavior
- Lands on the same Single Topic View as Step 1.
- All page elements (header, action buttons, sub-tabs, post list, footer) render identically.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Topic chip on post detail | `[data-testid="post-topic-chip"]` or `article >> a[href^="/topic/"]` |

### Assertions
- `await page.locator('a[href^="/topic/"]').first().click()`
- `await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+/)`
- `await expect(page.locator('main h1')).toBeVisible()`

---

## Step 3 — Switch sub-tab (Trending → Popular)

**Action:** Click the `Popular` sub-tab.
**Expected URL:** stays on `/topic/{slug}` (sub-tab state may be reflected as `?tab=popular` — confirm with engineering).

### Behavior
- Post list re-renders, ordered by popularity within this topic.
- `Popular` becomes the active sub-tab; `Trending` becomes inactive.
- Page header (title, description, action buttons) stays the same.

### Assertions
- `await page.locator('[role="tab"]:has-text("Popular")').click()`
- `await expect(page.locator('[role="tab"]:has-text("Popular")')).toHaveAttribute('aria-selected', 'true')`
- `await expect(page.locator('[role="tab"]:has-text("Trending")')).toHaveAttribute('aria-selected', 'false')`
- `await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible()`

---

## Step 4 — Switch sub-tab (Popular → Latest)

**Action:** Click the `Latest` sub-tab.
**Expected URL:** stays on `/topic/{slug}`.

### Behavior
- Post list re-renders in reverse chronological order within this topic.
- `Latest` becomes the active sub-tab.

### Assertions
- `await page.locator('[role="tab"]:has-text("Latest")').click()`
- `await expect(page.locator('[role="tab"]:has-text("Latest")')).toHaveAttribute('aria-selected', 'true')`
- `await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible()`

---

## Step 5 — Click a post in the topic post list

**Action:** Click any post card under the active sub-tab.
**Expected URL:** `/post/{slug}` (confirm pattern with engineering).

### Behavior
- Navigates to the Single Post View for that post.
- Browser back returns to `/topic/{slug}` with previously selected sub-tab preserved.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| First post card | `[data-testid="post-card"]:first-of-type` |
| Post title within card | `[data-testid="post-card"] >> h2, h3` |

### Assertions
- `const firstPost = page.locator('[data-testid="post-card"]').first()`
- `const postTitle = await firstPost.locator('h2, h3').first().textContent()`
- `await firstPost.click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/)`
- `await expect(page.locator('h1')).toContainText(postTitle.trim())`

---

## Step 6 — Topic-to-topic navigation

**Action:** From inside a Single Topic View, open a post (Step 5), then click another topic chip inside that post.
**Expected URL:** `/topic/{new-slug}` (different from the one in Step 1).

### Behavior
- Navigates to a new Single Topic View for the second topic.
- New topic's header, sub-tabs, and post list render correctly.
- This confirms topic-to-topic navigation works without returning to the homepage.

### Assertions
- `const firstTopicUrl = page.url()`
- `// (after clicking a post and then a different topic chip inside it)`
- `await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+/)`
- `await expect(page.url()).not.toBe(firstTopicUrl)`
- `await expect(page.locator('main h1')).toBeVisible()`

---

## Step 7 — Attempt gated action: Follow Topic → redirect to Login

**Action:** Click the `Follow Topic` button while logged out.
**Expected URL after click:** `/login`

### Behavior
- Follow state is not registered.
- Browser navigates to the Login page.
- _(Optional, confirm with engineering)_ A `redirect_to` query param may be appended so the user returns to the topic page after successful login.

### Assertions
- `await page.locator('button:has-text("Follow Topic")').click()`
- `await expect(page).toHaveURL(/\/login/)`

---

## Step 8 — Attempt gated action: + New Post → redirect to Login

**Action:** Click the `+ New Post` button while logged out.
**Expected URL after click:** `/login`

### Behavior
- Create Post form is not opened.
- Browser navigates to the Login page.

### Assertions
- `await page.locator('button:has-text("New Post")').click()`
- `await expect(page).toHaveURL(/\/login/)`

---

## Step 9 — Attempt gated action: Vote on a post → redirect to Login

**Action:** Click the Upvote (or Downvote) button on any post card in the topic post list.
**Expected URL after click:** `/login`

### Behavior
- Vote is not registered.
- Browser navigates to the Login page.

### Assertions
- `await page.locator('[data-testid="upvote"]').first().click()`
- `await expect(page).toHaveURL(/\/login/)`

---

## Step 10 — Back navigation preserves state

**Action:** After clicking a post (Step 5) inside the Single Topic View, click the browser back button.
**Expected URL:** `/topic/{slug}`

### Behavior
- Returns to the topic page with the previously selected sub-tab still active.
- Scroll position may be preserved (confirm with engineering).

### Assertions
- `await page.goBack()`
- `await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+/)`
- `await expect(page.locator('[role="tab"]:has-text("Latest")')).toHaveAttribute('aria-selected', 'true')` (assuming Latest was the active sub-tab before clicking the post)

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

test('Single Topic View (pre-login) flow — entry from homepage + sub-tabs + post click', async ({ page }) => {
  // Step 1 — Enter topic page from homepage
  await page.goto('https://talktravel.com/trending');
  await page.locator('[data-testid="topic-chip"]').first().click();
  await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+/);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('button:has-text("Follow Topic")')).toBeVisible();
  await expect(page.locator('[role="tab"]:has-text("Trending")')).toHaveAttribute('aria-selected', 'true');

  // Step 3 — Switch to Popular sub-tab
  await page.locator('[role="tab"]:has-text("Popular")').click();
  await expect(page.locator('[role="tab"]:has-text("Popular")')).toHaveAttribute('aria-selected', 'true');

  // Step 4 — Switch to Latest sub-tab
  await page.locator('[role="tab"]:has-text("Latest")').click();
  await expect(page.locator('[role="tab"]:has-text("Latest")')).toHaveAttribute('aria-selected', 'true');

  // Step 5 — Click a post in the list
  const firstPost = page.locator('[data-testid="post-card"]').first();
  const postTitle = await firstPost.locator('h2, h3').first().textContent();
  await firstPost.click();
  await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
  await expect(page.locator('h1')).toContainText(postTitle.trim());

  // Step 10 — Back returns to topic with Latest sub-tab still active
  await page.goBack();
  await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+/);
  await expect(page.locator('[role="tab"]:has-text("Latest")')).toHaveAttribute('aria-selected', 'true');
});

test('Topic-to-topic navigation via post', async ({ page }) => {
  await page.goto('https://talktravel.com/trending');
  await page.locator('[data-testid="topic-chip"]').first().click();
  const firstTopicUrl = page.url();

  // Open a post in this topic
  await page.locator('[data-testid="post-card"]').first().click();
  await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);

  // Click a different topic chip inside the post (skip the first one which may match the current topic)
  await page.locator('a[href^="/topic/"]').nth(1).click();
  await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+/);
  expect(page.url()).not.toBe(firstTopicUrl);
});

test('Gated actions redirect to login from topic page', async ({ page }) => {
  await page.goto('https://talktravel.com/trending');
  await page.locator('[data-testid="topic-chip"]').first().click();
  await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+/);

  // Follow Topic → /login
  await page.locator('button:has-text("Follow Topic")').click();
  await expect(page).toHaveURL(/\/login/);
  await page.goBack();

  // + New Post → /login
  await page.locator('button:has-text("New Post")').click();
  await expect(page).toHaveURL(/\/login/);
  await page.goBack();

  // Vote → /login
  await page.locator('[data-testid="upvote"]').first().click();
  await expect(page).toHaveURL(/\/login/);
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Direct navigation to `/topic/{valid-slug}` | Page loads with Trending sub-tab active by default; no auth redirect |
| 2 | Direct navigation to `/topic/nonexistent-slug` | Graceful 404 or "Topic not found" state |
| 3 | Topic page loaded via homepage post chip vs post-detail chip | Identical rendering in both entry paths |
| 4 | Switch Trending ↔ Popular ↔ Latest multiple times | Post list re-renders correctly each time; no stale state |
| 5 | Refresh page while on Popular sub-tab | Sub-tab state restored OR resets to Trending (confirm with engineering) |
| 6 | Topic with zero posts | Empty state: "No posts in this topic yet" |
| 7 | Topic with only one post | Single post renders; sub-tabs still visible and clickable |
| 8 | Post list fails to load (network/server error) | Error state with `Retry` action |
| 9 | Click Upvote on a post in the list | Redirects to `/login` |
| 10 | Click Downvote on a post in the list | Redirects to `/login` |
| 11 | Click Follow on a post in the list (if shown) | Redirects to `/login` |
| 12 | Click Follow Topic | Redirects to `/login` |
| 13 | Click `+ New Post` | Redirects to `/login` |
| 14 | Click author username/avatar on a post card | Opens user profile page (pre-login view) |
| 15 | Click another topic chip on a post card | Opens that topic's detail page |
| 16 | Click a topic chip that matches the current topic | Stays on the same page OR no-op (confirm behavior) |
| 17 | Browser back from a post inside the topic | Returns to topic with sub-tab state preserved |
| 18 | Click TalkTravel logo from topic page | Returns to `/trending` |
| 19 | Click `Community` in header from topic page | Returns to `/trending` |
| 20 | Click `Log in` from topic page | Navigates to `/login` |
| 21 | Click `Join Free` from topic page | Navigates to `/register` |
| 22 | Rapid double-click on Follow Topic | Only one redirect to `/login` triggered |
| 23 | Very long topic title | Truncated with ellipsis (tooltip on hover) |
| 24 | Very long topic description | Truncated with "Read more" or wrapped gracefully |
| 25 | Mobile viewport (~375px) | Layout reflows; sub-tabs may scroll horizontally; cards stack vertically |
| 26 | Reduced motion preference | No animation on sub-tab switch |
| 27 | Slow network | Loading skeleton appears in post list area while fetching |
| 28 | Open `/topic/{slug}` in incognito tab via shared link | Loads identically; deep-link integrity preserved |
| 29 | Topic page has both parent and child topics shown | Confirm whether child topics render as chips/links; clicking opens child topic page |
| 30 | Click post that itself has multiple topic chips | All chips clickable; each opens correct topic page |

---

## Known issues to watch for

- Sub-tab state persistence is unclear — may reset on reload, may persist via local storage, or may be URL-driven (`?tab=popular`). Confirm with engineering before writing brittle assertions.
- Topic chips may appear in multiple places (post header, post body, sidebar). Use scoped selectors so tests target the intended chip.
- The first topic chip inside a post may point back to the current topic (especially when entering via a post). For topic-to-topic tests, use `.nth(1)` or filter by `href` to avoid same-topic navigation.
- If a cookie banner appears on first visit to a topic page, it will block clicks on the feed. Handle in `beforeEach`.
- The `Follow Topic` button may render different copy when hovered (e.g., "Follow" vs "+ Follow") — confirm exact text.
- Some topics may be parent categories with sub-topics nested underneath. Behavior of clicking a parent vs child topic may differ; confirm with product.

---

## Notes for the automation engineer

- Never hardcode a topic slug — capture it from the URL or chip `href` at runtime. Topic slugs may change.
- For sub-tab assertions, prefer ARIA attributes (`aria-selected`) over class names — they're more stable across UI revisions.
- The post list inside a topic is dynamic; the first post on Trending today may not be the first tomorrow. Always capture title at runtime and assert on the captured value.
- For topic-to-topic navigation, store the current URL before clicking, and assert the new URL differs.
- For gated-action tests, isolate each action in its own test so one failure doesn't block the others — Login redirect leaves the test on `/login`, requiring a `goBack()` or re-navigation between actions.
- Clear local storage / cookies in `beforeEach` to ensure consistent default state (Trending sub-tab active, no persisted prefs from prior tests).
- If running headed locally, dismiss the cookie banner before interacting with the page.

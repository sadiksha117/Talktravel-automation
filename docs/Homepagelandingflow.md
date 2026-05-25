# TalkTravel — Flow: Homepage / Trending Landing (Pre-Login)

> **Purpose:** Reference for Playwright automation of one pre-login flow — landing on the homepage at `/trending` and interacting with the feed (tabs, view toggle, post cards, sidebar, gated actions).
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged out

---

## Flow overview

```
Open talktravel.com  →  Auto-redirect to /trending  →  Switch tab (Trending ↔ Latest)
                                                    →  Toggle view (Card ↔ Compact)
                                                    →  Click post / topic / author
                                                    →  Attempt gated action → redirect to /login
```

The Homepage acts as the primary discovery surface for logged-out visitors. High-intent actions (Vote, Follow, +New Post) are gated and redirect to Login. Selected tab and view mode persist across refresh and navigation.

---

## Step 1 — Land on the homepage

**Action:** Navigate to `https://talktravel.com`
**Expected URL:** `/trending` (auto-redirect from `/`)

### Elements that must be visible
- Header: TalkTravel logo, `Community`, `Blog`, `FAQ`, `Log in`, `Join Free`
- Feed tabs: `Trending` (active by default), `Latest`
- View toggle: `Card` (active by default), `Compact`
- Feed list of post cards
- Sidebar: `Popular This Week` with clickable post entries
- Footer: brand block, Community / Blog / Support columns, bottom bar with copyright + version

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Logo | `a[href="/"]` (header) |
| `Community` link | `header >> text=Community` |
| `Blog` link | `header >> text=Blog` |
| `FAQ` link | `header >> text=FAQ` |
| `Log in` button | `text=Log in` |
| `Join Free` CTA | `text=Join Free` |
| Trending tab | `button:has-text("Trending")` or `[role="tab"][name="Trending"]` |
| Latest tab | `button:has-text("Latest")` or `[role="tab"][name="Latest"]` |
| Card view toggle | `button[aria-label="Card view"]` or `[data-testid="view-card"]` |
| Compact view toggle | `button[aria-label="Compact view"]` or `[data-testid="view-compact"]` |
| Feed container | `[data-testid="feed"]` or `main >> section` |
| Post card (generic) | `[data-testid="post-card"]` or `article` |
| First post card | `[data-testid="post-card"]:first-of-type` |
| Popular This Week | `[data-testid="popular-this-week"]` or `aside:has-text("Popular This Week")` |
| Footer | `footer` |

### Assertions
- `await expect(page).toHaveURL(/\/trending$/)`
- `await expect(page.locator('header')).toContainText('Community')`
- `await expect(page.locator('header')).toContainText('Join Free')`
- `await expect(page.locator('button:has-text("Trending")')).toHaveAttribute('aria-selected', 'true')`
- `await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible()`
- `await expect(page.locator('aside:has-text("Popular This Week")')).toBeVisible()`
- `await expect(page.locator('footer')).toBeVisible()`

---

## Step 2 — Switch feed tab (Trending → Latest)

**Action:** Click the `Latest` tab.
**Expected URL:** stays on `/trending` (tab state may also be reflected as `?tab=latest` if query-param-driven — confirm with engineering).

### Behavior
- Feed re-renders with posts in reverse chronological order.
- Latest tab is visually active; Trending tab is inactive.
- View mode (Card / Compact) is preserved across tab switch.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Latest tab | `button:has-text("Latest")` |
| Trending tab | `button:has-text("Trending")` |
| Active tab indicator | `[aria-selected="true"]` |

### Assertions
- `await page.locator('button:has-text("Latest")').click()`
- `await expect(page.locator('button:has-text("Latest")')).toHaveAttribute('aria-selected', 'true')`
- `await expect(page.locator('button:has-text("Trending")')).toHaveAttribute('aria-selected', 'false')`
- `await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible()`

---

## Step 3 — Toggle view mode (Card → Compact)

**Action:** Click the `Compact` view toggle.
**Expected URL:** stays on `/trending`.

### Behavior
- Feed re-renders with condensed rows (title, author, topic, vote count, comment count).
- Card view toggle becomes inactive; Compact becomes active.
- Selected tab (Trending or Latest) is preserved across view change.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Compact toggle | `button[aria-label="Compact view"]` |
| Card toggle | `button[aria-label="Card view"]` |
| Compact row | `[data-testid="post-card"][data-view="compact"]` or `.post-card--compact` |

### Assertions
- `await page.locator('button[aria-label="Compact view"]').click()`
- `await expect(page.locator('button[aria-label="Compact view"]')).toHaveAttribute('aria-pressed', 'true')`
- `await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible()`

---

## Step 4 — Persistence check (refresh)

**Action:** With `Latest` tab + `Compact` view selected, reload the page.
**Expected URL:** `/trending`

### Behavior
- After reload, Latest tab remains active and Compact view remains applied.
- Persistence is backed by local storage / cookie.

### Assertions
- `await page.reload()`
- `await expect(page).toHaveURL(/\/trending$/)`
- `await expect(page.locator('button:has-text("Latest")')).toHaveAttribute('aria-selected', 'true')`
- `await expect(page.locator('button[aria-label="Compact view"]')).toHaveAttribute('aria-pressed', 'true')`

---

## Step 5 — Click a post card

**Action:** Click any post card title or body in the feed.
**Expected URL:** `/post/{slug}` or `/posts/{id}` (confirm pattern with engineering).

### Behavior
- Navigates to the single post view.
- Browser back returns to `/trending` with previously selected tab + view restored.

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

## Step 6 — Click a topic chip

**Action:** From a post card, click a topic chip (e.g., `#Airlines`).
**Expected URL:** `/topic/{slug}` or `/topics/{slug}`.

### Behavior
- Opens the single topic detail page.
- Page shows topic title, description, and a post list filtered by that topic.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Topic chip on post card | `[data-testid="topic-chip"]` or `a[href^="/topic/"]` |

### Assertions
- `await page.locator('[data-testid="topic-chip"]').first().click()`
- `await expect(page).toHaveURL(/\/topic\/[a-z0-9-]+/)`

---

## Step 7 — Click an author username/avatar

**Action:** Click the author name or avatar on any post card.
**Expected URL:** `/user/{username}` or `/profile/{username}`.

### Behavior
- Opens that user's profile page in logged-out view.
- Profile action buttons (Add Friend, Chat, Follow, More) are visible but all redirect to `/login` when clicked.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Author link on card | `[data-testid="post-card"] >> [data-testid="author-link"]` or `a[href^="/user/"]` |

### Assertions
- `await page.locator('[data-testid="author-link"]').first().click()`
- `await expect(page).toHaveURL(/\/user\/[a-zA-Z0-9_-]+/)`

---

## Step 8 — Attempt a gated action (Upvote → redirect to Login)

**Action:** Click the Upvote button on any post card while logged out.
**Expected URL after click:** `/login`

### Behavior
- Vote is not registered.
- Browser navigates to the Login page.
- _(Optional, confirm with engineering)_ A `redirect_to` query param may be appended so the user returns to `/trending` after successful login.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Upvote button | `[data-testid="upvote"]` or `button[aria-label="Upvote"]` |
| Downvote button | `[data-testid="downvote"]` or `button[aria-label="Downvote"]` |

### Assertions
- `await page.locator('[data-testid="upvote"]').first().click()`
- `await expect(page).toHaveURL(/\/login/)`

---

## Step 9 — Click a post in `Popular This Week` sidebar

**Action:** Click any post entry in the `Popular This Week` sidebar.
**Expected URL:** `/post/{slug}` (or `/posts/{id}`).

### Behavior
- Opens the single post view (same as Step 5).
- Back returns to `/trending` with state preserved.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Popular sidebar | `aside:has-text("Popular This Week")` |
| Popular post entry | `aside:has-text("Popular This Week") >> a` |

### Assertions
- `await page.locator('aside:has-text("Popular This Week") >> a').first().click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/)`

---

## Step 10 — Logo click returns to `/trending`

**Action:** From a single post view, click the TalkTravel logo in the header.
**Expected URL:** `/trending`

### Assertions
- `await page.locator('header >> a[href="/"]').click()`
- `await expect(page).toHaveURL(/\/trending$/)`

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

test('Homepage / Trending Landing (pre-login) flow', async ({ page }) => {
  // Step 1 — Land on homepage
  await page.goto('https://talktravel.com');
  await expect(page).toHaveURL(/\/trending$/);
  await expect(page.locator('header')).toContainText('Join Free');
  await expect(page.locator('button:has-text("Trending")')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible();

  // Step 2 — Switch to Latest tab
  await page.locator('button:has-text("Latest")').click();
  await expect(page.locator('button:has-text("Latest")')).toHaveAttribute('aria-selected', 'true');

  // Step 3 — Toggle to Compact view
  await page.locator('button[aria-label="Compact view"]').click();
  await expect(page.locator('button[aria-label="Compact view"]')).toHaveAttribute('aria-pressed', 'true');

  // Step 4 — Persistence check
  await page.reload();
  await expect(page.locator('button:has-text("Latest")')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('button[aria-label="Compact view"]')).toHaveAttribute('aria-pressed', 'true');

  // Step 5 — Click first post (capture title, assert on detail page)
  const firstPost = page.locator('[data-testid="post-card"]').first();
  const postTitle = await firstPost.locator('h2, h3').first().textContent();
  await firstPost.click();
  await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
  await expect(page.locator('h1')).toContainText(postTitle.trim());

  // Step 10 — Logo click returns to /trending
  await page.locator('header >> a[href="/"]').click();
  await expect(page).toHaveURL(/\/trending$/);
});

test('Gated action redirects to login', async ({ page }) => {
  await page.goto('https://talktravel.com/trending');
  await page.locator('[data-testid="upvote"]').first().click();
  await expect(page).toHaveURL(/\/login/);
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Open `talktravel.com/` (root) | Auto-redirect to `/trending` |
| 2 | Direct navigation to `/trending` | Loads identically; no auth redirect |
| 3 | Switch Trending ↔ Latest multiple times | Feed re-renders correctly each time; no stale state |
| 4 | Toggle Card ↔ Compact multiple times | View mode updates correctly each time |
| 5 | Refresh page after selecting tab + view | Both preferences restored |
| 6 | Navigate away and back via header `Community` link | Tab + view state preserved |
| 7 | Browser back from single post view | Returns to `/trending` with state preserved (including scroll position if implemented) |
| 8 | Click Upvote on a sidebar (Popular This Week) post | Redirects to `/login` |
| 9 | Click Downvote on any post | Redirects to `/login` |
| 10 | Click Follow on a post (if shown) | Redirects to `/login` |
| 11 | Click `Log in` in header | Navigates to `/login` |
| 12 | Click `Join Free` in header | Navigates to `/register` |
| 13 | Click `Community` in header | Returns to `/trending` |
| 14 | Click `Blog` in header | Opens `/blog` |
| 15 | Click `FAQ` in header | Opens `/faq` |
| 16 | Local storage disabled (privacy mode / incognito) | Defaults apply (Trending + Card); no persistence across reload |
| 17 | Deep link `/trending?tab=latest&view=compact` | Query params take precedence over stored prefs (if supported — confirm) |
| 18 | Empty feed (no Trending posts available) | Empty state: "No trending posts right now. Check back soon." |
| 19 | Feed fails to load (network/server error) | Error state with `Retry` action |
| 20 | Popular This Week is empty | Sidebar hidden OR shows "Nothing popular this week" |
| 21 | Rapid double-click on Vote button | Only one redirect to `/login` is triggered |
| 22 | Very long post title | Truncated with ellipsis in both Card and Compact views |
| 23 | Mobile viewport (~375px) | Layout reflows; cards stack vertically; nav collapses; sidebar moves below feed |
| 24 | Reduced motion preference | No animation on tab switch or view toggle |
| 25 | Slow network | Loading skeletons appear while feed loads |
| 26 | Click two posts in rapid succession | Latest click wins; no race condition |
| 27 | Open `/trending` in an incognito tab | Loads identically; no persisted prefs applied |
| 28 | Footer rendered at the bottom of the page | All columns + bottom bar (copyright + version) visible |

---

## Known issues to watch for

- Tab state persistence may be implemented via local storage, cookies, or query params — confirm with engineering before writing brittle selectors against URL.
- The `Card` / `Compact` toggle may use `aria-pressed` or `data-active` attributes — confirm which is in production.
- The Popular This Week sidebar may render below the feed on smaller breakpoints. Use viewport-aware selectors.
- If a cookie banner appears on first visit, it will block clicks on the feed. Handle it in a `beforeEach` hook (reject / dismiss).
- The header `Blog` link may also trigger a hover dropdown — ensure Playwright clicks the link itself, not a dropdown item.

---

## Notes for the automation engineer

- Use `await page.waitForLoadState('networkidle')` only if you observe race conditions between feed re-renders and assertions; otherwise prefer explicit element waits via `expect(...).toBeVisible()`.
- Never hardcode a post slug or title — capture from the DOM at runtime and assert against the captured value.
- The feed is dynamic; the first post on Trending today may not be the first tomorrow. Tests should be resilient to changing content.
- When asserting tab/view state, prefer ARIA attributes (`aria-selected`, `aria-pressed`) over visual class names — they're more stable.
- For the gated-action redirect test, isolate it from the main flow test so a failure here doesn't block downstream steps.
- Clear local storage / cookies in `beforeEach` to ensure each test starts from a clean default state (Trending + Card view).
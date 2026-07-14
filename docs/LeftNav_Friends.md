# TalkTravel — Flow: Left Nav — Friends Dropdown (Post-Login)

> **Purpose:** Reference for Playwright automation of the Friends left-nav dropdown — clicking `Friends` in the left navigation to expand/collapse an inline dropdown showing the user's friends, clicking a friend row to open their profile, using the `See all` entry point to reach the full `/friends` page, and verifying the empty state when the user has no friends.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged in

> **Prerequisite:** Tests require an authenticated session via `storageState`. Some tests need the user to have at least one friend (seed via API in `beforeEach`); the empty-state test needs an account with zero friends. Adding a friend requires two accounts and mutual acceptance — cover the accept/reject flow in the Friend Request Lifecycle doc.

---

## Flow overview

```
Any post-login page  →  Left nav  →  Friends (click to expand)
                                          ↓
                     Dropdown expands INLINE below the nav item
                                          ↓
     ┌──────────────────────────────────────────────────────────────┐
     │  Populated state:                                            │
     │     List of friends (avatar + nickname per row)              │
     │     "See all" link at the bottom                             │
     │                                                              │
     │  Empty state:                                                │
     │     "No friends yet"                                         │
     │     "See all" link (still visible → opens /friends page)    │
     └──────────────────────────────────────────────────────────────┘
                                          ↓
   ┌───────────────────────────┐  ┌────────────────────────────────┐
   │ Click a friend row        │  │ Click "See all"                │
   └───────────────────────────┘  └────────────────────────────────┘
             ↓                                    ↓
   Opens friend's user profile         Opens /friends (Friends page)
```

The Friends item behaves as a **collapsible inline dropdown**, structurally identical to the Followed Topics dropdown. Each row shows a friend's avatar and nickname. Clicking a row opens that friend's user profile. The `See all` link at the bottom is always present (populated or empty state) and navigates to the full Friends page where accept/reject/cancel actions live. This dropdown is read-only — no friend management happens here.

---

## Step 1 — Expand the Friends dropdown

**Action:** From any post-login page, click the `Friends` item in the left navigation.

### Behavior
- The dropdown expands inline below the nav item.
- The parent nav item shows a visual indicator that it's expanded (`aria-expanded="true"` or a chevron rotation).
- The URL does NOT change — this is a UI-only interaction.
- If the user has friends, they appear as clickable rows (avatar + nickname).
- The `See all` link is always visible at the bottom of the dropdown.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| `Friends` nav item (parent toggle) | `nav[aria-label="Primary"] >> button:has-text("Friends")` or `[data-testid="nav-friends"]` |
| Dropdown container | `[data-testid="friends-dropdown"]` or `[aria-labelledby="nav-friends"]` |
| Individual friend row | `[data-testid="friends-dropdown"] >> a[href^="/user/"]` |
| Friend avatar | `[data-testid="friends-dropdown"] >> [data-testid="friend-avatar"]` |
| Friend nickname | `[data-testid="friends-dropdown"] >> [data-testid="friend-nickname"]` |
| See all link | `[data-testid="friends-dropdown"] >> text=See all` |
| Empty state text | `text=/no friends yet/i` |

### Assertions
- `const navItem = page.locator('nav[aria-label="Primary"] >> button:has-text("Friends")')`
- `await navItem.click()`
- `await expect(navItem).toHaveAttribute('aria-expanded', 'true')`
- `await expect(page.locator('[data-testid="friends-dropdown"]')).toBeVisible()`

---

## Step 2 — Collapse the Friends dropdown

**Action:** With the dropdown expanded, click the `Friends` nav item again.

### Behavior
- The dropdown collapses.
- The parent nav item's expanded indicator returns to collapsed state (`aria-expanded="false"`).
- Friend rows are no longer visible.

### Assertions
- `await navItem.click()`
- `await expect(navItem).toHaveAttribute('aria-expanded', 'false')`
- `await expect(page.locator('[data-testid="friends-dropdown"]')).not.toBeVisible()`

---

## Step 3 — Populated state: user has at least one friend

**Action:** With the user having at least one accepted friend (seed via API), expand the dropdown.

### Elements that must be visible
- List of friends — one row per friend
- Each row shows the friend's avatar and nickname
- Each row is a clickable link to `/user/{username}`
- `See all` link at the bottom (always present)

### Assertions
- `await navItem.click()`
- `const dropdown = page.locator('[data-testid="friends-dropdown"]')`
- `await expect(dropdown.locator('a[href^="/user/"]')).toHaveCount(/* seeded count */)`
- `await expect(dropdown.locator('[data-testid="friend-avatar"]').first()).toBeVisible()`
- `await expect(dropdown.locator('[data-testid="friend-nickname"]').first()).toBeVisible()`
- `await expect(dropdown.locator('text=See all')).toBeVisible()`

---

## Step 4 — Click a friend row in the dropdown

**Action:** Click any friend row in the expanded dropdown.
**Expected URL:** `/user/{username}` (the friend's profile).

### Behavior
- Navigates to the Single User Profile page (post-login version) for that friend.
- The profile shows Friend state on the action button (i.e., `Friends` label with confirmation-to-unfriend behavior).
- Whether the dropdown stays expanded or collapses after click is UI-dependent — confirm with engineering.

### Assertions
- `const firstFriend = dropdown.locator('a[href^="/user/"]').first()`
- `const friendHref = await firstFriend.getAttribute('href')`
- `await firstFriend.click()`
- `await expect(page).toHaveURL(new RegExp(friendHref))`
- `await expect(page.locator('button:has-text("Friends")')).toBeVisible()`

---

## Step 5 — Click "See all" link

**Action:** With the dropdown expanded, click the `See all` link at the bottom.
**Expected URL:** `/friends`

### Behavior
- Navigates to the full Friends page (`/friends`).
- The page shows 3 tabs: `Friends` (accepted), `Requests` (incoming), `Sent` (outgoing pending).
- Full friend management (accept, reject, cancel, remove) lives on this page.

### Assertions
- `await dropdown.locator('text=See all').click()`
- `await expect(page).toHaveURL(/\/friends$/)`

---

## Step 6 — Empty state: user has zero friends

**Action:** With the user having NO friends, expand the dropdown.

### Elements that must be visible
- Empty state message — e.g., *"No friends yet"*
- `See all` link (persistently visible even in empty state — opens `/friends` page for finding/inviting friends)

### Assertions
- `// Precondition: user has 0 friends`
- `await navItem.click()`
- `await expect(dropdown.locator('text=/no friends yet/i')).toBeVisible()`
- `await expect(dropdown.locator('text=See all')).toBeVisible()`
- `await expect(dropdown.locator('a[href^="/user/"]')).toHaveCount(0)`

---

## Step 7 — Friend added elsewhere appears in the dropdown

**Action:** From another user's profile, send a friend request. Have the other user accept (via a second browser context or API). Return to the dropdown.

### Behavior
- The newly accepted friend appears in the dropdown.
- May update in real-time OR require the page/dropdown to re-render (confirm with engineering).

### Assertions
- `// After friend request accepted via API or second context`
- `await navItem.click()`
- `await expect(dropdown.locator(`a[href="/user/${friendUsername}"]`)).toBeVisible()`

---

## Step 8 — Unfriend elsewhere, verify friend disappears from the dropdown

**Action:** From the friend's user profile OR from the Friends page, unfriend them. Return to the dropdown.

### Behavior
- The unfriended user is removed from the Friends dropdown list.
- The change is persistent across refresh.

### Assertions
- `// After unfriend action`
- `await navItem.click()`
- `await expect(dropdown.locator(`a[href="/user/${friendUsername}"]`)).not.toBeVisible()`

---

## Step 9 — Keyboard interaction: Tab and Enter to expand/collapse

**Action:** Focus the `Friends` nav item via keyboard. Press Enter (or Space).

### Behavior
- Enter/Space toggles the dropdown open/closed — same as click.
- Tab moves focus into the dropdown when expanded, allowing keyboard navigation to individual friend rows.
- Esc collapses the dropdown (confirm with engineering).

### Assertions
- `await navItem.focus()`
- `await page.keyboard.press('Enter')`
- `await expect(dropdown).toBeVisible()`
- `await page.keyboard.press('Escape')`
- `// If Esc collapses:`
- `// await expect(dropdown).not.toBeVisible()`

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'auth/verified.json' });

test.describe('Left Nav — Friends Dropdown', () => {

  test.beforeEach(async ({ request }) => {
    // Seed: create 3 accepted friendships via API
    await seedFriendshipsViaApi(3);
  });

  test.afterEach(async ({ request }) => {
    await removeAllFriendshipsViaApi();
  });

  test('Expand and collapse the dropdown', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    const navItem = page.locator('nav[aria-label="Primary"] >> button:has-text("Friends")');

    await navItem.click();
    await expect(navItem).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-testid="friends-dropdown"]')).toBeVisible();

    await navItem.click();
    await expect(navItem).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('[data-testid="friends-dropdown"]')).not.toBeVisible();
  });

  test('Dropdown lists friends with avatar and nickname', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> button:has-text("Friends")').click();
    const dropdown = page.locator('[data-testid="friends-dropdown"]');
    await expect(dropdown.locator('a[href^="/user/"]')).toHaveCount(3);
    await expect(dropdown.locator('[data-testid="friend-avatar"]').first()).toBeVisible();
    await expect(dropdown.locator('[data-testid="friend-nickname"]').first()).toBeVisible();
    await expect(dropdown.locator('text=See all')).toBeVisible();
  });

  test('Click a friend opens their profile', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> button:has-text("Friends")').click();
    const firstFriend = page.locator('[data-testid="friends-dropdown"] >> a[href^="/user/"]').first();
    const href = await firstFriend.getAttribute('href');
    await firstFriend.click();
    await expect(page).toHaveURL(new RegExp(href));
    await expect(page.locator('button:has-text("Friends")')).toBeVisible();
  });

  test('See all navigates to /friends', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> button:has-text("Friends")').click();
    await page.locator('[data-testid="friends-dropdown"] >> text=See all').click();
    await expect(page).toHaveURL(/\/friends$/);
  });
});

test('Empty state when user has zero friends', async ({ browser }) => {
  const context = await browser.newContext({ storageState: 'auth/no-friends.json' });
  const page = await context.newPage();
  await page.goto('https://talktravel.com/');
  await page.locator('nav[aria-label="Primary"] >> button:has-text("Friends")').click();
  const dropdown = page.locator('[data-testid="friends-dropdown"]');
  await expect(dropdown.locator('text=/no friends yet/i')).toBeVisible();
  await expect(dropdown.locator('text=See all')).toBeVisible();
  await expect(dropdown.locator('a[href^="/user/"]')).toHaveCount(0);
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Expand dropdown on Homepage | Works |
| 2 | Expand dropdown on Single Post View | Works |
| 3 | Expand dropdown on Settings page | Works (nav is present on every post-login page) |
| 4 | Expand dropdown while Followed Topics dropdown is open | Both may stay open OR one collapses (confirm) |
| 5 | Rapid double-click on nav item | Ends in predictable state (expanded or collapsed) |
| 6 | Click outside the dropdown while expanded | Dropdown collapses OR stays open (confirm) |
| 7 | Very long nickname in dropdown | Truncated with ellipsis, tooltip on hover |
| 8 | Many friends (20+) | Dropdown scrolls internally OR shows a subset with "See all" for full list (confirm) |
| 9 | Accept a friend request from another user's profile | New friend appears in dropdown |
| 10 | Accept a friend request from the Friends page | Same |
| 11 | Reject a friend request | User does NOT appear in Friends dropdown |
| 12 | Cancel a sent friend request | User does NOT appear in Friends dropdown |
| 13 | Remove a friend from the Friends page | User disappears from dropdown |
| 14 | Unfriend from a friend's profile | User disappears from dropdown |
| 15 | Two browser tabs: accept friend request in one, check dropdown in the other | Updates on refresh OR real-time (confirm) |
| 16 | Session expires while dropdown is open | Next action redirects to Login |
| 17 | Mobile viewport (~375px) — nav collapsed | Confirm dropdown pattern OR converts to bottom sheet/modal |
| 18 | Reduced motion preference | No animation on expand/collapse |
| 19 | Screen reader announcement | Confirm accessible label / aria-expanded |
| 20 | Keyboard navigation: Tab into dropdown, Arrow keys between friend rows | Confirm keyboard support |
| 21 | Esc while dropdown is expanded | Collapses dropdown (confirm) |
| 22 | Click a friend who has since deleted their account | Handle gracefully (404 or "User unavailable") |
| 23 | Click a friend who has blocked the current user | Confirm behavior |
| 24 | Slow network on dropdown initial load | Loading indicator inside dropdown |
| 25 | Friend list sort order | Confirm — likely alphabetical or most-recently-added |
| 26 | Avatar image fails to load | Fallback to default avatar or initials |

---

## Known issues to watch for

- The exact ARIA implementation (`aria-expanded`, `role="button"`, `role="menu"`) on the nav item is unconfirmed.
- Whether the dropdown collapses on outside-click is unspecified.
- Whether opening one dropdown auto-collapses another (Friends vs Followed Topics) is unspecified.
- The empty state copy is unspecified — use regex matcher.
- Real-time updates when accepting/rejecting friend requests from another page are unspecified.
- The friend list sort order is unspecified — most likely alphabetical or by last interaction. Do not assume order.
- Long nickname truncation behavior is unspecified.
- Mobile behavior (nav collapsed to hamburger) — dropdown pattern may not apply.
- Whether the dropdown shows ALL friends or a "top N" subset (say, most recent) is unspecified. If it's a subset, the count in the dropdown may not match the total on the Friends page.
- Avatar fallback behavior (broken image, deleted user, no avatar set) is unspecified.

---

## Notes for the automation engineer

- **Seed friendships via API** — creating friendships manually through the UI requires two accounts, sending requests, accepting them. API seed is far faster and more reliable.
- **Two account types.** `auth/verified.json` (with seeded friends) and `auth/no-friends.json` (zero friends) for empty-state tests. For friend-request lifecycle tests, add `auth/pending.json` (with pending sent + received requests).
- **Cleanup in `afterEach`** by removing all friendships via API.
- **For dropdown visibility assertions**, use `expect(...).toBeVisible()` rather than checking a class name.
- **For expanded/collapsed state**, prefer `aria-expanded` over class names.
- **For empty state copy**, use a regex matcher (`text=/no friends yet/i`).
- **Capture friend usernames at runtime** rather than hardcoding.
- **Do NOT assume friend list order** — assert on presence/absence by username, not by position.
- **For nav-item selectors**, scope to primary nav (`nav[aria-label="Primary"]`) to avoid collisions.
- **The `See all` link is critical** — always assert its presence in both populated and empty states.
- **For friend row clicks**, capture the href before clicking so URL assertion is reliable.
- **Real-time update tests** (edge cases #9, #15) may need short waits or manual refresh triggers depending on implementation.
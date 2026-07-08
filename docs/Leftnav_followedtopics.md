# TalkTravel — Flow: Left Nav — Followed Topics Dropdown (Post-Login)

> **Purpose:** Reference for Playwright automation of the Followed Topics left-nav dropdown — clicking the `Followed Topics` item in the left navigation to expand/collapse an inline dropdown showing the topics the user follows, clicking a topic to navigate to its detail page, using the `Browse all topics` entry point to reach `/topics`, and verifying the empty state when the user follows no topics.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged in

> **Prerequisite:** Tests require an authenticated session via `storageState`. Some tests need the user to follow at least one topic (seed via API in `beforeEach`); the empty-state test needs an account following zero topics.

---

## Flow overview

```
Any post-login page  →  Left nav  →  Followed Topics (click to expand)
                                          ↓
                     Dropdown expands INLINE below the nav item
                                          ↓
     ┌──────────────────────────────────────────────────────────────┐
     │  Populated state:                                            │
     │     List of followed topics (each is a link)                 │
     │     "Browse all topics" link at the bottom                   │
     │                                                              │
     │  Empty state:                                                │
     │     "No followed topics yet"                                 │
     │     "Browse all topics" link                                 │
     └──────────────────────────────────────────────────────────────┘
                                          ↓
   ┌───────────────────────────┐  ┌────────────────────────────────┐
   │ Click a topic name        │  │ Click "Browse all topics"      │
   └───────────────────────────┘  └────────────────────────────────┘
             ↓                                    ↓
   Opens Single Topic View            Opens /topics (Browse Topics page)
   Dropdown may stay open or           Dropdown may stay open or
   collapse (confirm with eng)         collapse (confirm with eng)
```

The Followed Topics item behaves as a **collapsible inline dropdown**, not a page. Unlike Followed Posts, there is no `/followed-topics` page — the followed topic list lives entirely within the left nav. Clicking the item toggles the dropdown open or closed; the dropdown lists the topics with a persistent `Browse all topics` link at the bottom.

---

## Step 1 — Expand the Followed Topics dropdown

**Action:** From any post-login page, click the `Followed Topics` item in the left navigation.

### Behavior
- The dropdown expands inline below the nav item.
- The parent nav item shows a visual indicator that it's expanded (chevron down / caret rotation, or `aria-expanded="true"`).
- The URL does NOT change — this is a UI-only interaction.
- If the user follows topics, they appear as clickable rows.
- The `Browse all topics` link is always visible at the bottom of the dropdown.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| `Followed Topics` nav item (parent toggle) | `nav[aria-label="Primary"] >> button:has-text("Followed Topics")` or `[data-testid="nav-followed-topics"]` |
| Dropdown container | `[data-testid="followed-topics-dropdown"]` or `[aria-labelledby="nav-followed-topics"]` |
| Individual topic row | `[data-testid="followed-topics-dropdown"] >> a[href^="/topic/"]` |
| Browse all topics link | `[data-testid="followed-topics-dropdown"] >> text=Browse all topics` |
| Empty state text | `text=/no followed topics/i` |

### Assertions
- `const navItem = page.locator('nav[aria-label="Primary"] >> button:has-text("Followed Topics")')`
- `await navItem.click()`
- `await expect(navItem).toHaveAttribute('aria-expanded', 'true')`
- `await expect(page.locator('[data-testid="followed-topics-dropdown"]')).toBeVisible()`

---

## Step 2 — Collapse the Followed Topics dropdown

**Action:** With the dropdown expanded, click the `Followed Topics` nav item again.

### Behavior
- The dropdown collapses.
- The parent nav item's expanded indicator returns to collapsed state (`aria-expanded="false"`).
- Followed topic rows are no longer visible.

### Assertions
- `await navItem.click()`
- `await expect(navItem).toHaveAttribute('aria-expanded', 'false')`
- `await expect(page.locator('[data-testid="followed-topics-dropdown"]')).not.toBeVisible()`

---

## Step 3 — Populated state: user follows at least one topic

**Action:** With the user following at least one topic (seed via API), expand the dropdown.

### Elements that must be visible
- List of followed topics — one row per topic
- Each row shows the topic name (and possibly an icon or follower count — confirm with engineering)
- Each row is a clickable link
- `Browse all topics` link at the bottom (always present, populated or empty state)

### Assertions
- `await navItem.click()`
- `const dropdown = page.locator('[data-testid="followed-topics-dropdown"]')`
- `await expect(dropdown.locator('a[href^="/topic/"]')).toHaveCount(/* seeded count */)`
- `await expect(dropdown.locator('text=Browse all topics')).toBeVisible()`

---

## Step 4 — Click a topic in the dropdown

**Action:** Click any topic row in the expanded dropdown.
**Expected URL:** `/topic/{slug}`

### Behavior
- Navigates to the Single Topic View for that topic (post-login version).
- The page shows the topic's post list, topic description, Follow/Unfollow button, etc.
- Whether the dropdown stays expanded or collapses after click is UI-dependent — confirm with engineering.

### Assertions
- `const firstTopic = dropdown.locator('a[href^="/topic/"]').first()`
- `const topicHref = await firstTopic.getAttribute('href')`
- `await firstTopic.click()`
- `await expect(page).toHaveURL(new RegExp(topicHref))`

---

## Step 5 — Click "Browse all topics" link

**Action:** With the dropdown expanded, click the `Browse all topics` link at the bottom.
**Expected URL:** `/topics`

### Behavior
- Navigates to the Browse Topics page (`/topics`).
- The page shows the full topic hierarchy (parent/child, search bar, follow/unfollow controls).
- This is the standard entry point to topic discovery.

### Assertions
- `await dropdown.locator('text=Browse all topics').click()`
- `await expect(page).toHaveURL(/\/topics$/)`

---

## Step 6 — Empty state: user follows zero topics

**Action:** With the user following NO topics, expand the dropdown.

### Elements that must be visible
- Empty state message — e.g., *"No followed topics yet"*
- `Browse all topics` link (persistently visible even in empty state)

### Assertions
- `// Precondition: user follows 0 topics`
- `await navItem.click()`
- `await expect(dropdown.locator('text=/no followed topics/i')).toBeVisible()`
- `await expect(dropdown.locator('text=Browse all topics')).toBeVisible()`
- `await expect(dropdown.locator('a[href^="/topic/"]')).toHaveCount(0)`

---

## Step 7 — Follow a topic elsewhere, verify it appears in the dropdown

**Action:** From the Browse Topics page or a Single Topic View, click Follow on a topic. Return to any page and expand the Followed Topics dropdown.

### Behavior
- The newly followed topic appears in the dropdown list.
- May update in real-time OR require the page/dropdown to re-render (confirm with engineering).

### Assertions
- `// From /topics or a topic detail page`
- `await page.locator('[data-testid="follow-topic-<slug>"]').click()`
- `await expect(page.locator('[data-testid="follow-topic-<slug>"]:has-text("Following")')).toBeVisible()`
- `// Return to dropdown`
- `await navItem.click()`
- `await expect(dropdown.locator(`a[href="/topic/${slug}"]`)).toBeVisible()`

---

## Step 8 — Unfollow a topic elsewhere, verify it disappears from the dropdown

**Action:** From the Browse Topics page or a Single Topic View, click Unfollow on a followed topic. Return to the dropdown.

### Behavior
- The topic is removed from the Followed Topics dropdown list.
- The change is persistent across refresh.

### Assertions
- `// After unfollowing`
- `await navItem.click()`
- `await expect(dropdown.locator(`a[href="/topic/${slug}"]`)).not.toBeVisible()`

---

## Step 9 — Keyboard interaction: Tab and Enter to expand/collapse

**Action:** Focus the `Followed Topics` nav item via keyboard. Press Enter (or Space).

### Behavior
- Enter/Space toggles the dropdown open/closed — same as click.
- Tab moves focus into the dropdown when expanded, allowing keyboard navigation to individual topic rows.
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

test.describe('Left Nav — Followed Topics Dropdown', () => {

  test.beforeEach(async ({ request }) => {
    // Seed: make the test user follow 3 topics via API
    await followTopicsViaApi(['Airlines', 'Hotels', 'Solo Travel']);
  });

  test.afterEach(async ({ request }) => {
    await unfollowAllTopicsViaApi();
  });

  test('Expand and collapse the dropdown', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    const navItem = page.locator('nav[aria-label="Primary"] >> button:has-text("Followed Topics")');

    await navItem.click();
    await expect(navItem).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-testid="followed-topics-dropdown"]')).toBeVisible();

    await navItem.click();
    await expect(navItem).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('[data-testid="followed-topics-dropdown"]')).not.toBeVisible();
  });

  test('Dropdown lists followed topics', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> button:has-text("Followed Topics")').click();
    const dropdown = page.locator('[data-testid="followed-topics-dropdown"]');
    await expect(dropdown.locator('a[href^="/topic/"]')).toHaveCount(3);
    await expect(dropdown.locator('text=Browse all topics')).toBeVisible();
  });

  test('Click a topic opens its detail page', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> button:has-text("Followed Topics")').click();
    const dropdown = page.locator('[data-testid="followed-topics-dropdown"]');
    const firstTopic = dropdown.locator('a[href^="/topic/"]').first();
    const href = await firstTopic.getAttribute('href');
    await firstTopic.click();
    await expect(page).toHaveURL(new RegExp(href));
  });

  test('Browse all topics link navigates to /topics', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> button:has-text("Followed Topics")').click();
    await page.locator('[data-testid="followed-topics-dropdown"] >> text=Browse all topics').click();
    await expect(page).toHaveURL(/\/topics$/);
  });
});

test('Empty state when user follows zero topics', async ({ browser }) => {
  const context = await browser.newContext({ storageState: 'auth/empty-follows.json' });
  const page = await context.newPage();
  await page.goto('https://talktravel.com/');
  await page.locator('nav[aria-label="Primary"] >> button:has-text("Followed Topics")').click();
  const dropdown = page.locator('[data-testid="followed-topics-dropdown"]');
  await expect(dropdown.locator('text=/no followed topics/i')).toBeVisible();
  await expect(dropdown.locator('text=Browse all topics')).toBeVisible();
  await expect(dropdown.locator('a[href^="/topic/"]')).toHaveCount(0);
});

test('Follow a topic, verify it appears in dropdown', async ({ page }) => {
  await page.goto('https://talktravel.com/topics');
  await page.locator('button[data-testid="follow-topic-airlines"]').click();
  await expect(page.locator('button:has-text("Following")').first()).toBeVisible();

  await page.locator('nav[aria-label="Primary"] >> button:has-text("Followed Topics")').click();
  await expect(page.locator('[data-testid="followed-topics-dropdown"] >> a[href="/topic/airlines"]')).toBeVisible();
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Expand dropdown on Homepage | Works |
| 2 | Expand dropdown on Single Post View | Works |
| 3 | Expand dropdown on Settings page | Works (nav is present on every post-login page) |
| 4 | Expand dropdown while another dropdown is open (e.g., Friends dropdown) | Both may stay open OR one collapses when the other opens (confirm) |
| 5 | Rapid double-click on nav item | Ends in expanded OR collapsed state (predictable, no stuck state) |
| 6 | Click outside the dropdown while it's expanded | Dropdown collapses OR stays open (confirm) |
| 7 | Very long topic name in dropdown | Truncated with ellipsis, tooltip on hover |
| 8 | Many followed topics (20+) | Dropdown scrolls internally OR expands full-height (confirm) |
| 9 | Follow a topic from Search results, check dropdown | Topic appears |
| 10 | Follow a topic from another user's profile (topic they follow), check dropdown | Topic appears |
| 11 | Unfollow the last followed topic, dropdown transitions to empty state | Yes — empty state message replaces the list |
| 12 | Follow the first topic (from empty state), dropdown transitions to populated | Yes — list replaces empty state |
| 13 | Two browser tabs: follow a topic in one, check dropdown in the other | Dropdown updates on refresh OR real-time (confirm) |
| 14 | Session expires while dropdown is open | Next action redirects to Login |
| 15 | Dropdown behavior when nav is collapsed to hamburger (mobile) | Confirm — may become a modal or bottom sheet |
| 16 | Reduced motion preference | No animation on expand/collapse |
| 17 | Screen reader announcement | Confirm accessible label / aria-expanded / role |
| 18 | Keyboard navigation: Tab into dropdown, Arrow keys between topic rows | Confirm keyboard support |
| 19 | Esc while dropdown is expanded | Collapses dropdown (confirm) |
| 20 | Click a topic that has been deleted / renamed since follow | Handle gracefully (404 OR redirect) |
| 21 | Slow network on dropdown initial load | Loading indicator inside dropdown |
| 22 | Following a topic while the dropdown is already open | New topic appears without needing to reopen (confirm) |

---

## Known issues to watch for

- The exact ARIA implementation (`aria-expanded`, `role="button"`, `role="menu"`) on the nav item is unconfirmed — confirm with engineering.
- Whether the dropdown collapses when the user clicks outside it, or stays open until re-clicked, is unspecified.
- Whether opening one dropdown auto-collapses another (Followed Topics vs Friends) is unspecified.
- The empty state copy is unspecified — use regex matcher.
- Real-time updates when following/unfollowing from another page — behavior unspecified.
- Whether the dropdown maintains its expanded state across page navigation (i.e., visit Homepage → dropdown open → click a post → back to Homepage → dropdown still open?) is unspecified.
- Long topic name truncation behavior is unspecified.
- Mobile behavior (nav collapsed to hamburger) — the dropdown pattern may not apply. Confirm.
- Scroll behavior when many topics are followed is unspecified.

---

## Notes for the automation engineer

- **Seed followed topics via API** in `beforeEach` for consistent test state. Direct topic follow via UI adds too much overhead.
- **Cleanup in `afterEach`** by unfollowing all topics, or use a disposable account.
- **Two accounts.** `auth/verified.json` (with seeded topic follows) and `auth/empty-follows.json` (zero topic follows) for empty-state tests.
- **For dropdown visibility assertions**, use `expect(...).toBeVisible()` rather than checking a class name — behavior is more portable across UI implementations.
- **For expanded/collapsed state**, prefer `aria-expanded` over class names.
- **For empty state copy**, use a regex matcher (`text=/no followed topics/i`).
- **Capture topic hrefs at runtime** rather than hardcoding — slugs may change.
- **For click-outside behavior tests** (edge case #6), use `page.mouse.click(0, 0)` or click a known safe element (e.g., footer).
- **For rapid double-click tests** (edge case #5), assert the FINAL state, not intermediate states. State transitions are UI-implementation-dependent.
- **For nav-item selectors**, prefer scoped selectors to the primary nav (`nav[aria-label="Primary"]`) to avoid collisions with other menus.
- **The `Browse all topics` link is critical** — it's the primary discovery path. Make sure at least one test asserts its presence in both empty and populated states.
- **Keyboard tests** (edge case #18) are worth writing at least once — the dropdown is a common accessibility pain point.
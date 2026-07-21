# TalkTravel — Flow: Browse Topics (Post-Login)

> **Purpose:** Reference for Playwright automation of the Browse Topics page (`/topics`) — the topic discovery surface reached via the Followed Topics left-nav dropdown's `Browse all topics` link. Covers navigation, page structure, the search filter, the parent/child topic hierarchy (expand/collapse arrows, counts), following/unfollowing individual topics with instant state updates, and the propagation to the Followed Topics dropdown.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged in

> **Prerequisite:** Tests require an authenticated session via `storageState`. Follow/unfollow tests need at least the ability to modify follow state — no seeded topics required for basic tests, but seeded follow state helps for regression cases. The topic taxonomy (parent/child structure) is server-side; tests must be resilient to changing topic names/hierarchies.

---

## Flow overview

```
Followed Topics dropdown → "Browse all topics"    ─┐
Direct navigation to /topics                       ─┼─→ /topics (Browse Topics)
                                                    ↓
   Page heading: "Browse Topics"
   Search field: "Search topics..." (filters list in real-time)

   Topic list (hierarchical):
      Parent topic row:
         ▶ [collapsed] / ▼ [expanded]  Topic Name (N)   [Follow / Following]
             └─ Child topic row 1                        [Follow / Following]
             └─ Child topic row 2                        [Follow / Following]
      (Parent categories are collapsible; children only show when expanded)

   Each topic row:
      Topic name (clickable → opens Single Topic View)
      Post count (in parentheses)
      Follow / Following toggle button
```

Browse Topics is the platform's topic taxonomy surface. Topics are organized in a parent/child hierarchy — for example, `Airlines` (parent) may contain `Delta`, `United`, `Emirates` (children). Parent rows show an expand/collapse arrow; children only appear when expanded. Every topic (parent or child) has a Follow button, and the state toggles instantly — no page reload. Following a topic here immediately updates the Followed Topics left-nav dropdown.

---

## Step 1 — Reach Browse Topics via left nav

**Action:** Click `Followed Topics` in the left navigation to expand it. Click the `Browse all topics` link at the bottom of the dropdown.
**Expected URL:** `/topics`

### Elements that must be visible
- **Header:** search bar, `+ Create Post`, Messages, Notifications, Profile avatar
- **Left navigation** (with `Followed Topics` visible; may still be expanded)
- **Page heading:** `Browse Topics` (H1)
- **Search field:** placeholder `Search topics...` (or similar)
- **Topic list** with hierarchical rows
- **Footer**

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Page heading | `main h1` or `[data-testid="page-heading"]` |
| Search field | `input[placeholder*="Search topics"]` or `[data-testid="topics-search"]` |
| Topic list container | `[data-testid="topics-list"]` |
| Topic row (parent or child) | `[data-testid="topic-row"]` |
| Parent expand/collapse arrow | `[data-testid="topic-row"] >> button[aria-label*="expand"], button[aria-label*="collapse"]` |
| Topic name link | `[data-testid="topic-row"] >> a[href^="/topic/"]` |
| Post count | `[data-testid="topic-row"] >> [data-testid="topic-count"]` |
| Follow / Following button | `[data-testid="topic-row"] >> button:has-text("Follow"), button:has-text("Following")` |
| Child topic row (nested) | `[data-testid="topic-row"][data-level="child"]` |

### Assertions
- `await page.locator('nav[aria-label="Primary"] >> button:has-text("Followed Topics")').click()`
- `await page.locator('[data-testid="followed-topics-dropdown"] >> text=Browse all topics').click()`
- `await expect(page).toHaveURL(/\/topics$/)`
- `await expect(page.locator('main h1')).toContainText(/Browse Topics/i)`
- `await expect(page.locator('input[placeholder*="Search topics"]')).toBeVisible()`
- `await expect(page.locator('[data-testid="topic-row"]').first()).toBeVisible()`

---

## Step 2 — Direct navigation to /topics

**Action:** Navigate directly to `https://talktravel.com/topics`.

### Behavior
- Same page loads as via the left-nav route.
- Behavior is identical regardless of entry point.

### Assertions
- `await page.goto('https://talktravel.com/topics')`
- `await expect(page.locator('main h1')).toContainText(/Browse Topics/i)`

---

## Step 3 — Verify parent/child hierarchy renders

**Action:** Inspect the topic list.

### Behavior
- Parent topics are shown at the top level with an expand/collapse arrow (▶ / ▼).
- Each parent shows its total post count in parentheses (e.g., `Airlines (12)`).
- Child topics are hidden by default (parent collapsed).
- Clicking a parent's arrow expands to reveal its children.
- Children are visually indented under their parent.

### Assertions
- `const parentRow = page.locator('[data-testid="topic-row"][data-level="parent"]').first()`
- `await expect(parentRow).toBeVisible()`
- `await expect(parentRow.locator('[data-testid="topic-count"]')).toBeVisible()`
- `// Children hidden by default`
- `await expect(page.locator('[data-testid="topic-row"][data-level="child"]')).toHaveCount(0)`

---

## Step 4 — Expand a parent topic

**Action:** Click the expand arrow on any parent topic row.

### Behavior
- The arrow rotates (▶ → ▼) OR the `aria-expanded` attribute flips to `true`.
- Child topic rows appear below the parent, indented.
- Each child shows its own post count and Follow button.

### Assertions
- `const parent = page.locator('[data-testid="topic-row"][data-level="parent"]').first()`
- `await parent.locator('button[aria-label*="expand"]').click()`
- `await expect(parent.locator('button[aria-label*="expand"]')).toHaveAttribute('aria-expanded', 'true')`
- `await expect(page.locator('[data-testid="topic-row"][data-level="child"]')).not.toHaveCount(0)`

---

## Step 5 — Collapse a parent topic

**Action:** Click the collapse arrow on an expanded parent topic row.

### Behavior
- Children disappear.
- Arrow rotates back (▼ → ▶).

### Assertions
- `await parent.locator('button[aria-label*="collapse"]').click()`
- `await expect(parent.locator('button[aria-label*="expand"]')).toHaveAttribute('aria-expanded', 'false')`
- `await expect(page.locator('[data-testid="topic-row"][data-level="child"]')).toHaveCount(0)` (if only one parent was expanded)

---

## Step 6 — Search filters the list in real-time

**Action:** Type a query into the search field (e.g., "air").

### Behavior
- List filters to topics whose name matches the query (substring match, case-insensitive).
- Matching topics may include parents AND children.
- Non-matching parents may be hidden OR shown with only their matching children (confirm with engineering).
- Search updates as the user types (real-time filter, no submit button needed).

### Assertions
- `await page.locator('input[placeholder*="Search topics"]').fill('air')`
- `await expect(page.locator('[data-testid="topic-row"]').first()).toContainText(/air/i)`
- `// Verify some topics were filtered out (fewer rows visible than before)`
- `// Optional: verify all visible rows match the query`

---

## Step 7 — Search with no results

**Action:** Type a query that matches no topics (e.g., `zzzzzz`).

### Behavior
- Topic list is empty.
- An empty state message appears — e.g., *"No topics found"* (confirm exact copy with engineering).

### Assertions
- `await page.locator('input[placeholder*="Search topics"]').fill('zzzzzz')`
- `await expect(page.locator('[data-testid="topic-row"]')).toHaveCount(0)`
- `await expect(page.locator('text=/no topics found/i')).toBeVisible()`

---

## Step 8 — Clear the search filter

**Action:** Clear the search field (either backspace to empty, or click a clear icon if present).

### Behavior
- Full topic list re-appears.
- All parent topics restored to their default collapsed state.

### Assertions
- `await page.locator('input[placeholder*="Search topics"]').fill('')`
- `await expect(page.locator('[data-testid="topic-row"]')).not.toHaveCount(0)`

---

## Step 9 — Click a topic name to open Single Topic View

**Action:** Click a topic name (parent or child).
**Expected URL:** `/topic/{slug}`

### Behavior
- Navigates to the Single Topic View for that topic (post-login version).
- Page shows the topic's post list, description, Follow button, sub-tabs (Trending/Popular/Latest).

### Assertions
- `const topicName = page.locator('[data-testid="topic-row"] >> a[href^="/topic/"]').first()`
- `const topicHref = await topicName.getAttribute('href')`
- `await topicName.click()`
- `await expect(page).toHaveURL(new RegExp(topicHref))`

---

## Step 10 — Follow a topic

**Action:** Click the `Follow` button on any topic row.

### Behavior
- Button toggles from `Follow` to `Following` state.
- The change is instant (no confirmation dialog, no page reload).
- The topic is added to the user's Followed Topics list.
- The Followed Topics left-nav dropdown updates to include this topic.

### Assertions
- `const topicRow = page.locator('[data-testid="topic-row"]').filter({ hasText: 'Airlines' }).first()`
- `await topicRow.locator('button:has-text("Follow")').click()`
- `await expect(topicRow.locator('button:has-text("Following")')).toBeVisible()`

---

## Step 11 — Unfollow a topic (from Browse Topics)

**Action:** Click the `Following` button on a followed topic row.

### Behavior
- Button toggles back to `Follow` state.
- The topic is removed from Followed Topics.
- The change is instant.

### Assertions
- `const topicRow = page.locator('[data-testid="topic-row"]').filter({ hasText: 'Airlines' }).first()`
- `await topicRow.locator('button:has-text("Following")').click()`
- `await expect(topicRow.locator('button:has-text("Follow")')).toBeVisible()`

---

## Step 12 — Follow propagates to Followed Topics dropdown

**Action:** Follow a topic on Browse Topics. Return to any post-login page. Expand the `Followed Topics` left-nav dropdown.

### Behavior
- The newly followed topic appears in the dropdown list.
- May update in real-time OR require the page to refresh (confirm with engineering).

### Assertions
- `// From /topics`
- `const topicRow = page.locator('[data-testid="topic-row"]').filter({ hasText: 'Airlines' }).first()`
- `await topicRow.locator('button:has-text("Follow")').click()`
- `// Navigate elsewhere`
- `await page.goto('https://talktravel.com/')`
- `await page.locator('nav[aria-label="Primary"] >> button:has-text("Followed Topics")').click()`
- `await expect(page.locator('[data-testid="followed-topics-dropdown"] >> a[href="/topic/airlines"]')).toBeVisible()`

---

## Step 13 — Follow persistence across refresh

**Action:** Follow a topic on `/topics`. Refresh the page.

### Behavior
- The topic's Follow button still shows `Following` state after refresh.
- Follow state is not local UI state — it's persisted server-side.

### Assertions
- `await topicRow.locator('button:has-text("Follow")').click()`
- `await expect(topicRow.locator('button:has-text("Following")')).toBeVisible()`
- `await page.reload()`
- `await expect(topicRow.locator('button:has-text("Following")')).toBeVisible()`

---

## Step 14 — Follow a child topic while parent is expanded

**Action:** Expand a parent topic. Click Follow on one of its children.

### Behavior
- The child topic follows as expected (button toggles to Following).
- The parent's state is UNAFFECTED — following a child does not follow the parent.

### Assertions
- `const parent = page.locator('[data-testid="topic-row"][data-level="parent"]').first()`
- `await parent.locator('button[aria-label*="expand"]').click()`
- `const child = page.locator('[data-testid="topic-row"][data-level="child"]').first()`
- `await child.locator('button:has-text("Follow")').click()`
- `await expect(child.locator('button:has-text("Following")')).toBeVisible()`
- `await expect(parent.locator('button:has-text("Follow")')).toBeVisible()` (parent unchanged)

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'auth/verified.json' });

test.describe('Browse Topics', () => {

  test.afterEach(async ({ request }) => {
    // Cleanup: unfollow all topics
    await unfollowAllTopicsViaApi();
  });

  test('Navigate to Browse Topics via left nav', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> button:has-text("Followed Topics")').click();
    await page.locator('[data-testid="followed-topics-dropdown"] >> text=Browse all topics').click();
    await expect(page).toHaveURL(/\/topics$/);
    await expect(page.locator('main h1')).toContainText(/Browse Topics/i);
  });

  test('Expand and collapse a parent topic', async ({ page }) => {
    await page.goto('https://talktravel.com/topics');
    const parent = page.locator('[data-testid="topic-row"][data-level="parent"]').first();
    const expandBtn = parent.locator('button[aria-label*="expand"]');

    await expandBtn.click();
    await expect(expandBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-testid="topic-row"][data-level="child"]')).not.toHaveCount(0);

    await expandBtn.click();
    await expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
  });

  test('Search filters the topic list', async ({ page }) => {
    await page.goto('https://talktravel.com/topics');
    await page.locator('input[placeholder*="Search topics"]').fill('air');
    await expect(page.locator('[data-testid="topic-row"]').first()).toContainText(/air/i);
  });

  test('Search with no matches shows empty state', async ({ page }) => {
    await page.goto('https://talktravel.com/topics');
    await page.locator('input[placeholder*="Search topics"]').fill('zzzzzz');
    await expect(page.locator('[data-testid="topic-row"]')).toHaveCount(0);
    await expect(page.locator('text=/no topics found/i')).toBeVisible();
  });

  test('Click topic name opens Single Topic View', async ({ page }) => {
    await page.goto('https://talktravel.com/topics');
    const topicLink = page.locator('[data-testid="topic-row"] >> a[href^="/topic/"]').first();
    const href = await topicLink.getAttribute('href');
    await topicLink.click();
    await expect(page).toHaveURL(new RegExp(href));
  });

  test('Follow a topic toggles state instantly', async ({ page }) => {
    await page.goto('https://talktravel.com/topics');
    const topic = page.locator('[data-testid="topic-row"]').filter({ hasText: 'Airlines' }).first();
    await topic.locator('button:has-text("Follow")').click();
    await expect(topic.locator('button:has-text("Following")')).toBeVisible();
  });

  test('Unfollow toggles back to Follow', async ({ page }) => {
    await page.goto('https://talktravel.com/topics');
    const topic = page.locator('[data-testid="topic-row"]').filter({ hasText: 'Airlines' }).first();
    await topic.locator('button:has-text("Follow")').click();
    await expect(topic.locator('button:has-text("Following")')).toBeVisible();
    await topic.locator('button:has-text("Following")').click();
    await expect(topic.locator('button:has-text("Follow")')).toBeVisible();
  });

  test('Follow persists after refresh', async ({ page }) => {
    await page.goto('https://talktravel.com/topics');
    const topic = page.locator('[data-testid="topic-row"]').filter({ hasText: 'Airlines' }).first();
    await topic.locator('button:has-text("Follow")').click();
    await page.reload();
    await expect(topic.locator('button:has-text("Following")')).toBeVisible();
  });

  test('Following a topic appears in Followed Topics dropdown', async ({ page }) => {
    await page.goto('https://talktravel.com/topics');
    const topic = page.locator('[data-testid="topic-row"]').filter({ hasText: 'Airlines' }).first();
    await topic.locator('button:has-text("Follow")').click();

    await page.goto('https://talktravel.com/');
    await page.locator('nav[aria-label="Primary"] >> button:has-text("Followed Topics")').click();
    await expect(page.locator('[data-testid="followed-topics-dropdown"] >> a[href="/topic/airlines"]')).toBeVisible();
  });

  test('Following a child does NOT auto-follow the parent', async ({ page }) => {
    await page.goto('https://talktravel.com/topics');
    const parent = page.locator('[data-testid="topic-row"][data-level="parent"]').first();
    await parent.locator('button[aria-label*="expand"]').click();

    const child = page.locator('[data-testid="topic-row"][data-level="child"]').first();
    await child.locator('button:has-text("Follow")').click();
    await expect(child.locator('button:has-text("Following")')).toBeVisible();
    await expect(parent.locator('button:has-text("Follow")')).toBeVisible();
  });
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Direct navigation to `/topics` while logged out | Redirects to `/login` (or public view — confirm) |
| 2 | Rapid double-click on Follow | Only one follow state change; final state is Following |
| 3 | Rapid Follow → Unfollow → Follow | State updates each time; final state matches last click |
| 4 | Follow on slow network | Button shows loading state; state confirmed only after server response |
| 5 | Follow fails (network error) | Button reverts to Follow; error toast shown |
| 6 | Search with partial word (e.g., "air") | Matches "Airlines", "Airports", etc. — substring match |
| 7 | Search with special characters (e.g., "&", "#") | Handled gracefully; no crash |
| 8 | Search with leading/trailing whitespace | Trimmed before filtering |
| 9 | Search that matches only children (parent name doesn't match) | Confirm — parents may hide OR remain visible as context |
| 10 | Expand a parent while search is active | Children still filtered by the query (confirm) |
| 11 | Very long topic name | Truncated with ellipsis, tooltip on hover |
| 12 | Topic with count = 0 | Row still visible OR filtered out (confirm) |
| 13 | Newly created topic (from Create Post → Create New Topic) | Appears in list immediately OR requires refresh (confirm) |
| 14 | Topic renamed by admin | Displayed name updates; slug may change (confirm behavior) |
| 15 | Topic deleted by admin | Removed from list; if user was following, quietly unfollowed |
| 16 | Parent expanded, then collapsed while a child is being followed | Follow request completes; state persists (confirm no race condition) |
| 17 | Two browser tabs: follow in one, check dropdown in the other | Updates on refresh OR real-time (confirm) |
| 18 | Session expires while on page | Next Follow action redirects to login |
| 19 | Follow all topics rapidly | All succeed; Followed Topics dropdown populated with all |
| 20 | Mobile viewport (~375px) | List stacks; search bar remains sticky (confirm) |
| 21 | Reduced motion preference | No animation on expand/collapse |
| 22 | Screen reader announcement | Confirm aria-expanded / role tree |
| 23 | Keyboard navigation: Tab through topics, Enter to Follow | Confirm keyboard support |
| 24 | Extremely long topic list (200+ topics) | List renders performantly; no lag |
| 25 | Empty topic taxonomy (theoretical — no topics exist) | Empty state message; no crash |
| 26 | Parent with only one child | Confirm hierarchy still shows expand arrow (or collapses to flat) |
| 27 | Parent with 100+ children | Children may paginate or scroll (confirm) |
| 28 | Direct URL with search query preserved (e.g., `/topics?q=air`) | Search filter pre-applied on page load (confirm support) |

---

## Known issues to watch for

- The exact search filter behavior for parent/child interactions is unspecified — does a matching child cause a non-matching parent to still show?
- The empty state copy for zero search results is unspecified — use regex matcher.
- Whether the search field debounces input or filters on every keystroke is unspecified.
- Whether search state persists across navigation is unspecified.
- The exact ARIA implementation for expand/collapse (`aria-expanded`, `role="tree"`, `role="treeitem"`) is unconfirmed.
- Whether following a child auto-follows the parent OR vice versa is unspecified — assumed independent based on source doc.
- The follow state may be eventually consistent — assertions should use timeouts (2-3 seconds) rather than instant checks.
- Whether newly created topics (from Create Post's "Create new topic" option) appear immediately in Browse Topics is unspecified.
- Whether Browse Topics is available to logged-out users is unspecified — the source doc lists it as post-login only.
- The topic slug format vs display name — slugs may include hyphens or lowercase transformations; capture the `href` at runtime.
- Mobile behavior for the topic tree (nested indentation on narrow screens) is unspecified.
- Whether topic counts update in real-time as posts are created / deleted is unspecified.
- If a topic taxonomy is very large, whether the list uses pagination, infinite scroll, or renders all at once is unspecified.

---

## Notes for the automation engineer

- **Seed follow state via API** for tests requiring pre-followed topics. Direct UI-based following of many topics is slow.
- **Cleanup in `afterEach`** by unfollowing all topics via API, or use a disposable staging account.
- **Two account types.** `auth/verified.json` (standard tests) and optionally `auth/no-follows.json` (starts with zero followed topics for baseline).
- **For topic name assertions**, use realistic topic names that exist in the staging environment — `Airlines`, `Hotels`, `Food`, `Solo Travel`, etc. Avoid hardcoding topic names that may be renamed.
- **Capture topic hrefs at runtime** rather than hardcoding slugs.
- **For search assertions**, use regex matchers (`toContainText(/air/i)`) rather than exact strings — case sensitivity varies.
- **For empty search results**, use regex matcher (`text=/no topics found/i`) since exact copy is unconfirmed.
- **For expand/collapse assertions**, prefer `aria-expanded` over class names — more stable across UI revisions.
- **Do NOT assume the topic order in the list** — order may be alphabetical, by post count, or curated. Use scoped selectors (`filter({ hasText: 'Airlines' })`) to target specific topics.
- **For real-time propagation tests** (Step 12), navigate to a different page before checking the dropdown — this avoids race conditions where the same page's dropdown state may be stale.
- **For Follow persistence tests** (Step 13), use `page.reload()` rather than `page.goto()` to ensure the same URL is retested.
- **For parent/child hierarchy tests** (Step 14), verify explicitly that following a child does NOT auto-follow the parent. This assertion is critical for confirming the hierarchy is respected.
- **For long-list tests** (edge case #24), performance may vary. Consider running these tests separately with a longer timeout.
- **Screen reader tests** (edge case #22) can use `@axe-core/playwright` for automated a11y audits.
- **The search field is likely a controlled input with debounce.** For real-time filter tests, add a small wait after typing:
```js
  await page.locator('input[placeholder*="Search topics"]').fill('air');
  await page.waitForTimeout(300); // Debounce buffer
  await expect(page.locator('[data-testid="topic-row"]').first()).toContainText(/air/i);
```
- **Newly-followed topics propagating to the left-nav dropdown** is a common source of flakiness — the dropdown may be cached. Test navigating away and back rather than expecting instant update on the same page.
- **Topic hierarchy structure may vary between staging and production** — never assume a specific parent/child relationship in tests. Use generic assertions (`data-level="parent"` vs `data-level="child"`) rather than specific topic names.
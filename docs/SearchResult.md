# TalkTravel — Flow: Post-Login Search Results

> **Purpose:** Reference for Playwright automation of the post-login Search Results page — reached via the header search bar. Covers query submission, the 4 result tabs (Posts / Comments / Topics / People), special syntax (`#topic` and `@user`), combined queries (keyword + `#topic`, multi-topic filters), the sort dropdown (Relevance / Newest / Oldest / Most Voted), the natural-language matching rules (2-word 100%, 3–5 word N-1, 6+ at 80%), result interactions, and the empty state.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged in

> **Prerequisite:** Tests require an authenticated session via `storageState`. Search relies on server-side data — most tests should assert on structural elements (tabs, counts, sort order) rather than specific result content, since content is not stable across test runs.

---

## Flow overview

```
Header search bar (any post-login page)
        ↓ type query + submit (Enter or click search icon)
                     ↓
   URL updates: /search?q=<query>
                     ↓
        Search Results page loads
                     ↓
   Page header: "Search Results" + "X results found matching your term: <query>"
                     ↓
   4 tabs with counts:
      Posts (X) [default active]   |   Comments (X)   |   Topics (X)   |   People (X)
                     ↓
   Sort dropdown (top-right):
      Relevance (default) | Newest | Oldest | Most Voted
                     ↓
   Results list under active tab
                     ↓
   Interactions:
      Click post result       →  Single Post View
      Click comment result    →  Single Post View scrolled to comment
      Click topic result      →  Single Topic View
      Click person result     →  User Profile
      Vote / Follow on posts  →  same as feed behavior

   Special query syntax:
      #topic_name              →  Single Topic View for that topic (bypasses results page)
      @username                →  results appear in People tab
      keyword #topic           →  results filtered to keyword within that topic
      keyword #topic1 #topic2  →  keyword within any of those topics
      hike #Nepal #Trekking    →  matches all topics + keyword (optional)

   Natural-language matching:
      2 words  → both required (100% match)
      3-5 words → N-1 words required (can miss 1)
      6+ words → 80% of words required
      Minimum 2 word matches always required
```

The Search Results page is the central discovery surface after querying the header search bar. Queries are parsed for special syntax (`#topic`, `@user`) — a bare `#topic` bypasses results entirely and opens the topic page directly. Regular text queries produce results across four tabs, each with an independent count and clickable result rows. The sort dropdown reorders results within the active tab. Natural-language matching rules govern how "loose" a query can be while still returning matches.

---

## Step 1 — Submit a keyword query from the header search bar

**Action:** From any post-login page, click into the header search bar. Type a query (e.g., `Delta flight`). Press Enter (or click the search icon).
**Expected URL:** `/search?q=Delta+flight` (URL-encoded)

### Elements that must be visible on Search Results
- **Header:** search bar (retains the query), `+ Create Post`, Messages, Notifications, Profile avatar
- **Left navigation** (as usual)
- **Page heading:** `Search Results`
- **Results summary line:** e.g., `X results found matching your term: Delta flight`
- **4 tabs with counts:** Posts, Comments, Topics, People
- **Active tab:** Posts (default)
- **Sort dropdown** (top-right): Relevance (default) / Newest / Oldest / Most Voted
- **Results list** under the active tab
- **Footer**

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Header search bar | `[data-testid="header-search"]` or `header >> input[type="search"]` |
| Header search submit | `header >> button[aria-label="Search"]` |
| Page heading | `main h1` or `[data-testid="page-heading"]` |
| Results summary | `[data-testid="results-summary"]` or `text=/results found matching/i` |
| Posts tab | `[role="tab"]:has-text("Posts")` |
| Comments tab | `[role="tab"]:has-text("Comments")` |
| Topics tab | `[role="tab"]:has-text("Topics")` |
| People tab | `[role="tab"]:has-text("People")` |
| Sort dropdown | `[data-testid="search-sort"]` or `select[name="sort"]` |
| Result row — post | `[data-testid="post-card"]` |
| Result row — comment | `[data-testid="comment-result"]` |
| Result row — topic | `[data-testid="topic-result"]` |
| Result row — person | `[data-testid="person-result"]` |
| Empty state | `text=/no results found/i` |

### Assertions
- `await page.locator('[data-testid="header-search"]').fill('Delta flight')`
- `await page.locator('[data-testid="header-search"]').press('Enter')`
- `await expect(page).toHaveURL(/\/search\?q=Delta.*flight/)`
- `await expect(page.locator('main h1')).toContainText(/Search Results/i)`
- `await expect(page.locator('text=/results found matching/i')).toBeVisible()`
- `await expect(page.locator('[role="tab"]:has-text("Posts")')).toHaveAttribute('aria-selected', 'true')`

---

## Step 2 — Results summary shows count and query

**Action:** Inspect the results summary line.

### Behavior
- Format: `X results found matching your term: <query>` (or similar — confirm exact wording).
- `X` reflects the total across all 4 tabs, or the count for the active tab only (confirm with engineering).
- The query text echoes what the user typed.

### Assertions
- `const summary = await page.locator('[data-testid="results-summary"]').textContent()`
- `expect(summary).toMatch(/\d+ results? found matching/i)`
- `expect(summary).toContain('Delta flight')`

---

## Step 3 — Tab counts match rendered results

**Action:** Read each tab's count (e.g., `Posts (12)`). Click the tab. Count the rendered result rows.

### Behavior
- Each tab shows a count in parentheses.
- Clicking a tab renders results specific to that category.
- The count matches the number of rendered rows within that tab.

### Assertions
- `const postsTabText = await page.locator('[role="tab"]:has-text("Posts")').textContent()`
- `const postsCount = parseInt(postsTabText.match(/\((\d+)\)/)[1])`
- `const rowCount = await page.locator('[data-testid="post-card"]').count()`
- `expect(rowCount).toBe(postsCount)`

---

## Step 4 — Switch between tabs

**Action:** Click each tab (Posts → Comments → Topics → People) in sequence.

### Behavior
- Each tab loads its own result list.
- Active tab is visually highlighted (`aria-selected="true"`).
- Sort dropdown selection persists across tabs (confirm with engineering).
- Search query is preserved.

### Assertions
- `await page.locator('[role="tab"]:has-text("Comments")').click()`
- `await expect(page.locator('[role="tab"]:has-text("Comments")')).toHaveAttribute('aria-selected', 'true')`
- `await expect(page.locator('[data-testid="comment-result"]').first()).toBeVisible()`
- `// Repeat for Topics and People`

---

## Step 5 — Click a post result

**Action:** Click any row in the Posts tab.
**Expected URL:** `/post/{slug}`

### Behavior
- Opens the Single Post View for that post.
- Browser back returns to `/search?q=<query>` with the same tab and sort preserved.

### Assertions
- `const post = page.locator('[data-testid="post-card"]').first()`
- `await post.click()`
- `await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/)`
- `// Verify back navigation preserves state`
- `await page.goBack()`
- `await expect(page).toHaveURL(/\/search\?q=/)`
- `await expect(page.locator('[role="tab"]:has-text("Posts")')).toHaveAttribute('aria-selected', 'true')`

---

## Step 6 — Click a comment result

**Action:** Switch to the Comments tab. Click any comment result row.
**Expected URL:** `/post/{slug}#comment-{id}` (or equivalent deep-link format)

### Behavior
- Opens the Single Post View of the comment's parent post.
- Page scrolls to the specific comment.
- Comment is highlighted (briefly) OR the anchor positions the viewport.

### Assertions
- `await page.locator('[role="tab"]:has-text("Comments")').click()`
- `const commentResult = page.locator('[data-testid="comment-result"]').first()`
- `const commentId = await commentResult.getAttribute('data-comment-id')`
- `await commentResult.click()`
- `await expect(page).toHaveURL(new RegExp(`/post/[a-z0-9-]+.*comment-${commentId}`))`

---

## Step 7 — Click a topic result

**Action:** Switch to the Topics tab. Click any topic result row.
**Expected URL:** `/topic/{slug}`

### Behavior
- Opens the Single Topic View (post-login).

### Assertions
- `await page.locator('[role="tab"]:has-text("Topics")').click()`
- `const topicResult = page.locator('[data-testid="topic-result"]').first()`
- `const topicHref = await topicResult.locator('a').first().getAttribute('href')`
- `await topicResult.click()`
- `await expect(page).toHaveURL(new RegExp(topicHref))`

---

## Step 8 — Click a person result

**Action:** Switch to the People tab. Click any person result row.
**Expected URL:** `/user/{username}`

### Behavior
- Opens that user's profile page (post-login view).

### Assertions
- `await page.locator('[role="tab"]:has-text("People")').click()`
- `const personResult = page.locator('[data-testid="person-result"]').first()`
- `await personResult.click()`
- `await expect(page).toHaveURL(/\/user\/[a-zA-Z0-9_-]+/)`

---

## Step 9 — Special syntax: `#topic_name` bypasses results page

**Action:** In the header search bar, type `#Airlines` and submit.
**Expected URL:** `/topic/airlines` (opens Single Topic View directly)

### Behavior
- A bare `#topic` query does NOT open the Search Results page.
- Instead, it navigates directly to the Single Topic View for that topic.
- If the topic doesn't exist, behavior is unclear — may fall back to Search Results or 404 (confirm with engineering).

### Assertions
- `await page.locator('[data-testid="header-search"]').fill('#Airlines')`
- `await page.locator('[data-testid="header-search"]').press('Enter')`
- `await expect(page).toHaveURL(/\/topic\/airlines/)`
- `await expect(page).not.toHaveURL(/\/search/)`

---

## Step 10 — Special syntax: `@username` returns matching people

**Action:** In the header search bar, type `@john` and submit.
**Expected URL:** `/search?q=@john` (or similar)

### Behavior
- Opens the Search Results page.
- People tab shows users whose username / nickname matches.
- Other tabs may show zero or filtered results.
- Confirm with engineering whether People tab is auto-activated OR still defaults to Posts.

### Assertions
- `await page.locator('[data-testid="header-search"]').fill('@john')`
- `await page.locator('[data-testid="header-search"]').press('Enter')`
- `await expect(page).toHaveURL(/\/search/)`
- `// If People tab auto-activated:`
- `// await expect(page.locator('[role="tab"]:has-text("People")')).toHaveAttribute('aria-selected', 'true')`
- `await page.locator('[role="tab"]:has-text("People")').click()`
- `await expect(page.locator('[data-testid="person-result"]').first()).toBeVisible()`

---

## Step 11 — Combined query: keyword + `#topic`

**Action:** Type `Nepal #Airlines` in the header search bar and submit.

### Behavior
- Results are filtered to posts matching the keyword `Nepal` within the topic `Airlines`.
- Posts tab shows only matching posts.

### Assertions
- `await page.locator('[data-testid="header-search"]').fill('Nepal #Airlines')`
- `await page.locator('[data-testid="header-search"]').press('Enter')`
- `await expect(page).toHaveURL(/\/search/)`
- `await expect(page.locator('[role="tab"]:has-text("Posts")')).toHaveAttribute('aria-selected', 'true')`
- `// Confirm results contain both the keyword and are within the topic — visible via topic chip on cards`

---

## Step 12 — Multi-topic query: `hike #Nepal #Trekking`

**Action:** Type `hike #Nepal #Trekking` and submit.

### Behavior
- Results match posts containing the keyword `hike` AND tagged with either `Nepal` or `Trekking` (per source doc: "matches all topics + keyword (optional)").
- Exact semantics — AND vs OR across topics — should be confirmed with engineering.

### Assertions
- `await page.locator('[data-testid="header-search"]').fill('hike #Nepal #Trekking')`
- `await page.locator('[data-testid="header-search"]').press('Enter')`
- `await expect(page).toHaveURL(/\/search/)`
- `// Confirm at least one result exists`
- `await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible()`

---

## Step 13 — Sort dropdown: change to Newest

**Action:** Click the sort dropdown. Select `Newest`.

### Behavior
- Results in the active tab reorder to newest-first.
- URL may update to include the sort param (e.g., `&sort=newest` — confirm).
- Sort selection persists when switching tabs (confirm).

### Assertions
- `await page.locator('[data-testid="search-sort"]').click()`
- `await page.locator('[role="option"]:has-text("Newest")').click()`
- `await expect(page.locator('[data-testid="search-sort"]')).toContainText('Newest')`
- `// Verify results reordered — capture first result before and after`

---

## Step 14 — Sort dropdown: all options

**Action:** Cycle through each sort option (Relevance → Newest → Oldest → Most Voted).

### Behavior
- Each option reorders results independently.
- Relevance is the default on initial load.
- After navigating away and back, the last selected sort may or may not persist (confirm).

### Assertions
- `for (const sortOption of ['Relevance', 'Newest', 'Oldest', 'Most Voted']) {`
- `  await page.locator('[data-testid="search-sort"]').click()`
- `  await page.locator(`[role="option"]:has-text("${sortOption}")`).click()`
- `  await expect(page.locator('[data-testid="search-sort"]')).toContainText(sortOption)`
- `}`

---

## Step 15 — Natural language matching: 2 words require both

**Action:** Search for `cheap flights`.

### Behavior
- Both words are required (100% match rule for 2-word queries).
- Only results containing both `cheap` AND `flights` appear.
- Results with only `cheap` (without `flights`) or only `flights` (without `cheap`) are excluded.

### Assertions
- `await page.locator('[data-testid="header-search"]').fill('cheap flights')`
- `await page.locator('[data-testid="header-search"]').press('Enter')`
- `// Confirm results contain both keywords`
- `// This assertion is content-dependent; may need to sample results to verify`

---

## Step 16 — Natural language matching: 3-5 words allow 1 miss

**Action:** Search for `best places in paris`.

### Behavior
- 4-word query — N-1 rule = at least 3 words must match.
- Results may include posts containing any 3 of the 4 words (e.g., `best places paris` without `in`).

### Assertions
- `await page.locator('[data-testid="header-search"]').fill('best places in paris')`
- `await page.locator('[data-testid="header-search"]').press('Enter')`
- `// Results should exist and be lenient on 1 missing word`

---

## Step 17 — Natural language matching: 6+ words require 80%

**Action:** Search for `where to go on summer holidays for cheap`.

### Behavior
- 8-word query — 80% rule = at least ~6 words must match (rounded).
- Results are looser but still filtered.

### Assertions
- `await page.locator('[data-testid="header-search"]').fill('where to go on summer holidays for cheap')`
- `await page.locator('[data-testid="header-search"]').press('Enter')`
- `// Results exist; matching is fuzzy`

---

## Step 18 — Minimum 2 word match rule

**Action:** Search for a query where only 1 word matches (e.g., `xyzabc quicksilver`).

### Behavior
- If fewer than 2 words match, NO results appear.
- Empty state displayed.

### Assertions
- `await page.locator('[data-testid="header-search"]').fill('xyzabc quicksilver notarealword')`
- `await page.locator('[data-testid="header-search"]').press('Enter')`
- `// Expect empty results (or very few)`
- `await expect(page.locator('[data-testid="post-card"]')).toHaveCount(0)`
- `await expect(page.locator('text=/no results found/i')).toBeVisible()`

---

## Step 19 — Empty state (no results anywhere)

**Action:** Search for a nonsense string that matches nothing (e.g., `zzzqxvbnm`).

### Behavior
- All 4 tab counts show `0`.
- The active tab shows an empty state message: *"No results found"* (or similar).
- Search query is preserved in the results summary.

### Assertions
- `await page.locator('[data-testid="header-search"]').fill('zzzqxvbnm')`
- `await page.locator('[data-testid="header-search"]').press('Enter')`
- `await expect(page.locator('[role="tab"]:has-text("Posts (0)")')).toBeVisible()`
- `await expect(page.locator('text=/no results found/i')).toBeVisible()`

---

## Step 20 — Vote on a post from search results

**Action:** In the Posts tab, click Upvote on any result.

### Behavior
- Vote count updates instantly (same behavior as Homepage feed).
- Post remains in the results list.
- Vote state persists when navigating to the Single Post View.

### Assertions
- `const post = page.locator('[data-testid="post-card"]').first()`
- `const initial = parseInt(await post.locator('[data-testid="vote-count"]').textContent())`
- `await post.locator('[data-testid="upvote"]').click()`
- `await expect(post.locator('[data-testid="vote-count"]')).toHaveText(String(initial + 1))`

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'auth/verified.json' });

test.describe('Post-Login Search Results', () => {

  test('Submit keyword query and land on results page', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('[data-testid="header-search"]').fill('Delta flight');
    await page.locator('[data-testid="header-search"]').press('Enter');
    await expect(page).toHaveURL(/\/search\?q=Delta.*flight/);
    await expect(page.locator('main h1')).toContainText(/Search Results/i);
    await expect(page.locator('[role="tab"]:has-text("Posts")')).toHaveAttribute('aria-selected', 'true');
  });

  test('All 4 tabs are visible with counts', async ({ page }) => {
    await page.goto('https://talktravel.com/search?q=travel');
    for (const tab of ['Posts', 'Comments', 'Topics', 'People']) {
      const tabLocator = page.locator(`[role="tab"]:has-text("${tab}")`);
      await expect(tabLocator).toBeVisible();
      const text = await tabLocator.textContent();
      expect(text).toMatch(/\(\d+\)/);
    }
  });

  test('Switch tabs updates the result list', async ({ page }) => {
    await page.goto('https://talktravel.com/search?q=travel');
    await page.locator('[role="tab"]:has-text("Topics")').click();
    await expect(page.locator('[role="tab"]:has-text("Topics")')).toHaveAttribute('aria-selected', 'true');
    await page.locator('[role="tab"]:has-text("People")').click();
    await expect(page.locator('[role="tab"]:has-text("People")')).toHaveAttribute('aria-selected', 'true');
  });

  test('#topic query bypasses results and opens topic page', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('[data-testid="header-search"]').fill('#Airlines');
    await page.locator('[data-testid="header-search"]').press('Enter');
    await expect(page).toHaveURL(/\/topic\/airlines/);
    await expect(page).not.toHaveURL(/\/search/);
  });

  test('@username query returns people results', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('[data-testid="header-search"]').fill('@john');
    await page.locator('[data-testid="header-search"]').press('Enter');
    await expect(page).toHaveURL(/\/search/);
    await page.locator('[role="tab"]:has-text("People")').click();
    // Results may exist or be empty depending on seed data — assert count matches tab label
  });

  test('Sort dropdown reorders results', async ({ page }) => {
    await page.goto('https://talktravel.com/search?q=travel');
    const firstBefore = await page.locator('[data-testid="post-card"]').first().getAttribute('data-post-id');
    await page.locator('[data-testid="search-sort"]').click();
    await page.locator('[role="option"]:has-text("Newest")').click();
    const firstAfter = await page.locator('[data-testid="post-card"]').first().getAttribute('data-post-id');
    // If sort actually changes order, firstBefore should differ from firstAfter
    // (May not be true if the top result is genuinely both relevant AND newest)
  });

  test('Click post result opens Single Post View', async ({ page }) => {
    await page.goto('https://talktravel.com/search?q=travel');
    await page.locator('[data-testid="post-card"]').first().click();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
  });

  test('Back from post preserves search state', async ({ page }) => {
    await page.goto('https://talktravel.com/search?q=travel');
    await page.locator('[data-testid="post-card"]').first().click();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
    await page.goBack();
    await expect(page).toHaveURL(/\/search\?q=travel/);
    await expect(page.locator('[role="tab"]:has-text("Posts")')).toHaveAttribute('aria-selected', 'true');
  });

  test('Empty state for nonsense query', async ({ page }) => {
    await page.goto('https://talktravel.com/');
    await page.locator('[data-testid="header-search"]').fill('zzzqxvbnm');
    await page.locator('[data-testid="header-search"]').press('Enter');
    await expect(page.locator('[role="tab"]:has-text("Posts (0)")')).toBeVisible();
    await expect(page.locator('text=/no results found/i')).toBeVisible();
  });

  test('Vote on a post in search results updates count', async ({ page }) => {
    await page.goto('https://talktravel.com/search?q=travel');
    const post = page.locator('[data-testid="post-card"]').first();
    const initial = parseInt(await post.locator('[data-testid="vote-count"]').textContent());
    await post.locator('[data-testid="upvote"]').click();
    await expect(post.locator('[data-testid="vote-count"]')).toHaveText(String(initial + 1));
  });
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Direct navigation to `/search` (no query) | Empty state OR redirect to homepage (confirm) |
| 2 | Direct navigation to `/search?q=<query>` | Same as submitting via search bar |
| 3 | Empty query submitted via search bar | No-op OR shows empty state (confirm) |
| 4 | Query with only whitespace | Treated as empty |
| 5 | Query with leading/trailing whitespace | Trimmed before searching |
| 6 | Query with special characters (`@`, `#`, `&`, `<`, `>`) | Handled safely; no XSS |
| 7 | Very long query (>500 chars) | Truncated OR rejected (confirm) |
| 8 | Query with only 1 unique word | Requires minimum 2 word matches — may return 0 results |
| 9 | Multi-word query where 1 word is a stopword ("the", "and") | Confirm stopword handling |
| 10 | Query with mixed case (`Delta FLIGHT`) | Case-insensitive matching |
| 11 | Query with URL-encoded characters | Decoded correctly |
| 12 | `#topic` for a topic that doesn't exist | 404 OR fall back to Search Results (confirm) |
| 13 | `#topic` with unusual characters (`#slow-travel`) | Handles hyphens; opens correct topic |
| 14 | `@username` for a nonexistent user | People tab shows 0 results |
| 15 | Query with multiple `#topics` and no keyword | Confirm behavior — may filter to intersection or union |
| 16 | Query with multiple `@usernames` | Confirm behavior |
| 17 | Sort selection persists across tabs | Confirm |
| 18 | Sort selection persists across refresh | Confirm |
| 19 | Sort selection persists across navigation away and back | Confirm |
| 20 | Vote / Follow on a result and refresh — state persists | Yes (server-side state) |
| 21 | 3-dot menu on a post result | Same behavior as feed (Report for others, Edit/Delete for own) |
| 22 | Very long results list (100+ per tab) | Paginates OR infinite scroll (confirm) |
| 23 | Two search queries in rapid succession | Latest query wins; no race condition |
| 24 | Session expires while on Search Results | Next interaction redirects to Login |
| 25 | Special syntax mixed: `keyword @user #topic` | Confirm parsing behavior |
| 26 | Query for a deleted user (`@deleted-user`) | People tab shows 0 or "user unavailable" (confirm) |
| 27 | Query matches a post that's been deleted (placeholder state) | Result may show placeholder OR be filtered out (confirm) |
| 28 | Mobile viewport (~375px) | Tabs may scroll horizontally; sort dropdown adapts |
| 29 | Reduced motion preference | No animation on tab switch |
| 30 | Slow network | Loading skeleton in results area |
| 31 | Screen reader announcement of results count | Confirm aria-live region |
| 32 | Keyboard navigation: Tab through tabs, Enter to activate | Confirm keyboard support |
| 33 | Query typed but never submitted (blur without Enter) | No search executed |
| 34 | Query with emojis | Confirm handling |
| 35 | Result matches on comment inside a deleted post | Confirm — comments may survive their parent post |

---

## Known issues to watch for

- The exact URL parameter format is unspecified (`/search?q=`, `/search?query=`, `/results?q=`). Confirm with engineering.
- Whether the People tab auto-activates for `@username` queries or defaults to Posts is unspecified.
- Whether the total count in the results summary is the sum across all tabs OR just the active tab is unspecified.
- The multi-topic query semantics (AND vs OR across topics) are ambiguous in the source doc.
- The `#topic` bypass behavior — whether it opens `/topic/{slug}` OR falls back to Search Results if topic doesn't exist — is unspecified.
- Sort selection persistence across tab switches, refresh, and navigation is unspecified.
- Whether search results are cached or re-fetched on tab switch is unspecified.
- The natural-language matching rules from the source doc are described but the exact behavior for edge cases (stopwords, punctuation, singular/plural) is unspecified.
- Whether pagination or infinite scroll is used for large result sets is unspecified.
- The empty state copy is unspecified — use regex matcher.
- Whether search history / recent searches appear in an autocomplete dropdown is unspecified.
- Whether the search bar supports typeahead suggestions (like `#topic` autocompletion) is unspecified.
- Case sensitivity — queries are likely case-insensitive but confirm for `#topic` and `@user` syntax.
- Whether the results include content the user has blocked (from blocked users) is unspecified.

---

## Notes for the automation engineer

- **Assert on structure, not content.** Search results depend on server-side data that changes over time. Focus on tab counts, sort behavior, URL patterns, and interactions — not specific result titles or authors.
- **Use realistic queries** that are likely to return results in your staging environment (`travel`, `flight`, `Nepal`). Avoid brand-new terms that may not have indexed content.
- **For empty state tests**, use guaranteed-no-match queries (`zzzqxvbnm`, random UUIDs).
- **For sort persistence tests**, use regex or explicit selectors on the dropdown value — don't rely on visual state alone.
- **Capture result IDs from `data-post-id` / `data-comment-id`** attributes when verifying sort order changes.
- **For special syntax tests**, use topics/users known to exist in staging (`#Airlines`, `@admin`).
- **Do NOT hardcode specific result counts** — counts vary as content is created/deleted.
- **For tab count assertions**, regex-extract numbers from tab labels rather than asserting exact strings:
```js
  const match = tabText.match(/\((\d+)\)/);
  if (match) count = parseInt(match[1]);
```
- **For back-navigation tests**, use `page.goBack()` and confirm URL + tab state — this catches broken state preservation.
- **For natural-language matching tests** (Steps 15-18), assertions on content are unreliable. Instead, verify that:
  - 2-word queries with only 1 matching word return 0 or very few results.
  - Empty-state message appears for guaranteed-mismatch queries.
- **For `#topic` bypass tests** (Step 9), use a well-known topic name that definitely exists in staging.
- **For `@username` tests** (Step 10), seed a known test user OR use a stable username that exists in staging.
- **Sort dropdown implementation** may use `<select>`, custom `role="combobox"`, or `role="listbox"` — confirm and adjust selectors.
- **For long-list tests** (edge case #22), search for a common word like `travel` to guarantee many results; verify pagination controls or scroll behavior.
- **Watch for stale search state** — if the previous test leaves the search bar populated, the next test may see unexpected initial state. Clear the search bar in `beforeEach`:
```js
  await page.locator('[data-testid="header-search"]').fill('');
```
- **For back-preservation tests**, note that some SPAs preserve state via routing memoization; others re-fetch. Confirm with engineering before writing strict assertions.
- **XSS / special character tests** (edge case #6) are worth running once — search inputs are common attack vectors.
- **Keyboard navigation tests** (edge case #32) can use `@axe-core/playwright` for automated a11y audits.
- **Multi-topic query semantics** (edge case #15) — write a test that asserts the intersection/union behavior once confirmed with engineering.
- **Stale cache tests** — try switching tabs, refreshing, coming back; results should be consistent.
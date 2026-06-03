# TalkTravel — Flow: Blog Index, Pagination & Search (Pre-Login)

> **Purpose:** Reference for Playwright automation of one pre-login flow — navigating Blog Home (`/blog`), opening the full article listing (`/blog/articles`) and paginating through it, searching for articles, and reaching the vanity-URL articles Coolcation (`/coolcation`) and Slow Travel (`/slow-travel`).
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged out

> **Scope note:** This flow covers the blog index, pagination, search, and vanity-URL entry points. The Single Article page behavior (article content, share row, breadcrumb, etc.) is covered by the existing `Landing → Blog → Single Article` flow and is not duplicated here.

---

## Flow overview

```
Header `Blog` / Footer `Blog Home`  →  Blog Home (/blog)
                                            ↓
                                       Search bar  →  Results  →  Article
                                            ↓                       ↓
                                       View All Blogs CTA  →  /blog/articles
                                                                  ↓
                                                          Numbered pagination (1, 2, 3, …)
                                                                  ↓
                                                          Click an article  →  /blog/{slug}

Footer shortcuts:
   Coolcation     →  /coolcation     (vanity URL → single article)
   Slow Travel    →  /slow-travel    (vanity URL → single article)
```

Blog Home (`/blog`) shows a curated/featured set of articles plus a search bar. The "View All Blogs" CTA leads to the full listing (`/blog/articles`), where numbered pagination at the bottom lets the visitor page through all articles. Search runs against the article corpus and returns matching results or an empty state. Coolcation and Slow Travel are footer-linked vanity URLs that resolve directly to specific articles.

---

## Step 1 — Land on Blog Home

**Action:** Navigate to `https://talktravel.com/blog` (or click `Blog` in the header / `Blog Home` in the footer).
**Expected URL:** `/blog`

### Elements that must be visible
- Header: TalkTravel logo, `Community`, `Blog`, `FAQ`, `Log in`, `Join Free`
- Hero heading: *"Stories, tips & ideas from the travel community."*
- Hero subtext
- Search bar with placeholder `Search articles...` + green arrow submit button
- Section header: `Read the Latest Articles` with `View All Blogs` CTA on the right
- Grid of curated/featured article cards
- Footer

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Page hero heading (H1) | `main h1` |
| Search input | `input[placeholder="Search articles..."]` |
| Search submit button | `button[aria-label="Search"]` or search-input sibling button |
| `View All Blogs` CTA | `text=View All Blogs` |
| Article card | `article` or `[data-testid="article-card"]` |
| First article card | `article:first-of-type` |
| Article title within card | `article >> h2, h3` |

### Assertions
- `await expect(page).toHaveURL(/\/blog$/)`
- `await expect(page.locator('main h1')).toContainText('Stories, tips & ideas')`
- `await expect(page.locator('input[placeholder="Search articles..."]')).toBeVisible()`
- `await expect(page.getByText('View All Blogs')).toBeVisible()`
- `await expect(page.locator('article').first()).toBeVisible()`

---

## Step 2 — Click `View All Blogs` CTA

**Action:** Click the `View All Blogs` button next to the `Read the Latest Articles` section header.
**Expected URL:** `/blog/articles`

### Behavior
- Navigates to the full article listing.
- Listing displays all articles (paginated).
- Numbered pagination component visible at the bottom.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| `View All Blogs` button | `text=View All Blogs` |
| Article grid container | `[data-testid="article-grid"]` or `main >> section` |
| Pagination container | `[data-testid="pagination"]` or `nav[aria-label="Pagination"]` |
| Page number button | `[data-testid="pagination"] >> button` |
| Next arrow | `button[aria-label="Next page"]` |
| Previous arrow | `button[aria-label="Previous page"]` |

### Assertions
- `await page.locator('text=View All Blogs').click()`
- `await expect(page).toHaveURL(/\/blog\/articles$/)`
- `await expect(page.locator('article').first()).toBeVisible()`
- `await expect(page.locator('nav[aria-label="Pagination"]')).toBeVisible()`

---

## Step 3 — Verify numbered pagination is rendered

**Action:** On `/blog/articles`, scroll to the bottom of the article grid.
**Expected URL:** stays on `/blog/articles`.

### Elements that must be visible
- Numbered page buttons (e.g., `1`, `2`, `3`, …)
- Page `1` is active by default (visually distinct)
- `Next` arrow (clickable if there are more pages)
- `Previous` arrow (disabled or hidden when on page 1)

### Assertions
- `const pagination = page.locator('nav[aria-label="Pagination"]')`
- `await pagination.scrollIntoViewIfNeeded()`
- `await expect(pagination).toBeVisible()`
- `await expect(pagination.locator('button:has-text("1")')).toHaveAttribute('aria-current', 'page')`
- `await expect(pagination.locator('button:has-text("2")')).toBeVisible()`

---

## Step 4 — Click pagination page 2

**Action:** Click the `2` button in the pagination control.
**Expected URL:** `/blog/articles?page=2` (confirm exact query-param pattern with engineering — could also be `/blog/articles/2`).

### Behavior
- Article grid re-renders with the second page of articles.
- Page `2` becomes active; page `1` becomes inactive.
- `Previous` arrow becomes enabled.
- Page may scroll to the top of the article grid (confirm with engineering).

### Assertions
- `await page.locator('nav[aria-label="Pagination"] >> button:has-text("2")').click()`
- `await expect(page).toHaveURL(/\/blog\/articles(\?page=2|\/2)/)`
- `await expect(page.locator('nav[aria-label="Pagination"] >> button:has-text("2")')).toHaveAttribute('aria-current', 'page')`
- `await expect(page.locator('article').first()).toBeVisible()`

---

## Step 5 — Click `Next` arrow

**Action:** With page 2 active, click the `Next` arrow.
**Expected URL:** `/blog/articles?page=3` (or equivalent).

### Behavior
- Article grid re-renders with the third page.
- Page `3` becomes active.
- On the last page, the `Next` arrow becomes disabled or hidden.

### Assertions
- `await page.locator('button[aria-label="Next page"]').click()`
- `await expect(page).toHaveURL(/\/blog\/articles(\?page=3|\/3)/)`
- `await expect(page.locator('nav[aria-label="Pagination"] >> button:has-text("3")')).toHaveAttribute('aria-current', 'page')`

---

## Step 6 — Click `Previous` arrow

**Action:** Click the `Previous` arrow.
**Expected URL:** previous page (e.g., back to `/blog/articles?page=2`).

### Behavior
- Article grid re-renders with the prior page.
- On page 1, the `Previous` arrow is disabled or hidden.

### Assertions
- `await page.locator('button[aria-label="Previous page"]').click()`
- `await expect(page).toHaveURL(/\/blog\/articles(\?page=2|\/2)/)`

---

## Step 7 — Click an article from the paginated grid

**Action:** From any pagination page (e.g., page 2), click any article card.
**Expected URL:** `/blog/{slug}`

### Behavior
- Navigates to the Single Article view (covered by the `Landing → Blog → Single Article` flow).
- Browser back returns to `/blog/articles?page=2` with the same pagination state.

### Assertions
- `const firstArticle = page.locator('article').first()`
- `const articleTitle = await firstArticle.locator('h2, h3').first().textContent()`
- `await firstArticle.click()`
- `await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+/)`
- `await expect(page.locator('article h1')).toContainText(articleTitle.trim())`

---

## Step 8 — Search: submit a valid query

**Action:** On `/blog`, type a query (e.g., `Delta`) into the search bar and press Enter or click the submit button.
**Expected URL:** `/blog?q=Delta` OR `/blog/search?q=Delta` (confirm with engineering — could be in-page filter or dedicated results page).

### Behavior
- Article grid re-renders showing only matching articles.
- Results indicator may appear (e.g., `X results for "Delta"`).
- Each result card is clickable and opens its Single Article view.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Search input | `input[placeholder="Search articles..."]` |
| Search submit | `button[aria-label="Search"]` |
| Results indicator | `[data-testid="search-results-count"]` or `text=/results for/` |

### Assertions
- `await page.locator('input[placeholder="Search articles..."]').fill('Delta')`
- `await page.locator('input[placeholder="Search articles..."]').press('Enter')`
- `await expect(page).toHaveURL(/[?&]q=Delta/)`
- `await expect(page.locator('article').first()).toBeVisible()`

---

## Step 9 — Search: click a result

**Action:** From search results, click any article card.
**Expected URL:** `/blog/{slug}`

### Behavior
- Navigates to the Single Article view.
- Browser back returns to the search results with the query and results still applied.

### Assertions
- `const firstResult = page.locator('article').first()`
- `const resultTitle = await firstResult.locator('h2, h3').first().textContent()`
- `await firstResult.click()`
- `await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+/)`
- `await expect(page.locator('article h1')).toContainText(resultTitle.trim())`

---

## Step 10 — Search: empty state

**Action:** Type a query that yields no results (e.g., `zxzxzxzx-no-match-zxzxzxzx`) and submit.
**Expected URL:** `/blog?q=zxzxzxzx-no-match-zxzxzxzx` (or equivalent).

### Behavior
- Article grid is replaced with an empty state message (e.g., *"No articles found"* or *"No results for 'zxzxzxzx-no-match-zxzxzxzx'"*).
- Search bar retains the query for easy correction.
- Optional: a "Clear search" or "Browse all articles" link is shown.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Empty state container | `[data-testid="search-empty-state"]` or `text=/No articles found|No results/` |

### Assertions
- `await page.locator('input[placeholder="Search articles..."]').fill('zxzxzxzx-no-match-zxzxzxzx')`
- `await page.locator('input[placeholder="Search articles..."]').press('Enter')`
- `await expect(page.locator('article')).toHaveCount(0)`
- `await expect(page.locator('text=/No articles found|No results/')).toBeVisible()`

---

## Step 11 — Search: empty submit (blank query)

**Action:** With an empty search input, click the submit button.
**Expected URL:** stays on `/blog` (or no navigation occurs).

### Behavior
- No search is performed.
- Page either stays put or shows a gentle "enter a query" message.
- No empty-state error.

### Assertions
- `await page.locator('input[placeholder="Search articles..."]').fill('')`
- `await page.locator('button[aria-label="Search"]').click()`
- `await expect(page).toHaveURL(/\/blog$/)`

---

## Step 12 — Coolcation vanity URL

**Action:** Click `Coolcation` in the footer (or navigate directly to `/coolcation`).
**Expected URL:** `/coolcation`

### Behavior
- Resolves directly to a specific single article (Coolcation is one article, not a category/index page).
- Page renders as a Single Article view — same structure as `/blog/{slug}` (article H1, breadcrumb, author, share row, hero image, body content).
- Full single-article behavior is covered by the existing `Landing → Blog → Single Article` flow.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Footer `Coolcation` link | `footer >> text=Coolcation` |

### Assertions
- `await page.locator('footer >> text=Coolcation').click()`
- `await expect(page).toHaveURL(/\/coolcation$/)`
- `await expect(page.locator('article h1')).toBeVisible()`
- `await expect(page.locator('text=Written by')).toBeVisible()`

---

## Step 13 — Slow Travel vanity URL

**Action:** Click `Slow Travel` in the footer (or navigate directly to `/slow-travel`).
**Expected URL:** `/slow-travel`

### Behavior
- Resolves directly to a specific single article (Slow Travel is one article, not a category/index page).
- Page renders as a Single Article view.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Footer `Slow Travel` link | `footer >> text=Slow Travel` |

### Assertions
- `await page.locator('footer >> text=Slow Travel').click()`
- `await expect(page).toHaveURL(/\/slow-travel$/)`
- `await expect(page.locator('article h1')).toBeVisible()`
- `await expect(page.locator('text=Written by')).toBeVisible()`

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

test('Blog Home → View All Blogs → Paginate → Article', async ({ page }) => {
  // Step 1 — Land on Blog Home
  await page.goto('https://talktravel.com/blog');
  await expect(page.locator('main h1')).toContainText('Stories, tips & ideas');
  await expect(page.locator('input[placeholder="Search articles..."]')).toBeVisible();

  // Step 2 — Click View All Blogs
  await page.locator('text=View All Blogs').click();
  await expect(page).toHaveURL(/\/blog\/articles$/);
  await expect(page.locator('nav[aria-label="Pagination"]')).toBeVisible();

  // Step 3 — Verify pagination
  const pagination = page.locator('nav[aria-label="Pagination"]');
  await expect(pagination.locator('button:has-text("1")')).toHaveAttribute('aria-current', 'page');

  // Step 4 — Click page 2
  await pagination.locator('button:has-text("2")').click();
  await expect(page).toHaveURL(/\/blog\/articles(\?page=2|\/2)/);
  await expect(pagination.locator('button:has-text("2")')).toHaveAttribute('aria-current', 'page');

  // Step 7 — Click an article from page 2
  const firstArticle = page.locator('article').first();
  const articleTitle = await firstArticle.locator('h2, h3').first().textContent();
  await firstArticle.click();
  await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+/);
  await expect(page.locator('article h1')).toContainText(articleTitle.trim());
});

test('Blog search — query, results, empty state', async ({ page }) => {
  await page.goto('https://talktravel.com/blog');

  // Step 8 — Valid query
  await page.locator('input[placeholder="Search articles..."]').fill('Delta');
  await page.locator('input[placeholder="Search articles..."]').press('Enter');
  await expect(page).toHaveURL(/[?&]q=Delta/);
  await expect(page.locator('article').first()).toBeVisible();

  // Step 9 — Click a result
  const firstResult = page.locator('article').first();
  await firstResult.click();
  await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+/);

  // Step 10 — Empty state
  await page.goto('https://talktravel.com/blog');
  await page.locator('input[placeholder="Search articles..."]').fill('zxzxzxzx-no-match-zxzxzxzx');
  await page.locator('input[placeholder="Search articles..."]').press('Enter');
  await expect(page.locator('article')).toHaveCount(0);
  await expect(page.locator('text=/No articles found|No results/')).toBeVisible();
});

test('Vanity URL articles — Coolcation & Slow Travel', async ({ page }) => {
  // Coolcation
  await page.goto('https://talktravel.com/coolcation');
  await expect(page).toHaveURL(/\/coolcation$/);
  await expect(page.locator('article h1')).toBeVisible();
  await expect(page.locator('text=Written by')).toBeVisible();

  // Slow Travel
  await page.goto('https://talktravel.com/slow-travel');
  await expect(page).toHaveURL(/\/slow-travel$/);
  await expect(page.locator('article h1')).toBeVisible();
  await expect(page.locator('text=Written by')).toBeVisible();
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Direct navigation to `/blog` | Page loads identically; no auth redirect |
| 2 | Direct navigation to `/blog/articles` | Page loads with page 1 active by default |
| 3 | Direct navigation to `/blog/articles?page=5` | Loads page 5 directly; pagination reflects state |
| 4 | Direct navigation to `/blog/articles?page=999` (out of range) | Graceful empty state OR redirect to last valid page |
| 5 | Direct navigation to `/blog/articles?page=0` or `?page=-1` | Treated as page 1 OR error state |
| 6 | Direct navigation to `/blog/articles?page=abc` (non-numeric) | Treated as page 1 OR error state |
| 7 | Click `Next` on the last page | Arrow is disabled or hidden; click does nothing |
| 8 | Click `Previous` on page 1 | Arrow is disabled or hidden; click does nothing |
| 9 | Browser back from an article opened from page 2 | Returns to `/blog/articles?page=2` with pagination state preserved |
| 10 | Browser back from an article opened from search results | Returns to search results with query and results retained |
| 11 | Refresh on `/blog/articles?page=3` | Stays on page 3; no reset to page 1 |
| 12 | Search query with special characters (`@`, `#`, `&`) | URL-encoded properly; search executes safely |
| 13 | Search query with leading/trailing whitespace | Trimmed before searching |
| 14 | Search query with only whitespace | Treated as empty submit (no-op) |
| 15 | Search query exceeding max length (e.g., 500 chars) | Either truncated or rejected gracefully |
| 16 | Search returns 1 result | Single article displayed; no pagination needed |
| 17 | Search returns many results across multiple pages | Pagination appears in search results too |
| 18 | Article grid fails to load (network/server error) | Error state with `Retry` action |
| 19 | Pagination clicks happen during slow network | Latest click wins; no race condition |
| 20 | Click pagination button twice rapidly | Only one navigation happens |
| 21 | Search submitted while on `/blog/articles` | Either works in place OR redirects to `/blog?q=...` (confirm) |
| 22 | Coolcation/Slow Travel articles are unpublished or removed | Graceful 404 (confirm fallback behavior) |
| 23 | Click footer `Blog Home` from anywhere | Returns to `/blog` |
| 24 | Click footer `All Articles` from anywhere | Goes to `/blog/articles` |
| 25 | Mobile viewport (~375px) | Article grid stacks vertically; pagination remains usable (may collapse) |
| 26 | Reduced motion preference | No transitions on pagination or search result re-render |
| 27 | Slow network | Loading skeletons appear in article grid area |
| 28 | Click logo from any blog page | Returns to homepage `/` (or `/trending` after redirect) |
| 29 | Click `Log in` from any blog page | Navigates to `/login` |
| 30 | Click `Join Free` from any blog page | Navigates to `/register` |
| 31 | Open `/blog/articles?page=2` in incognito via shared link | Loads page 2 directly; deep-link integrity preserved |

---

## Known issues to watch for

- Pagination URL format is unconfirmed — could be `?page=2` (query param) or `/page/2` (path segment). Confirm with engineering before locking selectors.
- Search behavior is unconfirmed — could be in-page filter on `/blog`, dedicated results page at `/blog/search`, or query-driven `/blog?q=...`. Affects URL assertions in Step 8.
- The `Coolcation` and `Slow Travel` footer links are vanity URLs that resolve to specific articles. The underlying article may be renamed or re-targeted by the editorial team — tests should not hardcode the article title; assert only on the presence of article structure.
- The "View All Blogs" CTA text may be exactly `View All Blogs` or a similar variant — confirm production copy.
- Empty state copy is unconfirmed — could be "No articles found", "No results for ...", or a custom message. Use a regex matcher.
- Pagination component may use `aria-current="page"` or a class-based active state. Confirm before using strict ARIA assertions.
- If a cookie banner appears on first visit, it will block clicks. Handle in `beforeEach`.
- The header `Blog` link may also open a hover dropdown of categories — clicks should target the link itself, not a dropdown item.

---

## Notes for the automation engineer

- Never hardcode article slugs, titles, or pagination counts — capture from the DOM at runtime.
- For pagination assertions, prefer `aria-current="page"` over class names — more stable.
- For search assertions, use `toContainText(/results for/i)` or pattern matchers rather than exact strings — copy varies.
- When testing pagination state preservation after navigation, store the URL or page number before clicking an article, then assert after back navigation.
- The article grid is dynamic — articles may be added, reordered, or removed by the editorial team. Tests should be resilient to changing content.
- For Step 5 (`Next`) and Step 6 (`Previous`), test against an environment with at least 3 pages of articles so behavior is verifiable.
- For Coolcation/Slow Travel vanity URLs, test only that the URL resolves to a valid article view — full article behavior is covered by the existing Single Article flow.
- Clear local storage / cookies in `beforeEach` for consistent default state.
- If running headed locally, dismiss the cookie banner before interacting with the page.
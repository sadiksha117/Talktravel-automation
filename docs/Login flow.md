# TalkTravel — Flow: Landing → Blog → Single Article

> **Purpose:** Reference for Playwright automation of one pre-login flow — from the landing page to opening a single blog article.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged out

---

## Flow overview

```
Landing (/)  →  Blog index (/blog)  →  Single article (/blog/{slug})
```

Two ways to enter the Blog from Landing:
1. Header `Blog` link
2. Hero `Read the Blog` CTA

Either path leads to the same destination.

---

## Step 1 — Land on the homepage

**Action:** Navigate to `https://talktravel.com`
**Expected URL:** `/`

### Elements that must be visible
- Header: TalkTravel logo, `Community`, `Blog`, `FAQ`, `Log in`, `Join Free`
- Hero heading: *"A travel community for people who'd rather **talk to humans** than read reviews"*
- Hero subtext: *"Real tips from real travelers. No sponsored content, no algorithms — just honest conversations about airlines, destinations, packing, loyalty hacks, and wherever the discussion goes."*
- Primary CTAs: `Join the Community` (filled green), `Read the Blog` (outlined)
- Hero image below the CTAs

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Logo | `a[href="/"]` (header) |
| `Blog` header link | `header >> text=Blog` |
| `Read the Blog` CTA | `text=Read the Blog` |
| `Join the Community` CTA | `text=Join the Community` |
| Hero heading | `h1` |

### Assertions
- `await expect(page).toHaveURL('/')`
- `await expect(page.locator('h1')).toContainText("talk to humans")`
- `await expect(page.locator('header')).toContainText('Blog')`
- `await expect(page.getByRole('link', { name: 'Read the Blog' })).toBeVisible()`

---

## Step 2 — Navigate to the Blog

**Action (choose one):**
- Click the `Blog` link in the header, **OR**
- Click the `Read the Blog` CTA in the hero

**Expected URL:** `/blog`

### Elements that must be visible on `/blog`
- Header (same as landing)
- Hero heading: *"Stories, tips & ideas from the travel community."*
- Hero subtext: *"Real advice from travelers who've been there — no reviews, no algorithms, just honest conversations."*
- Search bar with placeholder *"Search articles..."* and green arrow submit button
- Section header: `Read the Latest Articles` with `View All Blogs` button on the right
- Grid of article cards, each showing: hero image, category tag (e.g., `AIRLINES`), article title

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Page hero heading | `h1` (on `/blog`) |
| Search input | `input[placeholder="Search articles..."]` |
| Search submit | `button[aria-label="Search"]` or sibling button of search input |
| `View All Blogs` | `text=View All Blogs` |
| Article card (generic) | `article` or `[data-testid="article-card"]` |
| First article card | `article:first-of-type` |
| Article title within card | `article >> h2` or `article >> h3` |

### Assertions
- `await expect(page).toHaveURL(/\/blog$/)`
- `await expect(page.locator('h1')).toContainText('Stories, tips & ideas')`
- `await expect(page.locator('input[placeholder="Search articles..."]')).toBeVisible()`
- `await expect(page.locator('article').first()).toBeVisible()`

---

## Step 3 — Open a single article

**Action:** Click any article card in the `Latest Articles` grid (e.g., *"Delta Airlines Flight Status: Live PNR Status Tracker 2026"*)

**Expected URL:** `/blog/{slug}` (e.g., `/blog/delta-flight-status`)

### Elements that must be visible on the article page
- Header (same as landing/blog)
- Breadcrumb: `Blog > {Category} > {Article Title}`
- Category tag (e.g., `AIRLINES`)
- Article title (H1) — matches the title clicked on the card
- Author block: avatar + *"Written by {Author Name}"* + publish date
- Share row: X, Facebook, LinkedIn, Email, Copy link icons
- Hero image
- Article body content with:
  - Multiple paragraphs of formatted prose
  - Section headings (H2 / H3)
  - Inline links (if any)
  - Optional inline images
  - Optional bulleted or numbered lists
  - Optional quote blocks or callouts

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Article H1 | `article h1` or `main h1` |
| Breadcrumb | `nav[aria-label="Breadcrumb"]` |
| Category tag | `[data-testid="category-tag"]` or `.category-tag` |
| Author name | `text=/Written by/` |
| Publish date | `time` or `[data-testid="publish-date"]` |
| Share buttons | `[data-testid="share-buttons"]` or `.share-row` |
| Copy link button | `button[aria-label="Copy link"]` |
| Hero image | `article img:first-of-type` or `[data-testid="hero-image"]` |
| Article body | `article` or `[data-testid="article-body"]` |

### Assertions
- `await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+/)`
- `await expect(page.locator('article h1')).toBeVisible()`
- `await expect(page.locator('text=Written by')).toBeVisible()`
- `await expect(page.locator('article img').first()).toBeVisible()`
- `await expect(page.locator('article p').first()).toBeVisible()` (body has content)

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

test('Landing → Blog → Single Article flow', async ({ page }) => {
  // Step 1 — Land on homepage
  await page.goto('https://talktravel.com');
  await expect(page).toHaveURL('https://talktravel.com/');
  await expect(page.locator('h1')).toContainText('talk to humans');
  await expect(page.getByRole('link', { name: 'Read the Blog' })).toBeVisible();

  // Step 2 — Navigate to Blog (via header link)
  await page.locator('header').getByRole('link', { name: 'Blog' }).click();
  await expect(page).toHaveURL(/\/blog$/);
  await expect(page.locator('h1')).toContainText('Stories, tips & ideas');
  await expect(page.locator('input[placeholder="Search articles..."]')).toBeVisible();

  // Step 3 — Open the first article
  const firstArticle = page.locator('article').first();
  const articleTitle = await firstArticle.locator('h2, h3').first().textContent();
  await firstArticle.click();

  await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+/);
  await expect(page.locator('article h1')).toContainText(articleTitle.trim());
  await expect(page.locator('text=Written by')).toBeVisible();
  await expect(page.locator('article img').first()).toBeVisible();
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Click `Read the Blog` CTA instead of header link | Same destination `/blog`; both paths must succeed |
| 2 | Direct navigation to `/blog` | Page loads identically; no auth redirect |
| 3 | Direct navigation to a valid `/blog/{slug}` URL | Article loads directly |
| 4 | Direct navigation to `/blog/nonexistent-slug` | Graceful 404 or "Article not found" |
| 5 | Click `View All Blogs` button | Navigates to full article listing |
| 6 | Type query in search bar and submit | Filtered article results appear |
| 7 | Submit empty search | No-op or graceful "enter a query" message |
| 8 | Search query with no matches | Empty state ("No articles found") |
| 9 | Article body contains external links | Clicking opens in a new tab (`target="_blank"`) |
| 10 | Share buttons (X, Facebook, LinkedIn, Email, Copy link) | Each opens correct share intent or copies link |
| 11 | Click Copy Link button | Toast confirmation ("Link copied") |
| 12 | Click breadcrumb `Blog` | Returns to `/blog` |
| 13 | Click breadcrumb category | Filters articles by that category |
| 14 | Click browser back from article | Returns to `/blog` with scroll position preserved |
| 15 | Click logo from article page | Returns to homepage `/` |
| 16 | Open article in incognito tab via shared link | Loads same content (deep-link integrity) |
| 17 | Mobile viewport (~375px) | Layout reflows; cards stack vertically; nav collapses |
| 18 | Reduced motion preference | No autoplay animations on hero or images |
| 19 | Slow network | Loading skeletons or placeholders show while images load |
| 20 | Click article while another article is still loading | Latest click wins; no race condition |

---

## Known issues to watch for

- Header `Blog` link is both clickable AND opens a hover dropdown of categories — redundant UX. Confirm Playwright clicks the link itself (not a dropdown item).
- Some article cards may have inconsistent metadata (missing category, missing date). Tests should be resilient to optional fields.

---

## Notes for the automation engineer

- Use `await page.waitForLoadState('networkidle')` between navigations only if you observe race conditions; otherwise prefer explicit element waits.
- Article slugs are dynamic — never hardcode a specific article slug in assertions. Use regex (`/\/blog\/[a-z0-9-]+/`) or extract the title at runtime and assert against it.
- The hero image on article pages may be served lazily. Use `await page.locator('article img').first().scrollIntoViewIfNeeded()` before asserting visibility if needed.
- If running headed locally, the cookie banner may appear — handle it with a beforeEach hook that clicks "Reject All" or dismisses it.
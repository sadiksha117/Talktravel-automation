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
- Article body content
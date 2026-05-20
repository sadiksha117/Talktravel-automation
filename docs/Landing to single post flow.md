# TalkTravel — Flow 3: Landing → Pre-Login Feed → Single Post View

> **Purpose:** Reference for Playwright automation of the third pre-login flow — from the landing page to the trending feed, then opening a single post.
> **Base URL:** `https://talktravel.com`
> **Auth state:** Logged out

---

## Flow overview

```
Landing (/)  →  Pre-Login Feed (/trending)  →  Single Post View (/post/{id})
```

Entry to the feed from Landing:
- Header `Community` link

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

## Step 2 — Navigate to the Pre-Login Feed

**Action:** Click the `Community` link in the header

**Expected URL:** `/trending`

### Elements that must be visible on `/trending`
- Header (same as landing)
- Feed tabs: `Trending` / `Latest`
- View toggle: `Card` / `Compact`
- Forum feed (list of posts) — each post card shows:
  - Post title
  - Author avatar and username
  - Topic tag(s)
  - Vote count (Upvote / Downvote)
  - Comment count
  - Snippet of post content
- `Popular This Week` section
- Footer

---

## Step 3 — Open a single post

**Action:** Click any post card in the feed

**Expected URL:** `/post/{id}`

### Elements that must be visible on the single post view page
- Header (same as landing/feed)
- Post title — matches the title clicked on the card
- Post content (full body)
- Author block: avatar + username
- Topic tag(s)
- Vote section: Upvote / Downvote with current vote count
- Comments section with `Sort by` dropdown (Newest / Oldest)
- `Share` button on the post
- `Login` button (visible since user is logged out)
- Footer

---

## Flow ends here

The flow completes when the single post view page loads successfully with the post matching the card that was clicked. Interactions on the post page (voting, sorting comments, sharing, clicking author profile or topic tags) are out of scope for this flow.
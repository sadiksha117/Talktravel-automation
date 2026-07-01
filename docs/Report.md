# TalkTravel — Flow: Report (Post / Comment / Reply) — Cross-Cutting

> **Purpose:** Reference for Playwright automation of the Report flow — a cross-cutting interaction available on any post, comment, or reply NOT authored by the current user. Covers all three entry surfaces (feed, single post view, comments), the Report modal contract (Reason required, Additional details optional), submission and Cancel paths, validation, and post-submission state.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged in

> **Prerequisite:** Tests require an authenticated session via `storageState`, AND content authored by a different user to report against. Maintain two test accounts: `auth/reporter.json` (the user reporting) and `auth/target.json` (the user whose content is being reported). Never submit real reports against production content — use a disposable staging environment.

---

## Flow overview

```
Reportable surfaces (any content NOT authored by current user):
   Post on Homepage feed       → 3-dots → Report Post     ─┐
   Post on Topic page          → 3-dots → Report Post     ─┤
   Post on Single Post View    → 3-dots → Report Post     ─┤
   Comment on Single Post View → 3-dots → Report          ─┼─→ Report Modal
   Reply on Single Post View   → 3-dots → Report          ─┤
   Post on Search results      → 3-dots → Report Post     ─┘

Report Modal contract:
   ┌─────────────────────────────────────────────────────────────────┐
   │  Reason (required, dropdown) — e.g., Spam, Harassment, ...      │
   │  Additional details (optional, textarea)                        │
   │                                                                 │
   │  [Cancel]                                  [Submit Report]      │
   └─────────────────────────────────────────────────────────────────┘
        ↓                                            ↓
   Modal closes, no change         Validates → submits → confirmation toast
                                   Modal closes
                                   Reported content stays VISIBLE pending review
```

Report is **only available on content NOT authored by the current user**. The modal contract is identical across all surfaces (post, comment, reply). After successful submission, the reported content remains visible to all users until moderators review it — there's no immediate hiding or removal from the UI. Submitting without a reason is blocked at the modal level with an inline error.

---

## Step 1 — Report Post from Homepage feed

**Action:** From the Homepage feed (logged in as a user who didn't author the target post), find a post authored by someone else. Click the 3-dot menu. Click `Report Post`.

### Behavior
- The 3-dot menu on others' posts shows only `Report` / `Report Post` (no `Edit` or `Delete`).
- Clicking it opens the Report modal.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| 3-dot menu on post card | `[data-testid="post-card"] >> button[aria-label="More"]` |
| Report option | `[role="menuitem"]:has-text("Report")` |
| Report modal | `[role="dialog"][aria-label*="Report"]` or `[data-testid="report-modal"]` |

### Assertions
- `const targetPost = page.locator('[data-testid="post-card"]:not([data-author="<current-user>"])').first()`
- `await targetPost.locator('button[aria-label="More"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Report")')).toBeVisible()`
- `await page.locator('[role="menuitem"]:has-text("Report")').click()`
- `await expect(page.locator('[role="dialog"]')).toBeVisible()`

---

## Step 2 — Report Post from Single Post View

**Action:** Open a post NOT authored by the current user. Click the 3-dot menu on the post (not on a comment). Click `Report Post`.

### Behavior
- Same Report modal opens.
- The reported entity is the post itself (not a comment).

### Assertions
- `await page.goto(`https://talktravel.com/post/<others-post-slug>`)`
- `await page.locator('[data-testid="post-more"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Report")').click()`
- `await expect(page.locator('[role="dialog"]')).toBeVisible()`

---

## Step 3 — Report Post from Topic / Search / other feed surfaces

**Action:** Navigate to a topic page or search results. Find a post by another user. Click 3-dots → Report.

### Behavior
- Same Report modal opens regardless of entry surface.
- This confirms the Report action is uniform across feed contexts.

### Assertions
- `await page.goto('https://talktravel.com/topic/airlines')`
- `await page.locator('[data-testid="post-card"]:not([data-author="<current-user>"])').first().locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Report")').click()`
- `await expect(page.locator('[role="dialog"]')).toBeVisible()`

---

## Step 4 — Report a Comment

**Action:** On a Single Post View, find a comment NOT authored by the current user. Click the 3-dot menu on the comment. Click `Report`.

### Behavior
- The 3-dot menu on others' comments shows only `Report` (no `Edit` or `Delete`).
- Clicking opens the same Report modal as for posts.
- The reported entity is the comment.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| 3-dot on comment | `[data-testid="comment"] >> button[aria-label="More"]` |
| Report option on comment | `[role="menuitem"]:has-text("Report")` |

### Assertions
- `const othersComment = page.locator('[data-testid="comment"]:not([data-author="<current-user>"])').first()`
- `await othersComment.locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Report")').click()`
- `await expect(page.locator('[role="dialog"]')).toBeVisible()`

---

## Step 5 — Report a Reply (nested comment)

**Action:** Find a reply (level 2, 3, or 4) NOT authored by the current user. Click its 3-dot menu. Click `Report`.

### Behavior
- Same Report modal opens.
- The reported entity is the specific reply, not the parent comment.
- Reports work at any thread depth (level 2 through level 4).

### Assertions
- `const targetReply = page.locator('[data-testid="comment"][data-level="2"]:not([data-author="<current-user>"])').first()`
- `await targetReply.locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Report")').click()`
- `await expect(page.locator('[role="dialog"]')).toBeVisible()`

---

## Step 6 — Verify Report Modal structure

**Action:** With the Report modal open, inspect its contents.

### Elements that must be visible
- **Modal heading** — e.g., *"Report this post"* / *"Report this comment"* (copy may vary by surface — confirm with engineering)
- **Reason dropdown** — required, with predefined reason options (e.g., Spam, Harassment, Misinformation, Inappropriate content, Other)
- **Additional details textarea** — optional, with placeholder text
- **Cancel button** — closes modal without submitting
- **Submit Report button** — primary action

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Modal heading | `[role="dialog"] >> h2, h3` |
| Reason dropdown | `[data-testid="report-reason"]` or `select[name="reason"]` |
| Additional details textarea | `[data-testid="report-details"]` or `textarea[name="details"]` |
| Submit Report button | `button:has-text("Submit Report")` |
| Cancel button | `[role="dialog"] >> button:has-text("Cancel")` |

### Assertions
- `await expect(page.locator('[role="dialog"]')).toBeVisible()`
- `await expect(page.locator('[data-testid="report-reason"]')).toBeVisible()`
- `await expect(page.locator('[data-testid="report-details"]')).toBeVisible()`
- `await expect(page.locator('button:has-text("Submit Report")')).toBeVisible()`
- `await expect(page.locator('[role="dialog"] >> button:has-text("Cancel")')).toBeVisible()`

---

## Step 7 — Select a Reason from the dropdown

**Action:** Click the Reason dropdown. Inspect the options. Select one.

### Behavior
- Dropdown opens with a list of predefined reasons.
- Selecting one closes the dropdown and shows the selected value.
- The list of reasons is fixed by the platform (not user-defined).

### Assertions
- `await page.locator('[data-testid="report-reason"]').click()`
- `await expect(page.locator('[role="listbox"] >> [role="option"]')).toHaveCount(/* expected count, e.g., 5+ */)`
- `await page.locator('[role="option"]:has-text("Spam")').click()`
- `await expect(page.locator('[data-testid="report-reason"]')).toContainText('Spam')`

---

## Step 8 — Submit Report with Reason only (Additional details empty)

**Action:** Select a Reason. Leave Additional details blank. Click `Submit Report`.

### Behavior
- Form submits successfully.
- Modal closes.
- A confirmation toast appears (e.g., *"Report submitted"* / *"Thank you for your report"*).
- The reported content **remains visible** on the page — it does NOT disappear or get hidden.

### Assertions
- `await page.locator('[data-testid="report-reason"]').click()`
- `await page.locator('[role="option"]:has-text("Spam")').click()`
- `await page.locator('button:has-text("Submit Report")').click()`
- `await expect(page.locator('[role="dialog"]')).not.toBeVisible()`
- `await expect(page.locator('text=/Report submitted|Thank you/i')).toBeVisible()`

---

## Step 9 — Submit Report with Reason + Additional details

**Action:** Select a Reason. Fill Additional details with context. Click `Submit Report`.

### Behavior
- Same as Step 8.
- The Additional details text is sent along with the report (visible only to moderators, not to other users).

### Assertions
- `await page.locator('[data-testid="report-reason"]').click()`
- `await page.locator('[role="option"]:has-text("Harassment")').click()`
- `await page.locator('[data-testid="report-details"]').fill('Specific context about why this content is concerning.')`
- `await page.locator('button:has-text("Submit Report")').click()`
- `await expect(page.locator('[role="dialog"]')).not.toBeVisible()`
- `await expect(page.locator('text=/Report submitted|Thank you/i')).toBeVisible()`

---

## Step 10 — Validation: Submit without Reason

**Action:** Open the Report modal. Do NOT select a Reason. Click `Submit Report`.

### Behavior
- Inline error appears on the Reason field (e.g., *"Please select a reason"*).
- Modal stays open.
- No report is submitted.

### Assertions
- `await page.locator('button:has-text("Submit Report")').click()`
- `await expect(page.locator('[role="dialog"]')).toBeVisible()`
- `await expect(page.locator('text=/select a reason|reason.*required/i')).toBeVisible()`

---

## Step 11 — Cancel the Report

**Action:** Open the Report modal. Optionally select a Reason / fill details. Click `Cancel`.

### Behavior
- Modal closes.
- No report is submitted.
- No state changes anywhere — content remains intact and the report is discarded.
- The next time the modal is opened, fields are reset (no persistence of cancelled drafts).

### Assertions
- `await page.locator('[data-testid="report-reason"]').click()`
- `await page.locator('[role="option"]:has-text("Spam")').click()`
- `await page.locator('[role="dialog"] >> button:has-text("Cancel")').click()`
- `await expect(page.locator('[role="dialog"]')).not.toBeVisible()`
- `// Reopen modal — fields should be empty`
- `await targetPost.locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Report")').click()`
- `await expect(page.locator('[data-testid="report-reason"]')).not.toContainText('Spam')`

---

## Step 12 — Cannot Report own content

**Action:** As the post / comment author, click the 3-dot menu on your own content.

### Behavior
- Menu shows `Edit` / `Delete` options (not `Report`).
- There is no path for a user to report their own content.

### Assertions
- `const ownPost = page.locator('[data-testid="post-card"][data-author="<current-user>"]').first()`
- `await ownPost.locator('button[aria-label="More"]').click()`
- `await expect(page.locator('[role="menuitem"]:has-text("Edit")')).toBeVisible()`
- `await expect(page.locator('[role="menuitem"]:has-text("Delete")')).toBeVisible()`
- `await expect(page.locator('[role="menuitem"]:has-text("Report")')).not.toBeVisible()`

---

## Step 13 — Reported content stays visible

**Action:** Submit a successful report. Refresh the page.

### Behavior
- The reported post / comment / reply is still visible.
- All interactions (vote, follow, reply, share) still work on the reported content.
- There is no visual indicator (to the reporter or other users) that the content has been reported.
- Moderation actions happen server-side and may eventually remove or hide the content — but that's outside the scope of this flow.

### Assertions
- `// After successful submit (Step 8 or 9)`
- `await page.reload()`
- `await expect(targetPost).toBeVisible()`

---

## Step 14 — Duplicate Report on same content

**Action:** Submit a report on a piece of content. Open the Report modal on the same content again.

### Behavior — confirm with engineering. Two possibilities:
- **Option A:** A second report is allowed (treated as additional input for moderators).
- **Option B:** Inline message appears: *"You've already reported this content"*; submit is disabled OR modal shows a different state.

### Assertions
- `// Submit first report (Step 8)`
- `// Re-open modal`
- `await targetPost.locator('button[aria-label="More"]').click()`
- `await page.locator('[role="menuitem"]:has-text("Report")').click()`
- `// Confirm behavior — either allow second report OR show "already reported" message`
- `// await expect(page.locator('text=/already reported/i')).toBeVisible()`

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';

// All Report tests run as a user who didn't author the target content
test.use({ storageState: 'auth/reporter.json' });

let targetPostSlug;
let targetCommentId;

test.beforeAll(async ({ request }) => {
  // Seed a post and a comment authored by a different user (auth/target.json)
  targetPostSlug = await seedPostViaApi({
    title: `Reportable post ${Date.now()}`,
    topics: ['Airlines'],
    asUser: 'target',
  });
  targetCommentId = await seedCommentViaApi({
    postSlug: targetPostSlug,
    text: 'Reportable comment',
    asUser: 'target',
  });
});

test('Report Post from Homepage feed', async ({ page }) => {
  await page.goto('https://talktravel.com/');
  const targetPost = page.locator(`[data-testid="post-card"][data-slug="${targetPostSlug}"]`);
  await targetPost.locator('button[aria-label="More"]').click();
  await page.locator('[role="menuitem"]:has-text("Report")').click();

  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await page.locator('[data-testid="report-reason"]').click();
  await page.locator('[role="option"]:has-text("Spam")').click();
  await page.locator('button:has-text("Submit Report")').click();

  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  await expect(page.locator('text=/Report submitted|Thank you/i')).toBeVisible();
});

test('Report Post from Single Post View', async ({ page }) => {
  await page.goto(`https://talktravel.com/post/${targetPostSlug}`);
  await page.locator('[data-testid="post-more"]').click();
  await page.locator('[role="menuitem"]:has-text("Report")').click();

  await page.locator('[data-testid="report-reason"]').click();
  await page.locator('[role="option"]:has-text("Harassment")').click();
  await page.locator('[data-testid="report-details"]').fill('Specific concerning context here.');
  await page.locator('button:has-text("Submit Report")').click();

  await expect(page.locator('text=/Report submitted|Thank you/i')).toBeVisible();
});

test('Report a Comment', async ({ page }) => {
  await page.goto(`https://talktravel.com/post/${targetPostSlug}`);
  const targetComment = page.locator(`[data-testid="comment"][data-comment-id="${targetCommentId}"]`);
  await targetComment.locator('button[aria-label="More"]').click();
  await page.locator('[role="menuitem"]:has-text("Report")').click();

  await page.locator('[data-testid="report-reason"]').click();
  await page.locator('[role="option"]:has-text("Spam")').click();
  await page.locator('button:has-text("Submit Report")').click();

  await expect(page.locator('text=/Report submitted|Thank you/i')).toBeVisible();
});

test('Submit without Reason shows validation error', async ({ page }) => {
  await page.goto(`https://talktravel.com/post/${targetPostSlug}`);
  await page.locator('[data-testid="post-more"]').click();
  await page.locator('[role="menuitem"]:has-text("Report")').click();

  await page.locator('button:has-text("Submit Report")').click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await expect(page.locator('text=/select a reason|reason.*required/i')).toBeVisible();
});

test('Cancel discards report', async ({ page }) => {
  await page.goto(`https://talktravel.com/post/${targetPostSlug}`);
  await page.locator('[data-testid="post-more"]').click();
  await page.locator('[role="menuitem"]:has-text("Report")').click();

  await page.locator('[data-testid="report-reason"]').click();
  await page.locator('[role="option"]:has-text("Spam")').click();
  await page.locator('[role="dialog"] >> button:has-text("Cancel")').click();

  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  // Reopen — fields should be reset
  await page.locator('[data-testid="post-more"]').click();
  await page.locator('[role="menuitem"]:has-text("Report")').click();
  await expect(page.locator('[data-testid="report-reason"]')).not.toContainText('Spam');
});

test('Cannot report own content', async ({ browser }) => {
  const context = await browser.newContext({ storageState: 'auth/target.json' });
  const page = await context.newPage();

  await page.goto(`https://talktravel.com/post/${targetPostSlug}`);
  await page.locator('[data-testid="post-more"]').click();
  await expect(page.locator('[role="menuitem"]:has-text("Edit")')).toBeVisible();
  await expect(page.locator('[role="menuitem"]:has-text("Report")')).not.toBeVisible();
});

test('Reported content stays visible after submit', async ({ page }) => {
  await page.goto(`https://talktravel.com/post/${targetPostSlug}`);
  await page.locator('[data-testid="post-more"]').click();
  await page.locator('[role="menuitem"]:has-text("Report")').click();
  await page.locator('[data-testid="report-reason"]').click();
  await page.locator('[role="option"]:has-text("Spam")').click();
  await page.locator('button:has-text("Submit Report")').click();

  await page.reload();
  await expect(page.locator('article h1')).toBeVisible(); // post still visible
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Report Post from Homepage feed | Modal opens; submits successfully |
| 2 | Report Post from Topic page | Same |
| 3 | Report Post from Search results | Same |
| 4 | Report Post from Single Post View | Same |
| 5 | Report top-level Comment | Modal opens; submits |
| 6 | Report Level-2 reply | Modal opens; submits |
| 7 | Report Level-4 reply (deepest) | Modal opens; submits |
| 8 | Open Report modal, click backdrop / outside | Modal closes (same as Cancel) — confirm |
| 9 | Open Report modal, press Esc | Modal closes — confirm |
| 10 | Submit with empty Reason | Validation error; modal stays open |
| 11 | Submit with Reason "Other" but no details | May require details when "Other" selected — confirm with engineering |
| 12 | Submit with very long Additional details (>5000 chars) | Truncated, scrollable, or rejected |
| 13 | Submit with HTML/scripts in Additional details | Sanitized; not executed |
| 14 | Submit on slow network | Submit button shows loading state; no double-submission |
| 15 | Submit fails (network/server error) | Error toast appears; modal stays open |
| 16 | Click Submit twice rapidly | Only one report fires |
| 17 | Open Report modal, change Reason multiple times before submit | Latest selection submitted |
| 18 | Report a deleted (placeholder) post | Confirm whether Report is still available on placeholder content |
| 19 | Report a deleted (placeholder) comment | Confirm whether Report is still available |
| 20 | Direct URL to a reported post (after submit) | Loads normally; content still visible |
| 21 | Report same content twice | Allowed OR blocked with "already reported" — confirm |
| 22 | Reporter clicks 3-dot on their own previous report's target | Same content; Report option still shown (multiple reports allowed) — confirm |
| 23 | Report by a logged-out user | Not possible — 3-dot menu either hidden OR redirects to login (confirm pre-login behavior in separate flow) |
| 24 | Report content from a blocked user | Reporting is allowed even on blocked content — confirm |
| 25 | Mobile viewport (~375px) | Modal renders centered; dropdown adapts |
| 26 | Reduced motion preference | No animation on modal open/close |
| 27 | Keyboard navigation: Tab through fields, Enter to submit | Submit triggered |
| 28 | Submit when session has just expired | Submission fails; redirects to login (confirm) |
| 29 | Reports submitted are visible in moderator dashboard | (Out of scope for this UI flow — requires admin testing) |
| 30 | Reports submitted update content's internal flag count | (Out of scope — backend state) |

---

## Known issues to watch for

- The exact modal heading copy varies by surface ("Report this post" vs "Report this comment") — use a regex matcher.
- The list of available Reasons is unspecified in the source doc. Confirm with engineering before writing assertions about specific reasons. Common ones: Spam, Harassment, Misinformation, Inappropriate, Hate speech, Other.
- Whether selecting "Other" requires Additional details is unspecified.
- Whether duplicate reports on the same content are allowed or blocked is unspecified.
- Confirmation toast copy after submit is unspecified — use a regex matcher.
- Backdrop click / Esc dismiss behavior on the modal is unspecified.
- The reported content is NEVER hidden from the UI as a result of reporting — moderation happens server-side. Tests must not assert visibility changes.
- The Additional details field may have a character limit that's not documented. Test with a long input to surface the limit.
- Whether the report includes metadata like the reporter's user ID, the content URL, and a timestamp is server-side detail — outside UI test scope.
- Reports may trigger emails or notifications to moderators — outside UI test scope.

---

## Notes for the automation engineer

- **Two accounts required.** `auth/reporter.json` (the user submitting reports) and `auth/target.json` (the user whose content gets reported). Never run Report tests against real content — use seeded posts and comments only.
- **Seed test content in `beforeAll`.** Create a post + a comment via API as the target user. Capture the post slug and comment ID for use across multiple tests.
- **NEVER submit reports against production posts or against real users' content.** Always run against a staging environment with disposable seed data.
- **Use regex matchers** for modal heading, confirmation toast, and validation error copy:
  - Heading: `text=/Report this/i`
  - Confirmation: `text=/Report submitted|Thank you/i`
  - Validation: `text=/select a reason|reason.*required/i`
- **For Reason dropdown**, capture available options at runtime rather than hardcoding (the list may change):
```js
  const reasons = await page.locator('[role="option"]').allTextContents();
```
- **Cleanup considerations.** Reports are server-side moderation records; they typically cannot be deleted by users. Either:
  - Run on a disposable staging env that resets nightly.
  - Coordinate with engineering for an admin API to clear test reports.
  - Accept the accumulation in staging and use the count as monitoring data.
- **For the `Cannot report own content` test** (Step 12 / edge case in main flow), use `auth/target.json` storage state — i.e., view as the post author.
- **For the duplicate-report test** (edge case #21), confirm the engineering decision before writing the assertion. The test should match the implemented behavior, not assume one.
- **For modal interactions**, prefer `[role="dialog"]` scoped selectors over class names — more stable.
- **For Submit-disabled-during-load test** (edge case #14), use Playwright route interception to simulate slow network:
```js
  await page.route('**/api/reports', route => {
    setTimeout(() => route.continue(), 2000);
  });
```
- **For the network-failure test** (edge case #15):
```js
  await page.route('**/api/reports', route => route.abort());
```
- **3-dot menu copy** — confirm exact strings per surface. Post 3-dot may say "Report Post", comment 3-dot may say just "Report". Use specific matchers per context.
- **Comment ID capture.** When seeding comments, return their IDs so tests can target a specific comment via `data-comment-id` attribute rather than relying on text content.
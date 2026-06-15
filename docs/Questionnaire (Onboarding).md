# TalkTravel — Flow: Travel Profile / Questionnaire (Onboarding)

> **Purpose:** Reference for Playwright automation of the onboarding questionnaire — the screen new users land on immediately after signup (or first login) where they set Home Airport (required) and Favorite Airline (optional). Covers the Continue path, the Skip-for-now path, the verification banner, and the page's structural elements.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged in, **first session of a brand-new account**

> **Prerequisite:** This flow requires a **fresh, unverified account** for every test run, because the questionnaire is only shown once after first signup/first login. Three options for satisfying this:
> 1. **Recommended:** Provision a new account via API in a `beforeEach` hook (fastest, most reliable).
> 2. Use the UI Registration flow with a unique email per run, e.g. `automation+${Date.now()}@talktravel-test.com`.
> 3. Maintain a pool of pre-seeded fresh accounts and consume one per test run.

---

## Flow overview

```
Signup (Email/Phone + Password)  →  /questionnaire (Your Travel Profile)
                                         ↓
            ┌────────────────────────────┴───────────────────────────┐
            ↓                                                          ↓
   Fill form + Continue                              Skip for now
   (Home Airport required, Favorite Airline optional)            ↓
            ↓                                                          
   Submits and proceeds to next destination (Homepage / Verify Account)
            ↓
   Orange banner persists at top until /verify-account is completed
```

The questionnaire is the very first authenticated screen a new user sees. It collects two pieces of information for personalization. The page itself is not a blocker — the user can `Skip for now`. Above the form, an orange banner prompts the user to verify their account, which is a separate flow.

> **Note on SSO:** Users signing up via Google or Apple are routed directly to `/questionnaire` and skip the OTP/verification step. So the verification banner behavior may differ for SSO accounts. Confirm with engineering.

---

## Step 1 — Reach the questionnaire via signup

**Action:** Complete the Registration flow with a fresh email/phone + password (or via SSO). Submit.
**Expected URL:** `/questionnaire`

### Behavior
- Immediately after successful signup, the browser navigates to `/questionnaire`.
- For email/phone signups (non-SSO), the orange verification banner is also visible.

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Registration form (reference) | covered by Registration flow doc |
| Submit button on registration | covered by Registration flow doc |

### Assertions
- `// After signup form submission`
- `await expect(page).toHaveURL(/\/questionnaire$/)`

---

## Step 2 — Verify page structure on `/questionnaire`

**Action:** Inspect the questionnaire page after landing.

### Elements that must be visible
- **Orange verification banner** at the top with text *"Please verify your account to access full functionality"* and a link to `/verify-account`
- **Header (post-login):** Search bar, `+ Create Post`, Messages icon, Notifications bell, Profile avatar
- **Left navigation:** Home, Followed Posts, Followed Topics, Friends, Liked Posts, My Posts, My Comments, Messages, My Profile, Settings, Logout
- **Page heading:** *"Your Travel Profile"* (H1)
- **Subtext:** *"Help us personalize your experience with a couple quick questions."*
- **Form fields:**
  - `Home Airport` (required) — searchable dropdown, placeholder *"Search for an airport (e.g. LAX, BKK)"*
  - `Favorite Airline` (optional) — dropdown, placeholder *"e.g. Thai Airways, Emirates, Delta"*
- **Actions:**
  - `Continue` button (primary)
  - `Skip for now` link

### Suggested Playwright selectors
| Element | Selector |
|---|---|
| Verification banner | `[data-testid="verify-banner"]` or `text=Please verify your account` |
| Banner link to verification | `[data-testid="verify-banner"] >> a[href="/verify-account"]` |
| Page heading (H1) | `main h1` or `text=Your Travel Profile` |
| Subtext | `text=Help us personalize your experience` |
| Home Airport dropdown | `input[placeholder*="Search for an airport"]` or `[data-testid="home-airport"]` |
| Favorite Airline dropdown | `input[placeholder*="Thai Airways"]` or `[data-testid="favorite-airline"]` |
| Continue button | `button:has-text("Continue")` |
| Skip for now link | `text=Skip for now` |

### Assertions
- `await expect(page.locator('main h1')).toContainText('Your Travel Profile')`
- `await expect(page.locator('text=Help us personalize')).toBeVisible()`
- `await expect(page.locator('[data-testid="verify-banner"]')).toBeVisible()`
- `await expect(page.locator('input[placeholder*="Search for an airport"]')).toBeVisible()`
- `await expect(page.locator('input[placeholder*="Thai Airways"]')).toBeVisible()`
- `await expect(page.locator('button:has-text("Continue")')).toBeVisible()`
- `await expect(page.locator('text=Skip for now')).toBeVisible()`

---

## Step 3 — Verify Home Airport searchable dropdown

**Action:** Click into the Home Airport field. Type `LAX`. Observe dropdown suggestions.

### Behavior
- Dropdown opens with matching airport suggestions filtered by the typed text.
- Selecting an option closes the dropdown and populates the field.
- Clearing the field re-shows the placeholder.

### Assertions
- `await page.locator('input[placeholder*="Search for an airport"]').click()`
- `await page.locator('input[placeholder*="Search for an airport"]').fill('LAX')`
- `await expect(page.locator('[role="listbox"] >> [role="option"]').first()).toContainText(/LAX|Los Angeles/i)`
- `await page.locator('[role="option"]:has-text("LAX")').first().click()`
- `await expect(page.locator('input[placeholder*="Search for an airport"]')).toHaveValue(/LAX|Los Angeles/i)`

---

## Step 4 — Verify Favorite Airline dropdown (optional field)

**Action:** Click into the Favorite Airline field. Type `Delta`. Select an option.

### Behavior
- Dropdown opens with matching airlines.
- Selecting an option populates the field.
- Field can be left empty without blocking submission (it's optional).

### Assertions
- `await page.locator('input[placeholder*="Thai Airways"]').click()`
- `await page.locator('input[placeholder*="Thai Airways"]').fill('Delta')`
- `await expect(page.locator('[role="option"]:has-text("Delta")').first()).toBeVisible()`
- `await page.locator('[role="option"]:has-text("Delta")').first().click()`
- `await expect(page.locator('input[placeholder*="Thai Airways"]')).toHaveValue(/Delta/i)`

---

## Step 5 — Submit with both fields filled (Continue path)

**Action:** With Home Airport and Favorite Airline both populated, click `Continue`.
**Expected URL:** `/` (Homepage) OR `/verify-account` — confirm with engineering whether non-SSO accounts route to verification next, or to the Homepage with the banner still showing.

### Behavior
- Form submits.
- User leaves the `/questionnaire` route.
- Submitted values are persisted to the user profile (visible later in `My Profile` or Settings).

### Assertions
- `await page.locator('button:has-text("Continue")').click()`
- `await expect(page).not.toHaveURL(/\/questionnaire/)`
- `// Confirm destination — Homepage or /verify-account`
- `await expect(page).toHaveURL(/\/(verify-account|trending)?$/)`

---

## Step 6 — Submit with only Home Airport filled (optional field skipped)

**Action:** Fresh account. Fill only Home Airport. Leave Favorite Airline empty. Click `Continue`.

### Behavior
- Form submits successfully (Favorite Airline is optional).
- User leaves the questionnaire route.

### Assertions
- `await page.locator('input[placeholder*="Search for an airport"]').fill('BKK')`
- `await page.locator('[role="option"]:has-text("BKK")').first().click()`
- `await page.locator('button:has-text("Continue")').click()`
- `await expect(page).not.toHaveURL(/\/questionnaire/)`

---

## Step 7 — Continue with Home Airport empty (validation)

**Action:** Click `Continue` without filling Home Airport.

### Behavior
- Inline error appears on the Home Airport field (e.g., *"Home Airport is required"*).
- Form does NOT submit; user remains on `/questionnaire`.

### Assertions
- `await page.locator('button:has-text("Continue")').click()`
- `await expect(page).toHaveURL(/\/questionnaire/)`
- `await expect(page.locator('text=/required|please select/i').first()).toBeVisible()`

---

## Step 8 — Skip for now path

**Action:** Click the `Skip for now` link without filling any field.
**Expected URL:** `/` (Homepage) OR `/verify-account` — same destination as Continue (confirm).

### Behavior
- User leaves `/questionnaire` without saving any data.
- Home Airport and Favorite Airline remain empty in the user profile.
- The questionnaire is NOT shown again on next login (it's a one-time onboarding screen).

### Assertions
- `await page.locator('text=Skip for now').click()`
- `await expect(page).not.toHaveURL(/\/questionnaire/)`

---

## Step 9 — Verification banner click

**Action:** Click the orange verification banner (or its link).
**Expected URL:** `/verify-account`

### Behavior
- Navigates to the Verify Account page (covered by the Account Verification flow doc).
- Banner remains visible across all post-login pages until verification is completed.

### Assertions
- `await page.locator('[data-testid="verify-banner"]').click()`
- `await expect(page).toHaveURL(/\/verify-account/)`

---

## Step 10 — Questionnaire does not reappear on next login

**Action:** Complete the questionnaire (or Skip). Logout. Login again with the same account.

### Behavior
- User lands on the Homepage, NOT `/questionnaire`.
- The orange verification banner may still be visible if account isn't verified yet, but the questionnaire form is gone.

### Assertions
- `// After logout and re-login`
- `await expect(page).not.toHaveURL(/\/questionnaire/)`
- `await expect(page.locator('main h1')).not.toContainText('Your Travel Profile')`

---

## Sample Playwright test (end-to-end)

```javascript
import { test, expect } from '@playwright/test';
import { createFreshAccount } from './fixtures/account-helpers';

test.describe('Travel Profile / Questionnaire (Onboarding)', () => {

  test.beforeEach(async ({ page }) => {
    // Provision a fresh account via API and authenticate
    const { email, password } = await createFreshAccount();
    await page.goto('https://talktravel.com/login');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/questionnaire/);
  });

  test('Continue with both fields filled', async ({ page }) => {
    // Page structure
    await expect(page.locator('main h1')).toContainText('Your Travel Profile');
    await expect(page.locator('[data-testid="verify-banner"]')).toBeVisible();

    // Fill Home Airport
    await page.locator('input[placeholder*="Search for an airport"]').click();
    await page.locator('input[placeholder*="Search for an airport"]').fill('LAX');
    await page.locator('[role="option"]:has-text("LAX")').first().click();

    // Fill Favorite Airline
    await page.locator('input[placeholder*="Thai Airways"]').click();
    await page.locator('input[placeholder*="Thai Airways"]').fill('Delta');
    await page.locator('[role="option"]:has-text("Delta")').first().click();

    // Continue
    await page.locator('button:has-text("Continue")').click();
    await expect(page).not.toHaveURL(/\/questionnaire/);
  });

  test('Skip for now path', async ({ page }) => {
    await page.locator('text=Skip for now').click();
    await expect(page).not.toHaveURL(/\/questionnaire/);
  });

  test('Home Airport is required — Continue with empty form shows error', async ({ page }) => {
    await page.locator('button:has-text("Continue")').click();
    await expect(page).toHaveURL(/\/questionnaire/);
    await expect(page.locator('text=/required|please select/i').first()).toBeVisible();
  });

  test('Favorite Airline is optional — Continue with only Home Airport succeeds', async ({ page }) => {
    await page.locator('input[placeholder*="Search for an airport"]').click();
    await page.locator('input[placeholder*="Search for an airport"]').fill('BKK');
    await page.locator('[role="option"]:has-text("BKK")').first().click();
    await page.locator('button:has-text("Continue")').click();
    await expect(page).not.toHaveURL(/\/questionnaire/);
  });

  test('Verification banner links to /verify-account', async ({ page }) => {
    await page.locator('[data-testid="verify-banner"]').click();
    await expect(page).toHaveURL(/\/verify-account/);
  });
});
```

---

## Edge cases to add as separate tests

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Direct navigation to `/questionnaire` after onboarding is already complete | Redirects to Homepage; questionnaire does NOT show again |
| 2 | Home Airport — type partial query (e.g., "Los") | Dropdown shows multiple matches; user can pick any |
| 3 | Home Airport — type query with no matches (e.g., "ZZZZ") | Empty dropdown or "No results" |
| 4 | Home Airport — select, then clear field, then Continue | Treated as empty; required error fires |
| 5 | Favorite Airline — type query with no matches | Empty dropdown; user can leave field blank |
| 6 | Continue with both fields filled (data is persisted) | Submitted values appear in profile / settings later |
| 7 | Skip for now — user profile has empty Home Airport and Favorite Airline | Fields remain blank in profile |
| 8 | Click verification banner | Navigates to `/verify-account` |
| 9 | Banner persists on Homepage, Settings, other pages | Banner visible until account is verified |
| 10 | SSO signup (Google / Apple) lands on questionnaire | Questionnaire shows; no orange banner (SSO accounts skip OTP) — confirm |
| 11 | Network error on submit | Error message shown; user remains on questionnaire |
| 12 | Submit clicked twice rapidly | Only one submission processed |
| 13 | Browser back button while on `/questionnaire` | Stays on `/questionnaire` (no history to go back to) |
| 14 | Logout while on `/questionnaire` | Session cleared; lands on login page |
| 15 | Mobile viewport (~375px) | Form fields stack vertically; dropdowns adapt to mobile width |
| 16 | Reduced motion preference | No animation on dropdown open/close |
| 17 | Slow network | Loading indicator on Continue button; dropdown shows skeleton while fetching airports |
| 18 | Refresh page while on `/questionnaire` | Page reloads with empty form (or persists locally — confirm) |
| 19 | Logout, then login again with same unverified account that skipped questionnaire | Lands on Homepage; questionnaire does NOT reappear; banner still visible |
| 20 | Two browser tabs: complete questionnaire in one | Other tab still shows questionnaire until refreshed (confirm session sync) |

---

## Known issues to watch for

- The post-questionnaire destination is unclear from the source doc — confirm with engineering whether users route to Homepage (`/`), Verify Account (`/verify-account`), or another page after Continue/Skip.
- The orange verification banner only applies to email/phone signups; SSO users (Google / Apple) skip OTP and likely don't see this banner. Tests should branch by signup method.
- The questionnaire is a one-time screen — re-running tests with the same account will skip it. Always provision a fresh account.
- Home Airport dropdown is searchable; airport data may be paginated server-side, so test queries should use well-known IATA codes (LAX, BKK, DEL) for stable results.
- Favorite Airline dropdown may have a fixed list or be searchable similarly. Confirm with engineering.
- Required-field error copy is unconfirmed — could be "Home Airport is required", "Please select an airport", or similar. Use regex matcher.
- If a cookie banner shows on the first session, dismiss it in `beforeEach` before interacting with the questionnaire.

---

## Notes for the automation engineer

- **Credentials handling.** Never commit credentials. Use `.env` (gitignored) for local runs and CI secrets for pipelines:
```env
  TEST_VERIFIED_EMAIL=...
  TEST_VERIFIED_PASSWORD=...
```
  Reference in code via `process.env.TEST_VERIFIED_EMAIL`. Add `.env` to `.gitignore` and provide a `.env.example` template in the repo for onboarding.
- **Fresh-account strategy.** The questionnaire only appears once per account, so each test run needs a new account. Easiest options:
  - **API provisioning** (preferred): expose an internal endpoint (or admin script) to create test accounts. Wrap it in a `createFreshAccount()` fixture.
  - **UI signup with timestamped email:** `automation+${Date.now()}@talktravel-test.com`. Requires the email domain to accept inbound (catch-all alias).
  - **Pre-seeded pool:** maintain N fresh accounts in a database; consume one per run, mark consumed.
- **Cleanup.** Test accounts will accumulate over time. Add a periodic cleanup job (delete accounts older than X days) or use a disposable test environment.
- For airport/airline dropdown selections, use ARIA roles (`[role="listbox"]`, `[role="option"]`) instead of class names — more stable across UI revisions.
- For the required-field validation error, use a regex matcher (`text=/required|please select/i`) since exact copy may vary.
- Use `page.locator('[role="option"]').first().click()` to select the top dropdown match — safer than relying on exact text positions.
- After test completion, do NOT log out programmatically inside the test — let the next test's `beforeEach` start fresh.
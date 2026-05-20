# TalkTravel — Flow 2: Landing → Create Account

> **Purpose:** Reference for Playwright automation of the second pre-login flow — from the landing page to successfully creating an account with email/password.
> **Base URL:** `https://staging.talktravel.com/`
> **Auth state:** Logged out → newly registered
> **Signup method:** Email/password (manual form)

---

## Flow overview

```
Landing (/)  →  Create Account (/register)  →  Travel Profile (post-signup)
```

Two ways to enter Create Account from Landing:
1. Header `Join Free` button
2. Hero `Join the Community` CTA

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

## Step 2 — Navigate to Create Account

**Action (choose one):**
- Click the `Join Free` button in the header, **OR**
- Click the `Join the Community` CTA in the hero

**Expected URL:** `/register`

### Elements that must be visible on `/register`
- Minimal header: TalkTravel logo (left) + `Blog` link (right)
- Page heading: *"Join the Community"*
- Subtext: *"By continuing, you agree to our User Agreement and acknowledge that you understand the Privacy Policy."* (User Agreement and Privacy Policy are clickable links)
- Default avatar at the top of the form
- `Generate` link below the avatar (cycles a new random avatar on each click)
- Form fields (in order, all required):
  - `Username`
  - `Email or Phone Number` — placeholder *"Email or phone (e.g., +1234567890)"*, helper text *"Email or phone with country code"*
  - `Password` — with show/hide visibility toggle
  - `Confirm Password` — must match Password
- `Already have an account? Login` link below the form
- `OR` divider
- `Continue with Google` button
- `Continue with Apple` button

---

## Step 3 — Fill out the signup form

**Action:** Enter valid data into each required field.

### Field inputs
| Field | Example value | Notes |
|---|---|---|
| Username | `traveltester01` | Must not already be taken |
| Email or Phone Number | `traveltester01@example.com` | Or phone with country code, e.g., `+9779800000000`. Must not already be registered |
| Password | `TestPass@123` | |
| Confirm Password | `TestPass@123` | Must match Password exactly |

### Expected behavior while filling
- Username field accepts text input
- Email/Phone field accepts both email format and phone format with country code
- Password field masks input by default; clicking the visibility toggle shows plain text
- Confirm Password field masks input by default
- No inline errors are shown for valid input

---

## Step 4 — Submit the form

**Action:** Click the submit button (e.g., `Create Account` / `Continue`)

**Expected result:**
- Form submits without validation errors
- User is redirected to the Travel Profile / Questionnaire page
- Account is created in the backend
- Submitted username, email/phone, and avatar are persisted to the new account

### Elements that must be visible on Travel Profile page
- Travel Profile / Questionnaire heading
- First questionnaire step or onboarding intro
- (Detailed Travel Profile spec lives in the post-login flow document)

---

## Flow ends here

The flow completes when the user successfully lands on the Travel Profile page after submitting valid signup data. Subsequent questionnaire steps and onboarding are out of scope for this flow.
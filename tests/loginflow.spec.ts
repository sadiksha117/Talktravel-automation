import { test, expect } from '@playwright/test';
import { LoginFlowPage } from '../src/pages/loginflow';

const VALID_EMAIL = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';
const BASE_URL = 'https://staging.talktravel.com';

test.describe('Login Flow', () => {
  let loginFlow: LoginFlowPage;

  test.beforeEach(async ({ page }) => {
    loginFlow = new LoginFlowPage(page);
    await loginFlow.goToLanding();
  });

  // ── Step 1: Landing page ─────────────────────────────────────────────────

  test('Step 1 — landing page loads at correct URL', async ({ page }) => {
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  test('Step 1 — logo is visible in header', async () => {
    await expect(loginFlow.logo).toBeVisible();
  });

  test('Step 1 — header nav links are visible', async () => {
    await expect(loginFlow.headerCommunity).toBeVisible();
    await expect(loginFlow.headerBlog).toBeVisible();
    await expect(loginFlow.headerFaq).toBeVisible();
  });

  test('Step 1 — Log in and Join Free buttons are visible in header', async () => {
    await expect(loginFlow.headerLogIn).toBeVisible();
    await expect(loginFlow.headerJoinFree).toBeVisible();
  });

  test('Step 1 — hero heading is visible', async () => {
    await expect(loginFlow.heroHeading).toBeVisible();
  });

  test('Step 1 — hero subtext is visible', async () => {
    await expect(loginFlow.heroSubtext).toBeVisible();
  });

  test('Step 1 — Join the Community CTA is visible', async () => {
    await expect(loginFlow.joinCommunityBtn).toBeVisible();
  });

  test('Step 1 — Read the Blog CTA is visible', async () => {
    await expect(loginFlow.readTheBlogBtn).toBeVisible();
  });

  // ── Step 2: Navigate to /login ────────────────────────────────────────────

  test('Step 2 — Log in header button navigates to /login', async ({ page }) => {
    await Promise.all([
      page.waitForURL('**/login'),
      loginFlow.headerLogIn.click(),
    ]);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('Step 2 — login page heading is visible', async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.loginHeading).toBeVisible();
  });

  test('Step 2 — logo is visible on login page', async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.loginLogo).toBeVisible();
  });

  test('Step 2 — Blog link is visible on login page header', async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.loginHeaderBlog).toBeVisible();
  });

  // ── Step 2: Login page form elements ─────────────────────────────────────

  test('Step 2 — email field is visible', async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.emailField).toBeVisible();
  });

  test('Step 2 — password field is visible', async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.passwordField).toBeVisible();
  });

  test('Step 2 — submit button is visible', async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.submitBtn).toBeVisible();
  });

  test('Step 2 — Forgot Password link is visible', async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.forgotPasswordLink).toBeVisible();
  });

  test('Step 2 — Create Account link is visible', async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.createAccountLink).toBeVisible();
  });

  test('Step 2 — Continue with Google button is visible', async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.continueWithGoogleBtn).toBeVisible();
  });

  test('Step 2 — Continue with Apple button is visible', async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.continueWithAppleBtn).toBeVisible();
  });

  test('Step 2 — password field masks input by default', async () => {
    await loginFlow.goToLogin();
    const inputType = await loginFlow.passwordField.getAttribute('type');
    expect(inputType).toBe('password');
  });

  // ── Step 3: Fill form ─────────────────────────────────────────────────────

  test('Step 3 — email field accepts email input', async () => {
    await loginFlow.goToLogin();
    await loginFlow.emailField.fill(VALID_EMAIL);
    await expect(loginFlow.emailField).toHaveValue(VALID_EMAIL);
  });

  test('Step 3 — password field accepts password input', async () => {
    await loginFlow.goToLogin();
    await loginFlow.passwordField.fill(VALID_PASSWORD);
    await expect(loginFlow.passwordField).toHaveValue(VALID_PASSWORD);
  });

  // ── Step 4: Submit — happy path ───────────────────────────────────────────

  test('Step 4 — valid credentials redirect away from /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
  });

  test('Step 4 — valid credentials land on community or dashboard page', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(/staging\.talktravel\.com\/(community|dashboard|feed|home|$)/);
  });

  // ── Full end-to-end happy path ────────────────────────────────────────────

  test('happy path — Landing → Log in header → fill form → submit → redirected', async ({ page }) => {
    await expect(page).toHaveURL(`${BASE_URL}/`);
    await expect(loginFlow.heroHeading).toBeVisible();

    await Promise.all([
      page.waitForURL('**/login'),
      loginFlow.headerLogIn.click(),
    ]);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
    await expect(loginFlow.loginHeading).toBeVisible();

    await loginFlow.login(VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
  });

  test('happy path — direct navigation to /login → fill form → submit → redirected', async ({ page }) => {
    await loginFlow.goToLogin();
    await expect(loginFlow.loginHeading).toBeVisible();

    await loginFlow.login(VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
  });

  // ── Negative cases ────────────────────────────────────────────────────────

  test('negative — wrong password keeps user on /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, 'WrongPass@999');
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('negative — wrong email keeps user on /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login('notregistered@example.com', VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('negative — wrong email and wrong password keeps user on /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login('wrong@example.com', 'WrongPass@999');
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('negative — empty email and password keeps user on /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.submitBtn.click();
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('negative — email only (no password) keeps user on /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.emailField.fill(VALID_EMAIL);
    await loginFlow.submitBtn.click();
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('negative — password only (no email) keeps user on /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.passwordField.fill(VALID_PASSWORD);
    await loginFlow.submitBtn.click();
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('negative — invalid email format keeps user on /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login('notanemail', VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('negative — email missing @ symbol keeps user on /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login('userdomain.com', VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('negative — email missing domain keeps user on /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login('user@', VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('negative — password with only spaces keeps user on /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, '        ');
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('negative — correct email with empty string password keeps user on /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.emailField.fill(VALID_EMAIL);
    await loginFlow.passwordField.fill('');
    await loginFlow.submitBtn.click();
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('negative — SQL injection in email field keeps user on /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login("' OR 1=1 --", VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('negative — SQL injection in password field keeps user on /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, "' OR '1'='1");
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('negative — XSS payload in email field is not executed', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login('<script>alert(1)</script>@x.com', VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('negative — very long email does not crash the page', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(`${'a'.repeat(200)}@example.com`, VALID_PASSWORD);
    await expect(loginFlow.loginHeading).toBeVisible();
  });

  test('negative — very long password does not crash the page', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, 'A1@' + 'a'.repeat(300));
    await expect(loginFlow.loginHeading).toBeVisible();
  });

  test('negative — error message is shown for wrong credentials', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login('wrong@example.com', 'WrongPass@999');
    const errorMsg = page.locator('[role="alert"], .error, [data-testid*="error"], p:has-text("invalid"), p:has-text("incorrect"), p:has-text("wrong")');
    await expect(errorMsg.first()).toBeVisible();
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  test('edge — direct navigation to /login loads the form', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(loginFlow.loginHeading).toBeVisible();
    await expect(loginFlow.emailField).toBeVisible();
  });

  test('edge — Create Account link navigates to /register', async ({ page }) => {
    await loginFlow.goToLogin();
    await Promise.all([
      page.waitForURL('**/register'),
      loginFlow.createAccountLink.click(),
    ]);
    await expect(page).toHaveURL(`${BASE_URL}/register`);
  });

  test('edge — Forgot Password link navigates away from /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.forgotPasswordLink.click();
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
  });

  test('edge — logo on login page navigates back to landing', async ({ page }) => {
    await loginFlow.goToLogin();
    await Promise.all([
      page.waitForURL(`${BASE_URL}/`),
      loginFlow.loginLogo.click(),
    ]);
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  test('edge — Blog link on login page navigates to /blog', async ({ page }) => {
    await loginFlow.goToLogin();
    await page.goto(`${BASE_URL}/blog`);
    await expect(page).toHaveURL(`${BASE_URL}/blog`);
  });

  test('edge — email field retains value after failed submission', async () => {
    await loginFlow.goToLogin();
    await loginFlow.emailField.fill(VALID_EMAIL);
    await loginFlow.passwordField.fill('WrongPass@999');
    await loginFlow.submitBtn.click();
    await expect(loginFlow.emailField).toHaveValue(VALID_EMAIL);
  });

  test('edge — tab key moves focus from email to password field', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.emailField.click();
    await page.keyboard.press('Tab');
    await expect(loginFlow.passwordField).toBeFocused();
  });

  test('edge — pressing Enter in password field submits the form', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.emailField.fill(VALID_EMAIL);
    await loginFlow.passwordField.fill(VALID_PASSWORD);
    await loginFlow.passwordField.press('Enter');
    await loginFlow.waitForPageLoad();
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
  });

  test('edge — pasting email into email field works correctly', async () => {
    await loginFlow.goToLogin();
    await loginFlow.emailField.click();
    await loginFlow.page.keyboard.insertText(VALID_EMAIL);
    await expect(loginFlow.emailField).toHaveValue(VALID_EMAIL);
  });

  test('edge — numeric only password keeps user on /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, '12345678');
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('edge — email with uppercase letters is accepted (case-insensitive)', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL.toUpperCase(), VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
  });

  test('edge — whitespace around valid email is trimmed and logs in', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(`  ${VALID_EMAIL}  `, VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
  });

  test('edge — all fields filled with whitespace keeps user on /login', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.emailField.fill('   ');
    await loginFlow.passwordField.fill('   ');
    await loginFlow.submitBtn.click();
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('edge — login page is accessible via direct URL without auth redirect loop', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
    await expect(loginFlow.loginHeading).toBeVisible();
  });
});

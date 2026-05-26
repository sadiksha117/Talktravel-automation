import { test, expect } from '@playwright/test';
import { LoginFlowExploratoryPage } from '../../src/pages/exploratory/LoginFlowExploratory';

const VALID_EMAIL = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';
const BASE_URL = 'https://staging.talktravel.com';

test.describe('Login Flow (Exploratory)', () => {
  let loginFlow: LoginFlowExploratoryPage;

  test.beforeEach(async ({ page }) => {
    loginFlow = new LoginFlowExploratoryPage(page);
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  test('Edge — password toggle reveals password text on click', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await loginFlow.passwordField.fill(VALID_PASSWORD);
    await expect(loginFlow.passwordToggle).toBeVisible({ timeout: 5000 });
    await loginFlow.passwordToggle.click();
    const inputType = await loginFlow.passwordField.getAttribute('type');
    expect(inputType).toBe('text');
  });

  test('Edge — password toggle hides password text on second click', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await loginFlow.passwordField.fill(VALID_PASSWORD);
    await expect(loginFlow.passwordToggle).toBeVisible({ timeout: 5000 });
    await loginFlow.passwordToggle.click();
    await loginFlow.passwordToggle.click();
    const inputType = await loginFlow.passwordField.getAttribute('type');
    expect(inputType).toBe('password');
  });

  test('Edge — visiting /login while already logged in redirects away', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
    await page.goto(`${BASE_URL}/login`);
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
  });

  test('Edge — browser back after login does not return to /login', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
    await page.goBack();
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
  });

  test('Edge — login page document title contains Login', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await expect(page).toHaveTitle(/log in|sign in|login/i);
  });

  test('Edge — email field has autocomplete="username" attribute', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.emailField).toHaveAttribute('autocomplete', 'username');
  });

  test('Edge — password field has autocomplete="current-password" attribute', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.passwordField).toHaveAttribute('autocomplete', 'current-password');
  });

  test('Edge — login page has no console errors on load', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await loginFlow.goToLogin();
    expect(errors).toHaveLength(0);
  });

  test('Edge — logo href on login page points to homepage', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.loginLogo).toHaveAttribute('href', '/');
  });

  test('Edge — Forgot Password link href points to /forgot-password', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });

  test('Edge — Blog header link on login page points to /blog', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.loginHeaderBlog).toHaveAttribute('href', '/blog');
  });

  test('Edge — Create Account link navigates to /register', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await Promise.all([
      page.waitForURL('**/register'),
      loginFlow.createAccountLink.click(),
    ]);
    await expect(page).toHaveURL(`${BASE_URL}/register`);
  });

  test('Edge — failed login keeps email field value intact', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await loginFlow.emailField.fill(VALID_EMAIL);
    await loginFlow.passwordField.fill('WrongPass@999');
    await loginFlow.submitBtn.click();
    await expect(loginFlow.emailField).toHaveValue(VALID_EMAIL);
  });

  // ── Negative cases ────────────────────────────────────────────────────────

  test('Negative — Forgot Password page loads with an email input', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.forgotPasswordLink.click();
    await page.waitForLoadState('networkidle');
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();
  });

  test('Negative — error message appears after 5 consecutive wrong password attempts', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    for (let i = 0; i < 5; i++) {
      await loginFlow.emailField.fill(VALID_EMAIL);
      await loginFlow.passwordField.fill('WrongPass@999');
      await loginFlow.submitBtn.click();
      await page.waitForLoadState('networkidle');
    }
    await expect(page.locator('[role="alert"]').first()).toBeVisible();
  });

  test('Negative — wrong credentials error message is not empty', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login('wrong@example.com', 'WrongPass@999');
    const errorMsg = page.locator('[role="alert"]').first();
    await expect(errorMsg).toBeVisible();
    const text = await errorMsg.innerText();
    expect(text.trim().length).toBeGreaterThan(5);
  });

  test('Negative — login with phone number format does not show format error', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.emailField.fill('+9779800000000');
    await loginFlow.passwordField.fill(VALID_PASSWORD);
    await loginFlow.submitBtn.click();
    await page.waitForLoadState('networkidle');
    const errorMsg = page.locator('[role="alert"]');
    await expect(errorMsg).not.toHaveText(/invalid format|not a valid email/i);
  });

  test('Negative — password with leading and trailing spaces fails login', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, ` ${VALID_PASSWORD} `);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('Negative — empty email field shows validation error', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.passwordField.fill(VALID_PASSWORD);
    await loginFlow.submitBtn.click();
    await expect(page).toHaveURL(`${BASE_URL}/login`);
    await expect(page.locator('[role="alert"], [class*="error"], [class*="invalid"]').first()).toBeVisible();
  });

  test('Negative — empty password field shows validation error', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.emailField.fill(VALID_EMAIL);
    await loginFlow.submitBtn.click();
    await expect(page).toHaveURL(`${BASE_URL}/login`);
    await expect(page.locator('[role="alert"], [class*="error"], [class*="invalid"]').first()).toBeVisible();
  });

  test('Negative — SQL injection in email field stays on login', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login("' OR 1=1 --", VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('Negative — very long email does not crash the page', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(`${'a'.repeat(200)}@example.com`, VALID_PASSWORD);
    await expect(loginFlow.loginHeading).toBeVisible();
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('Negative — XSS payload in email field is not executed', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login('<script>alert(1)</script>@x.com', VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
    await expect(loginFlow.loginHeading).toBeVisible();
  });

  test('Negative — unregistered email shows error message', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login('doesnotexist999@example.com', VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
    await expect(page.locator('[role="alert"]').first()).toBeVisible();
  });

  test('Negative — correct email with wrong case password fails login', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, VALID_PASSWORD.toLowerCase());
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });
});

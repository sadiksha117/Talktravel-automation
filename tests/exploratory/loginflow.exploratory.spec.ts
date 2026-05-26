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

  test('Edge — login page email input is focused automatically on load', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.emailField).toBeFocused();
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

  test('Edge — tab order moves focus from email to password to submit', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.emailField.click();
    await page.keyboard.press('Tab');
    await expect(loginFlow.passwordField).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(loginFlow.submitBtn).toBeFocused();
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

  test('Negative — submitting form via keyboard Enter on submit button logs in', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.emailField.fill(VALID_EMAIL);
    await loginFlow.passwordField.fill(VALID_PASSWORD);
    await loginFlow.submitBtn.focus();
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
  });

  test('Negative — login redirect preserves intended destination after login', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto(`${BASE_URL}/trending`);
    await page.waitForLoadState('networkidle');
    await page.goto(`${BASE_URL}/login`);
    await loginFlow.login(VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/trending`);
  });
});

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

  // ── Step 1 edge cases ────────────────────────────────────────────────────

  test('Edge — Step 1: logo href points to homepage', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLanding();
    await expect(loginFlow.logo).toHaveAttribute('href', '/');
  });

  test('Edge — Step 1: hero subtext is visible', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLanding();
    await expect(loginFlow.heroSubtext).toBeVisible();
  });

  test('Edge — Step 1: Log in link href points to /login', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLanding();
    await expect(loginFlow.headerLogIn).toHaveAttribute('href', '/login');
  });

  test('Edge — Step 1: Join Free link href points to /register', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLanding();
    await expect(loginFlow.headerJoinFree).toHaveAttribute('href', '/register');
  });

  // ── Step 2 edge cases ────────────────────────────────────────────────────

  test('Edge — Step 2: password field masks input by default', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    const inputType = await loginFlow.passwordField.getAttribute('type');
    expect(inputType).toBe('password');
  });

  test('Edge — Step 2: Forgot Password link is visible', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.forgotPasswordLink).toBeVisible();
  });

  test('Edge — Step 2: Create Account link is visible', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.createAccountLink).toBeVisible();
  });

  test('Edge — Step 2: Continue with Google button is visible', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.continueWithGoogleBtn).toBeVisible();
  });

  test('Edge — Step 2: Continue with Apple button is visible', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.continueWithAppleBtn).toBeVisible();
  });

  test('Edge — Step 2: logo on login page navigates back to landing', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await Promise.all([
      page.waitForURL(`${BASE_URL}/`),
      loginFlow.loginLogo.click(),
    ]);
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  // ── Potentially failing cases ─────────────────────────────────────────────

  test('Fail? — password toggle reveals password text on click', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await loginFlow.passwordField.fill(VALID_PASSWORD);
    await loginFlow.passwordToggle.click();
    const inputType = await loginFlow.passwordField.getAttribute('type');
    expect(inputType).toBe('text');
  });

  test('Fail? — visiting /login while already logged in redirects away', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, VALID_PASSWORD);
    await page.goto(`${BASE_URL}/login`);
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
  });

  test('Fail? — browser back after login does not return to /login', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, VALID_PASSWORD);
    await page.goBack();
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
  });

  test('Fail? — Forgot Password page loads with an email input', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.forgotPasswordLink.click();
    await page.waitForLoadState('networkidle');
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();
  });

  test('Fail? — error message appears after 5 consecutive wrong password attempts', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    for (let i = 0; i < 5; i++) {
      await loginFlow.emailField.fill(VALID_EMAIL);
      await loginFlow.passwordField.fill('WrongPass@999');
      await loginFlow.submitBtn.click();
      await page.waitForLoadState('networkidle');
    }
    const lockoutMsg = page.locator('[role="alert"], .error, [data-testid*="error"]').filter({
      hasText: /too many|locked|attempts|try again/i,
    });
    await expect(lockoutMsg).toBeVisible();
  });

  test('Fail? — email field has autocomplete="email" attribute', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.emailField).toHaveAttribute('autocomplete', 'email');
  });

  test('Fail? — password field has autocomplete="current-password" attribute', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.passwordField).toHaveAttribute('autocomplete', 'current-password');
  });

  test('Fail? — session persists after page refresh post-login', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, VALID_PASSWORD);
    const postLoginUrl = page.url();
    await page.reload();
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
    await expect(page).toHaveURL(postLoginUrl);
  });

  test('Fail? — Create Account link navigates to /register', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await Promise.all([
      page.waitForURL('**/register'),
      loginFlow.createAccountLink.click(),
    ]);
    await expect(page).toHaveURL(`${BASE_URL}/register`);
  });

  test('Fail? — login with phone number format is accepted', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.emailField.fill('+9779800000000');
    await loginFlow.passwordField.fill(VALID_PASSWORD);
    await loginFlow.submitBtn.click();
    await page.waitForLoadState('networkidle');
    const errorMsg = page.locator('[role="alert"], .error, [data-testid*="error"]');
    await expect(errorMsg).not.toHaveText(/invalid format|not a valid email/i);
  });

  test('Fail? — login page document title contains "Login" or "Sign in"', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await expect(page).toHaveTitle(/log in|sign in|login/i);
  });

  test('Fail? — login redirect preserves intended destination after login', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto(`${BASE_URL}/trending`);
    await page.waitForLoadState('networkidle');
    await page.goto(`${BASE_URL}/login`);
    await loginFlow.login(VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/trending`);
  });

  test('Fail? — Caps Lock warning appears when Caps Lock is on', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.passwordField.click();
    await page.keyboard.down('CapsLock');
    await loginFlow.passwordField.fill('Test');
    const capsWarning = page.locator('text=/caps lock/i');
    await expect(capsWarning).toBeVisible();
    await page.keyboard.up('CapsLock');
  });

  test('Fail? — login page has no console errors on load', { tag: '@exploratory' }, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await loginFlow.goToLogin();
    expect(errors).toHaveLength(0);
  });

  test('Fail? — tab order moves email → password → submit button', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.emailField.click();
    await page.keyboard.press('Tab');
    await expect(loginFlow.passwordField).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(loginFlow.submitBtn).toBeFocused();
  });

  test('Fail? — login page is not accessible when already logged in (redirects)', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, VALID_PASSWORD);
    await loginFlow.goToLogin();
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
  });

  test('Fail? — password with leading and trailing spaces fails login', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, ` ${VALID_PASSWORD} `);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('Fail? — login page has a visible "Remember me" checkbox', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    const rememberMe = page.getByRole('checkbox', { name: /remember me/i })
      .or(page.getByLabel(/remember me/i));
    await expect(rememberMe).toBeVisible();
  });

  test('Fail? — submitting form via Tab to submit button then Enter logs in', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.emailField.fill(VALID_EMAIL);
    await loginFlow.passwordField.fill(VALID_PASSWORD);
    await loginFlow.submitBtn.focus();
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
  });

  test('Fail? — login page footer is visible', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  test('Fail? — login page has a Log in with Google option that opens OAuth popup', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      loginFlow.continueWithGoogleBtn.click(),
    ]);
    await expect(popup).toBeTruthy();
    await expect(popup).toHaveURL(/accounts\.google\.com/);
  });

  test('Fail? — unverified account shows verification prompt on login', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login('unverified@example.com', 'TestPass@123');
    const verifyMsg = page.locator('[role="alert"], .error, main').filter({
      hasText: /verify|verification|confirm/i,
    });
    await expect(verifyMsg).toBeVisible();
  });

  test('Fail? — login page email input is focused automatically on load', { tag: '@exploratory' }, async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.emailField).toBeFocused();
  });

  test('Fail? — Forgot Password navigates to /forgot-password or /reset-password', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.forgotPasswordLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/forgot.password|reset.password|forgot|reset/i);
  });

  test('Fail? — wrong credentials error message is specific (not generic)', { tag: '@exploratory' }, async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login('wrong@example.com', 'WrongPass@999');
    const errorMsg = page.locator('[role="alert"], .error, [data-testid*="error"]').first();
    await expect(errorMsg).toBeVisible();
    const text = await errorMsg.innerText();
    expect(text.trim().length).toBeGreaterThan(5);
    expect(text).not.toMatch(/error|something went wrong/i);
  });
});

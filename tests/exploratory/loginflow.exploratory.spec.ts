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
});

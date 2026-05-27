import { test, expect } from '@playwright/test';
import { LoginFlowPage } from '../src/pages/loginflow';

const VALID_EMAIL = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';
const BASE_URL = 'https://staging.talktravel.com';

test.describe('Login Flow', () => {
  let loginFlow: LoginFlowPage;

  test.beforeEach(async ({ page }) => {
    loginFlow = new LoginFlowPage(page);
  });

  // ── Step 1: Landing page ─────────────────────────────────────────────────

  test('Step 1 — landing page loads at correct URL', async ({ page }) => {
    await loginFlow.goToLanding();
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  test('Step 1 — logo is visible in header', async () => {
    await loginFlow.goToLanding();
    await expect(loginFlow.logo).toBeVisible();
  });

  test('Step 1 — header nav links are visible', async () => {
    await loginFlow.goToLanding();
    await expect(loginFlow.headerCommunity).toBeVisible();
    await expect(loginFlow.headerBlog).toBeVisible();
    await expect(loginFlow.headerFaq).toBeVisible();
  });

  test('Step 1 — Log in and Join Free buttons are visible in header', async () => {
    await loginFlow.goToLanding();
    await expect(loginFlow.headerLogIn).toBeVisible();
    await expect(loginFlow.headerJoinFree).toBeVisible();
  });

  test('Step 1 — hero heading is visible', async () => {
    await loginFlow.goToLanding();
    await expect(loginFlow.heroHeading).toBeVisible();
  });

  // ── Step 2: Navigate to /login ────────────────────────────────────────────

  test('Step 2 — Log in header button navigates to /login', async ({ page }) => {
    await loginFlow.goToLanding();
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

  // ── Step 2: Login page form elements ─────────────────────────────────────

  test('Step 2 — login field is visible', async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.loginField).toBeVisible();
  });

  test('Step 2 — password field is visible', async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.passwordField).toBeVisible();
  });

  test('Step 2 — submit button is visible', async () => {
    await loginFlow.goToLogin();
    await expect(loginFlow.submitBtn).toBeVisible();
  });

  // ── Step 3: Fill form ─────────────────────────────────────────────────────

  test('Step 3 — login field accepts input', async () => {
    await loginFlow.goToLogin();
    await loginFlow.loginField.fill(VALID_EMAIL);
    await expect(loginFlow.loginField).toHaveValue(VALID_EMAIL);
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

  test('Step 4 — valid credentials land on correct page', async ({ page }) => {
    await loginFlow.goToLogin();
    await loginFlow.login(VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(/staging\.talktravel\.com\/(community|dashboard|feed|home|trending)/);
  });

  // ── Full end-to-end happy path ────────────────────────────────────────────

  test('happy path — Landing → Log in header → fill form → submit → redirected', async ({ page }) => {
    await loginFlow.goToLanding();
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
});

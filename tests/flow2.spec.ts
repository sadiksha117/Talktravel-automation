import { test, expect } from '@playwright/test';
import { Flow2Page } from '../src/pages/Flow2Page';

test.describe('Flow 2 — Landing → Create Account', () => {
  let flow2: Flow2Page;

  test.beforeEach(async ({ page }) => {
    flow2 = new Flow2Page(page);
    await flow2.goToLanding();
  });

  // ── Step 1: Landing page ─────────────────────────────────────────────────

  test('Step 1 — landing page loads at correct URL', async ({ page }) => {
    await expect(page).toHaveURL('https://talktravel.com/');
  });

  test('Step 1 — logo is visible in header', async () => {
    await expect(flow2.logo).toBeVisible();
  });

  test('Step 1 — header nav links are visible', async () => {
    await expect(flow2.headerCommunity).toBeVisible();
    await expect(flow2.headerBlog).toBeVisible();
    await expect(flow2.headerFaq).toBeVisible();
  });

  test('Step 1 — Log in and Join Free buttons are visible in header', async () => {
    await expect(flow2.headerLogIn).toBeVisible();
    await expect(flow2.headerJoinFree).toBeVisible();
  });

  test('Step 1 — hero heading is visible', async () => {
    await expect(flow2.heroHeading).toBeVisible();
  });

  test('Step 1 — hero subtext is visible', async () => {
    await expect(flow2.heroSubtext).toBeVisible();
  });

  test('Step 1 — Join the Community CTA is visible', async () => {
    await expect(flow2.joinCommunityBtn).toBeVisible();
  });

  test('Step 1 — Read the Blog CTA is visible', async () => {
    await expect(flow2.readTheBlogBtn).toBeVisible();
  });

  // ── Step 2: Navigate to /register ────────────────────────────────────────

  test('Step 2 — Join Free header button navigates to /register', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await expect(page).toHaveURL('https://talktravel.com/register');
  });

  test('Step 2 — Join the Community CTA navigates to /register', async ({ page }) => {
    await flow2.goToRegisterViaJoinCommunityCta();
    await expect(page).toHaveURL('https://talktravel.com/register');
  });

  test('Step 2 — register page heading is visible', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await expect(flow2.registerHeading).toBeVisible();
  });

  test('Step 2 — register page subtext with agreement links is visible', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await expect(flow2.registerSubtext).toBeVisible();
  });

  test('Step 2 — logo is visible on register page', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await expect(flow2.registerLogo).toBeVisible();
  });

  test('Step 2 — Blog link is visible on register page header', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await expect(flow2.registerHeaderBlog).toBeVisible();
  });

  // ── Step 2: Register page form elements ──────────────────────────────────

  test('Step 2 — Generate avatar link is visible', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await expect(flow2.generateAvatarLink).toBeVisible();
  });

  test('Step 2 — Username field is visible', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await expect(flow2.usernameField).toBeVisible();
  });

  test('Step 2 — Email or Phone Number field is visible', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await expect(flow2.emailPhoneField).toBeVisible();
  });

  test('Step 2 — Password field is visible', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await expect(flow2.passwordField).toBeVisible();
  });

  test('Step 2 — Confirm Password field is visible', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await expect(flow2.confirmPasswordField).toBeVisible();
  });

  test('Step 2 — Already have an account Login link is visible', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await expect(flow2.alreadyHaveAccountLink).toBeVisible();
  });

  test('Step 2 — Continue with Google button is visible', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await expect(flow2.continueWithGoogleBtn).toBeVisible();
  });

  test('Step 2 — Continue with Apple button is visible', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await expect(flow2.continueWithAppleBtn).toBeVisible();
  });

  // ── Step 3: Fill out the form ─────────────────────────────────────────────

  test('Step 3 — Username field accepts text input', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.usernameField.fill('traveltester01');
    await expect(flow2.usernameField).toHaveValue('traveltester01');
  });

  test('Step 3 — Email or Phone field accepts email format', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.emailPhoneField.fill('traveltester01@example.com');
    await expect(flow2.emailPhoneField).toHaveValue('traveltester01@example.com');
  });

  test('Step 3 — Email or Phone field accepts phone format with country code', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.emailPhoneField.fill('+9779800000000');
    await expect(flow2.emailPhoneField).toHaveValue('+9779800000000');
  });

  test('Step 3 — Password field masks input by default', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    const inputType = await flow2.passwordField.getAttribute('type');
    expect(inputType).toBe('password');
  });

  test('Step 3 — Generate avatar link cycles avatar on click', async () => {
    await flow2.goToRegisterViaJoinFreeHeader();
    const avatarBefore = await flow2.avatarImage.getAttribute('src');
    await flow2.generateAvatarLink.click();
    const avatarAfter = await flow2.avatarImage.getAttribute('src');
    expect(avatarAfter).not.toBe(avatarBefore);
  });

  // ── Step 4: Submit the form ───────────────────────────────────────────────

  test('Step 4 — valid form submission redirects to travel profile page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm(
      `tester${Date.now()}`,
      `tester${Date.now()}@example.com`,
      'TestPass@123'
    );
    await flow2.submitForm();
    await expect(page).not.toHaveURL('https://talktravel.com/register');
  });

  // ── Full end-to-end happy paths ───────────────────────────────────────────

  test('happy path — Landing → Register via Join Free header → fill form → submit', async ({ page }) => {
    await expect(page).toHaveURL('https://talktravel.com/');
    await expect(flow2.heroHeading).toBeVisible();

    await flow2.goToRegisterViaJoinFreeHeader();
    await expect(page).toHaveURL('https://talktravel.com/register');
    await expect(flow2.registerHeading).toBeVisible();

    await flow2.fillSignupForm(
      `tester${Date.now()}`,
      `tester${Date.now()}@example.com`,
      'TestPass@123'
    );
    await flow2.submitForm();
    await expect(page).not.toHaveURL('https://talktravel.com/register');
  });

  test('happy path — Landing → Register via Join the Community CTA → fill form → submit', async ({ page }) => {
    await expect(page).toHaveURL('https://talktravel.com/');
    await expect(flow2.joinCommunityBtn).toBeVisible();

    await flow2.goToRegisterViaJoinCommunityCta();
    await expect(page).toHaveURL('https://talktravel.com/register');
    await expect(flow2.registerHeading).toBeVisible();

    await flow2.fillSignupForm(
      `tester${Date.now()}`,
      `tester${Date.now()}@example.com`,
      'TestPass@123'
    );
    await flow2.submitForm();
    await expect(page).not.toHaveURL('https://talktravel.com/register');
  });
});

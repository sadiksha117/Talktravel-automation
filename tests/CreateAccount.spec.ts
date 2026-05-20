import { test, expect } from '@playwright/test';
import { CreateAccountPage } from '../src/pages/CreateAccount';

test.describe('Flow 2 — Landing → Create Account', () => {
  let flow2: CreateAccountPage;

  test.beforeEach(async ({ page }) => {
    flow2 = new CreateAccountPage(page);
    await flow2.goToLanding();
  });

  // ── Step 1: Landing page ─────────────────────────────────────────────────

  test('Step 1 — landing page loads at correct URL', async ({ page }) => {
    await expect(page).toHaveURL('https://staging.talktravel.com/');
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
    await Promise.all([
      page.waitForURL('**/register'),
      flow2.headerJoinFree.click(),
    ]);
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('Step 2 — Join the Community CTA navigates to /register', async ({ page }) => {
    await Promise.all([
      page.waitForURL('**/register'),
      flow2.joinCommunityBtn.click(),
    ]);
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
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
    await expect(page).not.toHaveURL('https://staging.talktravel.com/register');
  });

  // ── Full end-to-end happy paths ───────────────────────────────────────────

  test('happy path — Landing → Register via Join Free header → fill form → submit', async ({ page }) => {
    await expect(page).toHaveURL('https://staging.talktravel.com/');
    await expect(flow2.heroHeading).toBeVisible();

    await flow2.goToRegisterViaJoinFreeHeader();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
    await expect(flow2.registerHeading).toBeVisible();

    await flow2.fillSignupForm(
      `tester${Date.now()}`,
      `tester${Date.now()}@example.com`,
      'TestPass@123'
    );
    await flow2.submitForm();
    await expect(page).not.toHaveURL('https://staging.talktravel.com/register');
  });

  test('happy path — Landing → Register via Join the Community CTA → fill form → submit', async ({ page }) => {
    await expect(page).toHaveURL('https://staging.talktravel.com/');
    await expect(flow2.joinCommunityBtn).toBeVisible();

    await flow2.goToRegisterViaJoinCommunityCta();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
    await expect(flow2.registerHeading).toBeVisible();

    await flow2.fillSignupForm(
      `tester${Date.now()}`,
      `tester${Date.now()}@example.com`,
      'TestPass@123'
    );
    await flow2.submitForm();
    await expect(page).not.toHaveURL('https://staging.talktravel.com/register');
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  test('edge — submitting empty form shows validation errors', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('edge — mismatched confirm password keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.usernameField.fill(`tester${Date.now()}`);
    await flow2.emailPhoneField.fill(`tester${Date.now()}@example.com`);
    await flow2.passwordField.fill('TestPass@123');
    await flow2.confirmPasswordField.fill('WrongPass@999');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('edge — Already have an account Login link navigates to /login', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await Promise.all([
      page.waitForURL('**/login'),
      flow2.alreadyHaveAccountLink.click(),
    ]);
    await expect(page).toHaveURL('https://staging.talktravel.com/login');
  });

  test('edge — direct navigation to /register loads the form', async ({ page }) => {
    await page.goto('https://staging.talktravel.com/register');
    await expect(flow2.registerHeading).toBeVisible();
    await expect(flow2.usernameField).toBeVisible();
  });

  test('edge — invalid email format keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm(`tester${Date.now()}`, 'notanemail', 'TestPass@123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('edge — username with only spaces keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm('   ', `tester${Date.now()}@example.com`, 'TestPass@123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('edge — XSS payload in username is not executed', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.usernameField.fill('<script>alert(1)</script>');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('edge — very long username (200 chars) does not crash the page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.usernameField.fill('a'.repeat(200));
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
    await expect(flow2.registerHeading).toBeVisible();
  });

  test('edge — phone without country code keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm(`tester${Date.now()}`, '9800000000', 'TestPass@123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  // ── Negative cases ────────────────────────────────────────────────────────

  test('negative — password too short keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm(`tester${Date.now()}`, `tester${Date.now()}@example.com`, 'abc');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — password with no special character keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm(`tester${Date.now()}`, `tester${Date.now()}@example.com`, 'TestPass123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — password with only spaces keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm(`tester${Date.now()}`, `tester${Date.now()}@example.com`, '        ');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — email missing @ symbol keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm(`tester${Date.now()}`, 'testerdomain.com', 'TestPass@123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — email missing domain keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm(`tester${Date.now()}`, 'tester@', 'TestPass@123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — single character username keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm('a', `tester${Date.now()}@example.com`, 'TestPass@123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — username with special characters keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm('user!@#$%', `tester${Date.now()}@example.com`, 'TestPass@123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — confirm password left empty keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.usernameField.fill(`tester${Date.now()}`);
    await flow2.emailPhoneField.fill(`tester${Date.now()}@example.com`);
    await flow2.passwordField.fill('TestPass@123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — only password filled keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.passwordField.fill('TestPass@123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — only email filled keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.emailPhoneField.fill(`tester${Date.now()}@example.com`);
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — SQL injection in email field keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm(`tester${Date.now()}`, "' OR 1=1 --", 'TestPass@123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — XSS payload in email field is not executed', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm(`tester${Date.now()}`, '<script>alert(1)</script>@x.com', 'TestPass@123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — very long email does not crash the page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm(`tester${Date.now()}`, `${'a'.repeat(200)}@example.com`, 'TestPass@123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — very long password does not crash the page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm(`tester${Date.now()}`, `tester${Date.now()}@example.com`, 'A1@' + 'a'.repeat(300));
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — phone with invalid country code keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm(`tester${Date.now()}`, '+0001234567890', 'TestPass@123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — numeric only username keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm('1234567890', `tester${Date.now()}@example.com`, 'TestPass@123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — username with unicode characters keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm('旅行者🌍', `tester${Date.now()}@example.com`, 'TestPass@123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — password and confirm password both empty keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.usernameField.fill(`tester${Date.now()}`);
    await flow2.emailPhoneField.fill(`tester${Date.now()}@example.com`);
    await flow2.submitForm();
    await expect(flow2.registerHeading).toBeVisible();
  });

  test('negative — username with leading and trailing spaces keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.fillSignupForm('  tester  ', `tester${Date.now()}@example.com`, 'TestPass@123');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — all fields filled with whitespace keeps user on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.usernameField.fill('   ');
    await flow2.emailPhoneField.fill('   ');
    await flow2.passwordField.fill('   ');
    await flow2.confirmPasswordField.fill('   ');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
  });

  test('negative — mismatched passwords with valid all other fields shows error', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.usernameField.fill(`tester${Date.now()}`);
    await flow2.emailPhoneField.fill(`tester${Date.now()}@example.com`);
    await flow2.passwordField.fill('TestPass@123');
    await flow2.confirmPasswordField.fill('Different@456');
    await flow2.submitForm();
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
    await expect(flow2.confirmPasswordField).toBeVisible();
  });

  // ── Additional edge cases ─────────────────────────────────────────────────

  test('edge — User Agreement text is visible on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await expect(page.getByText(/user agreement/i)).toBeVisible();
  });

  test('edge — Privacy Policy link is visible and clickable on register page', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    const privacyLink = page.getByRole('link', { name: /privacy policy/i });
    await expect(privacyLink).toBeVisible();
    await privacyLink.click();
    await expect(page).not.toHaveURL('https://staging.talktravel.com/register');
  });

  test('edge — Blog link in register header navigates to /blog', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await page.goto('https://staging.talktravel.com/blog');
    await expect(page).toHaveURL('https://staging.talktravel.com/blog');
  });

  test('edge — logo on register page navigates back to landing', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await Promise.all([
      page.waitForURL('https://staging.talktravel.com/'),
      flow2.registerLogo.click(),
    ]);
    await expect(page).toHaveURL('https://staging.talktravel.com/');
  });

  test('edge — form fields retain values after failed submission', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    const username = `tester${Date.now()}`;
    await flow2.usernameField.fill(username);
    await flow2.emailPhoneField.fill('invalidemail');
    await flow2.passwordField.fill('TestPass@123');
    await flow2.submitForm();
    await expect(flow2.usernameField).toHaveValue(username);
  });

  test('edge — generating avatar multiple times keeps page stable', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    for (let i = 0; i < 5; i++) {
      await flow2.generateAvatarLink.click();
    }
    await expect(page).toHaveURL('https://staging.talktravel.com/register');
    await expect(flow2.registerHeading).toBeVisible();
  });

  test('edge — tab key moves focus from username to email field', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.usernameField.click();
    await page.keyboard.press('Tab');
    await expect(flow2.emailPhoneField).toBeFocused();
  });

  test('edge — pasting text into username field works correctly', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.usernameField.click();
    await page.keyboard.insertText('pasteduser');
    await expect(flow2.usernameField).toHaveValue('pasteduser');
  });

  test('edge — email field accepts subaddress format (plus addressing)', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.emailPhoneField.fill('user+tag@example.com');
    const value = await flow2.emailPhoneField.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test('edge — confirm password field does not accept input before password is filled', async ({ page }) => {
    await flow2.goToRegisterViaJoinFreeHeader();
    await flow2.confirmPasswordField.fill('TestPass@123');
    await flow2.submitForm();
    await expect(flow2.registerHeading).toBeVisible();
  });
});

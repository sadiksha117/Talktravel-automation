import { test, expect } from '@playwright/test';
import { CreateAccountPage } from '../src/pages/CreateAccount';
import { QuestionnairePage } from '../src/pages/Questionnaire';

test.describe('Travel Profile / Questionnaire (Onboarding) — Positive Cases', () => {
  let createAccount: CreateAccountPage;
  let questionnaire: QuestionnairePage;

  test.beforeEach(async ({ page }) => {
    createAccount = new CreateAccountPage(page);
    questionnaire = new QuestionnairePage(page);

    // Create a fresh account so the questionnaire appears
    await createAccount.goToRegisterViaJoinFreeHeader();
    await createAccount.fillSignupForm(
      `tester${Date.now()}`,
      `tester${Date.now()}@example.com`,
      'TestPass@123'
    );
    await createAccount.submitForm();

    // Should land on /questionnaire after signup
    await expect(page).toHaveURL(/\/questionnaire/);
  });

  // ── Step 2: Page structure ────────────────────────────────────────────────

  test('Step 2 — page heading "Your Travel Profile" is visible', async () => {
    await expect(questionnaire.pageHeading).toContainText('Your Travel Profile');
  });

  test('Step 2 — page subtext is visible', async () => {
    await expect(questionnaire.pageSubtext).toBeVisible();
  });

  test('Step 2 — orange verification banner is visible', async () => {
    await expect(questionnaire.verifyBanner).toBeVisible();
  });

  test('Step 2 — Home Airport input is visible', async () => {
    await expect(questionnaire.homeAirportInput).toBeVisible();
  });

  test('Step 2 — Favorite Airline input is visible', async () => {
    await expect(questionnaire.favoriteAirlineInput).toBeVisible();
  });

  test('Step 2 — Continue button is visible', async () => {
    await expect(questionnaire.continueBtn).toBeVisible();
  });

  test('Step 2 — Skip for now link is visible', async () => {
    await expect(questionnaire.skipLink).toBeVisible();
  });

  // ── Step 3: Home Airport dropdown ─────────────────────────────────────────

  test('Step 3 — Home Airport dropdown shows suggestions when typing', async ({ page }) => {
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('LAX');
    await expect(
      page.locator('[role="listbox"] >> [role="option"]').first()
    ).toContainText(/LAX|Los Angeles/i);
  });

  test('Step 3 — selecting a Home Airport option populates the field', async ({ page }) => {
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('LAX');
    await page.locator('[role="option"]:has-text("LAX")').first().click();
    await expect(questionnaire.homeAirportInput).toHaveValue(/LAX|Los Angeles/i);
  });

  // ── Step 4: Favorite Airline dropdown ─────────────────────────────────────

  test('Step 4 — Favorite Airline dropdown shows suggestions when typing', async ({ page }) => {
    await questionnaire.favoriteAirlineInput.click();
    await questionnaire.favoriteAirlineInput.fill('Delta');
    await expect(
      page.locator('[role="option"]:has-text("Delta")').first()
    ).toBeVisible();
  });

  test('Step 4 — selecting a Favorite Airline option populates the field', async ({ page }) => {
    await questionnaire.favoriteAirlineInput.click();
    await questionnaire.favoriteAirlineInput.fill('Delta');
    await page.locator('[role="option"]:has-text("Delta")').first().click();
    await expect(questionnaire.favoriteAirlineInput).toHaveValue(/Delta/i);
  });

  // ── Step 5: Continue with both fields filled ───────────────────────────────

  test('Step 5 — Continue with both fields filled leaves /questionnaire', async ({ page }) => {
    await questionnaire.selectHomeAirport('LAX');
    await questionnaire.selectFavoriteAirline('Delta');
    await questionnaire.continueBtn.click();
    await expect(page).not.toHaveURL(/\/questionnaire/);
  });

  // ── Step 6: Continue with only Home Airport filled ────────────────────────

  test('Step 6 — Continue with only Home Airport filled (Favorite Airline optional) succeeds', async ({ page }) => {
    await questionnaire.selectHomeAirport('BKK');
    await questionnaire.continueBtn.click();
    await expect(page).not.toHaveURL(/\/questionnaire/);
  });

  // ── Step 8: Skip for now ───────────────────────────────────────────────────

  test('Step 8 — Skip for now leaves /questionnaire without filling any field', async ({ page }) => {
    await questionnaire.skipLink.click();
    await expect(page).not.toHaveURL(/\/questionnaire/);
  });

  // ── Step 9: Verification banner click ────────────────────────────────────

  test('Step 9 — clicking verification banner navigates to /verify-account', async ({ page }) => {
    await questionnaire.verifyBanner.click();
    await expect(page).toHaveURL(/\/verify-account/);
  });
});

import { test, expect } from '@playwright/test';
import { CreateAccountPage } from '../src/pages/CreateAccount';
import { QuestionnairePage } from '../src/pages/Questionnaire';

// Serial mode: each test needs a fresh account; running in parallel causes
// registration race conditions and depletes unique emails faster than needed.
test.describe.configure({ mode: 'serial' });

test.describe('Travel Profile / Questionnaire (Onboarding) — Positive Cases', () => {
  let createAccount: CreateAccountPage;
  let questionnaire: QuestionnairePage;

  test.beforeEach(async ({ page }) => {
    createAccount = new CreateAccountPage(page);
    questionnaire = new QuestionnairePage(page);

    const ts = Date.now();
    await createAccount.goToRegisterViaJoinFreeHeader();
    await createAccount.fillSignupForm(
      `tester${ts}`,
      `tester${ts}@example.com`,
      'TestPass@123'
    );
    await createAccount.submitForm();

    // Wait up to 20s for navigation away from /register
    try {
      await page.waitForURL(url => !url.pathname.includes('/register'), { timeout: 20000 });
    } catch {
      // If submit didn't navigate, the form may still be processing — wait a moment
      await page.waitForTimeout(2000);
    }

    // Navigate directly to /questionnaire if not already there
    if (!page.url().includes('/questionnaire')) {
      await page.goto('https://staging.talktravel.com/questionnaire');
      await page.waitForLoadState('networkidle');
    }
  });

  // ── Step 2: Page structure ────────────────────────────────────────────────

  test('Step 2 — page heading "Your Travel Profile" is visible', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: /Travel Profile/i })).toBeVisible({ timeout: 10000 });
  });

  test('Step 2 — page subtext is visible', async ({ page }) => {
    await expect(page.locator('text=Help us personalize your experience')).toBeVisible({ timeout: 10000 });
  });

  test('Step 2 — orange verification banner is visible', async ({ page }) => {
    await expect(questionnaire.verifyBanner).toBeVisible({ timeout: 10000 });
  });

  test('Step 2 — Home Airport field is visible', async ({ page }) => {
    await expect(questionnaire.homeAirportInput).toBeVisible({ timeout: 10000 });
  });

  test('Step 2 — Favorite Airline field is visible', async ({ page }) => {
    await expect(questionnaire.favoriteAirlineInput).toBeVisible({ timeout: 10000 });
  });

  test('Step 2 — Continue button is visible', async ({ page }) => {
    await expect(questionnaire.continueBtn).toBeVisible({ timeout: 10000 });
  });

  test('Step 2 — Skip for now link is visible', async ({ page }) => {
    await expect(questionnaire.skipLink).toBeVisible({ timeout: 10000 });
  });

  // ── Step 3: Home Airport dropdown ─────────────────────────────────────────

  test('Step 3 — Home Airport dropdown shows suggestions when typing', async ({ page }) => {
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('LAX');
    await expect(
      page.locator('[role="option"]').first()
    ).toContainText(/LAX|Los Angeles/i, { timeout: 10000 });
  });

  test('Step 3 — selecting a Home Airport option populates the field', async ({ page }) => {
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('LAX');
    await page.locator('[role="option"]').first().click();
    // Value or displayed text should reflect the selection
    const val = await questionnaire.homeAirportInput.inputValue();
    expect(val.length).toBeGreaterThan(0);
  });

  // ── Step 4: Favorite Airline dropdown ─────────────────────────────────────

  test('Step 4 — Favorite Airline dropdown shows suggestions when typing', async ({ page }) => {
    await questionnaire.favoriteAirlineInput.click();
    await questionnaire.favoriteAirlineInput.fill('Delta');
    await expect(
      page.locator('[role="option"]').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Step 4 — selecting a Favorite Airline option populates the field', async ({ page }) => {
    await questionnaire.favoriteAirlineInput.click();
    await questionnaire.favoriteAirlineInput.fill('Delta');
    await page.locator('[role="option"]').first().click();
    const val = await questionnaire.favoriteAirlineInput.inputValue();
    expect(val.length).toBeGreaterThan(0);
  });

  // ── Step 5: Continue with both fields filled ───────────────────────────────

  test('Step 5 — Continue with both fields filled leaves /questionnaire', async ({ page }) => {
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('LAX');
    await page.locator('[role="option"]').first().click();

    await questionnaire.favoriteAirlineInput.click();
    await questionnaire.favoriteAirlineInput.fill('Delta');
    await page.locator('[role="option"]').first().click();

    await questionnaire.continueBtn.click();
    await expect(page).not.toHaveURL(/\/questionnaire/, { timeout: 10000 });
  });

  // ── Step 6: Continue with only Home Airport filled ────────────────────────

  test('Step 6 — Continue with only Home Airport (optional Airline skipped) succeeds', async ({ page }) => {
    await questionnaire.homeAirportInput.click();
    await questionnaire.homeAirportInput.fill('BKK');
    await page.locator('[role="option"]').first().click();

    await questionnaire.continueBtn.click();
    await expect(page).not.toHaveURL(/\/questionnaire/, { timeout: 10000 });
  });

  // ── Step 8: Skip for now ───────────────────────────────────────────────────

  test('Step 8 — Skip for now leaves /questionnaire without filling any field', async ({ page }) => {
    await questionnaire.skipLink.click();
    await expect(page).not.toHaveURL(/\/questionnaire/, { timeout: 10000 });
  });

  // ── Step 9: Verification banner click ────────────────────────────────────

  test('Step 9 — clicking verification banner navigates to /verify-account', async ({ page }) => {
    await questionnaire.verifyBanner.click();
    await expect(page).toHaveURL(/\/verify-account/, { timeout: 10000 });
  });
});

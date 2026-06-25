import { type Page, type Locator } from '@playwright/test';
import { QuestionnairePage } from '../Questionnaire';
import { CreateAccountPage } from '../CreateAccount';

export class QuestionnaireExploratoryPage extends QuestionnairePage {
  readonly heading: Locator;
  readonly subtext: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.locator('h1').filter({ hasText: /Travel Profile/i });
    this.subtext = page.locator('text=Help us personalize your experience');
  }

  /**
   * Registers a fresh account and ensures we land on /questionnaire.
   *
   * Registration on staging is flaky under parallel load (rate-limiting can
   * drop the session, bouncing to /login?callback=/questionnaire), so this
   * retries with a fresh unique account until an authenticated onboarding
   * session is reached.
   */
  async registerAndOpenQuestionnaire(maxAttempts = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const createAccount = new CreateAccountPage(this.page);
      const unique = `${Date.now()}${attempt}`;

      await createAccount.goToRegisterViaJoinFreeHeader();
      await createAccount.fillSignupForm(
        `tester${unique}`,
        `tester${unique}@example.com`,
        'TestPass@123'
      );
      await createAccount.submitForm();

      // Wait for registration to leave /register (mirrors the positive spec).
      // Tolerate timeout so we can still attempt the questionnaire route below.
      await this.page
        .waitForURL(url => !/\/register/.test(url.toString()), { timeout: 15000 })
        .catch(() => {});

      if (!this.page.url().includes('/questionnaire')) {
        // Use domcontentloaded (NOT networkidle — a live site never goes idle)
        // and tolerate ERR_ABORTED from an immediate client-side redirect.
        await this.page
          .goto('https://staging.talktravel.com/questionnaire', { waitUntil: 'domcontentloaded' })
          .catch(() => {});
      }

      // Success: authenticated and on the onboarding form.
      if (this.page.url().includes('/questionnaire')) return;
      // Otherwise (bounced to /login), loop and register a brand-new account.
    }
  }
}

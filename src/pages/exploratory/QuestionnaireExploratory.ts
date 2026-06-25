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
   * Mirrors the beforeEach of the positive Questionnaire spec so the
   * exploratory cases start from the same authenticated onboarding state.
   */
  async registerAndOpenQuestionnaire(): Promise<void> {
    const createAccount = new CreateAccountPage(this.page);
    const ts = Date.now();

    await createAccount.goToRegisterViaJoinFreeHeader();
    await createAccount.fillSignupForm(
      `tester${ts}`,
      `tester${ts}@example.com`,
      'TestPass@123'
    );
    await createAccount.submitForm();

    // Wait for registration to leave /register (mirrors the positive spec).
    // Tolerate timeout so we can still attempt the questionnaire route below.
    await this.page
      .waitForURL(url => !/\/register/.test(url.toString()), { timeout: 20000 })
      .catch(() => {});

    if (!this.page.url().includes('/questionnaire')) {
      // Use domcontentloaded (NOT networkidle — a live site never goes idle)
      // and tolerate ERR_ABORTED from an immediate client-side redirect.
      await this.page
        .goto('https://staging.talktravel.com/questionnaire', { waitUntil: 'domcontentloaded' })
        .catch(() => {});
    }
  }
}

import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class QuestionnairePage extends BasePage {
  readonly verifyBanner: Locator;
  readonly pageHeading: Locator;
  readonly pageSubtext: Locator;
  readonly homeAirportInput: Locator;
  readonly favoriteAirlineInput: Locator;
  readonly continueBtn: Locator;
  readonly skipLink: Locator;

  constructor(page: Page) {
    super(page);

    this.verifyBanner = page
      .locator('[data-testid="verify-banner"]')
      .or(page.locator('text=Please verify your account'));
    this.pageHeading = page.locator('main h1').or(page.locator('text=Your Travel Profile'));
    this.pageSubtext = page.locator('text=Help us personalize your experience');
    this.homeAirportInput = page
      .locator('[data-testid="home-airport"]')
      .or(page.locator('input[placeholder*="airport" i]'))
      .or(page.locator('input[placeholder*="LAX" i]'))
      .or(page.locator('input[placeholder*="Search for an airport" i]'));
    this.favoriteAirlineInput = page
      .locator('[data-testid="favorite-airline"]')
      .or(page.locator('input[placeholder*="airline" i]'))
      .or(page.locator('input[placeholder*="Thai Airways" i]'))
      .or(page.locator('input[placeholder*="Emirates" i]'))
      .or(page.locator('input[placeholder*="Delta" i]'));
    this.continueBtn = page.locator('button:has-text("Continue")');
    this.skipLink = page.locator('text=Skip for now');
  }

  async selectHomeAirport(query: string): Promise<void> {
    await this.homeAirportInput.click();
    await this.homeAirportInput.fill(query);
    await this.page.locator(`[role="option"]:has-text("${query}")`).first().click();
  }

  async selectFavoriteAirline(query: string): Promise<void> {
    await this.favoriteAirlineInput.click();
    await this.favoriteAirlineInput.fill(query);
    await this.page.locator(`[role="option"]:has-text("${query}")`).first().click();
  }
}

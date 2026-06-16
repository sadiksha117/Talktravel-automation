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
    this.homeAirportInput = page.locator('input[placeholder*="Search for an airport"]').or(
      page.locator('[data-testid="home-airport"]')
    );
    this.favoriteAirlineInput = page.locator('input[placeholder*="Thai Airways"]').or(
      page.locator('[data-testid="favorite-airline"]')
    );
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

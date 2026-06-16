import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class QuestionnairePage extends BasePage {
  readonly verifyBanner: Locator;
  readonly continueBtn: Locator;
  readonly skipLink: Locator;

  // Resolved at runtime via getHomeAirportInput / getFavoriteAirlineInput
  // because the actual element type (input vs combobox) may vary.
  readonly homeAirportInput: Locator;
  readonly favoriteAirlineInput: Locator;

  constructor(page: Page) {
    super(page);

    this.verifyBanner = page
      .locator('[data-testid="verify-banner"]')
      .or(page.locator('text=Please verify your account'));

    this.continueBtn = page.locator('button:has-text("Continue")');
    this.skipLink = page.locator('text=Skip for now');

    // Try label association first, then combobox role by order, then broad input fallbacks
    this.homeAirportInput = page
      .getByLabel(/home airport/i)
      .or(page.getByRole('combobox').first())
      .or(page.locator('[data-testid="home-airport"]'))
      .or(page.locator('input[placeholder*="airport" i]'))
      .or(page.locator('input[placeholder*="LAX" i]'));

    this.favoriteAirlineInput = page
      .getByLabel(/favorite airline/i)
      .or(page.getByRole('combobox').nth(1))
      .or(page.locator('[data-testid="favorite-airline"]'))
      .or(page.locator('input[placeholder*="airline" i]'))
      .or(page.locator('input[placeholder*="Thai Airways" i]'))
      .or(page.locator('input[placeholder*="Emirates" i]'));
  }
}

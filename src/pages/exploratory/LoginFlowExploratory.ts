import { type Page, type Locator } from '@playwright/test';
import { LoginFlowPage } from '../loginflow';

export class LoginFlowExploratoryPage extends LoginFlowPage {
  // Landing hero - exploratory
  readonly heroSubtext: Locator;
  readonly joinCommunityBtn: Locator;
  readonly readTheBlogBtn: Locator;

  // Login page - exploratory
  readonly loginLogo: Locator;
  readonly loginHeaderBlog: Locator;
  readonly passwordToggle: Locator;
  readonly forgotPasswordLink: Locator;
  readonly createAccountLink: Locator;
  readonly continueWithGoogleBtn: Locator;
  readonly continueWithAppleBtn: Locator;

  constructor(page: Page) {
    super(page);

    // Landing hero - exploratory
    this.heroSubtext = page.getByText(/Real tips from real travelers/);
    this.joinCommunityBtn = page.getByRole('link', { name: 'Join the Community' });
    this.readTheBlogBtn = page.getByRole('link', { name: 'Read the Blog' });

    // Login page - exploratory
    this.loginLogo = page.getByRole('link', { name: 'TalkTravel talk travel' });
    this.loginHeaderBlog = page.getByRole('link', { name: 'Blog', exact: true });
    this.passwordToggle = page
      .locator('div:has(> input[type="password"]) > img')
      .or(page.locator('div:has(> input[type="password"]) > button'))
      .or(page.locator('div:has(> input[type="password"]) > span'))
      .or(page.locator('[aria-label*="show" i], [aria-label*="password" i], [data-testid*="toggle"]'))
      .first();
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot/i });
    this.createAccountLink = page
      .getByRole('link', { name: /create account|register|sign up|join/i })
      .first();
    this.continueWithGoogleBtn = page.getByRole('button', { name: /continue with google/i });
    this.continueWithAppleBtn = page.getByRole('button', { name: /continue with apple/i });
  }
}

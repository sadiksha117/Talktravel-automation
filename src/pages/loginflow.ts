import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginFlowPage extends BasePage {
  // Header
  readonly logo: Locator;
  readonly headerCommunity: Locator;
  readonly headerBlog: Locator;
  readonly headerFaq: Locator;
  readonly headerLogIn: Locator;
  readonly headerJoinFree: Locator;

  // Landing hero
  readonly heroHeading: Locator;

  // Login page form — core
  readonly loginHeading: Locator;
  readonly emailField: Locator;
  readonly passwordField: Locator;
  readonly submitBtn: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.logo = page.getByRole('link', { name: 'TalkTravel talk travel' });
    this.headerCommunity = page.getByRole('link', { name: 'Community', exact: true });
    this.headerBlog = page.getByRole('link', { name: 'Blog', exact: true });
    this.headerFaq = page.getByRole('navigation').getByRole('link', { name: 'FAQ' });
    this.headerLogIn = page.getByRole('link', { name: 'Log in', exact: true });
    this.headerJoinFree = page.getByRole('link', { name: 'Join Free', exact: true });

    // Landing hero
    this.heroHeading = page.getByRole('heading', { name: 'A travel community for people' });

    // Login page form — core
    this.loginHeading = page.getByRole('heading', { name: /log in|sign in|welcome back/i });
    this.emailField = page
      .getByRole('textbox', { name: /email/i })
      .or(page.locator('input[type="email"]'))
      .or(page.locator('input[name="email"]'))
      .first();
    this.passwordField = page
      .getByRole('textbox', { name: /password/i })
      .or(page.locator('input[type="password"]'))
      .or(page.locator('input[name="password"]'))
      .first();
    this.submitBtn = page
      .locator('button[type="submit"]')
      .or(page.getByRole('button', { name: /log in|sign in/i }))
      .first();
  }

  async goToLanding(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  async goToLogin(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForPageLoad();
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailField.fill(email);
    await this.passwordField.fill(password);
    await this.submitBtn.click();
    await this.waitForPageLoad();
  }
}

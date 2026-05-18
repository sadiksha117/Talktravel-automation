import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class Flow2Page extends BasePage {
  // Header (landing)
  readonly logo: Locator;
  readonly headerCommunity: Locator;
  readonly headerBlog: Locator;
  readonly headerFaq: Locator;
  readonly headerLogIn: Locator;
  readonly headerJoinFree: Locator;

  // Landing hero
  readonly heroHeading: Locator;
  readonly heroSubtext: Locator;
  readonly joinCommunityBtn: Locator;
  readonly readTheBlogBtn: Locator;

  // Register page header (minimal)
  readonly registerLogo: Locator;
  readonly registerHeaderBlog: Locator;

  // Register page form
  readonly registerHeading: Locator;
  readonly registerSubtext: Locator;
  readonly avatarImage: Locator;
  readonly generateAvatarLink: Locator;
  readonly usernameField: Locator;
  readonly emailPhoneField: Locator;
  readonly passwordField: Locator;
  readonly confirmPasswordField: Locator;
  readonly passwordToggle: Locator;
  readonly alreadyHaveAccountLink: Locator;
  readonly continueWithGoogleBtn: Locator;
  readonly continueWithAppleBtn: Locator;
  readonly submitBtn: Locator;

  constructor(page: Page) {
    super(page);

    // Header (landing)
    this.logo = page.getByRole('link', { name: 'TalkTravel talk travel' });
    this.headerCommunity = page.getByRole('link', { name: 'Community', exact: true });
    this.headerBlog = page.getByRole('link', { name: 'Blog', exact: true });
    this.headerFaq = page.getByRole('navigation').getByRole('link', { name: 'FAQ' });
    this.headerLogIn = page.getByRole('link', { name: 'Log in', exact: true });
    this.headerJoinFree = page.getByRole('link', { name: 'Join Free', exact: true });

    // Landing hero
    this.heroHeading = page.getByRole('heading', { name: 'A travel community for people' });
    this.heroSubtext = page.getByText('Real tips from real travelers');
    this.joinCommunityBtn = page.getByRole('link', { name: 'Join the Community' });
    this.readTheBlogBtn = page.getByRole('link', { name: 'Read the Blog' });

    // Register page header (minimal)
    this.registerLogo = page.getByRole('link', { name: 'TalkTravel talk travel' });
    this.registerHeaderBlog = page.getByRole('link', { name: 'Blog', exact: true });

    // Register page form
    this.registerHeading = page.getByRole('heading', { name: 'Join the Community' });
    this.registerSubtext = page.getByText('By continuing, you agree to our');
    this.avatarImage = page.locator('img[alt*="avatar"], img[alt*="Avatar"], [data-testid*="avatar"] img').first();
    this.generateAvatarLink = page.getByRole('link', { name: 'Generate' }).or(page.getByText('Generate'));
    this.usernameField = page.getByLabel(/username/i).or(
      page.locator('input[name="username"]')
    ).or(
      page.locator('input[placeholder*="username" i]')
    ).first();
    this.emailPhoneField = page.getByRole('textbox', { name: /email or phone/i });
    this.passwordField = page.getByRole('textbox', { name: /^password$/i }).or(
      page.locator('input[type="password"]').first()
    );
    this.confirmPasswordField = page.getByRole('textbox', { name: /confirm password/i }).or(
      page.locator('input[type="password"]').nth(1)
    );
    this.passwordToggle = page.locator('input[type="password"]').first().locator('..').locator('img').first();
    this.alreadyHaveAccountLink = page.getByRole('link', { name: /login/i });
    this.continueWithGoogleBtn = page.getByRole('button', { name: /continue with google/i });
    this.continueWithAppleBtn = page.getByRole('button', { name: /continue with apple/i });
    this.submitBtn = page.locator('button[type="submit"]:not(.oauth-button)').or(
      page.locator('form button[type="submit"]')
    ).first();
  }

  async goToLanding(): Promise<void> {
    await this.page.goto('https://talktravel.com/');
    await this.waitForPageLoad();
  }

  async goToRegisterViaJoinFreeHeader(): Promise<void> {
    await Promise.all([
      this.page.waitForURL('**/register'),
      this.headerJoinFree.click(),
    ]);
    await this.waitForPageLoad();
  }

  async goToRegisterViaJoinCommunityCta(): Promise<void> {
    await Promise.all([
      this.page.waitForURL('**/register'),
      this.joinCommunityBtn.click(),
    ]);
    await this.waitForPageLoad();
  }

  async fillSignupForm(username: string, emailOrPhone: string, password: string): Promise<void> {
    await this.usernameField.fill(username);
    await this.emailPhoneField.fill(emailOrPhone);
    await this.passwordField.fill(password);
    await this.confirmPasswordField.fill(password);
  }

  async submitForm(): Promise<void> {
    await this.submitBtn.click();
    await this.waitForPageLoad();
  }
}

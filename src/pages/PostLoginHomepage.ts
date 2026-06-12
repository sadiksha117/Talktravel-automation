import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class PostLoginHomepagePage extends BasePage {
  // Header
  readonly logo: Locator;
  readonly headerCommunity: Locator;
  readonly headerBlog: Locator;
  readonly headerFaq: Locator;
  readonly headerNewPostBtn: Locator;
  readonly headerNotifications: Locator;
  readonly headerUserAvatar: Locator;

  // Feed tabs
  readonly feedTabTrending: Locator;
  readonly feedTabLatest: Locator;
  readonly feedTabForYou: Locator;

  // View switch
  readonly viewSwitchMenuBtn: Locator;
  readonly cardViewToggle: Locator;
  readonly compactViewToggle: Locator;

  // Feed
  readonly feedPostCards: Locator;

  // Post actions (authenticated)
  readonly upvoteButtons: Locator;
  readonly downvoteButtons: Locator;
  readonly newPostBtn: Locator;

  // Sidebar
  readonly popularThisWeek: Locator;
  readonly popularThisWeekLinks: Locator;

  // Footer
  readonly footer: Locator;

  // Single post view
  readonly postTitle: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.logo = page.getByRole('link', { name: 'TalkTravel talk travel' });
    this.headerCommunity = page.getByRole('link', { name: 'Community', exact: true });
    this.headerBlog = page.getByRole('link', { name: 'Blog', exact: true });
    this.headerFaq = page.getByRole('navigation').getByRole('link', { name: 'FAQ' });
    this.headerNewPostBtn = page.getByRole('link', { name: /new post/i }).or(
      page.getByRole('button', { name: /new post/i })
    ).first();
    this.headerNotifications = page.getByRole('button', { name: /notification/i }).or(
      page.locator('[data-testid="notifications"]')
    ).first();
    this.headerUserAvatar = page.locator('[data-testid="user-avatar"]').or(
      page.locator('header img[alt*="avatar"], header img[alt*="profile"]')
    ).first();

    // Feed tabs
    this.feedTabTrending = page.getByRole('link', { name: 'Trending', exact: true });
    this.feedTabLatest = page.getByRole('link', { name: 'Latest', exact: true });
    this.feedTabForYou = page.getByRole('link', { name: 'For You', exact: true });

    // View switch
    this.viewSwitchMenuBtn = page.getByRole('button', { name: 'TalkTravel' });
    this.cardViewToggle = page.getByText('Card', { exact: true });
    this.compactViewToggle = page.getByText('Compact', { exact: true });

    // Feed cards
    this.feedPostCards = page.locator('a[href^="/post/"]:has(div)');

    // Post actions
    this.upvoteButtons = page.locator('[data-testid="upvote"], button[aria-label="Upvote"]');
    this.downvoteButtons = page.locator('[data-testid="downvote"], button[aria-label="Downvote"]');
    this.newPostBtn = page.getByRole('link', { name: /new post/i }).or(
      page.getByRole('button', { name: /new post/i })
    ).first();

    // Sidebar
    this.popularThisWeek = page.getByText('Popular This Week');
    this.popularThisWeekLinks = page.locator('a[href^="/post/"]:not(:has(div))');

    // Footer
    this.footer = page.locator('footer');

    // Single post view
    this.postTitle = page.getByRole('heading', { level: 1 });
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.goto('/login');
    await this.waitForPageLoad();
    const loginField = this.page
      .getByRole('textbox', { name: /email|username|phone/i })
      .or(this.page.locator('input[type="email"]'))
      .first();
    const passwordField = this.page
      .locator('input[type="password"]')
      .or(this.page.getByRole('textbox', { name: /password/i }))
      .first();
    const submitBtn = this.page
      .locator('button[type="submit"]')
      .or(this.page.getByRole('button', { name: /log in|sign in/i }))
      .first();
    await loginField.fill(email);
    await passwordField.fill(password);
    await submitBtn.click();
    await this.page.waitForURL(/\/(trending|community|dashboard|feed|home)/);
    await this.waitForPageLoad();
  }

  async goToHomepage(): Promise<void> {
    await this.page.goto('/trending');
    await this.waitForPageLoad();
  }

  async dismissCookieBanner(): Promise<void> {
    try {
      await this.page.getByRole('button', { name: 'Accept All' }).click({ timeout: 3000 });
    } catch {
      // Banner not present
    }
  }

  async switchToLatestTab(): Promise<void> {
    await this.feedTabLatest.click();
    await this.waitForPageLoad();
  }

  async switchToTrendingTab(): Promise<void> {
    await this.feedTabTrending.click();
    await this.waitForPageLoad();
  }

  async switchToForYouTab(): Promise<void> {
    await this.feedTabForYou.click();
    await this.waitForPageLoad();
  }

  async switchToCompactView(): Promise<void> {
    await this.viewSwitchMenuBtn.click();
    await this.compactViewToggle.waitFor({ state: 'visible' });
    await this.compactViewToggle.click();
    await this.waitForPageLoad();
  }

  async switchToCardView(): Promise<void> {
    await this.viewSwitchMenuBtn.click();
    await this.cardViewToggle.waitFor({ state: 'visible' });
    await this.cardViewToggle.click();
    await this.waitForPageLoad();
  }

  async clickFirstPostCard(): Promise<void> {
    const firstCard = this.feedPostCards.first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click();
    await this.page.waitForURL('**/post/**');
    await this.waitForPageLoad();
  }

  async clickFirstPopularThisWeekPost(): Promise<void> {
    const firstLink = this.popularThisWeekLinks.first();
    await firstLink.waitFor({ state: 'visible' });
    await firstLink.click();
    await this.page.waitForURL('**/post/**');
    await this.waitForPageLoad();
  }

  async clickLogo(): Promise<void> {
    await this.logo.click();
    await this.page.waitForURL(/\/(trending)?$/);
    await this.waitForPageLoad();
  }
}

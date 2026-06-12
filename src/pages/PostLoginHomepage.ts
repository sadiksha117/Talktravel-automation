import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class PostLoginHomepagePage extends BasePage {
  // Header
  readonly logo: Locator;
  readonly headerCommunity: Locator;
  readonly headerBlog: Locator;
  readonly headerFaq: Locator;

  // Feed tabs
  readonly feedTabTrending: Locator;
  readonly feedTabLatest: Locator;
  readonly feedTabForYou: Locator;

  // View switch — ≡ icon button opens a dropdown with Card / Compact menu items
  readonly viewSwitchMenuBtn: Locator;
  readonly cardViewToggle: Locator;
  readonly compactViewToggle: Locator;

  // Feed
  readonly feedPostCards: Locator;

  // Vote buttons
  readonly firstUpvoteBtn: Locator;
  readonly firstDownvoteBtn: Locator;

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

    // Feed tabs
    this.feedTabTrending = page.getByRole('link', { name: 'Trending', exact: true });
    this.feedTabLatest = page.getByRole('link', { name: 'Latest', exact: true });
    this.feedTabForYou = page.locator('a[href="/for-you"]');

    // View switch — same pattern as pre-login
    this.viewSwitchMenuBtn = page.getByRole('button', { name: 'TalkTravel' });
    this.cardViewToggle = page.getByText('Card', { exact: true });
    this.compactViewToggle = page.getByText('Compact', { exact: true });

    // Feed cards
    this.feedPostCards = page.locator('a[href^="/post/"]:has(div)');

    // Vote buttons
    this.firstUpvoteBtn = page.getByRole('button', { name: 'Upvote' }).first();
    this.firstDownvoteBtn = page.getByRole('button', { name: 'Downvote' }).first();

    // Sidebar
    this.popularThisWeek = page.getByRole('heading', { name: 'Popular This Week', level: 4 });
    this.popularThisWeekLinks = page.locator('a[href^="/post/"]:not(:has(div))');

    // Footer
    this.footer = page.locator('footer');

    // Single post view
    this.postTitle = page.getByRole('heading', { level: 1 });
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.goto('https://staging.talktravel.com/login');
    await this.waitForPageLoad();
    const loginField = this.page
      .getByRole('textbox', { name: /email|username|phone/i })
      .or(this.page.locator('input[type="email"]'))
      .first();
    const passwordField = this.page.locator('input[type="password"]').first();
    const submitBtn = this.page
      .locator('button[type="submit"]')
      .or(this.page.getByRole('button', { name: /log in|sign in/i }))
      .first();
    await loginField.fill(email);
    await passwordField.fill(password);
    await submitBtn.click();
    await this.page.waitForURL(/staging\.talktravel\.com\/.+/);
    await this.waitForPageLoad();
  }

  async goToHomepage(): Promise<void> {
    await this.page.goto('https://staging.talktravel.com/trending');
    await this.waitForPageLoad();
    await this.dismissCookieBanner();
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

  async clickFirstTopicChip(): Promise<void> {
    const topicChip = this.page.locator('a[href^="/tags/"]').first();
    await topicChip.waitFor({ state: 'visible' });
    await topicChip.click();
    await this.page.waitForURL('**/tags/**');
    await this.waitForPageLoad();
  }

  async clickFirstAuthorLink(): Promise<void> {
    const authorLink = this.page.locator('a[href^="/profile/"]').first();
    await authorLink.waitFor({ state: 'visible' });
    await authorLink.click();
    await this.page.waitForURL(/\/profile\/.+/);
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

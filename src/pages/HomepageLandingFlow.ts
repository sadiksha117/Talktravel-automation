import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomepageLandingFlowPage extends BasePage {
  // Header
  readonly logo: Locator;
  readonly headerCommunity: Locator;
  readonly headerBlog: Locator;
  readonly headerFaq: Locator;
  readonly headerLogIn: Locator;
  readonly headerJoinFree: Locator;

  // Feed tabs
  readonly feedTabTrending: Locator;
  readonly feedTabLatest: Locator;

  // View toggles
  readonly cardViewToggle: Locator;
  readonly compactViewToggle: Locator;

  // Feed
  readonly feedPostCards: Locator;

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
    this.headerLogIn = page.getByRole('link', { name: 'Log in', exact: true });
    this.headerJoinFree = page.getByRole('link', { name: 'Join Free', exact: true });

    // Feed tabs
    this.feedTabTrending = page.getByRole('link', { name: 'Trending', exact: true });
    this.feedTabLatest = page.getByRole('link', { name: 'Latest', exact: true });

    // View toggles
    this.cardViewToggle = page.getByRole('button', { name: /card view/i });
    this.compactViewToggle = page.getByRole('button', { name: /compact view/i });

    // Feed cards — anchor elements wrapping post content (has(div) excludes sidebar links)
    this.feedPostCards = page.locator('a[href^="/post/"]:has(div)');

    // Sidebar
    this.popularThisWeek = page.getByText('Popular This Week');
    this.popularThisWeekLinks = page.locator('aside').getByRole('link');

    // Footer
    this.footer = page.locator('footer');

    // Single post view
    this.postTitle = page.getByRole('heading', { level: 1 });
  }

  async goToHomepage(): Promise<void> {
    await this.page.goto('https://staging.talktravel.com/trending');
    await this.waitForPageLoad();
    await this.dismissCookieBanner();
  }

  async dismissCookieBanner(): Promise<void> {
    const acceptBtn = this.page.getByRole('button', { name: 'Accept All' });
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();
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

  async switchToCompactView(): Promise<void> {
    await this.compactViewToggle.click();
    await this.waitForPageLoad();
  }

  async switchToCardView(): Promise<void> {
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
    const topicChip = this.page.locator('a[href^="/topic/"]').first();
    await topicChip.waitFor({ state: 'visible' });
    await topicChip.click();
    await this.page.waitForURL('**/topic/**');
    await this.waitForPageLoad();
  }

  async clickFirstAuthorLink(): Promise<void> {
    const authorLink = this.page.locator('a[href^="/user/"]').first();
    await authorLink.waitFor({ state: 'visible' });
    await authorLink.click();
    await this.page.waitForURL('**/user/**');
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
    await this.page.waitForURL('**/trending**');
    await this.waitForPageLoad();
  }
}

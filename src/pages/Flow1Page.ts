import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class Flow1Page extends BasePage {
  // Header
  readonly logo: Locator;
  readonly headerCommunity: Locator;
  readonly headerBlog: Locator;
  readonly headerFaq: Locator;
  readonly headerJoinCommunity: Locator;

  // Landing hero
  readonly heroHeading: Locator;
  readonly joinCommunityBtn: Locator;
  readonly readTheBlogBtn: Locator;

  // Blog index
  readonly blogHeroHeading: Locator;
  readonly blogHeroText: Locator;
  readonly latestArticlesHeading: Locator;
  readonly latestArticlesSection: Locator;

  // Single article
  readonly articleTitle: Locator;

  constructor(page: Page) {
    super(page);

    // Header — exact selectors from codegen
    this.logo = page.getByRole('link', { name: 'TalkTravel talk travel' });
    this.headerCommunity = page.getByRole('link', { name: 'Community', exact: true });
    this.headerBlog = page.getByRole('link', { name: 'Blog', exact: true });
    this.headerFaq = page.getByRole('navigation').getByRole('link', { name: 'FAQ' });
    this.headerJoinCommunity = page.getByRole('link', { name: 'Join the Community' });

    // Landing hero — exact selectors from codegen
    this.heroHeading = page.getByRole('heading', { name: 'A travel community for people' });
    this.joinCommunityBtn = page.getByRole('link', { name: 'Join the Community' });
    this.readTheBlogBtn = page.getByRole('link', { name: 'Read the Blog' });

    // Blog index — exact selectors from codegen
    this.blogHeroHeading = page.getByRole('heading', { name: 'Stories, tips & ideas from' });
    this.blogHeroText = page.getByText("from the travel community.");
    this.latestArticlesHeading = page.getByRole('heading', { name: 'Latest Articles' });
    this.latestArticlesSection = page.locator('section').filter({ hasText: 'Read theLatest ArticlesView' });

    // Single article
    this.articleTitle = page.getByRole('heading', { level: 1 });
  }

  async goToLanding(): Promise<void> {
    await this.page.goto('https://talktravel.com/');
    await this.waitForPageLoad();
  }

  async goToBlogViaHeader(): Promise<void> {
    await this.headerBlog.click();
    await this.waitForPageLoad();
  }

  async goToBlogViaCta(): Promise<void> {
    await this.readTheBlogBtn.click();
    await this.waitForPageLoad();
  }

  async openFirstArticle(): Promise<void> {
    const firstCard = this.latestArticlesSection.getByRole('link').first();
    await firstCard.click();
    await this.waitForPageLoad();
  }
}

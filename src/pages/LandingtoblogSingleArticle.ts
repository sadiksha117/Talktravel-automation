import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class Flow1Page extends BasePage {
  // Header
  readonly logo: Locator;
  readonly headerCommunity: Locator;
  readonly headerBlog: Locator;
  readonly headerFaq: Locator;

  // Landing hero
  readonly heroHeading: Locator;
  readonly joinCommunityBtn: Locator;
  readonly readTheBlogBtn: Locator;

  // Blog index
  readonly blogHeroHeading: Locator;
  readonly blogHeroText: Locator;
  readonly latestArticlesHeading: Locator;
  readonly latestArticlesSection: Locator;
  readonly blogSearchBar: Locator;
  readonly viewAllBlogsBtn: Locator;

  // Single article
  readonly articleTitle: Locator;
  readonly articleBreadcrumb: Locator;
  readonly articleAuthorBlock: Locator;
  readonly articleShareRow: Locator;
  readonly articleBody: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.logo = page.getByRole('link', { name: 'TalkTravel talk travel' });
    this.headerCommunity = page.getByRole('link', { name: 'Community', exact: true });
    this.headerBlog = page.getByRole('link', { name: 'Blog', exact: true });
    this.headerFaq = page.getByRole('navigation').getByRole('link', { name: 'FAQ' });

    // Landing hero
    this.heroHeading = page.getByRole('heading', { name: 'A travel community for people' });
    this.joinCommunityBtn = page.getByRole('link', { name: 'Join the Community' });
    this.readTheBlogBtn = page.getByRole('link', { name: 'Read the Blog' });

    // Blog index — scope to div containing the h2 AND article elements
    this.blogHeroHeading = page.getByRole('heading', { name: 'Stories, tips & ideas from' });
    this.blogHeroText = page.getByText('from the travel community.');
    this.latestArticlesHeading = page.getByRole('heading', { name: 'Latest Articles', level: 2 });
    this.latestArticlesSection = page.locator('div').filter({
      has: page.getByRole('heading', { name: 'Latest Articles', level: 2 }),
    }).filter({
      has: page.locator('article'),
    }).first();
    this.blogSearchBar = page.getByPlaceholder('Search articles...');
    this.viewAllBlogsBtn = page.getByRole('link', { name: 'View All Blogs' }).first();

    // Single article
    this.articleTitle = page.getByRole('heading', { level: 1 });
    this.articleBreadcrumb = page.locator('[class*="breadcrumb"]').first();
    this.articleAuthorBlock = page.getByText(/Written by/);
    this.articleShareRow = page.locator('[class*="share"]').first();
    this.articleBody = page.locator('article').first();
  }

  async goToLanding(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  async dismissCookieBanner(): Promise<void> {
    const acceptBtn = this.page.getByRole('button', { name: 'Accept All' });
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();
    }
  }

  async goToBlogViaHeader(): Promise<void> {
    // Header Blog link opens a dropdown menu on click — navigate directly instead
    await this.page.goto('/blog');
    await this.waitForPageLoad();
    await this.dismissCookieBanner();
  }

  async goToBlogViaCta(): Promise<void> {
    await this.readTheBlogBtn.click();
    await this.page.waitForURL('**/blog');
    await this.waitForPageLoad();
    await this.dismissCookieBanner();
  }

  async openFirstArticle(): Promise<void> {
    // Click the heading link — the first link (bl-article__link) is a hidden overlay
    // blocked by the image div intercepting pointer events
    await this.latestArticlesSection
      .locator('article').first()
      .getByRole('heading', { level: 3 })
      .getByRole('link')
      .click();
    await this.waitForPageLoad();
  }
}

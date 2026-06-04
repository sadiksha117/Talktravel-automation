import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class BlogIndexPaginationSearchPage extends BasePage {
  // Header
  readonly logo: Locator;
  readonly headerCommunity: Locator;
  readonly headerBlog: Locator;
  readonly headerFaq: Locator;
  readonly headerLogIn: Locator;
  readonly headerJoinFree: Locator;

  // Blog Home (/blog)
  readonly blogHeroHeading: Locator;
  readonly blogHeroText: Locator;
  readonly searchInput: Locator;
  readonly searchSubmitBtn: Locator;
  readonly viewAllBlogsBtn: Locator;
  readonly articleCards: Locator;

  // Blog Articles (/blog/articles)
  readonly pagination: Locator;

  // Single article
  readonly articleTitle: Locator;
  readonly writtenBy: Locator;

  // Footer
  readonly footerBlogHome: Locator;
  readonly footerCoolcation: Locator;
  readonly footerSlowTravel: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.logo = page.getByRole('link', { name: 'TalkTravel talk travel' });
    this.headerCommunity = page.getByRole('link', { name: 'Community', exact: true });
    this.headerBlog = page.getByRole('link', { name: 'Blog', exact: true });
    this.headerFaq = page.getByRole('navigation').getByRole('link', { name: 'FAQ' });
    this.headerLogIn = page.getByRole('link', { name: 'Log in', exact: true });
    this.headerJoinFree = page.getByRole('link', { name: 'Join Free', exact: true });

    // Blog Home
    this.blogHeroHeading = page.getByRole('heading', { name: /Stories, tips & ideas/i });
    this.blogHeroText = page.getByText(/from the travel community/i);
    this.searchInput = page.locator('input[placeholder="Search articles..."]');
    this.searchSubmitBtn = page.locator('button[aria-label="Search"]');
    this.viewAllBlogsBtn = page.getByText('View All Blogs');
    this.articleCards = page.locator('article');

    // Pagination
    this.pagination = page.locator('nav[aria-label="Pagination"]');

    // Single article
    this.articleTitle = page.locator('article h1');
    this.writtenBy = page.getByText(/Written by/i);

    // Footer
    this.footerBlogHome = page.locator('footer').getByText('Blog Home');
    this.footerCoolcation = page.locator('footer').getByText('Coolcation');
    this.footerSlowTravel = page.locator('footer').getByText('Slow Travel');
  }

  async goToBlogHome(): Promise<void> {
    await this.page.goto('/blog');
    await this.waitForPageLoad();
    await this.dismissCookieBanner();
  }

  async goToBlogArticles(): Promise<void> {
    await this.page.goto('/blog/articles');
    await this.waitForPageLoad();
    await this.dismissCookieBanner();
  }

  async dismissCookieBanner(): Promise<void> {
    const acceptBtn = this.page.getByRole('button', { name: 'Accept All' });
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();
    }
  }

  async clickViewAllBlogs(): Promise<void> {
    await this.viewAllBlogsBtn.click();
    await this.waitForPageLoad();
  }

  async clickPaginationPage(pageNum: number): Promise<void> {
    await this.pagination.locator(`button:has-text("${pageNum}")`).click();
    await this.waitForPageLoad();
  }

  async clickNextPage(): Promise<void> {
    await this.page.locator('button[aria-label="Next page"]').click();
    await this.waitForPageLoad();
  }

  async clickPreviousPage(): Promise<void> {
    await this.page.locator('button[aria-label="Previous page"]').click();
    await this.waitForPageLoad();
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.waitForPageLoad();
  }

  async clickFirstArticle(): Promise<string> {
    const firstArticle = this.articleCards.first();
    const title = await firstArticle.locator('h2, h3').first().textContent() ?? '';
    await firstArticle.click();
    await this.waitForPageLoad();
    return title.trim();
  }
}

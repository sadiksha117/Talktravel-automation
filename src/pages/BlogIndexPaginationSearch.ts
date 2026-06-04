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
  // Two "View All Blogs" links exist on /blog — target the first (Latest Articles section)
  readonly viewAllBlogsBtn: Locator;
  readonly articleCards: Locator;

  // Blog Articles (/blog/articles) — pagination
  readonly pagination: Locator;
  readonly nextPageBtn: Locator;
  readonly prevPageBtn: Locator;

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

    // Blog Home — use the first "View All Blogs" link (Latest Articles section)
    this.blogHeroHeading = page.getByRole('heading', { name: /Stories, tips & ideas/i });
    this.blogHeroText = page.getByText(/from the travel community/i);
    this.searchInput = page.locator('input[placeholder="Search articles..."]');
    this.searchSubmitBtn = page.locator('button[aria-label="Search"]');
    this.viewAllBlogsBtn = page.locator('a.bl-section__action').first();
    this.articleCards = page.locator('article');

    // Pagination — use class-based selector since no aria-label is present
    this.pagination = page.locator('[class*="pagination"]').first();
    // Next/Prev: last and first links in the pagination bar (arrow controls are icon-only links)
    this.nextPageBtn = page.locator('[class*="pagination"] a, [class*="pagination"] button').last();
    this.prevPageBtn = page.locator('[class*="pagination"] a, [class*="pagination"] button').first();

    // Single article — h1 may not be inside <article> wrapper
    this.articleTitle = page.locator('h1').first();
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
    await this.pagination.locator(`a:has-text("${pageNum}"), button:has-text("${pageNum}")`).first().click();
    await this.waitForPageLoad();
  }

  async clickNextPage(): Promise<void> {
    await this.nextPageBtn.click();
    await this.waitForPageLoad();
  }

  async clickPreviousPage(): Promise<void> {
    await this.prevPageBtn.click();
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

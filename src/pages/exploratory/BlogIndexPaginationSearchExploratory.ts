import { type Page, type Locator } from '@playwright/test';
import { BlogIndexPaginationSearchPage } from '../BlogIndexPaginationSearch';

export class BlogIndexPaginationSearchExploratoryPage extends BlogIndexPaginationSearchPage {
  // Blog Home — additional exploratory locators
  readonly viewAllBlogsFeaturedBtn: Locator;
  readonly footerElement: Locator;
  readonly footerAllArticles: Locator;
  readonly newsletterEmailInput: Locator;
  readonly newsletterSubscribeBtn: Locator;

  // Blog Articles listing
  readonly firstArticleImage: Locator;
  readonly firstArticleAuthor: Locator;
  readonly firstArticleDate: Locator;

  // Search
  readonly searchEmptyState: Locator;

  constructor(page: Page) {
    super(page);

    // Footer
    this.footerElement = page.getByRole('contentinfo');
    this.footerAllArticles = page.locator('footer').getByText('All Articles');

    // Second "View All Blogs" link (Featured section)
    this.viewAllBlogsFeaturedBtn = page.locator('a.bl-featured__view').first();

    // Newsletter
    this.newsletterEmailInput = page.getByPlaceholder('Enter your email');
    this.newsletterSubscribeBtn = page.getByRole('button', { name: 'Subscribe' });

    // Article card detail locators (scoped to first article)
    this.firstArticleImage = page.locator('article').first().locator('img').first();
    this.firstArticleAuthor = page.locator('article').first().locator('a[href*="/blog/author/"]');
    this.firstArticleDate = page.locator('article').first().locator('time');

    // Search empty state
    this.searchEmptyState = page.locator('[class*="empty"], [class*="no-result"], [class*="not-found"]').first();
  }
}

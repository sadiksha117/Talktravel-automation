import { type Page, type Locator } from '@playwright/test';
import { Flow1Page } from '../LandingtoblogSingleArticle';

export class Flow1ExploratoryPage extends Flow1Page {
  // Header - exploratory
  readonly headerLoginBtn: Locator;
  readonly headerJoinFreeBtn: Locator;

  // Landing hero - exploratory
  readonly heroSubtext: Locator;

  // Blog index - exploratory
  readonly blogSearchBar: Locator;
  readonly blogSearchBtn: Locator;
  readonly viewAllBlogsBtn: Locator;
  readonly featuredBlogsHeading: Locator;
  readonly featuredBlogsSection: Locator;
  readonly categoryTopicsNav: Locator;
  readonly newsletterHeading: Locator;
  readonly newsletterEmailInput: Locator;
  readonly newsletterSubscribeBtn: Locator;
  readonly contributorsHeading: Locator;
  readonly footerElement: Locator;

  // Single article - exploratory
  readonly articleBreadcrumb: Locator;
  readonly articleAuthorBlock: Locator;
  readonly articleShareRow: Locator;
  readonly articleBody: Locator;
  readonly articleDate: Locator;

  constructor(page: Page) {
    super(page);

    // Header - exploratory
    this.headerLoginBtn = page.getByRole('navigation').getByRole('link', { name: 'Log in' });
    this.headerJoinFreeBtn = page.getByRole('navigation').getByRole('link', { name: 'Join Free' });

    // Landing hero - exploratory
    this.heroSubtext = page.getByText(/Real tips from real travelers/);

    // Blog index - exploratory
    this.blogSearchBar = page.getByPlaceholder('Search articles...');
    this.blogSearchBtn = page.getByRole('button', { name: 'Search' });
    this.viewAllBlogsBtn = page.getByRole('link', { name: 'View All Blogs' }).first();
    this.featuredBlogsHeading = page.getByRole('heading', { name: 'Featured Blogs', level: 2 });
    this.featuredBlogsSection = page.locator('div').filter({
      has: page.getByRole('heading', { name: 'Featured Blogs', level: 2 }),
    }).first();
    this.categoryTopicsNav = page.getByRole('navigation').filter({
      has: page.getByRole('link', { name: 'Airlines', exact: true }),
    });
    this.newsletterHeading = page.getByRole('heading', { name: 'Stay in the know' });
    this.newsletterEmailInput = page.getByPlaceholder('Enter your email');
    this.newsletterSubscribeBtn = page.getByRole('button', { name: 'Subscribe' });
    this.contributorsHeading = page.getByRole('heading', { name: 'Our Contributors' });
    this.footerElement = page.getByRole('contentinfo');

    // Single article - exploratory
    this.articleBreadcrumb = page.locator('[class*="breadcrumb"]').first();
    this.articleAuthorBlock = page.getByText(/Written by/);
    this.articleShareRow = page.locator('[class*="share"]').first();
    this.articleBody = page.locator('article').first();
    this.articleDate = page.locator('time').first();
  }
}

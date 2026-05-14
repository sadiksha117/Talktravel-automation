import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class Flow1Page extends BasePage {
  // Header
  readonly logo: Locator;
  readonly headerCommunity: Locator;
  readonly headerBlog: Locator;
  readonly headerFaq: Locator;
  readonly headerLogin: Locator;
  readonly headerJoinFree: Locator;

  // Landing hero
  readonly heroHeading: Locator;
  readonly heroSubtext: Locator;
  readonly joinCommunityBtn: Locator;
  readonly readTheBlogBtn: Locator;
  readonly heroImage: Locator;

  // Blog index
  readonly blogHeroHeading: Locator;
  readonly blogHeroSubtext: Locator;
  readonly searchBar: Locator;
  readonly searchSubmitBtn: Locator;
  readonly latestArticlesHeading: Locator;
  readonly viewAllBlogsBtn: Locator;
  readonly articleCards: Locator;

  // Single article
  readonly breadcrumb: Locator;
  readonly articleCategoryTag: Locator;
  readonly articleTitle: Locator;
  readonly authorBlock: Locator;
  readonly shareRow: Locator;
  readonly articleHeroImage: Locator;
  readonly articleBody: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.logo = page.locator('header img[alt*="TalkTravel"], header a[href="/"] img').first();
    this.headerCommunity = page.locator('header a', { hasText: 'Community' });
    this.headerBlog = page.locator('header a', { hasText: 'Blog' });
    this.headerFaq = page.locator('header a', { hasText: 'FAQ' });
    this.headerLogin = page.locator('header a', { hasText: 'Log in' });
    this.headerJoinFree = page.locator('header a', { hasText: 'Join Free' });

    // Landing hero
    this.heroHeading = page.locator('h1, [class*="hero"] h1, [class*="hero"] h2').first();
    this.heroSubtext = page.locator('[class*="hero"] p, [class*="hero"] [class*="sub"]').first();
    this.joinCommunityBtn = page.locator('a, button').filter({ hasText: 'Join the Community' }).first();
    this.readTheBlogBtn = page.locator('a, button').filter({ hasText: 'Read the Blog' }).first();
    this.heroImage = page.locator('[class*="hero"] img').first();

    // Blog index
    this.blogHeroHeading = page.locator('h1, [class*="hero"] h1, [class*="hero"] h2').first();
    this.blogHeroSubtext = page.locator('[class*="hero"] p, [class*="hero"] [class*="sub"]').first();
    this.searchBar = page.locator('input[placeholder*="Search"]');
    this.searchSubmitBtn = page.locator('button[type="submit"], [class*="search"] button').first();
    this.latestArticlesHeading = page.locator('h2, h3').filter({ hasText: /Read the Latest Articles/i });
    this.viewAllBlogsBtn = page.locator('a, button').filter({ hasText: /View All Blogs/i });
    this.articleCards = page.locator('[class*="card"], article').filter({ has: page.locator('img') });

    // Single article
    this.breadcrumb = page.locator('[class*="breadcrumb"], nav[aria-label*="breadcrumb"]');
    this.articleCategoryTag = page.locator('[class*="category"], [class*="tag"]').first();
    this.articleTitle = page.locator('h1').first();
    this.authorBlock = page.locator('[class*="author"]').first();
    this.shareRow = page.locator('[class*="share"]').first();
    this.articleHeroImage = page.locator('article img, [class*="hero"] img, main img').first();
    this.articleBody = page.locator('article, [class*="content"], [class*="body"]').first();
  }

  async goToLanding(): Promise<void> {
    await this.page.goto('https://talktravel.com');
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

  async openFirstArticle(): Promise<string> {
    const firstCard = this.articleCards.first();
    const titleEl = firstCard.locator('h2, h3, [class*="title"]').first();
    const title = await titleEl.innerText();
    await firstCard.click();
    await this.waitForPageLoad();
    return title.trim();
  }
}

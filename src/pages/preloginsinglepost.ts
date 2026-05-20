import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class PreLoginSinglePostPage extends BasePage {
  // Header
  readonly logo: Locator;
  readonly headerCommunity: Locator;
  readonly headerBlog: Locator;
  readonly headerFaq: Locator;
  readonly headerLogIn: Locator;
  readonly headerJoinFree: Locator;

  // Landing hero
  readonly heroHeading: Locator;
  readonly heroSubtext: Locator;
  readonly joinCommunityBtn: Locator;
  readonly readTheBlogBtn: Locator;
  readonly heroImage: Locator;

  // Trending feed
  readonly feedTabTrending: Locator;
  readonly feedTabLatest: Locator;
  readonly feedPostCards: Locator;
  readonly popularThisWeek: Locator;
  readonly footer: Locator;

  // Single post view
  readonly postTitle: Locator;
  readonly postContent: Locator;
  readonly authorAvatar: Locator;
  readonly voteSection: Locator;
  readonly commentsSection: Locator;
  readonly sortByDropdown: Locator;
  readonly shareButton: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.logo = page.getByRole('link', { name: 'TalkTravel talk travel' });
    this.headerCommunity = page.getByRole('link', { name: 'Community', exact: true });
    this.headerBlog = page.getByRole('link', { name: 'Blog', exact: true });
    this.headerFaq = page.getByRole('navigation').getByRole('link', { name: 'FAQ' });
    this.headerLogIn = page.getByRole('link', { name: 'Log in', exact: true });
    this.headerJoinFree = page.getByRole('link', { name: 'Join Free', exact: true });

    // Landing hero
    this.heroHeading = page.getByRole('heading', { name: 'A travel community for people' });
    this.heroSubtext = page.getByText('Real tips from real travelers');
    this.joinCommunityBtn = page.getByRole('link', { name: 'Join the Community' });
    this.readTheBlogBtn = page.getByRole('link', { name: 'Read the Blog' });
    this.heroImage = page.locator('img').first();

    // Trending feed — post cards are <a href="/post/..."> link elements with child content
    this.feedTabTrending = page.getByRole('link', { name: 'Trending', exact: true });
    this.feedTabLatest = page.getByRole('link', { name: 'Latest', exact: true });
    // Feed cards are large anchor elements (href="/post/...") with multiple child elements
    // (author info, title, snippet, tags, vote counts) — sidebar "Popular This Week" links
    // are simpler anchors without div children, so we use :has(div) to target only feed cards
    this.feedPostCards = page.locator('a[href^="/post/"]:has(div)');
    this.popularThisWeek = page.getByText('Popular This Week');
    this.footer = page.locator('footer');

    // Single post view
    this.postTitle = page.getByRole('heading', { level: 1 });
    this.postContent = page.locator('article, [role="article"], [class*="post" i], [class*="content" i]').first();
    this.authorAvatar = page.locator('img[alt*="avatar"], img[alt*="Avatar"], img[alt*="profile"], img[alt*="Profile"]').first();
    this.voteSection = page.locator('[class*="vote" i], [data-testid*="vote" i], [aria-label*="vote" i], [aria-label*="upvote" i]').first();
    this.commentsSection = page.locator('[class*="comment"], [data-testid*="comment"]').first();
    this.sortByDropdown = page.getByRole('combobox').or(page.getByLabel(/sort/i)).first();
    this.shareButton = page.getByRole('button', { name: /share/i });
    this.loginButton = page.getByRole('button', { name: /login/i }).or(page.getByRole('link', { name: /login/i })).first();
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

  async goToFeedViaCommunityLink(): Promise<void> {
    await this.headerCommunity.click();
    await this.page.waitForURL('**/trending');
    await this.waitForPageLoad();
    await this.dismissCookieBanner();
  }

  async openFirstPostCard(): Promise<string> {
    const firstCard = this.feedPostCards.first();
    await firstCard.waitFor({ state: 'visible' });
    const href = await firstCard.getAttribute('href') ?? '';
    await firstCard.click();
    await this.page.waitForURL('**/post/**');
    await this.waitForPageLoad();
    return href;
  }
}

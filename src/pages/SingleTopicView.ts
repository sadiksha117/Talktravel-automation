import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class SingleTopicViewPage extends BasePage {
  // Header
  readonly logo: Locator;
  readonly headerCommunity: Locator;
  readonly headerBlog: Locator;
  readonly headerFaq: Locator;
  readonly headerLogIn: Locator;
  readonly headerJoinFree: Locator;

  // Topic header
  readonly topicTitle: Locator;

  // Action buttons
  readonly followTopicBtn: Locator;
  readonly newPostBtn: Locator;

  // Sub-tabs
  readonly tabTrending: Locator;
  readonly tabPopular: Locator;
  readonly tabLatest: Locator;

  // Post list
  readonly postCards: Locator;

  // Topic chips inside post cards
  readonly topicChips: Locator;

  // Vote button
  readonly upvoteBtn: Locator;

  // Footer
  readonly footer: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.logo = page.getByRole('link', { name: 'TalkTravel talk travel' });
    this.headerCommunity = page.getByRole('link', { name: 'Community', exact: true });
    this.headerBlog = page.getByRole('link', { name: 'Blog', exact: true });
    this.headerFaq = page.getByRole('navigation').getByRole('link', { name: 'FAQ' });
    this.headerLogIn = page.getByRole('link', { name: 'Log in', exact: true });
    this.headerJoinFree = page.getByRole('link', { name: 'Join Free', exact: true });

    // Topic header
    this.topicTitle = page.getByRole('heading', { level: 1 });

    // Action buttons — "Follow Topic" may render as "Follow" depending on state
    this.followTopicBtn = page.getByRole('button', { name: /follow/i }).first();
    this.newPostBtn = page.getByRole('button', { name: /new post/i });

    // Sub-tabs — rendered as links (same pattern as homepage feed tabs)
    this.tabTrending = page.getByRole('link', { name: 'Trending', exact: true });
    this.tabPopular = page.getByRole('link', { name: 'Popular', exact: true });
    this.tabLatest = page.getByRole('link', { name: 'Latest', exact: true });

    // Post cards
    this.postCards = page.locator('a[href^="/post/"]:has(div)');

    // Topic chips — links to /tags/ within the feed
    this.topicChips = page.locator('a[href^="/tags/"]');

    // Upvote button — may use class, aria-label, or be an SVG button
    this.upvoteBtn = page.locator(
      '[data-testid="upvote"], [data-testid="vote-up"], button[aria-label*="upvote" i], button[aria-label*="vote up" i], [class*="upvote" i]'
    );

    // Footer
    this.footer = page.locator('footer');
  }

  async dismissCookieBanner(): Promise<void> {
    try {
      await this.page.getByRole('button', { name: 'Accept All' }).click({ timeout: 3000 });
    } catch {
      // Banner not present
    }
  }

  async goToTopicViaHomepageChip(): Promise<void> {
    await this.page.goto('https://staging.talktravel.com/trending');
    await this.waitForPageLoad();
    await this.dismissCookieBanner();
    const chip = this.page.locator('a[href^="/tags/"]').first();
    await chip.waitFor({ state: 'visible' });
    await chip.click();
    await this.page.waitForURL(/\/tags\/.+/);
    await this.waitForPageLoad();
  }

  async goToTopicViaPostChip(): Promise<void> {
    await this.page.goto('https://staging.talktravel.com/trending');
    await this.waitForPageLoad();
    await this.dismissCookieBanner();
    // Open a post first
    const postCard = this.page.locator('a[href^="/post/"]:has(div)').first();
    await postCard.waitFor({ state: 'visible' });
    await postCard.click();
    await this.page.waitForURL('**/post/**');
    await this.waitForPageLoad();
    // Then click a topic chip inside the post
    const chip = this.page.locator('a[href^="/tags/"]').first();
    await chip.waitFor({ state: 'visible' });
    await chip.click();
    await this.page.waitForURL(/\/tags\/.+/);
    await this.waitForPageLoad();
  }

  async switchToPopularTab(): Promise<void> {
    await this.tabPopular.click();
    await this.waitForPageLoad();
  }

  async switchToLatestTab(): Promise<void> {
    await this.tabLatest.click();
    await this.waitForPageLoad();
  }

  async switchToTrendingTab(): Promise<void> {
    await this.tabTrending.click();
    await this.waitForPageLoad();
  }

  async clickFirstPostCard(): Promise<void> {
    const first = this.postCards.first();
    await first.waitFor({ state: 'visible' });
    await first.click();
    await this.page.waitForURL('**/post/**');
    await this.waitForPageLoad();
  }

  async clickFollowTopic(): Promise<void> {
    await this.followTopicBtn.click();
    await this.waitForPageLoad();
  }

  async clickNewPost(): Promise<void> {
    await this.newPostBtn.click();
    await this.waitForPageLoad();
  }

  async clickUpvote(): Promise<void> {
    const btn = this.upvoteBtn.first();
    const count = await btn.count();
    if (count > 0) {
      await btn.click();
    } else {
      // fallback: click first vote-related button inside a post card
      await this.page.locator('[class*="vote" i] button, [class*="vote" i] a').first().click();
    }
    await this.waitForPageLoad();
  }
}

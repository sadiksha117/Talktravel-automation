import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class UserProfileViewPage extends BasePage {
  // Header
  readonly logo: Locator;
  readonly headerCommunity: Locator;
  readonly headerBlog: Locator;
  readonly headerFaq: Locator;
  readonly headerLogIn: Locator;
  readonly headerJoinFree: Locator;

  // Profile header
  readonly profileUsername: Locator;
  readonly profileAvatar: Locator;
  readonly badgesStrip: Locator;
  readonly singleBadge: Locator;
  readonly seeAllBadgesLink: Locator;

  // Action buttons
  readonly addFriendBtn: Locator;
  readonly chatBtn: Locator;
  readonly followBtn: Locator;
  readonly moreBtn: Locator;

  // Tabs
  readonly postsTab: Locator;
  readonly commentsTab: Locator;

  // Content
  readonly postCards: Locator;
  readonly profileComments: Locator;
  readonly topicChips: Locator;

  // About User sidebar
  readonly aboutSidebar: Locator;
  readonly profileBio: Locator;
  readonly jetfuelCount: Locator;
  readonly profileTier: Locator;
  readonly tierProgress: Locator;

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

    // Profile header
    this.profileUsername = page.locator('main h1');
    this.profileAvatar = page.locator('[data-testid="profile-avatar"], main img').first();
    this.badgesStrip = page.locator('[data-testid="badges-strip"]');
    this.singleBadge = page.locator('[data-testid="badges-strip"] [data-testid="badge"]');
    this.seeAllBadgesLink = page.getByRole('link', { name: /see all badges/i });

    // Action buttons
    this.addFriendBtn = page.getByRole('button', { name: /add friend/i });
    this.chatBtn = page.getByRole('button', { name: /chat/i });
    this.followBtn = page.getByRole('button', { name: /follow/i });
    this.moreBtn = page.locator('button[aria-label="More"], [data-testid="profile-more"]');

    // Tabs
    this.postsTab = page.getByRole('tab', { name: /posts/i });
    this.commentsTab = page.getByRole('tab', { name: /comments/i });

    // Content
    this.postCards = page.locator('[data-testid="post-card"], a[href^="/post/"]:has(div)');
    this.profileComments = page.locator('[data-testid="profile-comment"]');
    this.topicChips = page.locator('[data-testid="topic-chip"], a[href^="/tags/"]');

    // About User sidebar
    this.aboutSidebar = page.locator('aside').filter({ hasText: /about/i });
    this.profileBio = page.locator('[data-testid="profile-bio"]');
    this.jetfuelCount = page.locator('[data-testid="jetfuel-count"]');
    this.profileTier = page.locator('[data-testid="profile-tier"]');
    this.tierProgress = page.locator('[data-testid="tier-progress"]');

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

  async goToProfileViaHomepageFeed(): Promise<void> {
    await this.page.goto('https://staging.talktravel.com/trending');
    await this.waitForPageLoad();
    await this.dismissCookieBanner();
    const authorLink = this.page
      .locator('[data-testid="author-link"], a[href^="/user/"]')
      .first();
    await authorLink.waitFor({ state: 'visible' });
    await authorLink.click();
    await this.page.waitForURL(/\/user\/.+/);
    await this.waitForPageLoad();
  }

  async goToProfileViaSinglePost(): Promise<void> {
    await this.page.goto('https://staging.talktravel.com/trending');
    await this.waitForPageLoad();
    await this.dismissCookieBanner();
    const postCard = this.page.locator('a[href^="/post/"]:has(div)').first();
    await postCard.waitFor({ state: 'visible' });
    await postCard.click();
    await this.page.waitForURL('**/post/**');
    await this.waitForPageLoad();
    const authorLink = this.page
      .locator('article [data-testid="author-link"], article a[href^="/user/"]')
      .first();
    await authorLink.waitFor({ state: 'visible' });
    await authorLink.click();
    await this.page.waitForURL(/\/user\/.+/);
    await this.waitForPageLoad();
  }

  async goToProfileViaComment(): Promise<void> {
    await this.page.goto('https://staging.talktravel.com/trending');
    await this.waitForPageLoad();
    await this.dismissCookieBanner();
    const postCard = this.page.locator('a[href^="/post/"]:has(div)').first();
    await postCard.waitFor({ state: 'visible' });
    await postCard.click();
    await this.page.waitForURL('**/post/**');
    await this.waitForPageLoad();
    const commentAuthorLink = this.page
      .locator('[data-testid="comment"] [data-testid="author-link"], [data-testid="comment"] a[href^="/user/"]')
      .first();
    await commentAuthorLink.waitFor({ state: 'visible' });
    await commentAuthorLink.click();
    await this.page.waitForURL(/\/user\/.+/);
    await this.waitForPageLoad();
  }

  async switchToCommentsTab(): Promise<void> {
    await this.commentsTab.click();
    await this.waitForPageLoad();
  }

  async switchToPostsTab(): Promise<void> {
    await this.postsTab.click();
    await this.waitForPageLoad();
  }

  async clickFirstPostCard(): Promise<string> {
    const firstPost = this.postCards.first();
    await firstPost.waitFor({ state: 'visible' });
    const title = await firstPost.locator('h2, h3').first().textContent() ?? '';
    await firstPost.click();
    await this.page.waitForURL(/\/post\/.+/);
    await this.waitForPageLoad();
    return title.trim();
  }

  async clickFirstComment(): Promise<void> {
    const firstComment = this.profileComments.first();
    await firstComment.waitFor({ state: 'visible' });
    await firstComment.click();
    await this.page.waitForURL(/\/post\/.+/);
    await this.waitForPageLoad();
  }

  async clickFirstTopicChip(): Promise<void> {
    const chip = this.page
      .locator('[data-testid="post-card"] [data-testid="topic-chip"], [data-testid="post-card"] a[href^="/tags/"]')
      .first();
    await chip.waitFor({ state: 'visible' });
    await chip.click();
    await this.page.waitForURL(/\/tags\/.+/);
    await this.waitForPageLoad();
  }

  async clickFirstBadge(): Promise<void> {
    await this.singleBadge.first().waitFor({ state: 'visible' });
    await this.singleBadge.first().click();
    await this.waitForPageLoad();
  }

  async clickSeeAllBadges(): Promise<void> {
    await this.seeAllBadgesLink.click();
    await this.page.waitForURL(/\/badges/);
    await this.waitForPageLoad();
  }
}

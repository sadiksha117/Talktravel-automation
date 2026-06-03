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

  // Tabs — rendered as <a class="nav-link"> inside <ul class="nav">
  readonly postsTab: Locator;
  readonly commentsTab: Locator;

  // Content
  readonly postCards: Locator;
  readonly postTitleLinks: Locator;
  readonly profileComments: Locator;
  readonly topicChips: Locator;

  // About User sidebar
  readonly aboutSidebar: Locator;
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

    // Profile header — no <main>, page uses div.profile-page
    this.profileUsername = page.locator('.profile-info h1');
    this.profileAvatar = page.locator('img.profile-avatar');
    this.badgesStrip = page.locator('.profile-badges-strip');
    this.singleBadge = page.locator('.profile-badges-strip__tile');
    this.seeAllBadgesLink = page.locator('.profile-badges-strip__all-link');

    // Action buttons
    this.addFriendBtn = page.getByRole('button', { name: /add friend/i });
    this.chatBtn = page.getByRole('button', { name: /chat/i });
    this.followBtn = page.getByRole('button', { name: /follow|unfollow/i });
    this.moreBtn = page.getByRole('button', { name: /more/i });

    // Tabs — <a class="nav-link"> with href containing profile_active_tab
    this.postsTab = page.locator('a.nav-link[href*="profile_active_tab=posts"]');
    this.commentsTab = page.locator('a.nav-link[href*="profile_active_tab=comments"]');

    // Content — post cards are div.feed-post-item, title links are a.feed-post-title-link
    this.postCards = page.locator('.feed-post-item');
    this.postTitleLinks = page.locator('a.feed-post-title-link');
    this.profileComments = page.locator('.profile-comment-item, .feed-post-item');
    this.topicChips = page.locator('a.tag-default[href*="/tags/"]');

    // About User sidebar — div.user-sidebar
    this.aboutSidebar = page.locator('.user-sidebar');
    this.jetfuelCount = page.locator('.user-sidebar-stat--jetfuel .user-sidebar-stat__value');
    this.profileTier = page.locator('.user-sidebar-stat--tier .user-sidebar-stat__value');
    this.tierProgress = page.locator('.user-sidebar-next-tier');

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
    const authorLink = this.page.locator('a[href*="/profile/"]').first();
    await authorLink.waitFor({ state: 'visible' });
    await authorLink.click();
    await this.page.waitForURL(/\/profile\/.+/);
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
    const authorLink = this.page.locator('a[href*="/profile/"]').first();
    await authorLink.waitFor({ state: 'visible' });
    await authorLink.click();
    await this.page.waitForURL(/\/profile\/.+/);
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
    // Comment author links — on single post page, author links use feed-post-meta-user class
    // Skip the first one (post author at top) and get one from the comments area
    const commentAuthorLink = this.page
      .locator('a[class*="meta-user"][href*="/profile/"], a[class*="comment"][href*="/profile/"], [class*="comment"] a[href*="/profile/"]')
      .nth(1);
    await commentAuthorLink.waitFor({ state: 'visible' });
    await commentAuthorLink.click();
    await this.page.waitForURL(/\/profile\/.+/);
    await this.waitForPageLoad();
  }

  async switchToCommentsTab(): Promise<void> {
    await this.commentsTab.waitFor({ state: 'visible' });
    await this.commentsTab.click();
    await this.waitForPageLoad();
  }

  async switchToPostsTab(): Promise<void> {
    await this.postsTab.waitFor({ state: 'visible' });
    await this.postsTab.click();
    await this.waitForPageLoad();
  }

  async clickFirstPostCard(): Promise<string> {
    const firstLink = this.postTitleLinks.first();
    await firstLink.waitFor({ state: 'visible' });
    const title = await firstLink.locator('.feed-post-title-content').textContent() ?? '';
    await firstLink.click();
    await this.page.waitForURL(/\/post\/.+/);
    await this.waitForPageLoad();
    return title.trim();
  }

  async clickFirstComment(): Promise<void> {
    await this.switchToCommentsTab();
    // Comments tab may use feed-post-title-link or render as clickable feed-post-item
    const firstClickable = this.page
      .locator('a.feed-post-title-link, .feed-post-item[role="link"]')
      .first();
    await firstClickable.waitFor({ state: 'visible' });
    await firstClickable.click();
    await this.page.waitForURL(/\/post\/.+/);
    await this.waitForPageLoad();
  }

  async clickFirstTopicChip(): Promise<void> {
    const chip = this.topicChips.first();
    await chip.waitFor({ state: 'visible' });
    await chip.click();
    await this.page.waitForURL(/\/tags\/.+/);
    await this.waitForPageLoad();
  }

  async clickFirstBadge(): Promise<void> {
    await this.singleBadge.first().waitFor({ state: 'visible' });
    await this.singleBadge.first().click();
    await this.page.waitForURL(/\/badge\/.+/);
    await this.waitForPageLoad();
  }

  async clickSeeAllBadges(): Promise<void> {
    await this.seeAllBadgesLink.waitFor({ state: 'visible' });
    await this.seeAllBadgesLink.click();
    await this.page.waitForURL(/\/badges/);
    await this.waitForPageLoad();
  }
}

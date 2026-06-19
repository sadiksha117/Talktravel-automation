import { type Page, type Locator } from '@playwright/test';
import { PostLoginHomepagePage } from '../PostLoginHomepage';

export class PostLoginHomepageExploratoryPage extends PostLoginHomepagePage {
  // Tab hrefs
  readonly feedTabTrendingLink: Locator;
  readonly feedTabLatestLink: Locator;
  readonly feedTabForYouLink: Locator;

  // Vote buttons
  readonly firstUpvoteBtn: Locator;
  readonly firstDownvoteBtn: Locator;

  // Author profile link
  readonly firstAuthorProfileLink: Locator;

  // Tag chips
  readonly firstTagChip: Locator;

  // 3-dot menu
  readonly firstMoreMenuBtn: Locator;

  // Left nav items
  readonly leftNavMyPosts: Locator;
  readonly leftNavLogout: Locator;

  // Create post button
  readonly createPostBtn: Locator;

  // Footer links
  readonly footerPrivacyLink: Locator;
  readonly footerTermsLink: Locator;
  readonly footerCopyright: Locator;

  constructor(page: Page) {
    super(page);

    this.feedTabTrendingLink = page.getByRole('link', { name: 'Trending', exact: true });
    // Scope to the feed-tabs list (anchored by the Trending link) so 'Latest'
    // doesn't also match a same-named footer/header link elsewhere on the page.
    const feedTabsList = page
      .locator('ul')
      .filter({ has: page.getByRole('link', { name: 'Trending', exact: true }) });
    this.feedTabLatestLink = feedTabsList.getByRole('link', { name: 'Latest', exact: true });
    this.feedTabForYouLink = feedTabsList.locator('a[href="/for-you"]');

    this.firstUpvoteBtn = page.getByRole('button', { name: 'Upvote' }).first();
    this.firstDownvoteBtn = page.getByRole('button', { name: 'Downvote' }).first();

    this.firstAuthorProfileLink = page.locator('a[href^="/profile/"]').first();
    this.firstTagChip = page.locator('a[href^="/tags/"]').first();

    this.firstMoreMenuBtn = page.getByRole('button', { name: 'More' }).first();

    this.leftNavMyPosts = page.getByRole('link', { name: 'My Posts', exact: true });
    this.leftNavLogout = page.getByRole('button', { name: /log out|logout|sign out/i }).first();

    this.createPostBtn = page.locator('[data-testid="create-post"]').or(
      page.getByRole('link', { name: /create post/i })
    ).first();

    this.footerPrivacyLink = page.getByRole('contentinfo').getByRole('link', { name: 'Privacy', exact: true });
    this.footerTermsLink = page.getByRole('contentinfo').getByRole('link', { name: 'Terms', exact: true });
    this.footerCopyright = page.getByRole('contentinfo').getByText(/© \d{4} TalkTravel/);
  }

  /**
   * Best-effort logout. Clicks a visible Log out control if present,
   * otherwise opens a likely account/avatar menu first. Resolves once the
   * app leaves the authenticated feed (or after a short grace period).
   */
  async logout(): Promise<void> {
    if (!(await this.leftNavLogout.isVisible().catch(() => false))) {
      await this.page
        .getByRole('button', { name: /account|profile|avatar|menu|settings/i })
        .first()
        .click({ timeout: 3000 })
        .catch(() => { /* no menu trigger — fall through */ });
    }
    await this.leftNavLogout.click({ timeout: 5000 }).catch(() => { /* control not found */ });
    await this.page.waitForURL(/\/login|talktravel\.com\/?$/, { timeout: 10000 }).catch(() => { /* SPA may not change URL */ });
  }
}

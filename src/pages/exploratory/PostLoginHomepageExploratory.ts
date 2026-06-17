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
    this.feedTabLatestLink = page.getByRole('link', { name: 'Latest', exact: true });
    this.feedTabForYouLink = page.locator('a[href="/for-you"]');

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
}

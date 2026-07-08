import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the Left Nav — Followed Posts (Post-Login) flow
 * (docs/Leftnav_followedpost.md).
 *
 * The left-nav link's exact container, the page URL, and the per-card
 * Follow/Unfollow toggle are unconfirmed against the live app — the source
 * doc itself lists the URL as one of several candidates. These use flexible
 * role/text locators with fallbacks, same convention as the unconfirmed
 * elements in EditPost.ts/DeletePost.ts ("Post options" 3-dot menu). Feed
 * card, vote, topic-chip and author-link selectors reuse the conventions
 * already confirmed in PostLoginHomepagePage, since this list shares the
 * same card structure as the Homepage feed.
 */
export class LeftNavFollowedPostsPage extends BasePage {
  // Left nav
  readonly followedPostsLink: Locator;

  // Page
  readonly pageHeading: Locator;
  readonly postCards: Locator;

  // Vote buttons (feed-card convention)
  readonly firstUpvoteBtn: Locator;
  readonly firstDownvoteBtn: Locator;

  // 3-dot menu — confirmed pattern (Report.spec.ts / EditPost.ts)
  readonly postOptionsBtn: Locator;
  readonly menuReportPost: Locator;
  readonly menuEditPost: Locator;
  readonly menuDeletePost: Locator;

  constructor(page: Page) {
    super(page);

    this.followedPostsLink = page.getByRole('link', { name: /followed posts/i }).first();

    this.pageHeading = page.getByRole('heading', { level: 1 });

    // Same feed-card convention confirmed in PostLoginHomepagePage.
    this.postCards = page.locator('a[href^="/post/"]:has(div)');

    this.firstUpvoteBtn = page.getByRole('button', { name: 'Upvote' }).first();
    this.firstDownvoteBtn = page.getByRole('button', { name: 'Downvote' }).first();

    this.postOptionsBtn = page.getByRole('button', { name: 'Post options' }).first();
    this.menuReportPost = page.getByRole('button', { name: 'Report Post' });
    this.menuEditPost = page.getByRole('button', { name: /^edit post$/i })
      .or(page.locator('[role="menuitem"]:has-text("Edit")'))
      .first();
    this.menuDeletePost = page.getByRole('button', { name: /^delete post$/i })
      .or(page.locator('[role="menuitem"]:has-text("Delete")'))
      .first();
  }

  async login(email: string, password: string): Promise<void> {
    // Retry the login navigation — under parallel workers staging can return
    // ERR_ABORTED or be slow to render the form on the first hit.
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.page.goto('https://staging.talktravel.com/login', { waitUntil: 'domcontentloaded' });
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await this.page.waitForTimeout(attempt * 1500);
      }
    }
    const emailField = this.page
      .getByRole('textbox', { name: /email|username|phone/i })
      .or(this.page.locator('input[type="email"]'))
      .first();
    const passwordField = this.page.locator('input[type="password"]').first();
    const submitBtn = this.page
      .locator('button[type="submit"]')
      .or(this.page.getByRole('button', { name: /log in|sign in/i }))
      .first();
    await emailField.waitFor({ state: 'visible', timeout: 30000 });
    await emailField.fill(email);
    await passwordField.fill(password);
    await submitBtn.click();
    await this.page.waitForURL(/staging\.talktravel\.com\/.+/, { timeout: 30000 });
    await this.page.waitForLoadState('load');
  }

  /**
   * Navigate to a URL, tolerating net::ERR_ABORTED. The SPA frequently
   * aborts an in-flight navigation when its router redirects (e.g. visiting
   * /trending right after login, or while already authenticated) — that
   * abort is benign, the app lands on the correct page regardless. Same
   * pattern as PostLoginHomepagePage.safeGoto.
   */
  async safeGoto(url: string): Promise<void> {
    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    } catch (e) {
      const msg = String(e);
      const benign = msg.includes('ERR_ABORTED') || msg.includes('interrupted by another navigation');
      if (!benign) throw e;
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Navigates via the left-nav link when present, else falls back to the
   * most likely candidate URL from the source doc (URL is unconfirmed).
   */
  async goToFollowedPosts(): Promise<void> {
    if (await this.followedPostsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.followedPostsLink.click();
      await this.page.waitForLoadState('domcontentloaded');
    } else {
      await this.safeGoto('https://staging.talktravel.com/followed-posts');
    }
    await this.waitForPageLoad();
  }

  /** Follow/Following toggle scoped to a single feed card — unconfirmed selector. */
  followButtonOnCard(card: Locator): Locator {
    return card.getByRole('button', { name: /^follow$/i });
  }

  followingButtonOnCard(card: Locator): Locator {
    return card.getByRole('button', { name: /^following$/i });
  }

  /**
   * Guarantees the account follows at least one post, so list/vote/unfollow
   * tests have a target regardless of the account's current follow state.
   * Follows via the Single Post View, whose Follow/Following selectors are
   * already confirmed (see PostLoginSinglePostViewPage).
   */
  async ensureFollowingAtLeastOnePost(): Promise<void> {
    await this.safeGoto('https://staging.talktravel.com/trending');
    await this.waitForPageLoad();
    const firstCard = this.postCards.first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });
    await firstCard.click();
    await this.page.waitForURL('**/post/**', { timeout: 20000 });
    await this.waitForPageLoad();
    // Give the post's action bar a moment to hydrate before probing it —
    // the vote/follow buttons render after the initial paint.
    await this.page.waitForTimeout(1000);

    // Same 3-way fallback chain as the confirmed PostLoginSinglePostViewPage.
    const followBtn = this.page.locator('button[data-action="follow"], button[data-action="subscribe"]')
      .or(this.page.locator('[class*="follow" i]:not([class*="following" i]) button').first())
      .or(this.page.getByRole('button', { name: /^follow$/i }).first())
      .first();
    const followingBtn = this.page.locator('button[data-action="unfollow"], button[data-action="unsubscribe"]')
      .or(this.page.getByRole('button', { name: /following|subscribed/i }).first())
      .first();

    const isFollowing = await followingBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (isFollowing) return;

    const followVisible = await followBtn.isVisible({ timeout: 10000 }).catch(() => false);
    if (!followVisible) {
      throw new Error(
        'Could not find a Follow/Following button on the opened post — the selector is ' +
        'unconfirmed against the live app. Check test-results/**/error-context.md for the ' +
        'real accessibility tree and update followBtn/followingBtn in LeftNavFollowedPosts.ts.'
      );
    }
    await followBtn.click();
    await followingBtn.waitFor({ state: 'visible', timeout: 10000 });
  }
}

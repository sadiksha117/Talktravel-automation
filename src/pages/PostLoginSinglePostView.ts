import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class PostLoginSinglePostViewPage extends BasePage {
  // Post header
  readonly postTitle: Locator;
  readonly postAuthor: Locator;
  readonly topicChip: Locator;

  // Post actions
  readonly upvoteBtn: Locator;
  readonly downvoteBtn: Locator;
  readonly voteCount: Locator;
  readonly followBtn: Locator;
  readonly followingBtn: Locator;
  readonly shareBtn: Locator;
  readonly postMoreBtn: Locator;

  // 3-dot menu items
  readonly menuEdit: Locator;
  readonly menuDelete: Locator;
  readonly menuReport: Locator;

  // External link card
  readonly externalLinkCard: Locator;

  // Comment section
  readonly commentInput: Locator;
  readonly commentSubmit: Locator;
  readonly commentSort: Locator;
  readonly commentRows: Locator;

  // Comment actions (scoped at runtime)
  readonly linkCopiedToast: Locator;

  // Report modal
  readonly reportDialog: Locator;

  constructor(page: Page) {
    super(page);

    this.postTitle       = page.locator('article h1').or(page.locator('main h1'));
    this.postAuthor      = page.locator('[data-testid="post-author"]').or(page.locator('article a[href^="/user/"]').first());
    this.topicChip       = page.locator('[data-testid="topic-chip"]').first();

    this.upvoteBtn       = page.locator('[data-testid="post-upvote"]').or(page.getByRole('button', { name: /upvote/i }).first());
    this.downvoteBtn     = page.locator('[data-testid="post-downvote"]').or(page.getByRole('button', { name: /downvote/i }).first());
    this.voteCount       = page.locator('[data-testid="post-vote-count"]');
    this.followBtn       = page.locator('[data-testid="follow-post"]').or(page.getByRole('button', { name: 'Follow', exact: true }));
    this.followingBtn    = page.getByRole('button', { name: /following/i });
    this.shareBtn        = page.locator('[data-testid="share-post"]').or(page.getByRole('button', { name: /share/i }).first());
    this.postMoreBtn     = page.locator('[data-testid="post-more"]').or(page.locator('article button[aria-label="More"]'));

    this.menuEdit        = page.locator('[role="menuitem"]:has-text("Edit")');
    this.menuDelete      = page.locator('[role="menuitem"]:has-text("Delete")');
    this.menuReport      = page.locator('[role="menuitem"]:has-text("Report")');

    this.externalLinkCard = page.locator('[data-testid="external-link-card"]');

    this.commentInput    = page.locator('[data-testid="comment-input"]').or(page.locator('textarea[placeholder*="comment" i]').first());
    this.commentSubmit   = page.locator('[data-testid="comment-submit"]').or(page.getByRole('button', { name: /reply|submit/i }).first());
    this.commentSort     = page.locator('[data-testid="comment-sort"]');
    this.commentRows     = page.locator('[data-testid="comment"]');

    this.linkCopiedToast = page.locator('text=/Link copied|Copied/i');
    this.reportDialog    = page.locator('[role="dialog"]');
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.goto('https://staging.talktravel.com/login');
    await this.waitForPageLoad();
    const emailField = this.page
      .getByRole('textbox', { name: /email|username|phone/i })
      .or(this.page.locator('input[type="email"]'))
      .first();
    const passwordField = this.page.locator('input[type="password"]').first();
    const submitBtn = this.page
      .locator('button[type="submit"]')
      .or(this.page.getByRole('button', { name: /log in|sign in/i }))
      .first();
    await emailField.fill(email);
    await passwordField.fill(password);
    await submitBtn.click();
    await this.page.waitForURL(/staging\.talktravel\.com\/.+/);
    await this.waitForPageLoad();
  }

  async openFirstPost(): Promise<void> {
    await this.page.goto('https://staging.talktravel.com/trending');
    await this.waitForPageLoad();
    await this.page.locator('a[href^="/post/"]:has(div)').first().click();
    await this.page.waitForURL(/\/post\/[a-z0-9-]+/);
    await this.waitForPageLoad();
  }

  async getVoteCount(): Promise<number> {
    const text = await this.voteCount.textContent();
    return parseInt(text ?? '0', 10);
  }

  async addComment(text: string): Promise<void> {
    await this.commentInput.fill(text);
    await this.commentSubmit.click();
  }

  async replyToComment(commentLocator: Locator, replyText: string): Promise<void> {
    await commentLocator.locator('button:has-text("Reply")').click();
    await this.page.locator('[data-testid="comment-reply-input"]').fill(replyText);
    await this.page.locator('[data-testid="comment-reply-submit"]').click();
  }
}

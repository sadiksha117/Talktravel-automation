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

  // Toasts / dialogs
  readonly linkCopiedToast: Locator;
  readonly reportDialog: Locator;

  constructor(page: Page) {
    super(page);

    this.postTitle    = page.getByRole('heading', { level: 1 });
    this.postAuthor   = page.locator('a[href*="/profile/"]').first();
    this.topicChip    = page.locator('a[href*="/tags/"]').first();

    this.upvoteBtn    = page.locator('button[data-action="upvote"]').first();
    this.downvoteBtn  = page.locator('button[data-action="downvote"]').first();
    // Vote count sits as a sibling element immediately after the upvote button
    this.voteCount    = page.locator('button[data-action="upvote"] + *').first();

    this.followBtn    = page.getByRole('button', { name: /^follow$/i });
    this.followingBtn = page.getByRole('button', { name: /following/i });
    this.shareBtn     = page.getByRole('button', { name: /share/i }).first();
    this.postMoreBtn  = page.locator('button[aria-label="More"]').first();

    this.menuEdit   = page.locator('[role="menuitem"]:has-text("Edit")');
    this.menuDelete = page.locator('[role="menuitem"]:has-text("Delete")');
    this.menuReport = page.locator('[role="menuitem"]:has-text("Report")');

    this.externalLinkCard = page.locator('[data-testid="external-link-card"]');

    // Rich-text comment input may be a contenteditable div, a textarea, or a textbox role
    this.commentInput  = page.locator('[contenteditable="true"]')
      .or(page.locator('textarea[placeholder*="reply" i]'))
      .or(page.getByRole('textbox', { name: /reply|comment/i }))
      .first();
    this.commentSubmit = page.getByRole('button', { name: /^reply$/i })
      .or(page.getByRole('button', { name: /submit|post/i }))
      .first();
    this.commentSort = page.getByRole('combobox').or(page.getByLabel(/sort/i)).first();
    this.commentRows = page.locator('[data-testid="comment"]')
      .or(page.locator('[class*="comment" i] [class*="comment" i]'))
      .first()
      .locator('..')  // reset — we define rows as a list locator below
      .locator('[data-testid="comment"], [class*="comment-item"], [class*="commentItem"]');

    this.linkCopiedToast = page.locator('text=/Link copied|Copied/i');
    this.reportDialog    = page.locator('[role="dialog"]');
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.goto('https://staging.talktravel.com/login', { waitUntil: 'domcontentloaded' });
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
    await this.page.waitForURL(/staging\.talktravel\.com\/.+/, { timeout: 30000 });
    await this.waitForPageLoad();
  }

  async openFirstPost(): Promise<void> {
    await this.page.goto('https://staging.talktravel.com/trending', { waitUntil: 'domcontentloaded' });
    await this.waitForPageLoad();
    await this.dismissCookieBanner();
    const firstCard = this.page.locator('a[href^="/post/"]:has(div)').first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click();
    await this.page.waitForURL('**/post/**', { timeout: 15000 });
    await this.waitForPageLoad();
  }

  async dismissCookieBanner(): Promise<void> {
    try {
      await this.page.getByRole('button', { name: 'Accept All' }).click({ timeout: 3000 });
    } catch {
      // Banner not present — continue
    }
  }

  async getVoteCount(): Promise<number> {
    const text = await this.voteCount.innerText();
    return parseInt(text.replace(/\D/g, '') || '0', 10);
  }

  async addComment(text: string): Promise<void> {
    await this.commentInput.click();
    await this.commentInput.fill(text);
    await this.commentSubmit.click();
  }

  async replyToComment(commentLocator: Locator, replyText: string): Promise<void> {
    await commentLocator.locator('button:has-text("Reply")').click();
    const replyInput = this.page.locator('[contenteditable="true"]')
      .or(this.page.locator('textarea[placeholder*="reply" i]'))
      .last();
    await replyInput.click();
    await replyInput.fill(replyText);
    await this.page.getByRole('button', { name: /^reply$/i }).last().click();
  }
}

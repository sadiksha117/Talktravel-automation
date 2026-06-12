import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class PostLoginSinglePostViewPage extends BasePage {
  // Post header
  readonly postTitle: Locator;
  readonly postAuthor: Locator;
  readonly topicChip: Locator;

  // Post actions — vote
  readonly upvoteBtn: Locator;
  readonly downvoteBtn: Locator;
  readonly voteCount: Locator;

  // Post actions — follow
  readonly followBtn: Locator;
  readonly followingBtn: Locator;

  // Post actions — share / more
  readonly shareBtn: Locator;
  readonly postMoreBtn: Locator;

  // 3-dot menu items
  readonly menuEdit: Locator;
  readonly menuDelete: Locator;
  readonly menuReport: Locator;

  // Comment section
  readonly commentSort: Locator;

  // Toasts / dialogs
  readonly linkCopiedToast: Locator;
  readonly reportDialog: Locator;

  constructor(page: Page) {
    super(page);

    this.postTitle    = page.getByRole('heading', { level: 1 });
    // Author and topic chip — confirmed URL patterns from UserProfileView / existing tests
    this.postAuthor   = page.locator('a[href*="/profile/"]').first();
    this.topicChip    = page.locator('a[href*="/tags/"]').first();

    // Vote buttons — confirmed attribute from error output
    this.upvoteBtn   = page.locator('button[data-action="upvote"]').first();
    this.downvoteBtn = page.locator('button[data-action="downvote"]').first();
    // Vote count span: <span data-total="N">N</span> — sibling of upvote button
    this.voteCount   = page.locator('button[data-action="upvote"] + *').first();

    // Follow / Following — looser match without anchors
    this.followBtn    = page.getByRole('button', { name: /follow/i }).first();
    this.followingBtn = page.getByRole('button', { name: /following/i }).first();

    this.shareBtn    = page.getByRole('button', { name: /share/i }).first();
    // More/3-dot button — UserProfileView uses getByRole('button', { name: /more/i })
    this.postMoreBtn = page.getByRole('button', { name: /more/i }).first();

    this.menuEdit   = page.locator('[role="menuitem"]:has-text("Edit")');
    this.menuDelete = page.locator('[role="menuitem"]:has-text("Delete")');
    this.menuReport = page.locator('[role="menuitem"]:has-text("Report")');

    // Sort — look for a sort button or select near the comments heading
    this.commentSort = page.locator('[class*="sort" i] button, [class*="sort" i] select')
      .or(page.getByRole('button', { name: /newest|oldest|sort/i }))
      .first();

    this.linkCopiedToast = page.locator('text=/Link copied|Copied/i');
    this.reportDialog    = page.locator('[role="dialog"]');
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.goto('https://staging.talktravel.com/login', { waitUntil: 'load' });
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
    await this.page.goto('https://staging.talktravel.com/trending', { waitUntil: 'load' });
    await this.dismissCookieBanner();
    const firstCard = this.page.locator('a[href^="/post/"]:has(div)').first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click();
    await this.page.waitForURL('**/post/**', { timeout: 30000 });
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
    const attr = await this.voteCount.getAttribute('data-total');
    if (attr !== null) return parseInt(attr, 10);
    const text = await this.voteCount.innerText();
    return parseInt(text.replace(/\D/g, '') || '0', 10);
  }

  // Returns the comment input locator — scrolls into view first then activates the editor
  async getCommentInput(): Promise<Locator> {
    // Scroll to comments section so lazy-loaded elements mount
    const commentsHeading = this.page.locator('h2').filter({ hasText: /comment/i }).first();
    await commentsHeading.scrollIntoViewIfNeeded();

    // Try progressively broader selectors
    const candidates = [
      this.page.locator('[contenteditable="true"]').first(),
      this.page.locator('[contenteditable]').first(),
      this.page.locator('.ProseMirror').first(),
      this.page.locator('textarea').first(),
    ];
    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 2000 }).catch(() => false)) {
        return candidate;
      }
    }
    // Last resort: click on the placeholder "write a reply" area to activate the editor
    const placeholder = this.page.locator('[class*="reply" i], [class*="comment-box" i]').first();
    await placeholder.click({ timeout: 5000 });
    return this.page.locator('[contenteditable]').first();
  }

  async addComment(text: string): Promise<void> {
    const input = await this.getCommentInput();
    await input.click();
    await input.fill(text);
    // Submit via reply/post button — scope to comment form area only
    const submitBtn = this.page
      .getByRole('button', { name: /^reply$/i })
      .or(this.page.getByRole('button', { name: /^post$/i }))
      .or(this.page.getByRole('button', { name: /^submit$/i }))
      .last();
    await submitBtn.click();
  }
}

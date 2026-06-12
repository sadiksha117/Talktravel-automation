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

    this.postTitle   = page.getByRole('heading', { level: 1 });
    this.postAuthor  = page.locator('a[href*="/profile/"]').first();
    this.topicChip   = page.locator('a[href*="/tags/"]').first();

    // Vote buttons — confirmed attribute pattern from error output
    this.upvoteBtn   = page.locator('button[data-action="upvote"]').first();
    this.downvoteBtn = page.locator('button[data-action="downvote"]').first();
    // Vote count: <span data-total="N">N</span> immediately after the upvote button
    this.voteCount   = page.locator('button[data-action="upvote"] + *').first();

    // Follow / Following — try data-action pattern (same convention as upvote/downvote),
    // then fall back to text-based button matches
    this.followBtn    = page.locator('button[data-action="follow"], button[data-action="subscribe"]')
      .or(page.locator('[class*="follow" i]:not([class*="following" i]) button').first())
      .or(page.getByRole('button', { name: /^follow$/i }).first())
      .first();
    this.followingBtn = page.locator('button[data-action="unfollow"], button[data-action="unsubscribe"]')
      .or(page.getByRole('button', { name: /following|subscribed/i }).first())
      .first();

    this.shareBtn    = page.getByRole('button', { name: /share/i }).first();
    // More/3-dot — try data-action, then aria-haspopup dropdown buttons
    this.postMoreBtn = page.locator('button[data-action="more"], button[data-action="options"]')
      .or(page.locator('[aria-haspopup="true"] button, button[aria-haspopup="true"]').first())
      .or(page.locator('[class*="more" i]:not([class*="comment" i]) button, button[class*="more" i]').first())
      .first();

    this.menuEdit   = page.locator('[role="menuitem"]:has-text("Edit")');
    this.menuDelete = page.locator('[role="menuitem"]:has-text("Delete")');
    this.menuReport = page.locator('[role="menuitem"]:has-text("Report")');

    this.commentSort = page.locator('[class*="sort" i] button, [class*="sort" i] select')
      .or(page.getByRole('button', { name: /newest|oldest|sort/i }))
      .first();

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
    await this.page.waitForURL(/staging\.talktravel\.com\/.+/, { timeout: 30000 });
    // Wait for all login redirects to fully settle before any subsequent navigation
    await this.page.waitForLoadState('load');
  }

  async openFirstPost(): Promise<void> {
    // Retry up to 3 times — ERR_ABORTED can occur when parallel workers all login
    // simultaneously and the trailing redirect chain hasn't fully cleared
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.page.goto('https://staging.talktravel.com/trending', { waitUntil: 'domcontentloaded' });
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await this.page.waitForTimeout(attempt * 1500);
      }
    }
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

  // Scrolls to the comments section and probes for the comment editor using
  // multiple strategies since the editor is lazy-mounted
  async getCommentInput(): Promise<Locator> {
    // Scroll to the comments heading
    const commentsH2 = this.page.locator('h2').filter({ hasText: /comment/i }).first();
    if (await commentsH2.isVisible({ timeout: 3000 }).catch(() => false)) {
      await commentsH2.scrollIntoViewIfNeeded();
    } else {
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    }
    await this.page.waitForTimeout(600);

    // Probe all editor types in priority order
    const editorSelectors = [
      '[contenteditable="true"]',
      '[contenteditable=""]',
      '[contenteditable]',
      '.ProseMirror',
      '.ql-editor',
      'textarea',
      '[role="textbox"]',
      'input[type="text"]:not([placeholder*="search" i])',
    ];
    for (const sel of editorSelectors) {
      const el = this.page.locator(sel).first();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) return el;
    }

    // If no editor found yet, try clicking a trigger element to activate the editor
    const triggerSelectors = [
      // "Scroll to comments" button on the post may activate the reply area
      'button[aria-label*="scroll" i]',
      // Common "write a reply" placeholder areas
      'p[data-placeholder]',
      '[class*="reply-placeholder"], [class*="comment-placeholder"]',
      '[class*="reply-area"], [class*="comment-area"]',
      // Tiptap/ProseMirror empty paragraph used as placeholder
      'p.is-editor-empty',
    ];
    for (const sel of triggerSelectors) {
      const el = this.page.locator(sel).first();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        await el.click({ timeout: 2000 });
        await this.page.waitForTimeout(400);
        for (const edSel of editorSelectors) {
          const editor = this.page.locator(edSel).first();
          if (await editor.isVisible({ timeout: 1000 }).catch(() => false)) return editor;
        }
      }
    }

    throw new Error(
      'Comment input not found. The app may require a different interaction to activate the editor. ' +
      'Inspect the post page when logged in to identify the correct selector.'
    );
  }

  async addComment(text: string): Promise<void> {
    const input = await this.getCommentInput();
    await input.click();
    await input.fill(text);
    const submitBtn = this.page
      .getByRole('button', { name: /^reply$/i })
      .or(this.page.getByRole('button', { name: /^post$/i }))
      .or(this.page.getByRole('button', { name: /^submit comment$/i }))
      .last();
    await submitBtn.click();
  }

  // Navigate to the own-user profile via the header avatar link
  async goToOwnProfile(): Promise<void> {
    // The logged-in user's avatar/profile link appears in the site header
    const ownLink = this.page
      .locator('header a[href*="/profile/"], nav a[href*="/profile/"]')
      .last();
    const href = await ownLink.getAttribute('href', { timeout: 5000 }).catch(() => null);
    if (href) {
      await this.page.goto(`https://staging.talktravel.com${href}`, { waitUntil: 'domcontentloaded' });
    } else {
      // Fallback: click the avatar and wait for profile URL
      await ownLink.click();
      await this.page.waitForURL(/\/profile\/.+/, { timeout: 15000 });
    }
    await this.waitForPageLoad();
  }
}

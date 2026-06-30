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

    this.postTitle  = page.getByRole('heading', { level: 1 });
    // Author link is visible in the post body — exclude the hidden nav-dropdown items
    this.postAuthor = page.locator('a[class*="meta-user"][href*="/profile/"]')
      .or(page.locator('a[href*="/profile/"]:not(.dropdown-item):not(.nav-dropdown-link)').first())
      .first();
    // Tag chips are a.tag-default (confirmed from UserProfileView) — exclude nav dropdown links
    this.topicChip  = page.locator('a.tag-default[href*="/tags/"]')
      .or(page.locator('a[href*="/tags/"]:not(.nav-dropdown-link):not(.dropdown-item)').first())
      .first();

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
    // Explicitly wait for the form to mount before filling — fails fast with a
    // clear message if the login page didn't render, rather than hanging.
    await emailField.waitFor({ state: 'visible', timeout: 30000 });
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
    // Let the feed render before probing for cards.
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Don't blindly take the first DOM match: the lead feed card can be a
    // hidden placeholder (e.g. href="/post/-10") or a title-less image post
    // whose <a> renders hidden, which makes wait-for-visible time out. Pick the
    // first VISIBLE post card whose slug is a real (non-negative) id.
    const firstCard = this.page
      .locator('a[href^="/post/"]:not([href^="/post/-"])')
      .filter({ visible: true })
      .first();
    await firstCard.scrollIntoViewIfNeeded();
    await firstCard.click();           // auto-waits for actionable
    await this.page.waitForURL('**/post/**', { timeout: 30000 });
    // Wait for full React/auth hydration so Quill switches to contenteditable="true"
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
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
    // Scroll to bottom so the comment editor mounts
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const quill = this.page.locator('.ql-editor').first();
    const quillVisible = await quill.isVisible({ timeout: 5000 }).catch(() => false);

    if (quillVisible) {
      // Click the editor — many Quill instances only activate (flip contenteditable)
      // after receiving a click/focus event, even when the user is authenticated.
      await quill.click({ force: true, timeout: 5000 }).catch(() => {});

      try {
        await this.page.waitForFunction(
          () => document.querySelector('.ql-editor')?.getAttribute('contenteditable') === 'true',
          { timeout: 8000 }
        );
        return this.page.locator('.ql-editor[contenteditable="true"]').first();
      } catch {
        // Quill still not editable after click — fall through
      }
    }

    const editorSelectors = [
      '.ql-editor[contenteditable="true"]',
      '[contenteditable="true"]',
      'textarea',
      '[role="textbox"]',
    ];
    for (const sel of editorSelectors) {
      const el = this.page.locator(sel).first();
      if (await el.isVisible({ timeout: 500 }).catch(() => false)) return el;
    }

    throw new Error(
      'Comment input not found or still showing "Please login" placeholder. ' +
      'The Quill editor did not activate after click — check auth state on the post page.'
    );
  }

  async addComment(text: string): Promise<void> {
    const input = await this.getCommentInput();
    await input.click();
    // Quill editors respond better to keyboard type than fill() for rich-text content
    await input.fill(text);
    const submitBtn = this.page
      .getByRole('button', { name: /^reply$/i })
      .or(this.page.getByRole('button', { name: /^post$/i }))
      .or(this.page.getByRole('button', { name: /^submit comment$/i }))
      .last();
    await submitBtn.click();
  }

  // Navigate to the own-user profile.
  // The own profile link is inside a hidden nav dropdown — extract href via evaluate
  // rather than clicking, which avoids opening/closing the dropdown.
  async goToOwnProfile(): Promise<void> {
    // Extract the profile href from the hidden nav dropdown without opening it
    const href = await this.page.evaluate(() => {
      const link = document.querySelector('a.dropdown-item[href*="/profile/"]') as HTMLAnchorElement | null;
      return link?.getAttribute('href') ?? null;
    });
    if (href) {
      await this.page.goto(`https://staging.talktravel.com${href}`, { waitUntil: 'domcontentloaded' });
    } else {
      // Fallback: navigate directly to the confirmed test-account profile
      await this.page.goto('https://staging.talktravel.com/profile/prempoudel_1', { waitUntil: 'domcontentloaded' });
    }
    await this.waitForPageLoad();
  }
}

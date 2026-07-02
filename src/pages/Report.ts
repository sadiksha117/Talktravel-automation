import { type Page, type Locator } from '@playwright/test';
import { PostLoginSinglePostViewPage } from './PostLoginSinglePostView';

/**
 * Page object for the Report (Post / Comment / Reply) flow (docs/Report.md).
 *
 * Report is cross-cutting: the same modal opens from a feed post card, a
 * topic-page post card, a Single Post View post, a comment, or a reply — but
 * ONLY for content NOT authored by the logged-in account. This suite logs in
 * with a single shared test account per-test (see CommentLifecyclePage /
 * EditPostPage for the same pattern), not the two-account setup
 * (`auth/reporter.json` / `auth/target.json`) the doc describes, so "another
 * user's content" is discovered dynamically:
 * `findReportableRow` opens a candidate's 3-dot menu and keeps only rows
 * where "Report" is offered — which the doc itself states is exactly the
 * signal that distinguishes someone else's content from your own (own
 * content shows Edit/Delete instead).
 *
 * Reuses the confirmed login()/openFirstPost()/dismissCookieBanner() helpers
 * and the confirmed `reportDialog` locator from PostLoginSinglePostViewPage.
 * All other selectors here are confirmed via codegen against the live site:
 * the 3-dot trigger on a post is a button named exactly "Post options"; the
 * Report action itself is a plain BUTTON named "Report Post" / "Report
 * Reply" (not a role=menuitem); the reason picker is a react-select
 * (`.custom-select__control`, options render page-level with role="option");
 * the details field is a textbox named "Please provide details about...";
 * and the submit button is labeled exactly "Submit" (not "Submit Report").
 * Selecting reason "Other" makes Additional details required on posts —
 * tests should pick a non-"Other" reason unless specifically testing that.
 *
 * IMPORTANT: on feed/topic-page cards, "Post options" is conditionally
 * RENDERED (not just CSS-hidden) on hover — confirmed by comparing two
 * codegen recordings of the exact same post: a static accessibility
 * snapshot taken without hovering showed no "Post options" anywhere in the
 * card at all, while a recording where the card was actually hovered before
 * clicking showed it right in the link's computed accessible name. Since
 * the element doesn't exist in the DOM until hovered, `.click()`'s built-in
 * auto-hover isn't enough (you can't hover a locator that resolves to
 * nothing) — `findReportableRow` explicitly calls `row.hover()` first to
 * force it to mount before searching for it.
 */
export class ReportPage extends PostLoginSinglePostViewPage {
  // Feed / topic-page post cards (same DOM shape confirmed for Homepage feed)
  readonly feedPostCards: Locator;

  // "Report" trigger — may render as a role=menuitem (posts) or a plain
  // button (comments/replies use plain buttons for Edit/Delete per
  // CommentLifecyclePage, so Report likely follows the same pattern)
  readonly reportAction: Locator;

  // Report modal internals
  readonly modalHeading: Locator;
  readonly reasonDropdown: Locator;
  readonly detailsTextarea: Locator;
  readonly submitReportBtn: Locator;
  readonly cancelReportBtn: Locator;
  readonly confirmationToast: Locator;

  constructor(page: Page) {
    super(page);

    // Title link of each feed/topic-page card — confirmed real <a href="/post/...">
    // via ARIA snapshot. Excludes /post/-N (negative placeholder ids), same
    // exclusion openFirstPost() already relies on for hidden/broken cards.
    // (Deliberately NOT climbing to a "card wrapper" here — see
    // findReportablePostCard() for why.)
    this.feedPostCards = page.locator('a[href^="/post/"]:not([href^="/post/-"])').filter({ visible: true });

    // Confirmed: a plain button, not role=menuitem — "Report Post" on posts,
    // "Report Reply" on replies, presumably "Report"/"Report Comment" on
    // top-level comments. Matched page-level since these render in a portal
    // (same pattern as menuEdit/menuDelete elsewhere in this codebase).
    this.reportAction = page.getByRole('button', { name: /^report/i })
      .or(page.locator('[role="menuitem"]:has-text("Report")'))
      .first();

    this.modalHeading = this.reportDialog.getByRole('heading').first();

    // Confirmed: a react-select control (`.custom-select__input-container`
    // opens it), not a native <select>. Scoped to the outer `__control` —
    // still clickable to open the dropdown, but (per react-select's standard
    // BEM-style class convention) also encloses the `__single-value` display
    // once a reason is picked, so assertions against this locator work too.
    this.reasonDropdown = this.reportDialog.locator('.custom-select__control')
      .or(this.reportDialog.locator('.custom-select__input-container'))
      .or(this.reportDialog.locator('select'))
      .or(this.reportDialog.getByRole('combobox'))
      .first();

    // Confirmed: textbox named "Please provide details about the issue..." (or similar).
    this.detailsTextarea = this.reportDialog.getByRole('textbox', { name: /please provide details/i })
      .or(this.reportDialog.locator('textarea'))
      .first();

    // Confirmed: button labelled exactly "Submit" (not "Submit Report").
    this.submitReportBtn = this.reportDialog.getByRole('button', { name: /^submit$|submit report/i }).first();
    this.cancelReportBtn = this.reportDialog.getByRole('button', { name: /^cancel$/i }).first();

    this.confirmationToast = page.locator('text=/report submitted|thank you for your report|report received/i').first();
  }

  /**
   * The 3-dot/"more" trigger scoped to a single comment/reply row. These use
   * a react-aria button with an unstable auto-generated id but a stable
   * aria-haspopup attribute (same pattern as CommentLifecyclePage.openCommentMenu).
   * NOT used for feed/topic-page posts — see findReportablePostCard() below.
   */
  moreButtonIn(row: Locator): Locator {
    return row.locator('button[aria-haspopup]')
      .or(row.getByRole('button', { name: /more|options?/i }))
      .first();
  }

  /**
   * Scans up to `maxTries` candidates (via `rowAt`/`count`), opening each
   * one's 3-dot menu, and returns the first (or last, with `fromEnd`) row
   * that offers "Report" — i.e. content authored by someone other than the
   * logged-in account. Closes the menu again before returning so callers
   * always start from a known (closed) state and reopen it via
   * `moreButtonIn(row).click()` themselves.
   */
  private async findReportableRow(
    rowAt: (i: number) => Locator,
    count: number,
    opts: { maxTries?: number; fromEnd?: boolean } = {}
  ): Promise<Locator> {
    const maxTries = opts.maxTries ?? 10;
    const tries = Math.min(count, maxTries);
    for (let step = 0; step < tries; step++) {
      const i = opts.fromEnd ? count - 1 - step : step;
      const row = rowAt(i);
      await row.scrollIntoViewIfNeeded().catch(() => {});
      const more = this.moreButtonIn(row);
      const opened = await more.click({ timeout: 5000 }).then(() => true).catch(() => false);
      if (!opened) continue;
      const reportable = await this.reportAction.isVisible({ timeout: 2000 }).catch(() => false);
      await this.page.keyboard.press('Escape').catch(() => {});
      if (reportable) return row;
    }
    throw new Error('Could not find any content authored by another user to report against.');
  }

  /**
   * Finds a feed/topic-page post authored by someone other than the
   * logged-in account. Returns the post's title link (the row) so callers
   * can navigate into it via row.click(), or reopen its menu via
   * openPostOptionsMenu(row).
   *
   * "Post options" only mounts for the currently-HOVERED card — confirmed
   * by comparing two live snapshots of the exact same post: one taken
   * without hovering showed no trace of it anywhere, one taken after
   * hovering showed it right in that card's computed accessible name. This
   * deliberately does NOT climb to a "card wrapper" ancestor first: the
   * accessibility tree collapses plain wrapper <div>s, so what looks like
   * "one level up" there does not reliably map onto the real DOM, and a
   * guessed ancestor depth hovers the wrong element. Instead it hovers the
   * title link itself (a real, confirmed element — hover bubbles through
   * every real ancestor regardless of depth) and then searches PAGE-LEVEL
   * for "Post options", since only the actively-hovered card renders it.
   */
  async findReportablePostCard(): Promise<Locator> {
    const count = await this.feedPostCards.count();
    const tries = Math.min(count, 10);
    for (let i = 0; i < tries; i++) {
      const row = this.feedPostCards.nth(i);
      await row.scrollIntoViewIfNeeded().catch(() => {});
      await row.hover().catch(() => {});
      const trigger = this.page.getByRole('button', { name: 'Post options' }).first();
      const opened = await trigger.click({ timeout: 3000 }).then(() => true).catch(() => false);
      if (!opened) continue;
      const reportable = await this.reportAction.isVisible({ timeout: 2000 }).catch(() => false);
      await this.page.keyboard.press('Escape').catch(() => {});
      if (reportable) return row;
    }
    throw new Error('Could not find any content authored by another user to report against.');
  }

  /** Reopens "Post options" for a row previously returned by findReportablePostCard(). */
  async openPostOptionsMenu(row: Locator): Promise<void> {
    await row.hover().catch(() => {});
    await this.page.getByRole('button', { name: 'Post options' }).first().click();
  }

  /**
   * Finds a comment or reply row (skipping index 0, the post-level upvote)
   * authored by someone else, on the CURRENT post only. `fromEnd` biases
   * toward rows that render later in the thread — typically deeper replies —
   * since exact nesting-level selectors aren't confirmed against the live site.
   */
  async findReportableCommentRow(opts: { fromEnd?: boolean } = {}): Promise<Locator> {
    const upvotes = this.page.locator('button[data-action="upvote"]');
    const total = await upvotes.count();
    const count = Math.max(total - 1, 0);
    return this.findReportableRow(
      i => upvotes.nth(i + 1).locator('xpath=ancestor::*[4]'),
      count,
      opts
    );
  }

  /**
   * Same as findReportableCommentRow(), but tries several different posts
   * from the Trending feed before giving up. openFirstPost() always opens
   * the SAME first feed post, and if that post's comments happen to all be
   * self-authored (or it has none), findReportableCommentRow() would fail
   * deterministically every run rather than flakily — this widens the
   * search across posts instead.
   */
  async findReportableCommentAcrossPosts(opts: { fromEnd?: boolean; maxPosts?: number } = {}): Promise<Locator> {
    await this.goToTrending();
    const count = await this.feedPostCards.count();
    const maxPosts = opts.maxPosts ?? 5;
    const tries = Math.min(count, maxPosts);
    for (let i = 0; i < tries; i++) {
      await this.goToTrending();
      const card = this.feedPostCards.nth(i);
      await card.scrollIntoViewIfNeeded().catch(() => {});
      const opened = await card.click({ timeout: 5000 }).then(() => true).catch(() => false);
      if (!opened) continue;
      await this.page.waitForURL('**/post/**', { timeout: 10000 }).catch(() => {});
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      try {
        return await this.findReportableCommentRow(opts);
      } catch {
        continue;
      }
    }
    throw new Error('Could not find any post with a comment authored by another user to report against.');
  }

  /** Navigates to the Trending feed, tolerating the SPA's transient ERR_ABORTED redirects. */
  async goToTrending(): Promise<void> {
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
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  /** Navigates to the Trending feed, then into the first topic/tag page. */
  async goToFirstTopicPage(): Promise<void> {
    await this.goToTrending();
    // a[href^="/tags/"] also matches the (hidden) nav-dropdown topic list, so
    // scope to a visible chip and exclude that dropdown — same fix already
    // applied to topicChip in PostLoginSinglePostViewPage.
    const topicChip = this.page
      .locator('a.tag-default[href*="/tags/"]')
      .or(this.page.locator('a[href^="/tags/"]:not(.nav-dropdown-link):not(.dropdown-item)').filter({ visible: true }))
      .first();
    await topicChip.waitFor({ state: 'visible' });
    await topicChip.click();
    await this.page.waitForURL('**/tags/**');
    await this.waitForPageLoad();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  /** Clicks the already-open "Report" menu item and waits for the modal. */
  async openReportModal(): Promise<void> {
    await this.reportAction.click();
    await this.reportDialog.waitFor({ state: 'visible', timeout: 10000 });
  }

  /** Opens the Report modal for the current Single Post View's post. */
  async openReportModalForCurrentPost(): Promise<void> {
    // Prefer the confirmed "Post options" name over the base class's generic
    // postMoreBtn fallback chain, which doesn't include that exact name.
    const trigger = this.page.getByRole('button', { name: 'Post options' }).or(this.postMoreBtn).first();
    await trigger.click();
    await this.openReportModal();
  }

  /**
   * Reads the list of available reasons without hardcoding them. Always
   * closes the dropdown before returning (Escape) so a following
   * selectReason() call reopens it from a known-closed state — leaving it
   * open caused selectReason()'s own click to TOGGLE it shut instead of
   * opening it, since react-select treats a click on an already-open
   * control as a close.
   */
  async getReasonOptions(): Promise<string[]> {
    await this.reasonDropdown.click();
    const tagName = await this.reasonDropdown.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
    const options = tagName === 'select'
      ? await this.reasonDropdown.locator('option').allTextContents()
      : await this.page.getByRole('option').allTextContents();
    await this.page.keyboard.press('Escape').catch(() => {});
    return options.map(o => o.trim()).filter(Boolean);
  }

  /** Selects a reason by its visible text, handling both native <select> and custom dropdowns. */
  async selectReason(name: string): Promise<void> {
    const tagName = await this.reasonDropdown.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'select') {
      await this.reasonDropdown.selectOption({ label: name });
      return;
    }
    await this.reasonDropdown.click();
    const option = this.page.getByRole('option', { name, exact: false })
      .or(this.page.getByText(name, { exact: false }))
      .first();
    await option.click();
  }

  async fillAdditionalDetails(text: string): Promise<void> {
    await this.detailsTextarea.fill(text);
  }

  async submitReport(): Promise<void> {
    await this.submitReportBtn.click();
  }
}

import { type Page, type Locator } from '@playwright/test';
import { PostLoginSinglePostViewPage } from './PostLoginSinglePostView';

/**
 * Page object for the Delete Post (Post-Login) flow.
 *
 * Delete Post is owner-only and irreversible, so the positive-flow tests never
 * touch pre-existing data: each test seeds a throwaway post through the real
 * Create Post UI and then deletes that. Two outcomes are exercised — a post
 * WITHOUT comments is removed permanently (URL → 404), a post WITH comments is
 * replaced by a "Deleted by author" placeholder (URL still resolves, comments
 * stay visible).
 *
 * Like EditPostPage, this reuses the *confirmed* real-site locators (role-based
 * Title / Topics inputs, the Quill `.ql-editor` body, the "Post options" 3-dot
 * button) rather than the speculative `data-testid` selectors in
 * docs/DeletePost.md, which the doc itself flags as unconfirmed.
 *
 * Navigation (login, cookie banner, comments) is inherited from
 * PostLoginSinglePostViewPage.
 */
export class DeletePostPage extends PostLoginSinglePostViewPage {
  // Create Post form (used only to seed a disposable post to delete)
  readonly createPostLink: Locator;
  readonly titleInput: Locator;
  readonly discussionEditor: Locator;
  readonly topicsInput: Locator;
  readonly publishBtn: Locator;

  // 3-dot menu item that opens the delete confirmation ("Delete Post" on the
  // feed / single view, "Delete" in the My Posts list)
  readonly menuDeletePost: Locator;

  // Confirmation dialog and its two actions
  readonly confirmDialog: Locator;
  readonly confirmDeleteBtn: Locator;
  readonly cancelDeleteBtn: Locator;

  // "Deleted by author" placeholder shown after deleting a post that has comments
  readonly deletedPlaceholder: Locator;

  // "Post not found" / 404 state shown for a permanently-deleted post
  readonly notFoundState: Locator;

  constructor(page: Page) {
    super(page);

    this.createPostLink = page.getByRole('link', { name: 'TalkTravel Create Post' })
      .or(page.getByRole('link', { name: /create post/i }))
      .first();
    this.titleInput       = page.getByRole('textbox', { name: 'Title *' });
    this.discussionEditor = page.locator('.ql-editor').first();
    this.topicsInput      = page.getByRole('textbox', { name: 'Topics *' });
    this.publishBtn       = page.getByRole('button', { name: 'Publish Post' });

    this.menuDeletePost = page.locator('[role="menuitem"]:has-text("Delete")')
      .or(page.getByRole('menuitem', { name: /^delete( post)?$/i }))
      .or(page.getByText(/^delete( post)?$/i))
      .first();

    // Dialog may be role="dialog" or role="alertdialog"
    this.confirmDialog = page.locator('[role="dialog"], [role="alertdialog"]').first();
    this.confirmDeleteBtn = this.confirmDialog
      .getByRole('button', { name: /^delete( post)?$/i })
      .first();
    this.cancelDeleteBtn = this.confirmDialog
      .getByRole('button', { name: /^cancel$/i })
      .first();

    this.deletedPlaceholder = page.locator('[data-testid="post-deleted-placeholder"]')
      .or(page.getByText(/deleted by author|post deleted/i))
      .first();

    this.notFoundState = page.getByText(/not found|404|no longer (exists|available)/i).first();
  }

  /** Returns the slug segment of the current /post/{slug}[/edit] URL. */
  currentPostSlug(): string {
    const match = this.page.url().match(/\/post\/([^/?#]+)/);
    return match ? match[1] : '';
  }

  /** True when the browser is on a Single Post View URL (/post/{slug}). */
  isOnPostUrl(slug?: string): boolean {
    if (slug) return new RegExp(`/post/${slug}(?:[/?#]|$)`).test(this.page.url());
    return /\/post\/[^/?#]+/.test(this.page.url());
  }

  /**
   * Seed a throwaway post through the Create Post UI and land on its Single Post
   * View. Returns the new post's slug. `withComment`, when true, also leaves one
   * comment on the post so the placeholder branch can be exercised.
   */
  async createDisposablePost(
    title: string,
    opts: { body?: string; topic?: string; withComment?: string } = {},
  ): Promise<string> {
    const { body, topic = 'Hilton', withComment } = opts;

    await this.dismissCookieBanner();
    await this.createPostLink.waitFor({ state: 'visible', timeout: 60000 });
    await this.createPostLink.click();
    await this.titleInput.waitFor({ state: 'visible', timeout: 15000 });

    await this.titleInput.fill(title);
    if (body) {
      await this.discussionEditor.click();
      await this.discussionEditor.fill(body);
    }
    await this.selectTopicByName(topic);
    await this.dismissCookieBanner();
    await this.publishBtn.click({ force: true });

    await this.page.waitForURL(/\/post\/[a-z0-9-]+/, { timeout: 20000 });
    await this.page.waitForLoadState('load').catch(() => {});
    const slug = this.currentPostSlug();

    if (withComment) {
      await this.addComment(withComment);
      // Re-open the post cleanly so the page isn't mid-comment-submit when the
      // delete flow starts.
      await this.page.goto(`https://staging.talktravel.com/post/${slug}`, {
        waitUntil: 'domcontentloaded',
      });
    }
    return slug;
  }

  /** Select a topic from the async/debounced Topics dropdown (same as Create Post). */
  async selectTopicByName(topicName: string): Promise<void> {
    await this.topicsInput.fill(topicName);
    const option = this.page
      .getByRole('listbox')
      .getByText(topicName, { exact: true })
      .filter({ hasNotText: 'Create new topic' });
    await option.first().waitFor({ state: 'visible', timeout: 15000 });
    await option.first().click();
  }

  /**
   * Open the 3-dot menu on the current Single Post View and click Delete, which
   * opens the confirmation dialog (it must NOT delete immediately). Returns true
   * once the dialog is visible, false if no Delete option exists (e.g. not owner).
   */
  async openDeleteDialog(): Promise<boolean> {
    const moreBtn = this.page.getByRole('button', { name: /post options/i }).first();
    await moreBtn.click({ timeout: 10000 }).catch(() => {});
    if (!(await this.menuDeletePost.isVisible({ timeout: 5000 }).catch(() => false))) {
      return false;
    }
    await this.menuDeletePost.click();
    return this.confirmDialog.isVisible({ timeout: 10000 }).catch(() => false);
  }

  /** Confirm the deletion from the open dialog. */
  async confirmDelete(): Promise<void> {
    await this.confirmDeleteBtn.click({ force: true });
    await this.confirmDialog.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  /** Dismiss the deletion via the dialog's Cancel button. */
  async cancelDelete(): Promise<void> {
    await this.cancelDeleteBtn.click();
    await this.confirmDialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }
}

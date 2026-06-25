import { type Page, type Locator } from '@playwright/test';
import { PostLoginSinglePostViewPage } from './PostLoginSinglePostView';

/**
 * Page object for the Delete Post (Post-Login) flow.
 *
 * Delete Post is owner-only and irreversible, so the positive-flow tests never
 * touch pre-existing data: each test seeds a throwaway post (via the proven
 * CreatePostPage flow) and then deletes that. Two outcomes are exercised — a
 * post WITHOUT comments is removed permanently (URL → 404), a post WITH comments
 * is replaced by a "Deleted by author" placeholder (URL still resolves, comments
 * stay visible).
 *
 * Like EditPostPage, this reuses the *confirmed* real-site locators (the "Post
 * options" 3-dot button, role="dialog" confirmation) rather than the speculative
 * `data-testid` selectors in docs/DeletePost.md, which the doc itself flags as
 * unconfirmed. Login, cookie banner and commenting are inherited from
 * PostLoginSinglePostViewPage.
 */
export class DeletePostPage extends PostLoginSinglePostViewPage {
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

  /** Returns the slug segment of the current /post/{slug} URL. */
  currentPostSlug(): string {
    const match = this.page.url().match(/\/post\/([^/?#]+)/);
    return match ? match[1] : '';
  }

  /** True when the browser is on a Single Post View URL (/post/{slug}). */
  isOnPostUrl(slug?: string): boolean {
    if (slug) return new RegExp(`/post/${slug}(?:[/?#]|$)`).test(this.page.url());
    return /\/post\/[^/?#]+/.test(this.page.url());
  }

  /** Open a post's Single Post View directly by slug. */
  async gotoPost(slug: string): Promise<void> {
    await this.page.goto(`https://staging.talktravel.com/post/${slug}`, {
      waitUntil: 'domcontentloaded',
    });
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

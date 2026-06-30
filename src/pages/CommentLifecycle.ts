import { type Page, type Locator } from '@playwright/test';
import { PostLoginSinglePostViewPage } from './PostLoginSinglePostView';

/**
 * Page object for the Comment Lifecycle flow (docs/Comment_lifecycle.md).
 *
 * Extends PostLoginSinglePostViewPage to reuse the confirmed login(),
 * openFirstPost() and getCommentInput() helpers, and centralises the
 * comment-specific locators so specs reference named, appropriate selectors
 * instead of ad-hoc ones. Selector choices follow the conventions already
 * confirmed in this codebase:
 *   - comment editor      → Quill `.ql-editor` (via getCommentInput)
 *   - submit / reply      → button with accessible name reply/post/submit
 *   - comment vote        → button[data-action="upvote|downvote"] (post is .first, comment is .nth(1))
 *   - 3-dot menu items    → [role="menuitem"]
 *   - delete confirm      → [role="dialog"]
 *   - edited label        → text=/Edited/i
 */
export class CommentLifecyclePage extends PostLoginSinglePostViewPage {
  // Editor / submit
  readonly commentSubmitBtn: Locator;
  readonly replySubmitBtn: Locator;
  readonly loginPrompt: Locator;

  // Comment-level actions (index 1 — index 0 is the post-level action)
  readonly commentUpvoteBtn: Locator;
  readonly commentDownvoteBtn: Locator;
  readonly commentShareBtn: Locator;

  // 3-dot menu items
  readonly menuEditItem: Locator;
  readonly menuDeleteItem: Locator;

  // Edit / delete affordances
  readonly editSaveBtn: Locator;
  readonly deleteDialog: Locator;
  readonly deleteConfirmBtn: Locator;
  readonly editedLabel: Locator;

  constructor(page: Page) {
    super(page);

    this.commentSubmitBtn = page.getByRole('button', { name: /^reply$|^post$|^submit/i }).last();
    this.replySubmitBtn   = page.getByRole('button', { name: /^reply$/i }).last();
    this.loginPrompt      = page.getByText(/please login to add a reply/i);

    this.commentUpvoteBtn   = page.locator('button[data-action="upvote"]').nth(1);
    this.commentDownvoteBtn = page.locator('button[data-action="downvote"]').nth(1);
    this.commentShareBtn    = page.getByRole('button', { name: /share/i }).nth(1);

    this.menuEditItem   = page.getByRole('menuitem', { name: /edit/i })
      .or(page.locator('[role="menuitem"]:has-text("Edit")')).first();
    this.menuDeleteItem = page.getByRole('menuitem', { name: /delete/i })
      .or(page.locator('[role="menuitem"]:has-text("Delete")')).first();

    this.editSaveBtn      = page.getByRole('button', { name: /save|update|done/i }).first();
    this.deleteDialog     = page.getByRole('dialog');
    this.deleteConfirmBtn = this.deleteDialog.getByRole('button', { name: /^delete$/i })
      .or(page.locator('[role="dialog"] button:has-text("Delete")')).first();
    this.editedLabel      = page.locator('text=/Edited/i');
  }

  /**
   * Locates the comment row wrapper that contains `text`. The visible comment
   * text sits a few nodes below the row that also holds the action buttons;
   * ancestor::*[4] climbs to that wrapper (pattern confirmed in the existing
   * PostLoginSinglePostView happy-path spec).
   */
  commentRow(text: string): Locator {
    return this.page.getByText(text).first().locator('xpath=ancestor::*[4]');
  }

  /** The inline editor that appears after clicking Reply or Edit. */
  activeInlineEditor(): Locator {
    return this.page.locator('.ql-editor[contenteditable="true"]')
      .or(this.page.locator('[contenteditable="true"]'))
      .or(this.page.locator('textarea'))
      .last();
  }

  /** Fills the top-level comment editor and submits. Returns false if the editor never activated. */
  async addTopLevelComment(text: string): Promise<boolean> {
    let input: Locator;
    try {
      input = await this.getCommentInput();
    } catch {
      return false;
    }
    await input.click();
    await input.fill(text);
    await this.commentSubmitBtn.click();
    await this.page.getByText(text).first().waitFor({ state: 'visible', timeout: 15000 });
    return true;
  }

  /** Opens the inline reply box under the given comment row, submits `text`. */
  async replyTo(row: Locator, text: string): Promise<void> {
    await row.getByRole('button', { name: /reply/i }).first().click();
    const replyInput = this.activeInlineEditor();
    await replyInput.waitFor({ state: 'visible', timeout: 5000 });
    await replyInput.fill(text);
    await this.replySubmitBtn.click();
    await this.page.getByText(text).first().waitFor({ state: 'visible', timeout: 15000 });
  }

  /** Opens the 3-dot menu on the given comment row. */
  async openCommentMenu(row: Locator): Promise<void> {
    await row.getByRole('button', { name: /more|options/i }).first().click();
  }
}

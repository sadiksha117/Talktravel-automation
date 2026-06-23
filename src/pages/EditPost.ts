import { type Page, type Locator } from '@playwright/test';
import { PostLoginSinglePostViewPage } from './PostLoginSinglePostView';

/**
 * Page object for the Edit Post (Post-Login) flow.
 *
 * Edit Post is owner-only and the form is structurally identical to Create Post,
 * just pre-filled with the post's current values. This object therefore reuses
 * the *confirmed* real-site form locators (role-based Title / External Link /
 * Topics inputs and the Quill `.ql-editor` discussion body) rather than the
 * speculative `data-testid` selectors in docs/Editpost.md, which the doc itself
 * flags as unconfirmed.
 *
 * Navigation (login, opening a post, cookie banner) is reused from
 * PostLoginSinglePostViewPage.
 */
export class EditPostPage extends PostLoginSinglePostViewPage {
  // Edit form fields (same controls as Create Post, pre-filled)
  readonly titleInput: Locator;
  readonly discussionEditor: Locator;
  readonly externalLinkInput: Locator;
  readonly topicsInput: Locator;
  readonly selectedTopicChips: Locator;

  // Edit form actions
  readonly updatePostBtn: Locator;
  readonly cancelBtn: Locator;
  readonly fetchTitleBtn: Locator;

  // 3-dot menu item that opens the edit form ("Edit Post" on feed/single view,
  // "Edit" in the My Posts list)
  readonly menuEditPost: Locator;

  // "Edited" label/timestamp shown on the Single Post View after a successful update
  readonly editedLabel: Locator;

  // Left-nav "My Posts" entry point
  readonly myPostsLink: Locator;

  constructor(page: Page) {
    super(page);

    this.titleInput        = page.getByRole('textbox', { name: 'Title *' });
    this.discussionEditor  = page.locator('.ql-editor').first();
    this.externalLinkInput = page.getByRole('textbox', { name: 'External Link' });
    this.topicsInput       = page.getByRole('textbox', { name: 'Topics *' });
    // Each selected topic renders a chip with a "Remove {topic}" button. Count
    // and locate topics by that button — it's exactly one per selected topic,
    // unlike a broad [class*="tag"] match which also hits unrelated elements.
    this.selectedTopicChips = page.getByRole('button', { name: /^Remove\s+/i });

    this.updatePostBtn = page.getByRole('button', { name: /update post/i })
      .or(page.getByRole('button', { name: /^update$|save changes|^save$/i }))
      .first();
    this.cancelBtn = page.getByRole('button', { name: /^cancel$/i }).first();
    this.fetchTitleBtn = page.getByRole('button', { name: /fetch title/i }).first();

    this.menuEditPost = page.locator('[role="menuitem"]:has-text("Edit")')
      .or(page.getByRole('menuitem', { name: /^edit( post)?$/i }))
      .or(page.getByText(/^edit( post)?$/i))
      .first();

    this.editedLabel = page.locator('[data-testid="edited-label"]')
      .or(page.getByText(/edited/i))
      .first();

    this.myPostsLink = page.getByRole('link', { name: /my posts/i }).first();
  }

  /** Returns the slug segment of the current /post/{slug}[/edit] URL. */
  currentPostSlug(): string {
    const match = this.page.url().match(/\/post\/([^/?#]+)/);
    return match ? match[1] : '';
  }

  /** True when the browser is on an Edit Post form URL (e.g. /post/{slug}/edit). */
  isOnEditUrl(): boolean {
    return /\/post\/[^/?#]+\/edit/.test(this.page.url()) || /\/edit-post\//.test(this.page.url());
  }

  /** Navigate directly to a post's edit form by slug. */
  async gotoEdit(slug: string): Promise<void> {
    await this.page.goto(`https://staging.talktravel.com/post/${slug}/edit`, {
      waitUntil: 'domcontentloaded',
    });
  }

  /**
   * Open the 3-dot menu on the current Single Post View and click the Edit item.
   * Returns true if the edit form was reached, false if no Edit option exists
   * (e.g. the current user is not the author).
   */
  async openEditFromSinglePost(): Promise<boolean> {
    // The post header 3-dot button is labelled "Post options".
    const moreBtn = this.page.getByRole('button', { name: /post options/i }).first();
    await moreBtn.click({ timeout: 10000 }).catch(() => {});
    if (!(await this.menuEditPost.isVisible({ timeout: 5000 }).catch(() => false))) {
      return false;
    }
    await this.menuEditPost.click();
    await this.titleInput.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    return true;
  }

  /**
   * Entry point used by most tests: log in, open one of the author's *own*
   * posts (via My Posts, which only lists the current user's posts), and land
   * on its edit form. Going through My Posts guarantees ownership — the
   * trending feed surfaces other users' posts, which have no Edit option.
   */
  async openOwnPostEdit(): Promise<void> {
    await this.goToMyPosts();
    const firstOwnPost = this.page.locator('a[href^="/post/"]').first();
    await firstOwnPost.waitFor({ state: 'visible', timeout: 15000 });
    await firstOwnPost.click();
    await this.page.waitForURL('**/post/**', { timeout: 30000 });
    const opened = await this.openEditFromSinglePost();
    if (!opened) {
      throw new Error(
        'No "Edit" option on the first My Posts entry — confirm the test account ' +
        'has at least one published post it owns.'
      );
    }
  }

  /** Open the author's My Posts list (left nav). */
  async goToMyPosts(): Promise<void> {
    await this.dismissCookieBanner();
    if (await this.myPostsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.myPostsLink.click();
    } else {
      // Fallback: the My Posts tab on the own profile.
      await this.page.goto(
        'https://staging.talktravel.com/profile/prempoudel_1?profile_active_tab=posts',
        { waitUntil: 'domcontentloaded' }
      );
    }
    await this.page.waitForLoadState('load').catch(() => {});
  }

  /** Select a topic from the async/debounced Topics dropdown (same as Create Post). */
  async selectTopic(topicName: string): Promise<void> {
    await this.topicsInput.fill(topicName);
    const option = this.page
      .getByRole('listbox')
      .getByText(topicName, { exact: true })
      .filter({ hasNotText: 'Create new topic' });
    await option.first().waitFor({ state: 'visible', timeout: 15000 });
    await option.first().click();
  }

  /** Remove a selected topic chip by its visible label. */
  async removeSelectedTopic(topicName: string): Promise<void> {
    await this.page
      .getByRole('button', { name: new RegExp(`^Remove\\s+${topicName}`, 'i') })
      .first()
      .click();
  }

  /** Remove every currently-selected topic chip. */
  async removeAllTopics(): Promise<void> {
    // Re-query after each removal since the list shrinks.
    for (let i = 0; i < 10; i++) {
      const remaining = await this.selectedTopicChips.count();
      if (remaining === 0) break;
      await this.selectedTopicChips.first().click().catch(() => {});
      await this.page.waitForTimeout(200);
    }
  }

  /** Submit the edit form. */
  async submitUpdate(): Promise<void> {
    await this.updatePostBtn.click({ force: true });
  }
}

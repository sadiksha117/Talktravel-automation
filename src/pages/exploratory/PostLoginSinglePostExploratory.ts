import { type Page, type Locator } from '@playwright/test';
import { PostLoginSinglePostViewPage } from '../PostLoginSinglePostView';

/**
 * Exploratory page object for the authenticated Single Post View flow.
 *
 * Reuses the happy-path login() / openFirstPost() helpers from
 * PostLoginSinglePostViewPage and adds a few extra locators used only by the
 * edge / negative / security / accessibility exploratory checks.
 */
export class PostLoginSinglePostExploratoryPage extends PostLoginSinglePostViewPage {
  // Generic comment submit button (Quill "Reply"/"Post"/"Submit")
  readonly commentSubmitBtn: Locator;
  // Login redirect prompt (should never appear for an authenticated user)
  readonly loginPrompt: Locator;
  // Site logo (returns to home feed)
  readonly logo: Locator;

  constructor(page: Page) {
    super(page);

    this.commentSubmitBtn = page
      .getByRole('button', { name: /^reply$|^post$|^submit/i })
      .last();
    this.loginPrompt = page.getByText(/please login to add a reply/i);
    this.logo = page.locator('a[href="/"], a[href="https://staging.talktravel.com/"]').first();
  }

  /** Returns the slug segment of the current /post/{slug} URL. */
  currentPostSlug(): string {
    const match = this.page.url().match(/\/post\/([^/?#]+)/);
    return match ? match[1] : '';
  }
}

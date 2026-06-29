import { type Page, type Locator } from '@playwright/test';
import { EditPostPage } from '../EditPost';

/**
 * Exploratory page object for the Edit Post flow.
 *
 * Reuses the happy-path helpers from EditPostPage (login, openOwnPostEdit,
 * gotoEdit, topic helpers, real `.autocomplete-tag-pill` selectors) and adds
 * locators used only by the edge / negative / security / accessibility checks.
 */
export class EditPostExploratoryPage extends EditPostPage {
  // Logged-out detection (password field on the login form)
  readonly loginPasswordField: Locator;
  // "Post not found" / error surfaces
  readonly notFound: Locator;
  // Generic inline validation message
  readonly anyValidationError: Locator;
  // Max-topics messaging
  readonly maxTopicsError: Locator;
  // Page main heading ("Edit Post")
  readonly editHeading: Locator;
  // Rich-text toolbar buttons (bold/italic/...)
  readonly toolbarButtons: Locator;

  constructor(page: Page) {
    super(page);

    this.loginPasswordField = page.locator('input[type="password"]').first();
    this.notFound = page
      .getByText(/not found|404|doesn'?t exist|does not exist|no longer available|something went wrong/i)
      .first();
    this.anyValidationError = page
      .getByText(/required|invalid|must|at least|maximum|valid url|cannot be empty/i)
      .first();
    this.maxTopicsError = page.getByText(/maximum 5 topics|max.*5.*topic|up to 5|only.*5/i).first();
    this.editHeading = page.getByRole('heading', { name: /edit post/i });
    this.toolbarButtons = page.locator('.ql-toolbar button');
  }

  /** Log in and land on an owned post's edit form; returns the post slug. */
  async openEditForm(email: string, password: string): Promise<string> {
    await this.login(email, password);
    await this.openOwnPostEdit();
    return this.currentPostSlug();
  }

  /** True if the current page looks logged-out (login link or password field). */
  async isLoggedOut(): Promise<boolean> {
    if (/\/login/.test(this.page.url())) return true;
    if (await this.loginPasswordField.isVisible({ timeout: 3000 }).catch(() => false)) return true;
    return await this.page
      .getByRole('link', { name: /^log ?in$|join free/i })
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
  }
}

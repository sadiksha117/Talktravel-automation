import { type Page, type Locator } from '@playwright/test';
import { EditPostPage } from '../EditPost';

/**
 * Exploratory page object for the Edit Post flow.
 *
 * Reuses the happy-path helpers from EditPostPage (login, openOwnPostEdit,
 * gotoEdit, topic helpers) and adds locators used only by the edge / negative
 * / security / accessibility exploratory checks.
 */
export class EditPostExploratoryPage extends EditPostPage {
  // Login redirect form (should appear when a logged-out user hits /edit)
  readonly loginForm: Locator;
  // Generic "not found" / error surface
  readonly notFound: Locator;
  // Max-topics / duplicate validation messaging
  readonly maxTopicsError: Locator;

  constructor(page: Page) {
    super(page);

    this.loginForm = page.locator('input[type="password"]').first();
    this.notFound = page.getByText(/not found|404|doesn't exist|does not exist|no longer available/i).first();
    this.maxTopicsError = page.getByText(/maximum 5 topics|max.*5.*topic|up to 5/i).first();
  }
}

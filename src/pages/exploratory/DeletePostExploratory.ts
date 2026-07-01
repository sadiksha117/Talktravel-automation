import { type Page, type Locator } from '@playwright/test';
import { DeletePostPage } from '../DeletePost';

/**
 * Exploratory page object for the Delete Post (Post-Login) flow.
 *
 * Reuses the happy-path delete helpers from DeletePostPage (openDeleteDialog,
 * confirmDelete, cancelDelete, gotoPost, the dialog/placeholder/not-found
 * locators) and adds just enough of the Create Post form to seed a disposable,
 * owner-controlled post for each edge / negative / security / a11y check.
 *
 * Delete is irreversible, so every exploratory test seeds its OWN throwaway
 * post (with a freshly-created, uniquely-named topic — existing topic names on
 * staging are not stable) and operates on that; no pre-existing data is touched.
 */
export class DeletePostExploratoryPage extends DeletePostPage {
  // Create Post form (used only to seed a disposable post)
  readonly titleInput: Locator;
  readonly topicsInput: Locator;
  readonly publishBtn: Locator;

  // Post header 3-dot ("Post options") button
  readonly postOptionsBtn: Locator;

  // Confirmation dialog heading (accessible-name source)
  readonly dialogHeading: Locator;

  constructor(page: Page) {
    super(page);

    this.titleInput  = page.getByRole('textbox', { name: 'Title *' });
    this.topicsInput = page.getByRole('textbox', { name: 'Topics *' });
    this.publishBtn  = page.getByRole('button', { name: 'Publish Post' });

    this.postOptionsBtn = page.getByRole('button', { name: /post options/i }).first();
    this.dialogHeading  = this.confirmDialog.getByRole('heading').first();
  }

  /**
   * Create a throwaway post via the /create-post page and land on its Single
   * Post View. Returns the new post's slug. Retries the navigation because
   * staging intermittently returns ERR_ABORTED / is slow to render the form.
   */
  async seedDisposablePost(title: string): Promise<string> {
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await this.page.goto('https://staging.talktravel.com/create-post', { waitUntil: 'domcontentloaded' });
        await this.titleInput.waitFor({ state: 'visible', timeout: 25000 });
        break;
      } catch (err) {
        if (attempt === 4) throw err;
        await this.page.waitForTimeout(attempt * 2000);
      }
    }
    await this.titleInput.fill(title);
    await this.addFreshTopic(`qa-${Date.now()}`);
    await this.dismissCookieBanner();
    await this.publishBtn.click({ force: true });
    await this.page.waitForURL(/\/post\/[a-z0-9-]+/, { timeout: 20000 });
    await this.page.waitForLoadState('load').catch(() => {});
    return this.currentPostSlug();
  }

  /**
   * Add a topic by creating a fresh, uniquely-named one through the "Create new
   * topic" dialog — keeps the create form valid without depending on which
   * topics happen to exist on staging.
   */
  async addFreshTopic(name: string): Promise<void> {
    await this.topicsInput.fill(name);
    const listbox = this.page.getByRole('listbox');
    const createBtn = listbox.getByRole('button', { name: /create new topic/i }).first();
    await createBtn.waitFor({ state: 'visible', timeout: 15000 });
    await createBtn.click();
    const dialog = this.page.getByRole('dialog').filter({ hasText: /create new topic/i }).first();
    await dialog.getByRole('button', { name: /^create topic$/i }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }
}

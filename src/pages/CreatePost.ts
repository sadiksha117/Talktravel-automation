import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class CreatePostPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly logInLink: Locator;
  readonly logInBtn: Locator;
  readonly createPostBtn: Locator;
  readonly titleInput: Locator;
  readonly discussionEditor: Locator;
  readonly externalLinkInput: Locator;
  readonly topicsInput: Locator;
  readonly publishBtn: Locator;
  readonly cancelBtn: Locator;

  constructor(page: Page) {
    super(page);

    this.emailInput = page.getByRole('textbox', { name: 'Email, username, or phone *' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password * Forgot password?' });
    this.logInLink = page.getByRole('link', { name: 'Log in' });
    this.logInBtn = page.getByRole('button', { name: 'Log In' });
    this.createPostBtn = page.getByRole('link', { name: 'TalkTravel Create Post' });
    this.titleInput = page.getByRole('textbox', { name: 'Title *' });
    this.discussionEditor = page.locator('.ql-editor');
    this.externalLinkInput = page.getByRole('textbox', { name: 'External Link' });
    this.topicsInput = page.getByRole('textbox', { name: 'Topics *' });
    this.publishBtn = page.getByRole('button', { name: 'Publish Post' });
    this.cancelBtn = page.getByRole('button', { name: /cancel|close/i }).or(page.locator('button[aria-label*="close" i], button[aria-label*="cancel" i], .modal .btn-close, .modal-header button')).first();
  }

  async loginAndGoToCreatePost(email: string, password: string): Promise<void> {
    await this.page.goto('https://staging.talktravel.com/', { waitUntil: 'domcontentloaded' });
    await this.logInLink.click();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.logInBtn.click();
    await this.page.waitForURL(/staging\.talktravel\.com\/.+/);
    // Wait for Create Post link to appear — avoids waitForLoadState hang on SPA
    await this.createPostBtn.waitFor({ state: 'visible', timeout: 60000 });
    await this.createPostBtn.click();
    // Create Post opens a modal — wait for the form title rather than a page load
    await this.titleInput.waitFor({ state: 'visible', timeout: 15000 });
  }

  async dismissCookieBanner(): Promise<void> {
    try {
      await this.page.getByRole('button', { name: 'Accept All' }).click({ timeout: 3000 });
    } catch {
      // Banner not present
    }
  }

  async selectTopic(topicName: string): Promise<void> {
    await this.topicsInput.fill(topicName);
    // Wait for the dropdown to open
    await this.page.getByRole('listbox').waitFor({ state: 'visible' });
    // Prefer an existing option; fall back to "Create new topic" button
    const existingOption = this.page.getByRole('option', { name: topicName, exact: true });
    const createOption = this.page.getByRole('button', { name: new RegExp(`Create new topic.*${topicName}`, 'i') });
    const exists = await existingOption.isVisible().catch(() => false);
    if (exists) {
      await existingOption.click();
    } else {
      await createOption.waitFor({ state: 'visible' });
      await createOption.click();
    }
  }

  async removeSelectedTopic(topicName: string): Promise<void> {
    await this.page.locator('div').filter({ hasText: new RegExp(`^${topicName}×$`) }).getByText('×').click();
  }
}

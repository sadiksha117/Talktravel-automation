import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class CreatePostPage extends BasePage {
  readonly createPostBtn: Locator;
  readonly titleInput: Locator;
  readonly discussionEditor: Locator;
  readonly boldBtn: Locator;
  readonly italicBtn: Locator;
  readonly underlineBtn: Locator;
  readonly quoteBtn: Locator;
  readonly listBtn: Locator;
  readonly linkBtn: Locator;
  readonly imageBtn: Locator;
  readonly externalLinkInput: Locator;
  readonly fetchTitleBtn: Locator;
  readonly topicsInput: Locator;
  readonly selectedTopicChips: Locator;
  readonly publishBtn: Locator;
  readonly cancelBtn: Locator;

  constructor(page: Page) {
    super(page);

    this.createPostBtn = page
      .locator('[data-testid="create-post"]')
      .or(page.getByRole('link', { name: /create post/i }))
      .or(page.getByRole('button', { name: /create post/i }))
      .first();

    this.titleInput = page
      .locator('[data-testid="post-title"]')
      .or(page.locator('input[name="title"]'))
      .first();

    this.discussionEditor = page
      .locator('[data-testid="post-discussion"] [contenteditable="true"]')
      .or(page.locator('[contenteditable="true"]'))
      .first();

    this.boldBtn = page.locator('button[aria-label="Bold"]').or(page.getByRole('button', { name: /bold/i })).first();
    this.italicBtn = page.locator('button[aria-label="Italic"]').or(page.getByRole('button', { name: /italic/i })).first();
    this.underlineBtn = page.locator('button[aria-label="Underline"]').or(page.getByRole('button', { name: /underline/i })).first();
    this.quoteBtn = page.locator('button[aria-label="Quote"]').or(page.getByRole('button', { name: /quote/i })).first();
    this.listBtn = page.locator('button[aria-label="List"]').or(page.getByRole('button', { name: /list/i })).first();
    this.linkBtn = page.locator('button[aria-label="Insert link"]').or(page.getByRole('button', { name: /insert link/i })).first();
    this.imageBtn = page.locator('button[aria-label="Insert image"]').or(page.getByRole('button', { name: /insert image/i })).first();

    this.externalLinkInput = page
      .locator('[data-testid="external-link"]')
      .or(page.locator('input[name="externalLink"]'))
      .first();

    this.fetchTitleBtn = page.getByRole('button', { name: /fetch title/i });

    this.topicsInput = page
      .locator('[data-testid="topics-input"]')
      .or(page.locator('input[placeholder*="topic" i]'))
      .first();

    this.selectedTopicChips = page.locator('[data-testid="topic-chip-selected"]');

    this.publishBtn = page.getByRole('button', { name: /publish post/i });
    this.cancelBtn = page.getByRole('button', { name: /cancel/i });
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.goto('https://staging.talktravel.com/login');
    await this.waitForPageLoad();
    const loginField = this.page
      .getByRole('textbox', { name: /email|username|phone/i })
      .or(this.page.locator('input[type="email"]'))
      .first();
    const passwordField = this.page.locator('input[type="password"]').first();
    const submitBtn = this.page
      .locator('button[type="submit"]')
      .or(this.page.getByRole('button', { name: /log in|sign in/i }))
      .first();
    await loginField.fill(email);
    await passwordField.fill(password);
    await submitBtn.click();
    await this.page.waitForURL(/staging\.talktravel\.com\/.+/);
    await this.waitForPageLoad();
  }

  async dismissCookieBanner(): Promise<void> {
    try {
      await this.page.getByRole('button', { name: 'Accept All' }).click({ timeout: 3000 });
    } catch {
      // Banner not present
    }
  }

  async goToCreatePost(): Promise<void> {
    await this.page.goto('https://staging.talktravel.com/trending', { waitUntil: 'domcontentloaded' });
    await this.waitForPageLoad();
    await this.dismissCookieBanner();
    await this.createPostBtn.click();
    await this.page.waitForURL(/\/create-post|\/new-post|\/post\/new/);
    await this.waitForPageLoad();
  }

  async selectTopic(topicName: string): Promise<void> {
    await this.topicsInput.click();
    await this.topicsInput.fill(topicName);
    await this.page.locator(`[role="option"]:has-text("${topicName}")`).first().click();
  }
}

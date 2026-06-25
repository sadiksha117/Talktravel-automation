import { type Page, type Locator } from '@playwright/test';
import { CreatePostPage } from '../CreatePost';

export class CreatePostExploratoryPage extends CreatePostPage {
  readonly formHeading: Locator;
  readonly charCountOrHint: Locator;
  readonly publishBtnDisabled: Locator;
  readonly topicsDropdown: Locator;
  readonly editorToolbar: Locator;

  constructor(page: Page) {
    super(page);

    this.formHeading = page.getByRole('heading', { name: 'Create New Post' });
    this.charCountOrHint = page.locator('[class*="count"], [class*="hint"], [class*="limit"]').first();
    this.publishBtnDisabled = page.getByRole('button', { name: 'Publish Post' });
    this.topicsDropdown = page.getByRole('listbox');
    this.editorToolbar = page.locator('.ql-toolbar');
  }

  async loginAndNavigateToCreatePost(email: string, password: string): Promise<void> {
    await this.loginAndGoToCreatePost(email, password);
  }
}

import { type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class Flow3Page extends BasePage {
  constructor(page: Page) {
    super(page);
  }
}

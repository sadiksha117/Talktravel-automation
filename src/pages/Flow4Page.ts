import { type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class Flow4Page extends BasePage {
  constructor(page: Page) {
    super(page);
  }
}

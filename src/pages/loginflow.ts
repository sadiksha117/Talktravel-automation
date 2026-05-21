import { type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginFlowPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }
}

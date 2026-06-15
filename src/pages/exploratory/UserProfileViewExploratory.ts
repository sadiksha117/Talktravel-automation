import { type Page, type Locator } from '@playwright/test';
import { UserProfileViewPage } from '../UserProfileView';

export class UserProfileViewExploratoryPage extends UserProfileViewPage {
  readonly moreDropdownMenu: Locator;
  readonly profilePageTitle: Locator;
  readonly addFriendBtnDisabled: Locator;

  constructor(page: Page) {
    super(page);

    this.moreDropdownMenu = page.locator('.profile-dropdown .dropdown-menu, .dropdown-menu');
    this.profilePageTitle = page.locator('title');
    this.addFriendBtnDisabled = page.locator('button:has-text("Add Friend")[disabled]');
  }
}

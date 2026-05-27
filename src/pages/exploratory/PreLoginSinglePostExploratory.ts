import { type Page, type Locator } from '@playwright/test';
import { PreLoginSinglePostPage } from '../preloginsinglepost';

export class PreLoginSinglePostExploratoryPage extends PreLoginSinglePostPage {
  // Header - exploratory
  readonly headerLoginBtn: Locator;
  readonly headerJoinFreeBtn: Locator;

  // Feed - exploratory
  readonly popularThisWeekLinks: Locator;
  readonly feedPageTitle: Locator;

  // Single post - exploratory
  readonly postTagLinks: Locator;
  readonly postAuthorLink: Locator;

  constructor(page: Page) {
    super(page);

    // Header - exploratory (scoped to nav for precision)
    this.headerLoginBtn = page.getByRole('navigation').getByRole('link', { name: 'Log in' });
    this.headerJoinFreeBtn = page.getByRole('navigation').getByRole('link', { name: 'Join Free' });

    // Feed - exploratory
    this.popularThisWeekLinks = page.getByText('Popular This Week')
      .locator('xpath=ancestor::*[self::div or self::section][1]')
      .getByRole('link');
    this.feedPageTitle = page.locator('title');

    // Single post - exploratory
    this.postTagLinks = page.locator('a[href*="/tag/"], a[href*="/topic/"]');
    this.postAuthorLink = page.locator('a[href*="/user/"], a[href*="/profile/"]').first();
  }
}

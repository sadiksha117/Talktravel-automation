import { type Page, type Locator } from '@playwright/test';
import { SingleTopicViewPage } from '../SingleTopicView';

export class SingleTopicViewExploratoryPage extends SingleTopicViewPage {
  // Sub-tab links for href inspection
  readonly tabForYou: Locator;
  readonly allSubTabLinks: Locator;

  // Topic chips in post cards
  readonly postCardTopicChips: Locator;

  // Author links in post cards
  readonly postAuthorLinks: Locator;

  // Downvote button
  readonly downvoteBtn: Locator;

  constructor(page: Page) {
    super(page);

    this.tabForYou = page.locator('a[href*="/tags/"][href$="/forYou"]');
    this.allSubTabLinks = page.locator('a[href*="/tags/"][href$="/trending"], a[href*="/tags/"][href$="/popular"], a[href*="/tags/"][href$="/latest"]');

    this.postCardTopicChips = page.locator('a[href^="/tags/"]');
    this.postAuthorLinks = page.locator('a[href*="/profile/"]');
    this.downvoteBtn = page.getByRole('button', { name: 'Downvote' });
  }
}

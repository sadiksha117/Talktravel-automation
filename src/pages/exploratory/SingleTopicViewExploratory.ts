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
    // Scoped to links containing an img — breadcrumb links share the same href pattern but have no img child
    this.allSubTabLinks = page.locator(
      'a[href*="/tags/"]:has(img[alt="Trending"]), a[href*="/tags/"]:has(img[alt="Popular"]), a[href*="/tags/"]:has(img[alt="Latest"])'
    );

    this.postCardTopicChips = page.locator('a[href^="/tags/"]');
    this.postAuthorLinks = page.locator('a[href*="/profile/"]');
    this.downvoteBtn = page.getByRole('button', { name: 'Downvote' });
  }
}

import { type Page, type Locator } from '@playwright/test';
import { HomepageLandingFlowPage } from '../HomepageLandingFlow';

export class HomepageLandingFlowExploratoryPage extends HomepageLandingFlowPage {
  // Exploratory — feed tabs
  readonly feedTabForYouLink: Locator;

  // Exploratory — tag / topic chips on post cards
  readonly firstTagChip: Locator;

  // Exploratory — vote buttons on feed cards
  readonly firstUpvoteBtn: Locator;
  readonly firstDownvoteBtn: Locator;

  // Exploratory — author link on feed card
  readonly firstAuthorLink: Locator;

  // Exploratory — Popular This Week heading
  readonly popularThisWeekHeading: Locator;

  // Exploratory — footer nav links
  readonly footerTrendingLink: Locator;
  readonly footerBlogHomeLink: Locator;
  readonly footerPrivacyLink: Locator;
  readonly footerTermsLink: Locator;
  readonly footerCopyright: Locator;

  constructor(page: Page) {
    super(page);

    // Feed tabs
    this.feedTabForYouLink = page.getByRole('link', { name: 'For You', exact: true });

    // Tag chips use /tags/{slug} href pattern
    this.firstTagChip = page.locator('a[href^="/tags/"]').first();

    // Vote buttons on the first post card
    this.firstUpvoteBtn = page.getByRole('button', { name: 'Upvote' }).first();
    this.firstDownvoteBtn = page.getByRole('button', { name: 'Downvote' }).first();

    // Author link on first post card
    this.firstAuthorLink = page.locator('a[href^="/profile/"]').first();

    // Sidebar heading
    this.popularThisWeekHeading = page.getByRole('heading', { name: 'Popular This Week', level: 4 });

    // Footer links
    this.footerTrendingLink = page.getByRole('contentinfo').getByRole('link', { name: 'Trending', exact: true });
    this.footerBlogHomeLink = page.getByRole('contentinfo').getByRole('link', { name: 'Blog Home', exact: true });
    this.footerPrivacyLink = page.getByRole('contentinfo').getByRole('link', { name: 'Privacy', exact: true });
    this.footerTermsLink = page.getByRole('contentinfo').getByRole('link', { name: 'Terms', exact: true });
    this.footerCopyright = page.getByRole('contentinfo').getByText(/© \d{4} TalkTravel/);
  }
}

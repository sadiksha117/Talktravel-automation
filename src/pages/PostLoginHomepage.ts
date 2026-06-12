import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class PostLoginHomepagePage extends BasePage {
  // Header
  readonly logo: Locator;
  readonly headerSearch: Locator;
  readonly createPostBtn: Locator;
  readonly messagesIcon: Locator;
  readonly notificationsBell: Locator;
  readonly headerAvatar: Locator;

  // Left nav
  readonly leftNav: Locator;

  // Feed tabs
  readonly feedTabTrending: Locator;
  readonly feedTabLatest: Locator;
  readonly feedTabForYou: Locator;

  // View toggle
  readonly cardViewToggle: Locator;
  readonly compactViewToggle: Locator;

  // Feed
  readonly feedPostCards: Locator;

  // Sidebar
  readonly popularThisWeek: Locator;
  readonly popularThisWeekLinks: Locator;

  // Footer
  readonly footer: Locator;

  // Single post view
  readonly postTitle: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.logo = page.locator('header >> a[href="/"]');
    this.headerSearch = page.locator('header >> input[type="search"]').or(
      page.locator('[data-testid="header-search"]')
    ).first();
    this.createPostBtn = page.locator('[data-testid="create-post"]');
    this.messagesIcon = page.locator('[data-testid="messages-icon"]').or(
      page.locator('a[href="/chats"]')
    ).first();
    this.notificationsBell = page.locator('[data-testid="notifications-bell"]');
    this.headerAvatar = page.locator('[data-testid="header-avatar"]');

    // Left nav
    this.leftNav = page.locator('nav[aria-label="Primary"]').or(
      page.locator('[data-testid="left-nav"]')
    ).first();

    // Feed tabs
    this.feedTabTrending = page.locator('[role="tab"]:has-text("Trending")');
    this.feedTabLatest = page.locator('[role="tab"]:has-text("Latest")');
    this.feedTabForYou = page.locator('[role="tab"]:has-text("For You")');

    // View toggle
    this.cardViewToggle = page.locator('button[aria-label="Card view"]');
    this.compactViewToggle = page.locator('button[aria-label="Compact view"]');

    // Feed
    this.feedPostCards = page.locator('[data-testid="post-card"]');

    // Sidebar
    this.popularThisWeek = page.locator('aside:has-text("Popular This Week")');
    this.popularThisWeekLinks = page.locator('aside:has-text("Popular This Week") >> a');

    // Footer
    this.footer = page.locator('footer');

    // Single post view
    this.postTitle = page.getByRole('heading', { level: 1 });
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.goto('/login');
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
    await this.page.waitForURL(/\/(trending|community|dashboard|feed|home)?$/);
    await this.waitForPageLoad();
  }

  async goToHomepage(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  async dismissCookieBanner(): Promise<void> {
    try {
      await this.page.getByRole('button', { name: 'Accept All' }).click({ timeout: 3000 });
    } catch {
      // Banner not present
    }
  }
}

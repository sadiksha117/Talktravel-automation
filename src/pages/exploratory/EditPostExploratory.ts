import { type Page, type Locator } from '@playwright/test';
import { EditPostPage } from '../EditPost';

/** The test account's own profile handle (used to tell own vs. foreign posts). */
export const OWN_HANDLE = 'prempoudel_1';

/**
 * Exploratory page object for Edit Post — focused on PRODUCT-bug probes.
 *
 * Beyond the happy-path helpers in EditPostPage, this adds helpers that save an
 * edit and then inspect the *live* post / feed, so assertions catch real
 * defects (stored XSS, broken authorization, server-side validation gaps,
 * stale propagation) rather than just form-field behaviour.
 */
export class EditPostExploratoryPage extends EditPostPage {
  readonly loginPasswordField: Locator;
  readonly postViewTitle: Locator;
  readonly editedLabelOnView: Locator;

  constructor(page: Page) {
    super(page);
    this.loginPasswordField = page.locator('input[type="password"]').first();
    this.postViewTitle = page.getByRole('heading', { level: 1 });
    this.editedLabelOnView = page.getByText(/edited/i).first();
  }

  /** Log in and land on an owned post's edit form; returns the post slug. */
  async openEditForm(email: string, password: string): Promise<string> {
    await this.login(email, password);
    await this.openOwnPostEdit();
    return this.currentPostSlug();
  }

  /** True if the current page looks logged-out. */
  async isLoggedOut(): Promise<boolean> {
    if (/\/login/.test(this.page.url())) return true;
    return await this.loginPasswordField.isVisible({ timeout: 3000 }).catch(() => false);
  }

  /** Fill the Title and submit; wait until we leave the edit form (best effort). */
  async setTitleAndSave(title: string): Promise<void> {
    await this.titleInput.fill(title);
    await this.dismissCookieBanner();
    await this.submitUpdate();
    await this.page.waitForURL(/\/post\/[^/?#]+$/, { timeout: 15000 }).catch(() => {});
  }

  /** Open a post's public view by slug. */
  async openPostView(slug: string): Promise<void> {
    await this.page.goto(`https://staging.talktravel.com/post/${slug}`, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  /**
   * Scan the trending feed and open the first post NOT authored by the test
   * account; returns its slug (we end up on that post's view), or '' if none
   * is found after checking several candidates.
   */
  async openForeignPostSlug(): Promise<string> {
    await this.page.goto('https://staging.talktravel.com/trending', { waitUntil: 'domcontentloaded' });
    await this.dismissCookieBanner();
    const links = this.page.locator('a[href^="/post/"]:not([href*="/-"])').filter({ visible: true });
    await links.first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    const hrefs = (await links.evaluateAll(els =>
      els.map(e => (e as HTMLAnchorElement).getAttribute('href')).filter((h): h is string => !!h)
    ));
    const unique = [...new Set(hrefs)].slice(0, 10);
    for (const href of unique) {
      await this.page.goto(`https://staging.talktravel.com${href}`, { waitUntil: 'domcontentloaded' });
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      const authorHref = await this.page
        .locator('a[href*="/profile/"]').first().getAttribute('href').catch(() => null);
      if (authorHref && !authorHref.includes(OWN_HANDLE)) return this.currentPostSlug();
    }
    return '';
  }

  /** Number of comments reported by the "N Comments" heading (0 if absent). */
  async commentCount(): Promise<number> {
    const text = await this.page
      .getByRole('heading', { name: /comments/i })
      .first()
      .innerText()
      .catch(() => '');
    const m = text.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  /** Count of topic tag links rendered on the post view. */
  async topicCountOnView(): Promise<number> {
    return await this.page.locator('a[href*="/tags/"]').count();
  }

  /** Set the External Link and submit. */
  async setExternalLinkAndSave(url: string): Promise<void> {
    await this.externalLinkInput.fill(url);
    await this.dismissCookieBanner();
    await this.submitUpdate();
    await this.page.waitForURL(/\/post\/[^/?#]+$/, { timeout: 15000 }).catch(() => {});
  }

  /** Set the Discussion body and submit. */
  async setDiscussionAndSave(text: string): Promise<void> {
    await this.discussionEditor.click();
    await this.discussionEditor.fill(text);
    await this.dismissCookieBanner();
    await this.submitUpdate();
    await this.page.waitForURL(/\/post\/[^/?#]+$/, { timeout: 15000 }).catch(() => {});
  }

  /** Relative "… ago" timestamp shown in the post header (or '' if absent). */
  async postDateText(): Promise<string> {
    return (await this.page.getByText(/\bago\b/i).first().innerText().catch(() => '')).trim();
  }
}

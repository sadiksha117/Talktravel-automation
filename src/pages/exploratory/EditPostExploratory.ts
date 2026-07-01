import { type Page, type Locator } from '@playwright/test';
import { EditPostPage } from '../EditPost';

/** The test account's own profile handle (used to tell own vs. foreign posts). */
export const OWN_HANDLE = 'prempoudel_1';

const BASE = 'https://staging.talktravel.com';

/**
 * Exploratory page object for Edit Post — focused on PRODUCT-bug probes.
 *
 * IMPORTANT: editing the Title regenerates the post slug, so the post moves to
 * a NEW /post/{slug} after a title-changing save. Every save helper therefore
 * RETURNS the post-save slug read from the live URL; callers must view the post
 * using that returned slug, never a slug captured before the edit.
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

  /**
   * Log in, open an owned post's *view* (to capture a valid permalink slug),
   * then enter its edit form. Returns the pre-edit slug.
   */
  async openEditForm(email: string, password: string): Promise<string> {
    await this.login(email, password);
    const slug = await this.openOwnPostView();
    const opened = await this.openEditFromSinglePost();
    if (!opened) throw new Error('Could not open the edit form from the owned post view');
    return slug;
  }

  /**
   * Open the first owned post's public view (via My Posts) and return its slug.
   * Leaves the browser on /post/{slug}.
   */
  async openOwnPostView(): Promise<string> {
    await this.goToMyPosts();
    const firstOwnPost = this.page
      .locator('a[href^="/post/"]:not([href*="/-"])')
      .filter({ visible: true })
      .first();
    await firstOwnPost.click();
    await this.page.waitForURL('**/post/**', { timeout: 30000 });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    return this.currentPostSlug();
  }

  /**
   * Create a brand-new post via the Create Post flow so each test edits its own
   * isolated post (no shared-state pollution). Returns the new post's slug.
   * Requires an authenticated session (call login() first).
   */
  async createFreshPostForEditing(opts: { title: string; body?: string; topics?: string[] }): Promise<string> {
    await this.page.goto(`${BASE}/create-post`, { waitUntil: 'domcontentloaded' });
    await this.dismissCookieBanner();
    await this.titleInput.waitFor({ state: 'visible', timeout: 20000 });
    await this.titleInput.fill(opts.title);
    if (opts.body) {
      await this.discussionEditor.click();
      await this.discussionEditor.fill(opts.body);
    }
    for (const topic of opts.topics ?? []) {
      await this.selectTopic(topic).catch(() => {});
    }
    await this.dismissCookieBanner();
    const publishBtn = this.page.getByRole('button', { name: /publish post|^publish$/i }).first();
    await publishBtn.click({ force: true });
    await this.page.waitForURL(/\/post\/[^/?#]+$/, { timeout: 20000 });
    return this.currentPostSlug();
  }

  /** True if the current page looks logged-out. */
  async isLoggedOut(): Promise<boolean> {
    if (/\/login/.test(this.page.url())) return true;
    return await this.loginPasswordField.isVisible({ timeout: 3000 }).catch(() => false);
  }

  /** Fill the Title and submit; returns the post-save slug from the live URL. */
  async setTitleAndSave(title: string): Promise<string> {
    await this.titleInput.fill(title);
    await this.dismissCookieBanner();
    await this.submitUpdate();
    await this.page.waitForURL(/\/post\/[^/?#]+$/, { timeout: 15000 }).catch(() => {});
    return this.currentPostSlug();
  }

  /** Set the External Link and submit; returns the post-save slug. */
  async setExternalLinkAndSave(url: string): Promise<string> {
    await this.externalLinkInput.fill(url);
    await this.dismissCookieBanner();
    await this.submitUpdate();
    await this.page.waitForURL(/\/post\/[^/?#]+$/, { timeout: 15000 }).catch(() => {});
    return this.currentPostSlug();
  }

  /** Set the Discussion body and submit; returns the post-save slug. */
  async setDiscussionAndSave(text: string): Promise<string> {
    await this.discussionEditor.click();
    await this.discussionEditor.fill(text);
    await this.dismissCookieBanner();
    await this.submitUpdate();
    await this.page.waitForURL(/\/post\/[^/?#]+$/, { timeout: 15000 }).catch(() => {});
    return this.currentPostSlug();
  }

  /** Open a post's public view by slug and wait for the heading to render. */
  async openPostView(slug: string): Promise<void> {
    await this.page.goto(`${BASE}/post/${slug}`, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  /** True when the current post view actually rendered (not a 404 page). */
  async postViewLoaded(): Promise<boolean> {
    const heading = (await this.postViewTitle.innerText({ timeout: 8000 }).catch(() => '')).trim();
    return heading.length > 0 && !/destination not found|not found|404/i.test(heading);
  }

  /**
   * Scan the trending feed and open the first post NOT authored by the test
   * account; returns its slug (we end on that post's view), or '' if none.
   */
  async openForeignPostSlug(): Promise<string> {
    await this.page.goto(`${BASE}/trending`, { waitUntil: 'domcontentloaded' });
    await this.dismissCookieBanner();
    const links = this.page.locator('a[href^="/post/"]:not([href*="/-"])').filter({ visible: true });
    await links.first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    const hrefs = await links.evaluateAll(els =>
      els.map(e => (e as HTMLAnchorElement).getAttribute('href')).filter((h): h is string => !!h)
    );
    const unique = [...new Set(hrefs)].slice(0, 10);
    for (const href of unique) {
      await this.page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' });
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

  /** Relative "… ago" timestamp shown in the post header (or '' if absent). */
  async postDateText(): Promise<string> {
    return (await this.page.getByText(/\bago\b/i).first().innerText().catch(() => '')).trim();
  }

  /** Author profile href on the current post view (or null). */
  async postAuthorHref(): Promise<string | null> {
    return this.page.locator('a[href*="/profile/"]').first().getAttribute('href').catch(() => null);
  }

  /** True if a post with the given title is listed in My Posts. */
  async isInMyPosts(title: string): Promise<boolean> {
    await this.goToMyPosts();
    return (await this.page.locator(`a[href^="/post/"]:has-text("${title}")`).count()) > 0;
  }

  /**
   * From the edit form, fill a new Title, submit, and capture the mutating
   * (PUT/PATCH/POST) network request the app fires. Returns null if none could
   * be identified, so callers can fall back to a UI-level assertion instead of
   * skipping.
   */
  async captureUpdateRequest(newTitle: string): Promise<CapturedRequest | null> {
    const reqP = this.page.waitForRequest(r => {
      const m = r.method().toUpperCase();
      if (m === 'GET' || m === 'OPTIONS' || m === 'HEAD') return false;
      const u = r.url().toLowerCase();
      if (/(login|auth|comment|vote|upload|image|analytics|track|telemetry|log|sentry)/.test(u)) return false;
      return /post|article|blog/.test(u);
    }, { timeout: 15000 }).catch(() => null);
    await this.titleInput.fill(newTitle);
    await this.submitUpdate();
    const req = await reqP;
    if (!req) return null;
    return { url: req.url(), method: req.method(), headers: req.headers(), body: req.postData() ?? null };
  }

  /**
   * Replay a captured update request via the page's APIRequestContext (which
   * shares the browser's cookies). Pass `data` to override the body and
   * `extraHeaders` to add/override headers. Returns the HTTP status.
   */
  async replayUpdate(req: CapturedRequest, data?: string | null, extraHeaders?: Record<string, string>): Promise<number> {
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries({ ...req.headers, ...(extraHeaders ?? {}) })) {
      const lk = k.toLowerCase();
      if (lk === 'content-length' || lk === 'host' || lk.startsWith(':')) continue;
      headers[k] = v;
    }
    const res = await this.page.request.fetch(req.url, {
      method: req.method,
      headers,
      data: data ?? req.body ?? undefined,
      failOnStatusCode: false,
    });
    return res.status();
  }
}

export interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

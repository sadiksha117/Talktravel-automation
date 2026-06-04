import { expect, test } from '@playwright/test';
import { BlogIndexPaginationSearchPage } from '../src/pages/BlogIndexPaginationSearch';

test.describe('Blog Index, Pagination & Search (Pre-Login)', () => {
  let blog: BlogIndexPaginationSearchPage;

  test.beforeEach(async ({ page }) => {
    blog = new BlogIndexPaginationSearchPage(page);
    await blog.goToBlogHome();
  });

  // ── Step 1: Blog Home (/blog) ────────────────────────────────────────────

  test('Step 1 — blog home loads at correct URL', async ({ page }) => {
    await expect(page).toHaveURL('https://staging.talktravel.com/blog');
  });

  test('Step 1 — logo is visible in header', async () => {
    await expect(blog.logo).toBeVisible();
  });

  test('Step 1 — header nav links are visible', async () => {
    await expect(blog.headerCommunity).toBeVisible();
    await expect(blog.headerBlog).toBeVisible();
    await expect(blog.headerFaq).toBeVisible();
  });

  test('Step 1 — Log in and Join Free buttons are visible', async () => {
    await expect(blog.headerLogIn).toBeVisible();
    await expect(blog.headerJoinFree).toBeVisible();
  });

  test('Step 1 — hero heading contains correct text', async () => {
    await expect(blog.blogHeroHeading).toContainText('Stories, tips & ideas');
  });

  test('Step 1 — hero subtext is visible', async () => {
    await expect(blog.blogHeroText).toBeVisible();
  });

  test('Step 1 — search bar is visible', async () => {
    await expect(blog.searchInput).toBeVisible();
  });

  test('Step 1 — View All Blogs CTA is visible', async () => {
    await expect(blog.viewAllBlogsBtn).toBeVisible();
  });

  test('Step 1 — article cards are displayed', async () => {
    await expect(blog.articleCards.first()).toBeVisible();
  });

  // ── Step 2: View All Blogs CTA → /blog/articles ──────────────────────────

  test('Step 2 — clicking View All Blogs navigates to /blog/articles', async ({ page }) => {
    await blog.clickViewAllBlogs();
    await expect(page).toHaveURL(/\/blog\/articles$/);
  });

  test('Step 2 — article grid is visible on /blog/articles', async () => {
    await blog.clickViewAllBlogs();
    await expect(blog.articleCards.first()).toBeVisible();
  });

  test('Step 2 — pagination is visible on /blog/articles', async () => {
    await blog.clickViewAllBlogs();
    await expect(blog.pagination).toBeVisible();
  });

  // ── Step 3: Numbered pagination rendered ─────────────────────────────────

  test('Step 3 — page 1 is active by default', async () => {
    await blog.goToBlogArticles();
    await blog.pagination.scrollIntoViewIfNeeded();
    await expect(blog.pagination.locator('button:has-text("1")')).toHaveAttribute('aria-current', 'page');
  });

  test('Step 3 — page 2 button is visible', async () => {
    await blog.goToBlogArticles();
    await expect(blog.pagination.locator('button:has-text("2")')).toBeVisible();
  });

  test('Step 3 — Next page arrow is visible', async () => {
    await blog.goToBlogArticles();
    await expect(blog.page.locator('button[aria-label="Next page"]')).toBeVisible();
  });

  // ── Step 4: Click pagination page 2 ─────────────────────────────────────

  test('Step 4 — clicking page 2 updates URL to page 2', async ({ page }) => {
    await blog.goToBlogArticles();
    await blog.clickPaginationPage(2);
    await expect(page).toHaveURL(/\/blog\/articles(\?page=2|\/2)/);
  });

  test('Step 4 — page 2 becomes active after click', async () => {
    await blog.goToBlogArticles();
    await blog.clickPaginationPage(2);
    await expect(blog.pagination.locator('button:has-text("2")')).toHaveAttribute('aria-current', 'page');
  });

  test('Step 4 — article cards are visible on page 2', async () => {
    await blog.goToBlogArticles();
    await blog.clickPaginationPage(2);
    await expect(blog.articleCards.first()).toBeVisible();
  });

  // ── Step 5: Click Next arrow ─────────────────────────────────────────────

  test('Step 5 — clicking Next arrow advances to page 3', async ({ page }) => {
    await blog.goToBlogArticles();
    await blog.clickPaginationPage(2);
    await blog.clickNextPage();
    await expect(page).toHaveURL(/\/blog\/articles(\?page=3|\/3)/);
  });

  test('Step 5 — page 3 is active after Next arrow click', async () => {
    await blog.goToBlogArticles();
    await blog.clickPaginationPage(2);
    await blog.clickNextPage();
    await expect(blog.pagination.locator('button:has-text("3")')).toHaveAttribute('aria-current', 'page');
  });

  // ── Step 6: Click Previous arrow ─────────────────────────────────────────

  test('Step 6 — clicking Previous arrow goes back to page 2', async ({ page }) => {
    await blog.goToBlogArticles();
    await blog.clickPaginationPage(2);
    await blog.clickNextPage();
    await blog.clickPreviousPage();
    await expect(page).toHaveURL(/\/blog\/articles(\?page=2|\/2)/);
  });

  // ── Step 7: Click article from paginated grid ─────────────────────────────

  test('Step 7 — clicking article from page 2 navigates to /blog/{slug}', async ({ page }) => {
    await blog.goToBlogArticles();
    await blog.clickPaginationPage(2);
    await blog.clickFirstArticle();
    await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+/);
  });

  test('Step 7 — article page has an H1 title', async () => {
    await blog.goToBlogArticles();
    await blog.clickPaginationPage(2);
    await blog.clickFirstArticle();
    await expect(blog.articleTitle).toBeVisible();
  });

  test('Step 7 — browser back returns to page 2 with pagination state', async ({ page }) => {
    await blog.goToBlogArticles();
    await blog.clickPaginationPage(2);
    await blog.clickFirstArticle();
    await page.goBack();
    await expect(page).toHaveURL(/\/blog\/articles(\?page=2|\/2)/);
  });

  // ── Step 8: Search — valid query ─────────────────────────────────────────

  test('Step 8 — searching a valid query updates the URL with q param', async ({ page }) => {
    await blog.search('Delta');
    await expect(page).toHaveURL(/[?&]q=Delta/);
  });

  test('Step 8 — search results show at least one article card', async () => {
    await blog.search('Delta');
    await expect(blog.articleCards.first()).toBeVisible();
  });

  // ── Step 9: Search — click a result ──────────────────────────────────────

  test('Step 9 — clicking a search result navigates to /blog/{slug}', async ({ page }) => {
    await blog.search('Delta');
    await blog.clickFirstArticle();
    await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+/);
  });

  test('Step 9 — article page title is visible after clicking search result', async () => {
    await blog.search('Delta');
    await blog.clickFirstArticle();
    await expect(blog.articleTitle).toBeVisible();
  });

  // ── Step 11: Search — blank submit ───────────────────────────────────────

  test('Step 11 — blank search submit stays on /blog', async ({ page }) => {
    await blog.searchInput.fill('');
    await blog.searchSubmitBtn.click();
    await expect(page).toHaveURL(/\/blog$/);
  });

  // ── Step 12: Coolcation vanity URL ────────────────────────────────────────

  test('Step 12 — /coolcation loads at correct URL', async ({ page }) => {
    await page.goto('/coolcation');
    await blog.waitForPageLoad();
    await expect(page).toHaveURL(/\/coolcation$/);
  });

  test('Step 12 — Coolcation page has an article H1', async ({ page }) => {
    await page.goto('/coolcation');
    await blog.waitForPageLoad();
    await expect(blog.articleTitle).toBeVisible();
  });

  test('Step 12 — Coolcation page shows Written by', async ({ page }) => {
    await page.goto('/coolcation');
    await blog.waitForPageLoad();
    await expect(blog.writtenBy).toBeVisible();
  });

  test('Step 12 — footer Coolcation link navigates to /coolcation', async ({ page }) => {
    await blog.footerCoolcation.click();
    await blog.waitForPageLoad();
    await expect(page).toHaveURL(/\/coolcation$/);
  });

  // ── Step 13: Slow Travel vanity URL ──────────────────────────────────────

  test('Step 13 — /slow-travel loads at correct URL', async ({ page }) => {
    await page.goto('/slow-travel');
    await blog.waitForPageLoad();
    await expect(page).toHaveURL(/\/slow-travel$/);
  });

  test('Step 13 — Slow Travel page has an article H1', async ({ page }) => {
    await page.goto('/slow-travel');
    await blog.waitForPageLoad();
    await expect(blog.articleTitle).toBeVisible();
  });

  test('Step 13 — Slow Travel page shows Written by', async ({ page }) => {
    await page.goto('/slow-travel');
    await blog.waitForPageLoad();
    await expect(blog.writtenBy).toBeVisible();
  });

  test('Step 13 — footer Slow Travel link navigates to /slow-travel', async ({ page }) => {
    await blog.footerSlowTravel.click();
    await blog.waitForPageLoad();
    await expect(page).toHaveURL(/\/slow-travel$/);
  });

  // ── Happy path end-to-end ─────────────────────────────────────────────────

  test('happy path — Blog Home → View All Blogs → Page 2 → Article', async ({ page }) => {
    test.setTimeout(60000);

    await expect(page).toHaveURL('https://staging.talktravel.com/blog');
    await expect(blog.blogHeroHeading).toBeVisible();

    await blog.clickViewAllBlogs();
    await expect(page).toHaveURL(/\/blog\/articles$/);
    await expect(blog.pagination).toBeVisible();

    await blog.clickPaginationPage(2);
    await expect(page).toHaveURL(/\/blog\/articles(\?page=2|\/2)/);

    await blog.clickFirstArticle();
    await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+/);
    await expect(blog.articleTitle).toBeVisible();
  });

  test('happy path — Blog Home → Search → Click result → Article', async ({ page }) => {
    test.setTimeout(60000);

    await expect(page).toHaveURL('https://staging.talktravel.com/blog');

    await blog.search('Delta');
    await expect(page).toHaveURL(/[?&]q=Delta/);
    await expect(blog.articleCards.first()).toBeVisible();

    await blog.clickFirstArticle();
    await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+/);
    await expect(blog.articleTitle).toBeVisible();
  });

  test('happy path — Vanity URLs load as single article views', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/coolcation');
    await blog.waitForPageLoad();
    await expect(page).toHaveURL(/\/coolcation$/);
    await expect(blog.articleTitle).toBeVisible();

    await page.goto('/slow-travel');
    await blog.waitForPageLoad();
    await expect(page).toHaveURL(/\/slow-travel$/);
    await expect(blog.articleTitle).toBeVisible();
  });
});

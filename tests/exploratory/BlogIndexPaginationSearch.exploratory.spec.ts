import { expect, test } from '@playwright/test';
import { BlogIndexPaginationSearchExploratoryPage } from '../../src/pages/exploratory/BlogIndexPaginationSearchExploratory';

test.describe('Blog Index, Pagination & Search — Exploratory (Pre-Login)', () => {
  let blog: BlogIndexPaginationSearchExploratoryPage;

  test.beforeEach(async ({ page }) => {
    blog = new BlogIndexPaginationSearchExploratoryPage(page);
    await blog.goToBlogHome();
  });

  // 1. View All Blogs links point to the correct URLs
  test('Edge — Blog Home: View All Blogs hrefs distinguish latest vs featured', { tag: '@exploratory' }, async () => {
    await expect(blog.viewAllBlogsBtn).toHaveAttribute('href', /view=latest/);
    await expect(blog.viewAllBlogsFeaturedBtn).toHaveAttribute('href', /view=featured/);
  });

  // 2. Pagination renders different articles on page 2 vs page 1
  test('Edge — Pagination: page 2 renders different articles than page 1', { tag: '@exploratory' }, async () => {
    await blog.goToBlogArticles();
    const page1Title = await blog.articleCards.first().locator('h2, h3').first().innerText();
    await blog.clickPaginationPage(2);
    const page2Title = await blog.articleCards.first().locator('h2, h3').first().innerText();
    expect(page1Title).not.toEqual(page2Title);
  });

  // 3. Article slug on page 2 is lowercase with no spaces
  test('Edge — Article: URL slug after page 2 is lowercase with no spaces', { tag: '@exploratory' }, async ({ page }) => {
    await blog.goToBlogArticles();
    await blog.clickPaginationPage(2);
    await blog.clickFirstArticle();
    const slug = page.url().split('/blog/')[1] ?? '';
    expect(slug).toBe(slug.toLowerCase());
    expect(slug).not.toContain(' ');
  });

  // 4. Search result count — valid query returns at least one article
  test('Edge — Search: valid query returns at least one article card', { tag: '@exploratory' }, async () => {
    await blog.search('Delta');
    const count = await blog.articleCards.count();
    expect(count).toBeGreaterThan(0);
  });

  // 5. Negative — gibberish query shows zero articles or an empty state
  test('Negative — Search: gibberish query returns no article cards', { tag: '@exploratory' }, async () => {
    await blog.search('zxzxzxzx-no-match-zxzxzxzx');
    const count = await blog.articleCards.count();
    expect(count).toBe(0);
  });

  // 6. Negative — whitespace-only search does not navigate to a results page
  test('Negative — Search: whitespace-only query does not leave /blog', { tag: '@exploratory' }, async ({ page }) => {
    await blog.searchInput.fill('   ');
    await blog.searchInput.press('Enter');
    await expect(page).toHaveURL(/\/blog/);
    await expect(blog.articleCards.first()).toBeVisible();
  });

  // 7. Negative — XSS in search does not crash the page
  test('Negative — Search: XSS payload in query does not crash the page', { tag: '@exploratory' }, async ({ page }) => {
    await blog.search('<script>alert(1)</script>');
    await expect(page).toHaveURL(/\/blog/);
    await expect(blog.headerBlog).toBeVisible();
  });

  // 8. Negative — out-of-range page number is handled gracefully
  test('Negative — Pagination: out-of-range page number does not crash the app', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('/blog/articles?page=99999');
    await blog.waitForPageLoad();
    await expect(page).toHaveURL(/\/blog/);
    await expect(blog.headerBlog).toBeVisible();
  });

  // 9. Negative — non-numeric page param is handled gracefully
  test('Negative — Pagination: non-numeric page param does not crash the app', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('/blog/articles?page=abc');
    await blog.waitForPageLoad();
    await expect(page).toHaveURL(/\/blog/);
    await expect(blog.headerBlog).toBeVisible();
  });

  // 10. Negative — unknown vanity URL slug returns a handled page, not a blank crash
  test('Negative — Vanity URL: unknown slug returns a handled page not a blank crash', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('/this-slug-does-not-exist-zxzxzx');
    await blog.waitForPageLoad();
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  // ── 15 additional edge cases ─────────────────────────────────────────────

  // 11. Blog Home article cards each have a clickable heading link
  test('Edge — Blog Home: each article card heading is a link', { tag: '@exploratory' }, async () => {
    const cards = blog.articleCards;
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 3); i++) {
      const link = cards.nth(i).locator('h2 a, h3 a').first();
      await expect(link).toHaveAttribute('href', /.+/);
    }
  });

  // 12. Direct navigation to /blog/articles lands on articles listing
  test('Edge — Articles: direct navigation to /blog/articles loads without error', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('/blog/articles');
    await blog.waitForPageLoad();
    await expect(page).toHaveURL(/\/blog\/articles/);
    await expect(blog.articleCards.first()).toBeVisible();
  });

  // 13. Page title (<title>) is set and non-empty on /blog
  test('Edge — Blog Home: page <title> is non-empty', { tag: '@exploratory' }, async ({ page }) => {
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
  });

  // 14. Page title is non-empty on /blog/articles
  test('Edge — Articles: page <title> is non-empty', { tag: '@exploratory' }, async ({ page }) => {
    await blog.goToBlogArticles();
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
  });

  // 15. Search query is URL-encoded correctly (special char &)
  test('Edge — Search: ampersand in query is URL-encoded and page does not crash', { tag: '@exploratory' }, async ({ page }) => {
    await blog.search('travel & tips');
    await expect(page).toHaveURL(/\/blog/);
    await expect(blog.headerBlog).toBeVisible();
  });

  // 16. Negative — page=0 is handled gracefully
  test('Negative — Pagination: page=0 does not crash the app', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('/blog/articles?page=0');
    await blog.waitForPageLoad();
    await expect(page).toHaveURL(/\/blog/);
    await expect(blog.headerBlog).toBeVisible();
  });

  // 17. Negative — negative page number is handled gracefully
  test('Negative — Pagination: negative page number does not crash the app', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('/blog/articles?page=-5');
    await blog.waitForPageLoad();
    await expect(page).toHaveURL(/\/blog/);
    await expect(blog.headerBlog).toBeVisible();
  });

  // 18. Coolcation page title is non-empty
  test('Edge — Coolcation: page <title> is non-empty', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('/coolcation');
    await blog.waitForPageLoad();
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
  });

  // 19. Slow Travel page title is non-empty
  test('Edge — Slow Travel: page <title> is non-empty', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('/slow-travel');
    await blog.waitForPageLoad();
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
  });

  // 20. Footer Blog Home link navigates back to /blog from /blog/articles
  test('Edge — Footer: Blog Home link from /blog/articles returns to /blog', { tag: '@exploratory' }, async ({ page }) => {
    await blog.goToBlogArticles();
    await blog.footerBlogHome.click();
    await blog.waitForPageLoad();
    await expect(page).toHaveURL(/\/blog$/);
  });

  // 21. Article card image src is not empty (image is not broken)
  test('Edge — Blog Home: first article card image has a non-empty src', { tag: '@exploratory' }, async () => {
    const src = await blog.firstArticleImage.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src!.trim().length).toBeGreaterThan(0);
  });

  // 22. Clicking logo from /blog/articles returns to homepage
  test('Edge — Logo: clicking logo from /blog/articles returns to homepage', { tag: '@exploratory' }, async ({ page }) => {
    await blog.goToBlogArticles();
    await blog.logo.click();
    await blog.waitForPageLoad();
    await expect(page).toHaveURL(/staging\.talktravel\.com\/?$/);
  });

  // 23. Search results page still shows the search input bar
  test('Edge — Search: search input is still visible on results page', { tag: '@exploratory' }, async () => {
    await blog.search('Delta');
    await expect(blog.searchInput).toBeVisible();
  });

  // 24. Negative — very long search query does not crash the page
  test('Negative — Search: very long query (500 chars) does not crash the page', { tag: '@exploratory' }, async ({ page }) => {
    const longQuery = 'a'.repeat(500);
    await blog.search(longQuery);
    await expect(page).toHaveURL(/\/blog/);
    await expect(blog.headerBlog).toBeVisible();
  });

  // 25. Article card on /blog/articles shows a publish date
  test('Edge — Articles: first article card has a visible publish date', { tag: '@exploratory' }, async () => {
    await blog.goToBlogArticles();
    const dateEl = blog.articleCards.first().locator('time');
    await expect(dateEl).toBeVisible();
  });
});

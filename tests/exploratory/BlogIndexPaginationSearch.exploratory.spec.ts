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
    await expect(blog.blogHeroHeading.or(blog.articleCards.first())).toBeVisible();
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
    await expect(blog.headerBlog.or(blog.articleCards.first())).toBeVisible();
  });

  // 9. Negative — non-numeric page param is handled gracefully
  test('Negative — Pagination: non-numeric page param does not crash the app', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('/blog/articles?page=abc');
    await blog.waitForPageLoad();
    await expect(page).toHaveURL(/\/blog/);
    await expect(blog.headerBlog.or(blog.articleCards.first())).toBeVisible();
  });

  // 10. Negative — unknown vanity URL slug returns a handled page, not a blank crash
  test('Negative — Vanity URL: unknown slug returns a handled page not a blank crash', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('/this-slug-does-not-exist-zxzxzx');
    await blog.waitForPageLoad();
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });
});

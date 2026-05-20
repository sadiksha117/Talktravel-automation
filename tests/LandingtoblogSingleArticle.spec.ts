import { expect, test } from '@playwright/test';
import { Flow1Page } from '../src/pages/LandingtoblogSingleArticle';

test.describe('Flow 1 — Landing → Blog → Single Article', () => {
  let flow1: Flow1Page;

  test.beforeEach(async ({ page }) => {
    flow1 = new Flow1Page(page);
    await flow1.goToLanding();
  });

  // ── Step 1: Landing page ─────────────────────────────────────────────────

  test('Step 1 — landing page loads at correct URL', async ({ page }) => {
    await expect(page).toHaveURL('https://staging.talktravel.com/');
  });

  test('Step 1 — logo is visible in header', async () => {
    await expect(flow1.logo).toBeVisible();
  });

  test('Step 1 — header nav links are visible', async () => {
    await expect(flow1.headerCommunity).toBeVisible();
    await expect(flow1.headerBlog).toBeVisible();
    await expect(flow1.headerFaq).toBeVisible();
  });

  test('Step 1 — hero heading is visible', async () => {
    await expect(flow1.heroHeading).toBeVisible();
  });

  test('Step 1 — Join the Community CTA is visible', async () => {
    await expect(flow1.joinCommunityBtn).toBeVisible();
  });

  test('Step 1 — Read the Blog CTA is visible', async () => {
    await expect(flow1.readTheBlogBtn).toBeVisible();
  });

  // ── Step 2: Blog index via header link ──────────────────────────────────

  test('Step 2 — Blog header link points to /blog', async ({ page }) => {
    await expect(flow1.headerBlog).toHaveAttribute('href', '/blog');
  });

  test('Step 2 — blog hero heading is visible after header nav', async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.blogHeroHeading).toBeVisible();
  });

  test('Step 2 — blog hero subtext is visible after header nav', async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.blogHeroText).toBeVisible();
  });

  test('Step 2 — Latest Articles heading is visible', async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.latestArticlesHeading).toBeVisible();
  });

  test('Step 2 — Latest Articles section contains article cards', async () => {
    await flow1.goToBlogViaHeader();
    const cardCount = await flow1.latestArticlesSection.getByRole('link').count();
    expect(cardCount).toBeGreaterThan(0);
  });

  // ── Step 2 (alternate path): Blog via hero CTA ──────────────────────────

  test('Step 2 — clicking Read the Blog CTA goes to /blog', async ({ page }) => {
    await flow1.goToBlogViaCta();
    await expect(page).toHaveURL('https://staging.talktravel.com/blog');
  });

  test('Step 2 — blog loads correctly via Read the Blog CTA', async () => {
    await flow1.goToBlogViaCta();
    await expect(flow1.latestArticlesHeading).toBeVisible();
  });

  // ── Step 3: Single article ───────────────────────────────────────────────

  test('Step 3 — clicking article card navigates to /blog/{slug}', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(page).toHaveURL(/https:\/\/staging\.talktravel\.com\/blog\/.+/);
  });

  test('Step 3 — article page has an H1 title', async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.articleTitle).toBeVisible();
  });

  test('Step 3 — header nav persists on article page', async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.headerCommunity).toBeVisible();
    await expect(flow1.headerBlog).toBeVisible();
    await expect(flow1.headerFaq).toBeVisible();
  });

  // ── Full end-to-end happy path ───────────────────────────────────────────

  test('happy path — full flow Landing → Blog (header) → Article', async ({ page }) => {
    await expect(page).toHaveURL('https://staging.talktravel.com/');
    await expect(flow1.heroHeading).toBeVisible();

    await flow1.goToBlogViaHeader();
    await expect(page).toHaveURL('https://staging.talktravel.com/blog');
    await expect(flow1.blogHeroHeading).toBeVisible();

    await flow1.openFirstArticle();
    await expect(page).toHaveURL(/https:\/\/staging\.talktravel\.com\/blog\/.+/);
    await expect(flow1.articleTitle).toBeVisible();
  });

  test('happy path — full flow Landing → Blog (CTA) → Article', async ({ page }) => {
    await expect(page).toHaveURL('https://staging.talktravel.com/');
    await expect(flow1.readTheBlogBtn).toBeVisible();

    await flow1.goToBlogViaCta();
    await expect(page).toHaveURL('https://staging.talktravel.com/blog');
    await expect(flow1.latestArticlesHeading).toBeVisible();

    await flow1.openFirstArticle();
    await expect(page).toHaveURL(/https:\/\/staging\.talktravel\.com\/blog\/.+/);
    await expect(flow1.articleTitle).toBeVisible();
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  test('Edge — Step 1: logo href points to homepage', async () => {
    await expect(flow1.logo).toHaveAttribute('href', '/');
  });

  test('Edge — Step 2: blog search bar is visible', async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.blogSearchBar).toBeVisible();
  });

  test('Edge — Step 2: View All Blogs button is visible', async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.viewAllBlogsBtn).toBeVisible();
  });

  test('Edge — Step 2: direct navigation to /blog loads correctly without landing', async ({ page }) => {
    await page.goto('/blog');
    await flow1.waitForPageLoad();
    await expect(page).toHaveURL('https://staging.talktravel.com/blog');
    await expect(flow1.latestArticlesHeading).toBeVisible();
  });

  test('Edge — Step 2: Latest Articles grid contains at least 3 cards', async () => {
    await flow1.goToBlogViaHeader();
    const cardCount = await flow1.latestArticlesSection.locator('article').count();
    expect(cardCount).toBeGreaterThanOrEqual(3);
  });

  test('Edge — Step 3: article breadcrumb is visible', async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.articleBreadcrumb).toBeVisible();
  });

  test('Edge — Step 3: article author block is visible', async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.articleAuthorBlock).toBeVisible();
  });

  test('Edge — Step 3: article share row is visible', async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.articleShareRow).toBeVisible();
  });

  test('Edge — Step 3: logo is visible on article page', async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.logo).toBeVisible();
  });

  test('Edge — Step 3: article body content is present', async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.articleBody).toBeVisible();
    const bodyText = await flow1.articleBody.innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });
});

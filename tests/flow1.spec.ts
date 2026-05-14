import { test, expect } from '@playwright/test';
import { Flow1Page } from '../src/pages/Flow1Page';

test.describe('Flow 1 — Landing → Blog → Single Article', () => {
  let flow1: Flow1Page;

  test.beforeEach(async ({ page }) => {
    flow1 = new Flow1Page(page);
    await flow1.goToLanding();
  });

  // ── Step 1: Landing page ─────────────────────────────────────────────────

  test('Step 1 — landing page loads with correct URL', async ({ page }) => {
    await expect(page).toHaveURL('https://talktravel.com');
  });

  test('Step 1 — header elements are visible', async () => {
    await expect(flow1.headerCommunity).toBeVisible();
    await expect(flow1.headerBlog).toBeVisible();
    await expect(flow1.headerFaq).toBeVisible();
    await expect(flow1.headerLogin).toBeVisible();
    await expect(flow1.headerJoinFree).toBeVisible();
  });

  test('Step 1 — hero heading contains expected text', async () => {
    await expect(flow1.heroHeading).toContainText('talk to humans');
  });

  test('Step 1 — hero subtext is visible', async () => {
    await expect(flow1.heroSubtext).toBeVisible();
    await expect(flow1.heroSubtext).toContainText('Real tips from real travelers');
  });

  test('Step 1 — primary CTAs are visible', async () => {
    await expect(flow1.joinCommunityBtn).toBeVisible();
    await expect(flow1.readTheBlogBtn).toBeVisible();
  });

  test('Step 1 — hero image is visible', async () => {
    await expect(flow1.heroImage).toBeVisible();
  });

  // ── Step 2: Blog index via header link ──────────────────────────────────

  test('Step 2 — navigate to blog via header Blog link', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await expect(page).toHaveURL(/\/blog/);
  });

  test('Step 2 — blog hero heading visible after navigating via header', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.blogHeroHeading).toContainText('Stories, tips & ideas');
  });

  test('Step 2 — blog hero subtext visible after navigating via header', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.blogHeroSubtext).toContainText('Real advice from travelers');
  });

  test('Step 2 — search bar is visible on blog index', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.searchBar).toBeVisible();
    await expect(flow1.searchBar).toHaveAttribute('placeholder', /Search articles/i);
  });

  test('Step 2 — search submit button is visible on blog index', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.searchSubmitBtn).toBeVisible();
  });

  test('Step 2 — Latest Articles section and View All Blogs button visible', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.latestArticlesHeading).toBeVisible();
    await expect(flow1.viewAllBlogsBtn).toBeVisible();
  });

  test('Step 2 — article cards grid is visible with at least one card', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.articleCards.first()).toBeVisible();
    const count = await flow1.articleCards.count();
    expect(count).toBeGreaterThan(0);
  });

  // ── Step 2 (alternate path): Blog via hero CTA ──────────────────────────

  test('Step 2 — navigate to blog via Read the Blog CTA', async ({ page }) => {
    await flow1.goToBlogViaCta();
    await expect(page).toHaveURL(/\/blog/);
  });

  test('Step 2 — blog page loads correctly via hero CTA', async ({ page }) => {
    await flow1.goToBlogViaCta();
    await expect(flow1.latestArticlesHeading).toBeVisible();
  });

  // ── Step 3: Single article ───────────────────────────────────────────────

  test('Step 3 — clicking article card navigates to article URL', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(page).toHaveURL(/\/blog\/.+/);
  });

  test('Step 3 — breadcrumb is visible on article page', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.breadcrumb).toBeVisible();
    await expect(flow1.breadcrumb).toContainText('Blog');
  });

  test('Step 3 — category tag is visible on article page', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.articleCategoryTag).toBeVisible();
  });

  test('Step 3 — article H1 title matches the card title clicked', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    const clickedTitle = await flow1.openFirstArticle();
    const h1Text = await flow1.articleTitle.innerText();
    expect(h1Text.trim().toLowerCase()).toContain(clickedTitle.toLowerCase().slice(0, 20));
  });

  test('Step 3 — author block is visible', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.authorBlock).toBeVisible();
  });

  test('Step 3 — share row is visible', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.shareRow).toBeVisible();
  });

  test('Step 3 — hero image is visible on article page', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.articleHeroImage).toBeVisible();
  });

  test('Step 3 — article body content is visible', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.articleBody).toBeVisible();
  });

  // ── Header persistence across pages ─────────────────────────────────────

  test('header remains consistent on blog index page', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.headerCommunity).toBeVisible();
    await expect(flow1.headerBlog).toBeVisible();
    await expect(flow1.headerFaq).toBeVisible();
    await expect(flow1.headerLogin).toBeVisible();
    await expect(flow1.headerJoinFree).toBeVisible();
  });

  test('header remains consistent on single article page', async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.headerCommunity).toBeVisible();
    await expect(flow1.headerBlog).toBeVisible();
    await expect(flow1.headerFaq).toBeVisible();
    await expect(flow1.headerLogin).toBeVisible();
    await expect(flow1.headerJoinFree).toBeVisible();
  });
});

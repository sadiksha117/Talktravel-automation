import { expect, test } from '@playwright/test';
import { Flow1ExploratoryPage } from '../../src/pages/exploratory/LandingtoblogSingleArticleExploratory';

test.describe('Flow 1 — Landing → Blog → Single Article (Exploratory)', () => {
  let flow1: Flow1ExploratoryPage;

  test.beforeEach(async ({ page }) => {
    flow1 = new Flow1ExploratoryPage(page);
    await flow1.goToLanding();
  });

  // ── Step 1 edge cases ────────────────────────────────────────────────────

  test('Edge — Step 1: logo href points to homepage', { tag: '@exploratory' }, async () => {
    await expect(flow1.logo).toHaveAttribute('href', '/');
  });

  test('Edge — Step 1: Log in link is visible in header', { tag: '@exploratory' }, async () => {
    await expect(flow1.headerLoginBtn).toBeVisible();
  });

  test('Edge — Step 1: Join Free link is visible in header', { tag: '@exploratory' }, async () => {
    await expect(flow1.headerJoinFreeBtn).toBeVisible();
  });

  test('Edge — Step 1: hero subtext is visible', { tag: '@exploratory' }, async () => {
    await expect(flow1.heroSubtext).toBeVisible();
  });

  test('Edge — Step 1: Read the Blog CTA href points to /blog', { tag: '@exploratory' }, async () => {
    await expect(flow1.readTheBlogBtn).toHaveAttribute('href', '/blog');
  });

  test('Edge — Step 1: Join the Community CTA has a non-empty href', { tag: '@exploratory' }, async () => {
    await expect(flow1.joinCommunityBtn).toHaveAttribute('href', /.+/);
  });

  test('Edge — Step 1: Community header link points to /trending', { tag: '@exploratory' }, async () => {
    await expect(flow1.headerCommunity).toHaveAttribute('href', '/trending');
  });

  test('Edge — Step 1: FAQ header link points to /faq', { tag: '@exploratory' }, async () => {
    await expect(flow1.headerFaq).toHaveAttribute('href', '/faq');
  });

  test('Edge — Step 1: Log in link points to /login', { tag: '@exploratory' }, async () => {
    await expect(flow1.headerLoginBtn).toHaveAttribute('href', '/login');
  });

  test('Edge — Step 1: Join Free link points to /register', { tag: '@exploratory' }, async () => {
    await expect(flow1.headerJoinFreeBtn).toHaveAttribute('href', '/register');
  });

  // ── Step 2 edge cases ────────────────────────────────────────────────────

  test('Edge — Step 2: blog search bar is visible', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.blogSearchBar).toBeVisible();
  });

  test('Edge — Step 2: blog search submit button is visible', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.blogSearchBtn).toBeVisible();
  });

  test('Edge — Step 2: View All Blogs button is visible', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.viewAllBlogsBtn).toBeVisible();
  });

  test('Edge — Step 2: View All Blogs link href contains view=latest', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.viewAllBlogsBtn).toHaveAttribute('href', /view=latest/);
  });

  test('Edge — Step 2: direct navigation to /blog loads correctly without landing', { tag: '@exploratory' }, async ({ page }) => {
    await page.goto('/blog');
    await flow1.waitForPageLoad();
    await expect(page).toHaveURL('https://staging.talktravel.com/blog');
    await expect(flow1.latestArticlesHeading).toBeVisible();
  });

  test('Edge — Step 2: Latest Articles grid contains at least 3 cards', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    const cardCount = await flow1.latestArticlesSection.locator('article').count();
    expect(cardCount).toBeGreaterThanOrEqual(3);
  });

  test('Edge — Step 2: Featured Blogs heading is visible', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.featuredBlogsHeading).toBeVisible();
  });

  test('Edge — Step 2: Featured Blogs section contains at least one article link', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    const linkCount = await flow1.featuredBlogsSection.getByRole('link').count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test('Edge — Step 2: category topics navigation is visible', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.categoryTopicsNav).toBeVisible();
  });

  test('Edge — Step 2: category nav contains Airlines link', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.categoryTopicsNav.getByRole('link', { name: 'Airlines', exact: true })).toBeVisible();
  });

  test('Edge — Step 2: newsletter signup section is visible', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.newsletterHeading).toBeVisible();
  });

  test('Edge — Step 2: newsletter email input is visible', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.newsletterEmailInput).toBeVisible();
  });

  test('Edge — Step 2: newsletter subscribe button is visible', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.newsletterSubscribeBtn).toBeVisible();
  });

  test('Edge — Step 2: Our Contributors section is visible', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.contributorsHeading).toBeVisible();
  });

  test('Edge — Step 2: first article card has a visible image', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    const firstCardImage = flow1.latestArticlesSection.locator('article').first().locator('img').first();
    await expect(firstCardImage).toBeVisible();
  });

  test('Edge — Step 2: first article card shows an author name', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    const firstCardAuthor = flow1.latestArticlesSection
      .locator('article').first()
      .locator('a[href*="/blog/author/"]');
    await expect(firstCardAuthor).toBeVisible();
  });

  test('Edge — Step 2: first article card shows a publish date', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    const firstCardDate = flow1.latestArticlesSection.locator('article').first().locator('time');
    await expect(firstCardDate).toBeVisible();
  });

  test('Edge — Step 2: footer is visible on blog page', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await expect(flow1.footerElement).toBeVisible();
  });

  // ── Step 3 edge cases ────────────────────────────────────────────────────

  test('Edge — Step 3: article breadcrumb is visible', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.articleBreadcrumb).toBeVisible();
  });

  test('Edge — Step 3: article author block is visible', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.articleAuthorBlock).toBeVisible();
  });

  test('Edge — Step 3: article share row is visible', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.articleShareRow).toBeVisible();
  });

  test('Edge — Step 3: article body content is present', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.articleBody).toBeVisible();
    const bodyText = await flow1.articleBody.innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test('Edge — Step 3: article publish date is visible', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.articleDate).toBeVisible();
  });

  test('Edge — Step 3: logo is visible on article page', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.logo).toBeVisible();
  });

  test('Edge — Step 3: header nav persists on article page', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.headerCommunity).toBeVisible();
    await expect(flow1.headerBlog).toBeVisible();
    await expect(flow1.headerFaq).toBeVisible();
  });

  test('Edge — Step 3: Blog header link still points to /blog on article page', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.headerBlog).toHaveAttribute('href', '/blog');
  });

  test('Edge — Step 3: Log in and Join Free links persist on article page', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.headerLoginBtn).toBeVisible();
    await expect(flow1.headerJoinFreeBtn).toBeVisible();
  });

  test('Edge — Step 3: footer is visible on article page', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    await expect(flow1.footerElement).toBeVisible();
  });

  test('Edge — Step 3: article URL slug contains no spaces', { tag: '@exploratory' }, async ({ page }) => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    expect(page.url()).not.toContain(' ');
  });

  test('Edge — Step 3: article H1 title text is not empty', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    await flow1.openFirstArticle();
    const titleText = await flow1.articleTitle.innerText();
    expect(titleText.trim().length).toBeGreaterThan(0);
  });

  test('Edge — Step 3: article title on page matches title clicked on blog listing', { tag: '@exploratory' }, async () => {
    await flow1.goToBlogViaHeader();
    const cardTitle = await flow1.latestArticlesSection
      .locator('article').first()
      .getByRole('heading', { level: 3 })
      .innerText();
    await flow1.openFirstArticle();
    await expect(flow1.articleTitle).toHaveText(cardTitle);
  });
});

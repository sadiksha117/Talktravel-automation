import { expect, test } from '@playwright/test';
import { UserProfileViewPage } from '../src/pages/UserProfileView';

test.describe('User Profile View (Pre-Login) — Positive Flow', () => {
  let profilePage: UserProfileViewPage;

  test.beforeEach(async ({ page }) => {
    profilePage = new UserProfileViewPage(page);
    await profilePage.goToProfileViaHomepageFeed();
  });

  // ── Step 1 — Enter profile from Homepage feed ────────────────────────────

  test('Step 1 — clicking author link from homepage navigates to /profile/{username}', async ({ page }) => {
    await expect(page).toHaveURL(/\/profile\/.+/);
  });

  test('Step 1 — profile username (h1) is visible', async () => {
    await expect(profilePage.profileUsername).toBeVisible();
  });

  test('Step 1 — profile avatar is visible', async () => {
    await expect(profilePage.profileAvatar).toBeVisible();
  });

  test('Step 1 — badges strip is visible', async () => {
    await expect(profilePage.badgesStrip).toBeVisible();
  });

  test('Step 1 — Add Friend button is visible', async () => {
    await expect(profilePage.addFriendBtn).toBeVisible();
  });

  test('Step 1 — Chat button is visible', async () => {
    await expect(profilePage.chatBtn).toBeVisible();
  });

  test('Step 1 — Follow/Unfollow button is visible', async () => {
    await expect(profilePage.followBtn).toBeVisible();
  });

  test('Step 1 — Posts tab is visible and active by default', async () => {
    await expect(profilePage.postsTab).toBeVisible();
    await expect(profilePage.postsTab).toHaveClass(/active/);
  });

  test('Step 1 — Comments tab is visible', async () => {
    await expect(profilePage.commentsTab).toBeVisible();
  });

  test('Step 1 — post cards are rendered under Posts tab', async () => {
    await expect(profilePage.postCards.first()).toBeVisible();
  });

  test('Step 1 — header nav links are visible', async () => {
    await expect(profilePage.headerCommunity).toBeVisible();
    await expect(profilePage.headerBlog).toBeVisible();
    await expect(profilePage.headerFaq).toBeVisible();
    await expect(profilePage.headerLogIn).toBeVisible();
    await expect(profilePage.headerJoinFree).toBeVisible();
  });

  test('Step 1 — footer is visible', async () => {
    await expect(profilePage.footer).toBeVisible();
  });

  // ── Step 2 — Enter profile from Single Post View ─────────────────────────

  test('Step 2 — clicking author from single post navigates to /profile/{username}', async ({ page }) => {
    const p = new UserProfileViewPage(page);
    await p.goToProfileViaSinglePost();
    await expect(page).toHaveURL(/\/profile\/.+/);
    await expect(p.profileUsername).toBeVisible();
  });

  // ── Step 3 — Enter profile from a comment ───────────────────────────────

  test('Step 3 — clicking commenter avatar from comments navigates to /profile/{username}', async ({ page }) => {
    const p = new UserProfileViewPage(page);
    await p.goToProfileViaComment();
    await expect(page).toHaveURL(/\/profile\/.+/);
    await expect(p.profileUsername).toBeVisible();
  });

  // ── Step 4 — Verify About User sidebar ───────────────────────────────────

  test('Step 4 — About User sidebar is visible', async () => {
    await expect(profilePage.aboutSidebar).toBeVisible();
  });

  test('Step 4 — Jetfuel count is visible in sidebar', async () => {
    await expect(profilePage.jetfuelCount).toBeVisible();
  });

  test('Step 4 — Tier label is visible in sidebar', async () => {
    await expect(profilePage.profileTier).toBeVisible();
  });

  test('Step 4 — tier progress line contains "Jetfuel until"', async () => {
    await expect(profilePage.tierProgress).toContainText(/Jetfuel until/i);
  });

  // ── Step 5 — Switch tab Posts → Comments ────────────────────────────────

  test('Step 5 — clicking Comments tab makes it active', async () => {
    await profilePage.switchToCommentsTab();
    await expect(profilePage.commentsTab).toHaveClass(/active/);
  });

  test('Step 5 — Posts tab becomes inactive after switching to Comments', async () => {
    await profilePage.switchToCommentsTab();
    await expect(profilePage.postsTab).not.toHaveClass(/active/);
  });

  test('Step 5 — post cards are visible after switching to Comments tab', async () => {
    await profilePage.switchToCommentsTab();
    await expect(profilePage.postCards.first()).toBeVisible();
  });

  // ── Step 6 — Click a post in the Posts tab ───────────────────────────────

  test('Step 6 — clicking a post title navigates to /post/{slug}', async ({ page }) => {
    const title = await profilePage.clickFirstPostCard();
    await expect(page).toHaveURL(/\/post\/.+/);
    if (title) {
      await expect(page.locator('h1')).toContainText(title);
    }
  });

  // ── Step 7 — Click a comment in the Comments tab ─────────────────────────

  test('Step 7 — clicking a comment row navigates to the parent post', async ({ page }) => {
    await profilePage.clickFirstComment();
    await expect(page).toHaveURL(/\/post\/.+/);
  });

  // ── Step 8 — Click a topic chip inside a post ────────────────────────────

  test('Step 8 — clicking a topic chip navigates to /tags/{slug}', async ({ page }) => {
    await profilePage.clickFirstTopicChip();
    await expect(page).toHaveURL(/\/tags\/.+/);
  });

  // ── Step 9 — Click a single badge ────────────────────────────────────────

  test('Step 9 — clicking a badge navigates to the badge detail page', async ({ page }) => {
    await profilePage.clickFirstBadge();
    await expect(page).toHaveURL(/\/badge\/.+/);
  });

  // ── Step 10 — Click "See all badges" ─────────────────────────────────────

  test('Step 10 — clicking "See all badges" navigates to /badges', async ({ page }) => {
    await profilePage.clickSeeAllBadges();
    await expect(page).toHaveURL(/\/badges/);
  });
});

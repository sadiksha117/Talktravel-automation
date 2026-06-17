import { test, expect } from '@playwright/test';
import { CreatePostPage } from '../src/pages/CreatePost';

const VALID_EMAIL = 'prempoudel72707@gmail.com';
const VALID_PASSWORD = 'Admin@123';

test.describe('Create Post (Post-Login) — Positive Flows', () => {
  let createPost: CreatePostPage;

  test.beforeEach(async ({ page }) => {
    createPost = new CreatePostPage(page);
    await createPost.login(VALID_EMAIL, VALID_PASSWORD);
    await createPost.goToCreatePost();
  });

  // ── Step 1: Open Create Post via header button ───────────────────────────

  test('Step 1 — Create Post page loads at /create-post URL', async ({ page }) => {
    await expect(page).toHaveURL(/\/create-post|\/new-post|\/post\/new/);
  });

  test('Step 1 — Title input is visible', async () => {
    await expect(createPost.titleInput).toBeVisible();
  });

  test('Step 1 — Discussion editor is visible', async () => {
    await expect(createPost.discussionEditor).toBeVisible();
  });

  test('Step 1 — External Link input is visible', async () => {
    await expect(createPost.externalLinkInput).toBeVisible();
  });

  test('Step 1 — Topics input is visible', async () => {
    await expect(createPost.topicsInput).toBeVisible();
  });

  test('Step 1 — Publish Post button is visible', async () => {
    await expect(createPost.publishBtn).toBeVisible();
  });

  test('Step 1 — Cancel button is visible', async () => {
    await expect(createPost.cancelBtn).toBeVisible();
  });

  // ── Step 2: Open Create Post via Topic Detail page ───────────────────────

  test('Step 2 — Create Post from Topic Detail pre-selects the topic', async ({ page }) => {
    await page.goto('https://staging.talktravel.com/tags/airlines', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /new post/i }).click();
    await expect(page).toHaveURL(/\/create-post|\/new-post|\/post\/new/);
    await expect(
      page.locator('[data-testid="topic-chip-selected"]').filter({ hasText: /airlines/i }).first()
    ).toBeVisible();
  });

  // ── Step 3: Title field ──────────────────────────────────────────────────

  test('Step 3 — Title field accepts text input', async () => {
    await createPost.titleInput.fill('Automation test post title');
    await expect(createPost.titleInput).toHaveValue('Automation test post title');
  });

  // ── Step 4: Discussion rich-text editor ─────────────────────────────────

  test('Step 4 — Discussion editor accepts text input', async () => {
    await createPost.discussionEditor.click();
    await createPost.discussionEditor.type('First line of automation discussion.');
    await expect(createPost.discussionEditor).toContainText('First line of automation discussion.');
  });

  test('Step 4 — Bold toolbar button is visible', async () => {
    await expect(createPost.boldBtn).toBeVisible();
  });

  test('Step 4 — Italic toolbar button is visible', async () => {
    await expect(createPost.italicBtn).toBeVisible();
  });

  test('Step 4 — Underline toolbar button is visible', async () => {
    await expect(createPost.underlineBtn).toBeVisible();
  });

  test('Step 4 — Bold formatting applies to selected text', async ({ page }) => {
    await createPost.discussionEditor.click();
    await createPost.discussionEditor.type('Bold text');
    await page.keyboard.press('Control+A');
    await createPost.boldBtn.click();
    const boldEl = page.locator('[data-testid="post-discussion"] strong, [contenteditable="true"] strong').first();
    await expect(boldEl).toBeVisible();
  });

  test('Step 4 — Italic formatting applies to selected text', async ({ page }) => {
    await createPost.discussionEditor.click();
    await createPost.discussionEditor.type('Italic text');
    await page.keyboard.press('Control+A');
    await createPost.italicBtn.click();
    const italicEl = page.locator('[data-testid="post-discussion"] em, [contenteditable="true"] em').first();
    await expect(italicEl).toBeVisible();
  });

  // ── Step 5: External Link + Fetch Title ──────────────────────────────────

  test('Step 5 — External Link input accepts a URL', async () => {
    await createPost.externalLinkInput.fill('https://www.bbc.com/travel');
    await expect(createPost.externalLinkInput).toHaveValue('https://www.bbc.com/travel');
  });

  test('Step 5 — Fetch Title button is visible', async () => {
    await expect(createPost.fetchTitleBtn).toBeVisible();
  });

  test('Step 5 — Fetch Title populates the Title field', async () => {
    await createPost.externalLinkInput.fill('https://www.bbc.com/travel');
    await createPost.fetchTitleBtn.click();
    await expect(createPost.titleInput).not.toHaveValue('');
  });

  test('Step 5 — Title remains editable after Fetch Title', async () => {
    await createPost.externalLinkInput.fill('https://www.bbc.com/travel');
    await createPost.fetchTitleBtn.click();
    await expect(createPost.titleInput).not.toHaveValue('');
    await createPost.titleInput.fill('My custom title');
    await expect(createPost.titleInput).toHaveValue('My custom title');
  });

  // ── Step 6: Topics — search and select existing topic ────────────────────

  test('Step 6 — Typing in Topics input shows a dropdown', async ({ page }) => {
    await createPost.topicsInput.click();
    await createPost.topicsInput.fill('air');
    await expect(page.locator('[role="listbox"], [role="option"]').first()).toBeVisible();
  });

  test('Step 6 — Selecting a topic adds it as a chip', async () => {
    await createPost.selectTopic('Airlines');
    await expect(
      createPost.selectedTopicChips.filter({ hasText: /airlines/i }).first()
    ).toBeVisible();
  });

  test('Step 6 — Topics input clears after a topic is selected', async () => {
    await createPost.selectTopic('Airlines');
    await expect(createPost.topicsInput).toHaveValue('');
  });

  // ── Step 7: Topics — create a new topic ──────────────────────────────────

  test('Step 7 — Typing a non-existent topic shows a Create option', async ({ page }) => {
    const uniqueTopic = `AutomationTestTopic${Date.now()}`;
    await createPost.topicsInput.click();
    await createPost.topicsInput.fill(uniqueTopic);
    await expect(
      page.locator('[role="option"]').filter({ hasText: /create/i }).first()
    ).toBeVisible();
  });

  test('Step 7 — Creating a new topic adds it as a chip', async ({ page }) => {
    const uniqueTopic = `AutomationTestTopic${Date.now()}`;
    await createPost.topicsInput.click();
    await createPost.topicsInput.fill(uniqueTopic);
    await page.locator('[role="option"]').filter({ hasText: /create/i }).first().click();
    await expect(
      createPost.selectedTopicChips.filter({ hasText: uniqueTopic }).first()
    ).toBeVisible();
  });

  // ── Step 8: Topics — parent + child resolves to child ────────────────────

  test('Step 8 — Selecting parent then child retains only the child chip', async ({ page }) => {
    await createPost.selectTopic('Travel');
    await createPost.selectTopic('Coolcation');
    await expect(
      createPost.selectedTopicChips.filter({ hasText: /coolcation/i }).first()
    ).toBeVisible();
    await expect(
      createPost.selectedTopicChips.filter({ hasText: /^travel$/i })
    ).toHaveCount(0);
  });

  // ── Step 9: Topics — max 5 limit ─────────────────────────────────────────

  test('Step 9 — Five topics can be added successfully', async ({ page }) => {
    for (const topic of ['Airlines', 'Hotels', 'Food', 'Solo Travel', 'Backpacking']) {
      await createPost.topicsInput.fill(topic);
      await page.locator(`[role="option"]:has-text("${topic}")`).first().click();
    }
    await expect(createPost.selectedTopicChips).toHaveCount(5);
  });

  test('Step 9 — Adding a 6th topic is blocked and shows a limit message', async ({ page }) => {
    for (const topic of ['Airlines', 'Hotels', 'Food', 'Solo Travel', 'Backpacking']) {
      await createPost.topicsInput.fill(topic);
      await page.locator(`[role="option"]:has-text("${topic}")`).first().click();
    }
    await createPost.topicsInput.fill('Adventure');
    await page.locator('[role="option"]:has-text("Adventure")').first().click();
    await expect(page.locator('text=/maximum.*5|5 topics/i')).toBeVisible();
    await expect(createPost.selectedTopicChips).toHaveCount(5);
  });

  // ── Step 10: Topics — duplicates blocked ─────────────────────────────────

  test('Step 10 — Adding a duplicate topic does not increase chip count', async ({ page }) => {
    await createPost.selectTopic('Airlines');
    await expect(
      createPost.selectedTopicChips.filter({ hasText: /airlines/i })
    ).toHaveCount(1);
    await createPost.topicsInput.fill('Airlines');
    await page.locator('[role="option"]:has-text("Airlines")').first().click();
    await expect(
      createPost.selectedTopicChips.filter({ hasText: /airlines/i })
    ).toHaveCount(1);
  });

  // ── Step 11: Cancel button ───────────────────────────────────────────────

  test('Step 11 — Cancel returns to a non-create-post page', async ({ page }) => {
    await createPost.titleInput.fill('Will be discarded');
    await createPost.cancelBtn.click();
    await expect(page).not.toHaveURL(/\/create-post|\/new-post|\/post\/new/);
  });

  // ── Step 15: Publish — full happy path ───────────────────────────────────

  test('Step 15 — Publish with full form redirects to Single Post View', async ({ page }) => {
    const title = `E2E full post ${Date.now()}`;
    await createPost.titleInput.fill(title);
    await createPost.discussionEditor.click();
    await createPost.discussionEditor.type('Discussion body content.');
    await createPost.externalLinkInput.fill('https://www.example.com');
    await createPost.selectTopic('Airlines');
    await createPost.selectTopic('Hotels');
    await createPost.publishBtn.click();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
  });

  // ── Step 16: Publish — minimal valid (Title + 1 topic) ───────────────────

  test('Step 16 — Publish with Title and one topic succeeds', async ({ page }) => {
    const title = `Minimal post ${Date.now()}`;
    await createPost.titleInput.fill(title);
    await createPost.selectTopic('Airlines');
    await createPost.publishBtn.click();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
  });

  // ── Step 17: Post appears in My Posts ────────────────────────────────────

  test('Step 17 — Published post appears in My Posts', async ({ page }) => {
    const title = `My Posts check ${Date.now()}`;
    await createPost.titleInput.fill(title);
    await createPost.selectTopic('Airlines');
    await createPost.publishBtn.click();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
    await page.locator('nav >> text=My Posts').click();
    await expect(
      page.locator('[data-testid="post-card"]').filter({ hasText: title }).first()
    ).toBeVisible();
  });

  // ── Step 18: Post appears in relevant topic page ──────────────────────────

  test('Step 18 — Published post appears on the tagged topic page under Latest', async ({ page }) => {
    const title = `Topic page check ${Date.now()}`;
    await createPost.titleInput.fill(title);
    await createPost.selectTopic('Airlines');
    await createPost.publishBtn.click();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);
    await page.goto('https://staging.talktravel.com/tags/airlines', { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /latest/i }).click();
    await expect(
      page.locator('[data-testid="post-card"]').filter({ hasText: title }).first()
    ).toBeVisible();
  });

  // ── Step 19: +5 Jetfuel earned after publish ─────────────────────────────

  test('Step 19 — Publishing a post increases Jetfuel count by 5', async ({ page }) => {
    await page.goto('https://staging.talktravel.com/profile/me', { waitUntil: 'domcontentloaded' });
    const beforeText = await page.locator('[data-testid="jetfuel-count"]').textContent();
    const before = parseInt(beforeText ?? '0', 10);

    await createPost.goToCreatePost();
    const title = `Jetfuel test ${Date.now()}`;
    await createPost.titleInput.fill(title);
    await createPost.selectTopic('Airlines');
    await createPost.publishBtn.click();
    await expect(page).toHaveURL(/\/post\/[a-z0-9-]+/);

    await page.goto('https://staging.talktravel.com/profile/me', { waitUntil: 'domcontentloaded' });
    const afterText = await page.locator('[data-testid="jetfuel-count"]').textContent();
    const after = parseInt(afterText ?? '0', 10);
    expect(after).toBe(before + 5);
  });
});

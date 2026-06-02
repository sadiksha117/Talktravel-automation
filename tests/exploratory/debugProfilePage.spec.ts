import { test } from '@playwright/test';

test('debug — dump profile page structure', async ({ page }) => {
  await page.goto('https://staging.talktravel.com/trending');
  await page.waitForLoadState('load');

  // Dismiss cookie banner
  try {
    await page.getByRole('button', { name: 'Accept All' }).click({ timeout: 3000 });
  } catch { /* not present */ }

  // Navigate to first author profile
  const authorLink = page.locator('a[href*="/user/"], a[href*="/profile/"]').first();
  await authorLink.waitFor({ state: 'visible' });
  const profileUrl = await authorLink.getAttribute('href');
  console.log('Profile URL:', profileUrl);
  await authorLink.click();
  await page.waitForURL(/\/(user|users|profile)\/.+/);
  await page.waitForLoadState('load');

  console.log('Current URL:', page.url());

  // Dump headings
  const headings = await page.locator('h1, h2, h3').allTextContents();
  console.log('Headings:', JSON.stringify(headings, null, 2));

  // Dump all buttons
  const buttons = await page.locator('button').allTextContents();
  console.log('Buttons:', JSON.stringify(buttons, null, 2));

  // Dump all links with hrefs
  const links = await page.locator('a[href]').evaluateAll(els =>
    els.slice(0, 30).map(el => ({ text: el.textContent?.trim(), href: el.getAttribute('href') }))
  );
  console.log('Links (first 30):', JSON.stringify(links, null, 2));

  // Dump all img alt texts
  const imgs = await page.locator('img').evaluateAll(els =>
    els.map(el => ({ alt: el.getAttribute('alt'), src: el.getAttribute('src')?.substring(0, 60) }))
  );
  console.log('Images:', JSON.stringify(imgs, null, 2));

  // Dump elements with role=tab
  const tabs = await page.locator('[role="tab"]').allTextContents();
  console.log('role=tab elements:', JSON.stringify(tabs, null, 2));

  // Dump aside elements
  const asides = await page.locator('aside').allTextContents();
  console.log('aside elements:', JSON.stringify(asides.map(t => t.substring(0, 200)), null, 2));

  // Dump elements with data-testid
  const testIds = await page.locator('[data-testid]').evaluateAll(els =>
    els.map(el => ({ testid: el.getAttribute('data-testid'), text: el.textContent?.trim().substring(0, 50) }))
  );
  console.log('data-testid elements:', JSON.stringify(testIds, null, 2));

  // Dump class names of main content area children
  const mainChildren = await page.locator('main > *').evaluateAll(els =>
    els.map(el => ({ tag: el.tagName, class: el.className.substring(0, 100) }))
  );
  console.log('main > * children:', JSON.stringify(mainChildren, null, 2));

  // Take a screenshot
  await page.screenshot({ path: 'test-results/debug-profile-page.png', fullPage: true });
});

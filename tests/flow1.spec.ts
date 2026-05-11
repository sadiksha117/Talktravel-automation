import { test } from '@playwright/test';
import { Flow1Page } from '../src/pages/Flow1Page';

test.describe('Flow 1', () => {
  let flow1Page: Flow1Page;

  test.beforeEach(async ({ page }) => {
    flow1Page = new Flow1Page(page);
  });

  test.todo('happy path: should complete flow 1 successfully');

  test.todo('negative case: should display error when flow 1 input is invalid');

  test.todo('edge case: should handle boundary conditions for flow 1');
});

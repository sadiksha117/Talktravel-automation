import { test } from '@playwright/test';
import { Flow3Page } from '../src/pages/Flow3Page';

test.describe('Flow 3', () => {
  let flow3Page: Flow3Page;

  test.beforeEach(async ({ page }) => {
    flow3Page = new Flow3Page(page);
  });

  test.todo('happy path: should complete flow 3 successfully');

  test.todo('negative case: should display error when flow 3 input is invalid');

  test.todo('edge case: should handle boundary conditions for flow 3');
});

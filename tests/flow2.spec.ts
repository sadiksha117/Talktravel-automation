import { test } from '@playwright/test';
import { Flow2Page } from '../src/pages/Flow2Page';

test.describe('Flow 2', () => {
  let flow2Page: Flow2Page;

  test.beforeEach(async ({ page }) => {
    flow2Page = new Flow2Page(page);
  });

  test.todo('happy path: should complete flow 2 successfully');

  test.todo('negative case: should display error when flow 2 input is invalid');

  test.todo('edge case: should handle boundary conditions for flow 2');
});

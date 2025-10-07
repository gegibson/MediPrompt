import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Prompt page accessibility', () => {
  test('Premium prompt locked state meets WCAG AA', async ({ page }) => {
    await page.goto('http://localhost:3001/library/medication-management-new-inhaler');
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      axeOptions: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa'],
        },
      },
    });
  });
});

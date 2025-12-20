import { test, expect } from '@playwright/test';

test('mock mode shows transcripts when started', async ({ page }) => {
  await page.goto('/?mock=1');

  await page.getByRole('button', { name: 'Start' }).click();

  const out = page.locator('#finalText');
  await expect(out).toContainText('こんにちは', { timeout: 5000 });

  await page.getByRole('button', { name: 'Stop' }).click();
});

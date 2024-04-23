import { test, expect } from '@playwright/test';
const jsdom = require('jsdom');

test('continue in session', async ({ page }) => {
  await page.goto('/uni4/game.php');
  const userName = process.env.PROGAME_USERNAME!;
  await expect(page.getByRole('link', { name: userName })).toBeVisible();
  await expect(page.getByRole('link', { name: /Metall[0-9\.\s]/ })).toBeVisible(); // Metall gefolgt von whitespace, Zahlen oder Punkt
  const metAmt = await page.locator('#current_metal').getAttribute('data-real');
  const krisAmt = await page.locator('#current_crystal').getAttribute('data-real');
  const deutAmt = await page.locator('#current_deuterium').getAttribute('data-real');
  const energieAmt = await page.getByRole('link', { name: /Energie[0-9\.\/\s]/ }).innerHTML(); // Energie gefolgt von whitespace, Zahlen, Punkt oder Backslash
  const { JSDOM } = jsdom;
  const energieDOM = new JSDOM(energieAmt);
  console.log(metAmt);
  console.log(krisAmt);
  console.log(deutAmt);
  console.log(energieDOM);
});

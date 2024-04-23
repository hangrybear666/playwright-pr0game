import { test, expect } from '@playwright/test';
import { randomDelay } from 'utils/pr0game-setup';
const jsdom = require('jsdom');

// declare global {
//   namespace NodeJS {
//     interface Global {
//       document: Document;
//       window: Window;
//       navigator: Navigator;
//     }
//   }
// }

test('continue in session', async ({ page }) => {
  await page.goto('/uni4/game.php');
  const userName = process.env.PROGAME_USERNAME!;
  await expect(page.getByRole('link', { name: userName })).toBeVisible();
  await expect(page.getByRole('link', { name: /Metall[0-9\.\s]/ })).toBeVisible(); // Metall gefolgt von whitespace, Zahlen oder Punkt
  const metAmt = await page.locator('#current_metal').getAttribute('data-real');
  const krisAmt = await page.locator('#current_crystal').getAttribute('data-real');
  const deutAmt = await page.locator('#current_deuterium').getAttribute('data-real');
  const energieHtml = await page.getByRole('link', { name: /Energie[0-9\.\/\s]/ }).innerHTML(); // Energie gefolgt von whitespace, Zahlen, Punkt oder Backslash
  const { JSDOM } = jsdom;
  const energieDOM = new JSDOM(energieHtml);
  const energieDocument: Document = energieDOM.window.document;
  const energieSpans = energieDocument.querySelectorAll('span');
  let energieAmt: string = '';
  energieSpans.forEach((e) => {
    if (e.textContent?.includes('/')) {
      energieAmt = e.textContent.split('/')[0];
    }
  });
  const metAvailable: number = metAmt ? parseInt(metAmt) : 0;
  const krisAvailable: number = krisAmt ? parseInt(krisAmt) : 0;
  const deutAvailable: number = deutAmt ? parseInt(deutAmt) : 0;
  const energieAvailable: number = energieAmt ? parseInt(energieAmt) : 0;

  await randomDelay(page); // wait a random time amount between 1-5 seconds before clicking
  await page.getByRole('link', { name: 'Gebäude', exact: true }).click();
  await expect(page.getByText('Metallmine')).toBeVisible();
  await expect(page.getByText('Kristallmine')).toBeVisible();
});

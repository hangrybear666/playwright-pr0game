import { test, expect, Page } from '@playwright/test';
import { logger } from 'utils/logger';
import { parameters } from 'config/parameters';
// import fs from 'fs';
import { PlayerStatistics, PointType } from 'utils/customTypes';
import { randomDelay } from 'utils/sharedFunctions';

test('extract points from statistics page', async ({ page }) => {
  try {
    await page.goto(process.env.PROGAME_UNI_RELATIVE_PATH!);
    const userName = process.env.CLI_PROGAME_USERNAME
      ? process.env.CLI_PROGAME_USERNAME
      : process.env.PROGAME_USERNAME_DEFAULT
        ? process.env.PROGAME_USERNAME_DEFAULT
        : '';
    await expect(page.getByRole('link', { name: userName })).toBeVisible({ timeout: parameters.ACTION_TIMEOUT });
    await expect(page.getByRole('link', { name: /Metall[0-9\.\s]/ })).toBeVisible({ timeout: parameters.ACTION_TIMEOUT }); // Metall followed by whitespace, numbers or a dot

    await page.goto(`${process.env.PROGAME_UNI_RELATIVE_PATH}?page=statistics`, { timeout: parameters.ACTION_TIMEOUT });
    await expect(page.locator('form#stats:has-text("Statistiken")')).toBeVisible({ timeout: parameters.ACTION_TIMEOUT });

    const lastUpdatedServerSide: string = (await page.getByText('Statistiken (Aktualisiert').innerText({ timeout: parameters.ACTION_TIMEOUT }))
      .split('am:')[1]
      .split(')')[0]
      .trim();
    logger.verbose('Sever Refresh Time : ' + lastUpdatedServerSide);

    let stats: PlayerStatistics[] = [];
    stats = await extractPlayerStatisticsByType(page, stats, lastUpdatedServerSide, 'total');

    const pointTypeSelectOptions = ['1']; // 1 = Punkte  3 = Forschung 4 = Gebäude
    const pointBracketSelectOptions = ['1', '101', '201', '301', '401'];
    async function processOptions() {
      for (const pointType of pointTypeSelectOptions) {
        await page.selectOption('select#type', pointType);
        for (const bracket of pointBracketSelectOptions) {
          // wait for a couple seconds between interactions
          await new Promise((resolve) => setTimeout(resolve, 3000 + (Math.random() > 0.5 ? Math.random() * 1000 : Math.random() * -1000)));
          await page.selectOption('select#range', bracket);
          // extract points
        }
      }
    }
    // await processOptions();
    console.log(stats);
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
    throw error;
  }
});

/**
 * page.evaluate takes javascript and executes it in the loaded browser context with access to document and window objects.
 * A parameter of any type can be passed as the last argument and is accesible via a reference passed as the first function argument.
 * @param {Page} page
 * @param {PlayerStatistics[]} stats
 * @param {string} lastUpdatedServerSide
 * @param {} typeStr
 * @returns
 */
async function extractPlayerStatisticsByType(page: Page, stats: PlayerStatistics[], lastUpdatedServerSide: string, typeStr: PointType) {
  return await page.evaluate(
    ({ lastUpdatedServerSide, stats, typeStr }) => {
      const executionDate = new Date();
      document.querySelectorAll('#statistics > div.wrapper > content > table > tbody > tr').forEach((row, index) => {
        if (index > 0) {
          console.log(row);
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            switch (typeStr) {
              case 'total':
                stats.push({
                  name: cells[1] && cells[1].textContent ? cells[1].textContent.split(/(\r\n|\r|\n)/)[0].trim() : '',
                  rank: cells[0] ? Number(cells[0].textContent?.trim()) : 0,
                  total: cells[cells.length - 1] ? Number(cells[cells.length - 1].textContent?.trim().replace('.', '')) : 0,
                  buildings: 0,
                  research: 0,
                  fleet: 0,
                  defense: 0,
                  serverDate: lastUpdatedServerSide,
                  checkDate: executionDate
                });
                break;

              default:
                break;
            }
          }
        }
      });
      return stats;
    },
    { lastUpdatedServerSide, stats, typeStr }
  );
}

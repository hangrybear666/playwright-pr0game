import { test, expect } from '@playwright/test';
import { logger } from 'utils/logger';
import { parameters } from 'config/parameters';
// import fs from 'fs';
import jsdom from 'jsdom';
import { PlayerStatistics } from 'utils/customTypes';

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

    const lastUpdatedServerSide = await page.getByText('Statistiken (Aktualisiert').innerText({ timeout: parameters.ACTION_TIMEOUT });
    logger.verbose('lastUpdatedServerSide : ' + lastUpdatedServerSide);
    const statisticsHtml = await page.locator('#statistics > div.wrapper > content > table > tbody').innerHTML();
    console.log(`
 _   _   _____   __  __   _
| | | | |_   _| |  \/  | | |
| |_| |   | |   | |\/| | | |
|  _  |   | |   | |  | | | |___
|_| |_|   |_|   |_|  |_| |_____|
  `);
    console.log(statisticsHtml);
    const { JSDOM } = jsdom;
    const statisticsDOM = new JSDOM(statisticsHtml);
    console.log(`
____      ___     __  __
|  _ \    / _ \   |  \/  |
| | | |  | | | |  | |\/| |
| |_| |  | |_| |  | |  | |
|____/    \___/   |_|  |_|
   `);
    console.log(statisticsDOM);
    const statisticsDocument: Document = statisticsDOM.window.document;
    console.log(`
____   ___   ____ _   _ __  __ _____ _   _ _____
|  _ \ / _ \ / ___| | | |  \/  | ____| \ | |_   _|
| | | | | | | |   | | | | |\/| |  _| |  \| | | |
| |_| | |_| | |___| |_| | |  | | |___| |\  | | |
|____/ \___/ \____|\___/|_|  |_|_____|_| \_| |_|
   `);
    console.log(statisticsDocument);
    const executionDate = new Date();
    let playerStatistics: PlayerStatistics[] = [];
    statisticsDocument.querySelectorAll('tr').forEach((row, index) => {
      console.log('ROW');
      console.log(row);
      if (index === 0) {
        // skip the header
      } else {
        const cells = row.querySelectorAll('td');
        console.log('CELLS 0');
        console.log(cells[0]);
        console.log('CELLS 5');
        console.log(cells[4]);
        playerStatistics.push({
          name: cells[0] && cells[0].textContent ? cells[0].textContent.trim() : '',
          total: cells[cells.length - 1] ? Number(cells[cells.length - 1].textContent?.trim().replace('.', '')) : 0,
          buildings: 0,
          research: 0,
          fleet: 0,
          defense: 0,
          checkDate: executionDate
        });
      }
    });
    console.log(playerStatistics);
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
    throw error;
  }
});

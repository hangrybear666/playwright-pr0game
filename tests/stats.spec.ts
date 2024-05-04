import { test, expect, Page } from '@playwright/test';
import { logger } from 'utils/logger';
import { parameters } from 'config/parameters';
import fs from 'fs';
import { PlayerStatistics, PointType, PointTypeEnum } from 'utils/customTypes';

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
    const executionDate = new Date();

    let stats: PlayerStatistics[] = [];
    const pointTypeSelectOptions = [PointTypeEnum.total, PointTypeEnum.buildings, PointTypeEnum.research]; // 1 = Punkte  3 = Forschung 4 = Gebäude
    const pointBracketSelectOptions = ['1', '101', '201', '301'];
    async function iterateThroughRankings() {
      for (const pointType of pointTypeSelectOptions) {
        await page.selectOption('select#type', pointType);
        for (const bracket of pointBracketSelectOptions) {
          // wait for a couple seconds between interactions
          await page.selectOption('select#range', bracket);
          expect((await page.locator('#range option[selected]').getAttribute('value')) === bracket);
          await new Promise((resolve) => setTimeout(resolve, 3000 + (Math.random() > 0.5 ? Math.random() * 1000 : Math.random() * -1000)));
          // extract points
          switch (pointType) {
            case PointTypeEnum.total:
              logger.verbose(`Extracting total points in bracket ${bracket}`);
              stats = await extractPlayerStatisticsByType(page, stats, lastUpdatedServerSide, executionDate, 'total');
              break;
            case PointTypeEnum.buildings:
              logger.verbose(`Extracting buildings points in bracket ${bracket}`);
              stats = await extractPlayerStatisticsByType(page, stats, lastUpdatedServerSide, executionDate, 'buildings');
              break;
            case PointTypeEnum.research:
              logger.verbose(`Extracting research points in bracket ${bracket}`);
              stats = await extractPlayerStatisticsByType(page, stats, lastUpdatedServerSide, executionDate, 'research');
              break;
            // case PointTypeEnum.fleet:
            //   stats = await extractPlayerStatisticsByType(page, stats, lastUpdatedServerSide, executionDate, 'fleet');
            //   break;
            //   case PointTypeEnum.defense:
            //     stats = await extractPlayerStatisticsByType(page, stats, lastUpdatedServerSide, executionDate, 'defense');
            //     break;

            default:
              break;
          }
        }
      }
    }
    await iterateThroughRankings();
    console.log(stats);
    await new Promise<void>((resolve) => {
      // fs.writeFile is asynchronous, so we have to wait for writing to complete before reading it from filesystem
      writeJSONToFile(stats, './storage/stats.json', () => {
        resolve();
      });
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
    throw error;
  }
});

function writeJSONToFile(stats: PlayerStatistics[], path: string, writingFinished: () => void) {
  fs.writeFile(path, JSON.stringify(stats, null, 2), (err) => {
    if (err) {
      logger.error("Couldn't write JSON file: ", err);
    } else {
      logger.verbose(`Updated stats at: ${path}`);
      writingFinished();
    }
  });
}

/**
 * page.evaluate takes javascript and executes it in the loaded browser context with access to document and window objects.
 * A parameter of any type can be passed as the last argument and is accesible via a reference passed as the first function argument.
 * @param {Page} page
 * @param {PlayerStatistics[]} stats
 * @param {string} lastUpdatedServerSide
 * @param {Date} executionDate
 * @param {} typeStr
 * @returns
 */
async function extractPlayerStatisticsByType(page: Page, stats: PlayerStatistics[], lastUpdatedServerSide: string, executionDate: Date, typeStr: PointType) {
  return await page.evaluate(
    ({ lastUpdatedServerSide, stats, typeStr, executionDate }) => {
      //            _                  _        __                         _   _ _____ __  __ _
      //   _____  _| |_ _ __ __ _  ___| |_     / _|_ __ ___  _ __ ___     | | | |_   _|  \/  | |
      //  / _ \ \/ / __| '__/ _` |/ __| __|   | |_| '__/ _ \| '_ ` _ \    | |_| | | | | |\/| | |
      // |  __/>  <| |_| | | (_| | (__| |_    |  _| | | (_) | | | | | |   |  _  | | | | |  | | |___
      //  \___/_/\_\\__|_|  \__,_|\___|\__|   |_| |_|  \___/|_| |_| |_|   |_| |_| |_| |_|  |_|_____|
      document.querySelectorAll('#statistics > div.wrapper > content > table > tbody > tr').forEach((row, index) => {
        // skip for first row, as this contains the header
        if (index > 0) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            //                      ___  __      ___  __   __            ___  __   __       ___  ___       __
            // \  /  /\  |    |  | |__  /__`    |__  |__) /  \  |\/|    |__  |__) /  \ |\ |  |  |__  |\ | |  \
            //  \/  /~~\ |___ \__/ |___ .__/    |    |  \ \__/  |  |    |    |  \ \__/ | \|  |  |___ | \| |__/
            const accName = cells[1] && cells[1].textContent ? cells[1].textContent.split(/(\r\n|\r|\n)/)[0].trim() : '';
            const accRank = cells[0] ? Number(cells[0].textContent?.trim()) : 0;
            const accPoints = cells[cells.length - 1] ? Number(cells[cells.length - 1].textContent?.trim().replace('.', '')) : 0;

            //   __        ___  __           ___  __   __      ___        __  ___         __      __  ___      ___  __
            //  /  ` |__| |__  /  ` |__/    |__  /  \ |__)    |__  \_/ | /__`  |  | |\ | / _`    /__`  |   /\   |  /__`
            //  \__, |  | |___ \__, |  \    |    \__/ |  \    |___ / \ | .__/  |  | | \| \__>    .__/  |  /~~\  |  .__/
            const isStatsInitialized = stats && stats.length > 0;
            // filter stats by name and checkDate of this playwright execution
            const statsFilteredAndSorted = isStatsInitialized
              ? stats.filter((e) => e.name === accName && e.serverDate === lastUpdatedServerSide).sort((a, b) => (a.checkDate > b.checkDate ? 1 : -1))
              : null;
            // set existingStat if match has been found
            const existingStat = statsFilteredAndSorted && statsFilteredAndSorted.length > 0 ? statsFilteredAndSorted[0] : null;
            // find index of existing stat
            const existingStatIndex = existingStat ? stats.indexOf(existingStat) : -1;
            const isStatIndexFound = existingStatIndex !== -1;
            switch (typeStr) {
              case 'total':
                if (isStatIndexFound) {
                  stats[existingStatIndex].rank = accRank;
                  stats[existingStatIndex].total = accPoints;
                } else {
                  initializePlayerTotal(stats, accName, accRank, accPoints, lastUpdatedServerSide, executionDate);
                }
                break;
              case 'buildings':
                if (isStatIndexFound) {
                  stats[existingStatIndex].buildingsRank = accRank;
                  stats[existingStatIndex].buildings = accPoints;
                } else {
                  initializeBuildingsTotal(stats, accName, accRank, accPoints, lastUpdatedServerSide, executionDate);
                }
                break;
              case 'research':
                if (isStatIndexFound) {
                  stats[existingStatIndex].researchRank = accRank;
                  stats[existingStatIndex].research = accPoints;
                } else {
                  initializeResearchTotal(stats, accName, accRank, accPoints, lastUpdatedServerSide, executionDate);
                }
                break;
              case 'fleet':
                if (isStatIndexFound) {
                  stats[existingStatIndex].fleetRank = accRank;
                  stats[existingStatIndex].fleet = accPoints;
                } else {
                  initializeFleetTotal(stats, accName, accRank, accPoints, lastUpdatedServerSide, executionDate);
                }
                break;
              case 'defense':
                if (isStatIndexFound) {
                  stats[existingStatIndex].defenseRank = accRank;
                  stats[existingStatIndex].defense = accPoints;
                } else {
                  initializeDefenseTotal(stats, accName, accRank, accPoints, lastUpdatedServerSide, executionDate);
                }
                break;
              default:
                break;
            }
          }
        }
      });
      //  _       _ _   _       _ _                              __ _          _
      // (_)_ __ (_) |_(_) __ _| (_)_______      ___  _ __      / _(_)_ __ ___| |_      __ _  ___ ___ ___  ___ ___
      // | | '_ \| | __| |/ _` | | |_  / _ \    / _ \| '_ \    | |_| | '__/ __| __|    / _` |/ __/ __/ _ \/ __/ __|
      // | | | | | | |_| | (_| | | |/ /  __/   | (_) | | | |   |  _| | |  \__ \ |_    | (_| | (_| (_|  __/\__ \__ \
      // |_|_| |_|_|\__|_|\__,_|_|_/___\___|    \___/|_| |_|   |_| |_|_|  |___/\__|    \__,_|\___\___\___||___/___/
      function initializePlayerTotal(
        stats: PlayerStatistics[],
        accName: string,
        accRank: number,
        accPoints: number,
        lastUpdatedServerSide: string,
        executionDate: Date
      ) {
        stats.push({
          name: accName,
          rank: accRank,
          buildingsRank: 0,
          researchRank: 0,
          fleetRank: 0,
          defenseRank: 0,
          total: accPoints,
          buildings: 0,
          research: 0,
          fleet: 0,
          defense: 0,
          serverDate: lastUpdatedServerSide,
          checkDate: executionDate
        });
      }
      function initializeBuildingsTotal(
        stats: PlayerStatistics[],
        accName: string,
        accRank: number,
        accPoints: number,
        lastUpdatedServerSide: string,
        executionDate: Date
      ) {
        stats.push({
          name: accName,
          rank: 0,
          buildingsRank: accRank,
          researchRank: 0,
          fleetRank: 0,
          defenseRank: 0,
          total: 0,
          buildings: accPoints,
          research: 0,
          fleet: 0,
          defense: 0,
          serverDate: lastUpdatedServerSide,
          checkDate: executionDate
        });
      }
      function initializeResearchTotal(
        stats: PlayerStatistics[],
        accName: string,
        accRank: number,
        accPoints: number,
        lastUpdatedServerSide: string,
        executionDate: Date
      ) {
        stats.push({
          name: accName,
          rank: 0,
          buildingsRank: 0,
          researchRank: accRank,
          fleetRank: 0,
          defenseRank: 0,
          total: 0,
          buildings: 0,
          research: accPoints,
          fleet: 0,
          defense: 0,
          serverDate: lastUpdatedServerSide,
          checkDate: executionDate
        });
      }
      function initializeFleetTotal(
        stats: PlayerStatistics[],
        accName: string,
        accRank: number,
        accPoints: number,
        lastUpdatedServerSide: string,
        executionDate: Date
      ) {
        stats.push({
          name: accName,
          rank: 0,
          buildingsRank: 0,
          researchRank: 0,
          fleetRank: accRank,
          defenseRank: 0,
          total: 0,
          buildings: 0,
          research: 0,
          fleet: accPoints,
          defense: 0,
          serverDate: lastUpdatedServerSide,
          checkDate: executionDate
        });
      }
      function initializeDefenseTotal(
        stats: PlayerStatistics[],
        accName: string,
        accRank: number,
        accPoints: number,
        lastUpdatedServerSide: string,
        executionDate: Date
      ) {
        stats.push({
          name: accName,
          rank: 0,
          buildingsRank: 0,
          researchRank: 0,
          fleetRank: 0,
          defenseRank: accRank,
          total: 0,
          buildings: 0,
          research: 0,
          fleet: 0,
          defense: accPoints,
          serverDate: lastUpdatedServerSide,
          checkDate: executionDate
        });
      }
      //            _                                            _ _  __ _          _         _        _
      //   _ __ ___| |_ _   _ _ __ _ __      _ __ ___   ___   __| (_)/ _(_) ___  __| |    ___| |_ __ _| |_ ___
      //  | '__/ _ \ __| | | | '__| '_ \    | '_ ` _ \ / _ \ / _` | | |_| |/ _ \/ _` |   / __| __/ _` | __/ __|
      //  | | |  __/ |_| |_| | |  | | | |   | | | | | | (_) | (_| | |  _| |  __/ (_| |   \__ \ || (_| | |_\__ \
      //  |_|  \___|\__|\__,_|_|  |_| |_|   |_| |_| |_|\___/ \__,_|_|_| |_|\___|\__,_|   |___/\__\__,_|\__|___/
      return stats;
    },
    { lastUpdatedServerSide, stats, typeStr, executionDate }
  );
}

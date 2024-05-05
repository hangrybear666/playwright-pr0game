import { test, expect, Page } from '@playwright/test';
import { logger } from 'utils/logger';
import { parameters } from 'config/parameters';
import fs from 'fs';
import { parse } from 'node-html-parser';
import { PlayerStatistics, PointType, PointTypeEnum } from 'utils/customTypes';

const STATS_JSON_PATH = `./storage/stats.json`;

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
    logger.verbose('Sever Refresh Time: ' + lastUpdatedServerSide);
    const executionDate = new Date();

    // await extractPlayerStatsFromPostRequest(page);

    // Import existing stats.json
    // let stats: PlayerStatistics[] = await loadExistingStats();
    let stats: PlayerStatistics[] = [];
    //                          _        _        _
    //   ___ _ __ __ ___      _| |   ___| |_ __ _| |_     _ __   __ _  __ _  ___
    //  / __| '__/ _` \ \ /\ / / |  / __| __/ _` | __|   | '_ \ / _` |/ _` |/ _ \
    // | (__| | | (_| |\ V  V /| |  \__ \ || (_| | |_    | |_) | (_| | (_| |  __/
    //  \___|_|  \__,_| \_/\_/ |_|  |___/\__\__,_|\__|   | .__/ \__,_|\__, |\___|
    //                                                   |_|          |___/
    const pointTypeSelectOptions = [PointTypeEnum.total, PointTypeEnum.fleet, PointTypeEnum.research, PointTypeEnum.buildings, PointTypeEnum.defense]; // 1 = Punkte 2 = Flotte 3 = Forschung 4 = Gebäude 5 = Verteidigung
    const pointBracketSelectOptions = ['1', '101', '201', '301', '401'];
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
              logger.verbose(`🏆 Extracting total points in bracket ${bracket}`);
              stats = await extractPlayerStatisticsByType(page, stats, lastUpdatedServerSide, executionDate, 'total');
              break;
            case PointTypeEnum.buildings:
              logger.verbose(`🏗 Extracting buildings points in bracket ${bracket}`);
              stats = await extractPlayerStatisticsByType(page, stats, lastUpdatedServerSide, executionDate, 'buildings');
              break;
            case PointTypeEnum.research:
              logger.verbose(`🧬 Extracting research points in bracket ${bracket}`);
              stats = await extractPlayerStatisticsByType(page, stats, lastUpdatedServerSide, executionDate, 'research');
              break;
            case PointTypeEnum.fleet:
              logger.verbose(`🛩 Extracting fleet points in bracket ${bracket}`);
              stats = await extractPlayerStatisticsByType(page, stats, lastUpdatedServerSide, executionDate, 'fleet');
              break;
            case PointTypeEnum.defense:
              logger.verbose(`🛡 Extracting defense points in bracket ${bracket}`);
              stats = await extractPlayerStatisticsByType(page, stats, lastUpdatedServerSide, executionDate, 'defense');
              break;

            default:
              break;
          }
        }
      }
    }
    // start crawling
    await iterateThroughRankings();

    //                                          _        _          _
    //   _ __ ___   ___ _ __ __ _  ___      ___| |_ __ _| |_ ___   (_)___  ___  _ __
    //  | '_ ` _ \ / _ \ '__/ _` |/ _ \    / __| __/ _` | __/ __|  | / __|/ _ \| '_ \
    //  | | | | | |  __/ | | (_| |  __/    \__ \ || (_| | |_\__ \_ | \__ \ (_) | | | |
    //  |_| |_| |_|\___|_|  \__, |\___|    |___/\__\__,_|\__|___(_)/ |___/\___/|_| |_|
    //                      |___/                                |__/
    await new Promise<void>((resolve) => {
      // fs.writeFile is asynchronous, so we have to wait for writing to complete before reading it from filesystem
      writeJSONToFile(stats, lastUpdatedServerSide, './storage/stats.json', () => {
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

// async function extractPlayerStatsFromPostRequest(page: Page) {
//   const response = await page.request.post('https://pr0game.com/uni4/game.php?page=statistics', {
//     form: { who: 1, type: 1, range: 1 }
//     //   form: { who: 1, type: 3, range: 1 }
//     //   form: { who: 1, type: 4, range: 1 }
//   });
//   const htmlText = await response.text();
//   const parsedHtml = parse(htmlText);
//   console.log(parsedHtml.querySelector('#statistics > div.wrapper > content > table.table519 > tr:nth-child(2) > td:nth-child(5)')?.toString());
// }

async function loadExistingStats() {
  let result: PlayerStatistics[] | [];
  try {
    // ensure file exists before reading it from filesystem
    await import('.'.concat(STATS_JSON_PATH)); // ! import requires 2 dots for relative navigation !
    result = JSON.parse(fs.readFileSync(STATS_JSON_PATH, 'utf-8'));
    logger.verbose(`Initialized stats from ${STATS_JSON_PATH}`);
  } catch (error: unknown) {
    result = [];
    if (error instanceof Error) {
      logger.warn(`No prior stats found. Initialized to empty array.`);
    }
  }
  return result;
}

function writeJSONToFile(stats: PlayerStatistics[], lastUpdatedServerSide: string, path: string, writingFinished: () => void) {
  fs.writeFile(path, JSON.stringify(stats, null, 2), (err) => {
    if (err) {
      logger.error("Couldn't write JSON file: ", err);
    } else {
      logger.info(`☑️ Updated stats for ${lastUpdatedServerSide} at: ${path}`);
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
            const statsFilteredAndSorted = isStatsInitialized ? stats.filter((e) => e.serverDate === lastUpdatedServerSide) : null;
            // set existingStat if match has been found
            const existingStats = statsFilteredAndSorted && statsFilteredAndSorted.length > 0 ? statsFilteredAndSorted[0] : null;
            // find index of existing stat
            const existingStatIndex = existingStats ? stats.indexOf(existingStats) : -1;
            const isStatIndexFound = existingStatIndex !== -1;
            const existingPlayer = isStatIndexFound ? stats[existingStatIndex].children.filter((e) => e.name === accName)[0] : null;
            const existingPlayerIndex = existingPlayer ? stats[existingStatIndex].children.indexOf(existingPlayer) : -1;
            const isPlayerIndexFound = existingPlayerIndex !== -1;
            switch (typeStr) {
              case 'total':
                if (isStatIndexFound && isPlayerIndexFound) {
                  stats[existingStatIndex].children[existingPlayerIndex].rank = accRank;
                  stats[existingStatIndex].children[existingPlayerIndex].total = accPoints;
                } else if (isStatIndexFound && !isPlayerIndexFound) {
                  initializePlayerTotal(false, existingStatIndex, stats, accName, accRank, accPoints, lastUpdatedServerSide, executionDate);
                } else {
                  initializePlayerTotal(true, existingStatIndex, stats, accName, accRank, accPoints, lastUpdatedServerSide, executionDate);
                }
                break;

              case 'fleet':
                if (isStatIndexFound && isPlayerIndexFound) {
                  stats[existingStatIndex].children[existingPlayerIndex].fleetRank = accRank;
                  stats[existingStatIndex].children[existingPlayerIndex].fleet = accPoints;
                } else if (isStatIndexFound && !isPlayerIndexFound) {
                  initializeFleetTotal(false, existingStatIndex, stats, accName, accRank, accPoints, lastUpdatedServerSide, executionDate);
                } else {
                  initializeFleetTotal(true, existingStatIndex, stats, accName, accRank, accPoints, lastUpdatedServerSide, executionDate);
                }
                break;

              case 'research':
                if (isStatIndexFound && isPlayerIndexFound) {
                  stats[existingStatIndex].children[existingPlayerIndex].researchRank = accRank;
                  stats[existingStatIndex].children[existingPlayerIndex].research = accPoints;
                } else if (isStatIndexFound && !isPlayerIndexFound) {
                  initializeResearchTotal(false, existingStatIndex, stats, accName, accRank, accPoints, lastUpdatedServerSide, executionDate);
                } else {
                  initializeResearchTotal(true, existingStatIndex, stats, accName, accRank, accPoints, lastUpdatedServerSide, executionDate);
                }
                break;

              case 'buildings':
                if (isStatIndexFound && isPlayerIndexFound) {
                  stats[existingStatIndex].children[existingPlayerIndex].buildingsRank = accRank;
                  stats[existingStatIndex].children[existingPlayerIndex].buildings = accPoints;
                } else if (isStatIndexFound && !isPlayerIndexFound) {
                  initializeBuildingsTotal(false, existingStatIndex, stats, accName, accRank, accPoints, lastUpdatedServerSide, executionDate);
                } else {
                  initializeBuildingsTotal(true, existingStatIndex, stats, accName, accRank, accPoints, lastUpdatedServerSide, executionDate);
                }
                break;

              case 'defense':
                if (isStatIndexFound && isPlayerIndexFound) {
                  stats[existingStatIndex].children[existingPlayerIndex].defenseRank = accRank;
                  stats[existingStatIndex].children[existingPlayerIndex].defense = accPoints;
                } else if (isStatIndexFound && !isPlayerIndexFound) {
                  initializeDefenseTotal(false, existingStatIndex, stats, accName, accRank, accPoints, lastUpdatedServerSide, executionDate);
                } else {
                  initializeDefenseTotal(true, existingStatIndex, stats, accName, accRank, accPoints, lastUpdatedServerSide, executionDate);
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
        firstInvocation: boolean,
        existingStatsIndex: number,
        stats: PlayerStatistics[],
        accName: string,
        accRank: number,
        accPoints: number,
        lastUpdatedServerSide: string,
        executionDate: Date
      ) {
        if (firstInvocation && existingStatsIndex === -1) {
          stats.push({
            serverDate: lastUpdatedServerSide,
            checkDate: executionDate,
            children: [
              {
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
                defense: 0
              }
            ]
          });
        } else if (!firstInvocation && existingStatsIndex !== -1) {
          stats[existingStatsIndex].children.push({
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
            defense: 0
          });
        } else {
          throw Error('Initializing Player total failed');
        }
      }
      function initializeFleetTotal(
        firstInvocation: boolean,
        existingStatsIndex: number,
        stats: PlayerStatistics[],
        accName: string,
        accRank: number,
        accPoints: number,
        lastUpdatedServerSide: string,
        executionDate: Date
      ) {
        if (firstInvocation && existingStatsIndex === -1) {
          stats.push({
            serverDate: lastUpdatedServerSide,
            checkDate: executionDate,
            children: [
              {
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
                defense: 0
              }
            ]
          });
        } else if (!firstInvocation && existingStatsIndex !== -1) {
          stats[existingStatsIndex].children.push({
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
            defense: 0
          });
        } else {
          throw Error('Initializing Player total failed');
        }
      }
      function initializeResearchTotal(
        firstInvocation: boolean,
        existingStatsIndex: number,
        stats: PlayerStatistics[],
        accName: string,
        accRank: number,
        accPoints: number,
        lastUpdatedServerSide: string,
        executionDate: Date
      ) {
        if (firstInvocation && existingStatsIndex === -1) {
          stats.push({
            serverDate: lastUpdatedServerSide,
            checkDate: executionDate,
            children: [
              {
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
                defense: 0
              }
            ]
          });
        } else if (!firstInvocation && existingStatsIndex !== -1) {
          stats[existingStatsIndex].children.push({
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
            defense: 0
          });
        } else {
          throw Error('Initializing Player total failed');
        }
      }
      function initializeBuildingsTotal(
        firstInvocation: boolean,
        existingStatsIndex: number,
        stats: PlayerStatistics[],
        accName: string,
        accRank: number,
        accPoints: number,
        lastUpdatedServerSide: string,
        executionDate: Date
      ) {
        if (firstInvocation && existingStatsIndex === -1) {
          stats.push({
            serverDate: lastUpdatedServerSide,
            checkDate: executionDate,
            children: [
              {
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
                defense: 0
              }
            ]
          });
        } else if (!firstInvocation && existingStatsIndex !== -1) {
          stats[existingStatsIndex].children.push({
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
            defense: 0
          });
        } else {
          throw Error('Initializing Player total failed');
        }
      }
      function initializeDefenseTotal(
        firstInvocation: boolean,
        existingStatsIndex: number,
        stats: PlayerStatistics[],
        accName: string,
        accRank: number,
        accPoints: number,
        lastUpdatedServerSide: string,
        executionDate: Date
      ) {
        if (firstInvocation && existingStatsIndex === -1) {
          stats.push({
            serverDate: lastUpdatedServerSide,
            checkDate: executionDate,
            children: [
              {
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
                defense: accPoints
              }
            ]
          });
        } else if (!firstInvocation && existingStatsIndex !== -1) {
          stats[existingStatsIndex].children.push({
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
            defense: accPoints
          });
        } else {
          throw Error('Initializing Player total failed');
        }
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

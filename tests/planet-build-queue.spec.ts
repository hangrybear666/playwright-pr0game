import { test, expect, Page } from '@playwright/test';
import { extractLevelFromBuildingHeader, randomDelay } from 'utils/sharedFunctions';
const jsdom = require('jsdom');
import { Building, ConstructedBuildings, Research, Resources } from 'utils/customTypes';
import fs from 'fs';
import { parameters } from 'config/parameters';
// import { BUILD_ORDER } from 'utils/build_orders/build-order';
import { ROBO_BUILD_ORDER } from 'utils/build_orders/build-order-with-robo';
import { RESEARCH_ORDER } from 'utils/build_orders/research-order';
import { logger } from 'utils/logger';
import { BUILD_ORDER } from 'utils/build_orders/build-order';

const BUILT_ORDER_PATH = `./storage/built-order${process.env.CLI_PROGAME_USERNAME ? '-' + process.env.CLI_PROGAME_USERNAME : process.env.PROGAME_USERNAME_DEFAULT ? '-' + process.env.PROGAME_USERNAME_DEFAULT : ''}.json`;
const RESEARCHED_ORDER_PATH = `./storage/researched-order${process.env.CLI_PROGAME_USERNAME ? '-' + process.env.CLI_PROGAME_USERNAME : process.env.PROGAME_USERNAME_DEFAULT ? '-' + process.env.PROGAME_USERNAME_DEFAULT : ''}.json`;

test('start main planet build queue', async ({ page }) => {
  try {
    await page.goto(process.env.PROGAME_UNI_RELATIVE_PATH!);
    const userName = process.env.CLI_PROGAME_USERNAME
      ? process.env.CLI_PROGAME_USERNAME
      : process.env.PROGAME_USERNAME_DEFAULT
        ? process.env.PROGAME_USERNAME_DEFAULT
        : '';
    await expect(page.getByRole('link', { name: userName })).toBeVisible({ timeout: parameters.ACTION_TIMEOUT });
    await expect(page.getByRole('link', { name: /Metall[0-9\.\s]/ })).toBeVisible({ timeout: parameters.ACTION_TIMEOUT }); // Metall followed by whitespace, numbers or a dot

    // Starts an infinite recursive loop acting as the building queue process based on available resources.
    let buildCompleted = false;
    let recursiveCallCount = 0;
    //       _             _
    //   ___| |_ __ _ _ __| |_    __ _ _   _  ___ _   _  ___
    //  / __| __/ _` | '__| __|  / _` | | | |/ _ \ | | |/ _ \
    //  \__ \ || (_| | |  | |_  | (_| | |_| |  __/ |_| |  __/
    //  |___/\__\__,_|_|   \__|  \__, |\__,_|\___|\__,_|\___|
    //                              |_|
    await startBuildingQueue(buildCompleted, recursiveCallCount, page);
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
    throw error;
  }
});

/**
 * Starts an infinite recursive loop acting as the building queue process based on available resources.
 * It merges the original Build oder with the written .json output build order created by this program.
 * Then it starts a build, updates the build order output file and recursively calls itself.
 * - If the next construction is a building, it waits for the active queue.
 * - Or it starts researching if the next construction is research.
 * - Or it starts building ships if the next construction is a ship.
 * - Or it starts building defense if the next construction is def.
 * @param {boolean} buildCompleted - Flag indicating if the build within this queue has completed.
 * @param {number} recursiveCallCount - The queue number starting at 0.
 * @param {Page} page - The Playwright Page object representing the pr0game building page for interaction.
 * @throws {Error} - If there are any issues during the building queue process, such as resource unavailability or unexpected errors.
 */
async function startBuildingQueue(buildCompleted: boolean, recursiveCallCount: number, page: Page) {
  // Extracts headers (name and level) for various building types from the provided building page.
  const currentBuildings = await extractCurrentBuildingLevels(page);
  // fetch current resources since they could have changed since last execution
  const currentRes = await extractCurrentResourceCount(page);
  // randomly decides between several interactions to make the code less deterministic and obvious
  await randomPlayerInteraction(page);
  // Merge original build with already built order
  let mergedBuildOrder: Building[];
  mergedBuildOrder = await mergeCurrentBuildOrderWithSource();
  const nextBuildingOrder = getNextBuildingOrder(mergedBuildOrder);
  const nextBuilding = mergedBuildOrder[nextBuildingOrder];
  if (nextBuilding.researchOverride) {
    //                                     _                                 _     _
    //   _ __ ___  ___  ___  __ _ _ __ ___| |__      _____   _____ _ __ _ __(_) __| | ___
    //  | '__/ _ \/ __|/ _ \/ _` | '__/ __| '_ \    / _ \ \ / / _ \ '__| '__| |/ _` |/ _ \
    //  | | |  __/\__ \  __/ (_| | | | (__| | | |  | (_) \ V /  __/ |  | |  | | (_| |  __/
    //  |_|  \___||___/\___|\__,_|_|  \___|_| |_|   \___/ \_/ \___|_|  |_|  |_|\__,_|\___|
    await waitForResearchToStart(page, buildCompleted, recursiveCallCount, currentRes, currentBuildings);
    // updates built-order with started research
    queueBuilding(nextBuildingOrder, mergedBuildOrder);
    // recursively calls itself to run another round after research queue has been started
    recursiveCallCount++;
    await startBuildingQueue(buildCompleted, recursiveCallCount, page);
  }
  //                              _                       _   _           _ _     _ _                   _               _     _
  //     _____  ___ __   ___  ___| |_     _ __   _____  _| |_| |__  _   _(_) | __| (_)_ __   __ _      / |     _____  _(_)___| |_ ___
  //    / _ \ \/ / '_ \ / _ \/ __| __|   | '_ \ / _ \ \/ / __| '_ \| | | | | |/ _` | | '_ \ / _` |_____| |    / _ \ \/ / / __| __/ __|
  //   |  __/>  <| |_) |  __/ (__| |_    | | | |  __/>  <| |_| |_) | |_| | | | (_| | | | | | (_| |_____| |   |  __/>  <| \__ \ |_\__ \
  //    \___/_/\_\ .__/ \___|\___|\__|   |_| |_|\___/_/\_\\__|_.__/ \__,_|_|_|\__,_|_|_| |_|\__, |     |_|    \___/_/\_\_|___/\__|___/
  //             |_|                                                                        |___/
  let existingBuildingErrorMsg = '';
  const existingBuildingLevel = extractLevelFromBuildingHeader(currentBuildings[`${nextBuilding.name.toLowerCase()}`]);
  if (nextBuilding.level > 1) {
    // expect next building level to be current building level + 1
    if (nextBuilding.level - 1 !== existingBuildingLevel) {
      existingBuildingErrorMsg = `Next Building ${nextBuilding.name} ${nextBuilding.level} is not a level above: ${currentBuildings[`${nextBuilding.name.toLowerCase()}`]}`;
      throw Error(existingBuildingErrorMsg);
    }
  } else if (nextBuilding.level === 1) {
    // for level 1 builds, verify that the existing building does not contain a level number (Stufe x)
    if (extractLevelFromBuildingHeader(currentBuildings[`${nextBuilding.name.toLowerCase()}`]) !== 0) {
      existingBuildingErrorMsg = `Building ${nextBuilding.name} ${nextBuilding.level} failed because a building with higher level exists: ${currentBuildings[`${nextBuilding.name.toLowerCase()}`]}`;
      throw Error(existingBuildingErrorMsg);
    }
  }

  // navigate to building page fallback
  if (page.url() !== process.env.PROGAME_BUILDING_PAGE_URL) {
    logger.verbose('Navigating to building overview.');
    await page.goto(`${process.env.PROGAME_UNI_RELATIVE_PATH}?page=buildings`, { timeout: parameters.ACTION_TIMEOUT });
    await randomDelay(page); // wait a random time amount before page interaction
  } else {
    logger.verbose(`Currently on building page. Attempting to queue next building ${nextBuilding.name} ${nextBuilding.level}.`);
    await randomDelay(page); // wait a random time amount before page interaction
  }

  // in case the test has restarted before the last queue finished executing, we have to wait for its completion and restart the queue to refresh resources.
  const isQueueActive = await page.locator(`div#buildlist div#progressbar`).isVisible({ timeout: parameters.ACTION_TIMEOUT });
  if (isQueueActive) {
    await waitForActiveQueue(page);
    await startBuildingQueue(buildCompleted, recursiveCallCount, page);
  }

  // Check for resource constraints
  if (nextBuilding.cost.energy <= currentRes.energyAvailable + parameters.ENERGY_DEFICIT_ALLOWED) {
    if (
      nextBuilding.cost.met <= currentRes.metAvailable &&
      nextBuilding.cost.kris <= currentRes.krisAvailable &&
      nextBuilding.cost.deut <= currentRes.deutAvailable
    ) {
      // Queue next Building
      await page.locator(`div.infos:has-text("${nextBuilding.name}") button.build_submit`).click({ timeout: parameters.ACTION_TIMEOUT });
      // Expect Queue to become visible
      await expect(page.locator('#buildlist')).toBeVisible();
      // Expect Next Building to be in Position 1. in Queue
      await expect(page.locator(`div#buildlist div:has-text("1."):has-text("${nextBuilding.name} ${nextBuilding.level}") button.build_submit`)).toHaveCount(1, {
        timeout: parameters.ACTION_TIMEOUT
      });
      // Marks the next building in line as queued and updates the .json output file
      queueBuilding(nextBuildingOrder, mergedBuildOrder);
      // Notifies user of successful queue addition
      logger.info(`🏗 Next building added to queue #${recursiveCallCount}: ${nextBuilding.name} Level ${nextBuilding.level}`);
      // Expect Queue to not have more than one value - we are a machine running cuntinuously and don't need a queue
      await expect(page.locator(`div#buildlist div:has-text("2.")`)).toHaveCount(0);
      // expects queue progressbar to have data-time attribute
      expect(Number(await page.locator('div#progressbar').getAttribute('data-time'))).toBeGreaterThan(0);
      // Check building completion in continuous intervals and refresh page with optional user interactions until it has finished building.
      // await refreshUntilQueueCompletion(true, buildCompleted, recursiveCallCount, page); // waitForActiveQueue achieves the same outcome without constant refreshes and user interaction spam.
      //  _           _ _     _         _             _           _
      // | |__  _   _(_) | __| |    ___| |_ __ _ _ __| |_ ___  __| |
      // | '_ \| | | | | |/ _` |   / __| __/ _` | '__| __/ _ \/ _` |
      // | |_) | |_| | | | (_| |   \__ \ || (_| | |  | ||  __/ (_| |
      // |_.__/ \__,_|_|_|\__,_|   |___/\__\__,_|_|   \__\___|\__,_|
      recursiveCallCount++;
      await startBuildingQueue(buildCompleted, recursiveCallCount, page); // recursively calls itself to run another round.
    } else {
      const isMetMissing = nextBuilding.cost.met > currentRes.metAvailable;
      const isKrisMissing = nextBuilding.cost.kris > currentRes.krisAvailable;
      const isDeutMissing = nextBuilding.cost.deut > currentRes.deutAvailable;
      const missingMet = isMetMissing ? nextBuilding.cost.met - currentRes.metAvailable : 'none';
      const missingKris = isKrisMissing ? nextBuilding.cost.kris - currentRes.krisAvailable : 'none';
      const missingDeut = isDeutMissing ? nextBuilding.cost.deut - currentRes.deutAvailable : 'none';
      logger.info(
        `⏳ Waiting. ${nextBuilding.name} ${nextBuilding.level} requires ${isMetMissing ? missingMet + ' more Met' : ''}${isMetMissing && isKrisMissing ? ' and ' : ''}${isKrisMissing ? missingKris + ' more Kris' : ''}${isKrisMissing && !isDeutMissing ? '.' : ''}${isKrisMissing && isDeutMissing ? ' and ' : ''}${isDeutMissing ? missingDeut + ' more Deut.' : ''}`
      );
      logger.verbose(
        // Cost: Met [${nextBuilding.cost.met}] Kris [${nextBuilding.cost.kris}] Deut [${nextBuilding.cost.deut}]
        // Available: Met [${metAvailable}] Kris [${krisAvailable}] Deut [${deutAvailable}]
        `Waiting for resources for ${nextBuilding.name} ${nextBuilding.level}. Checking again in approximately ${parameters.RESOURCE_DEFICIT_RECHECK_INTERVAL / 1000 / 60} minutes.
Missing: Met [${missingMet}] Kris [${missingKris}] Deut [${missingDeut}]`
      );
      // timeout of a couple minutes configured in RESOURCE_DEFICIT_RECHECK_INTERVAL +/- RESOURCE_DEFICIT_RECHECK_VARIANCE

      // TODO
      // await page.goto(`${process.env.PROGAME_UNI_RELATIVE_PATH}?page=Empire`);
      // const metProductionPerHour = page.locator
      // const krisProductionPerHour = 0
      // const deutProductionPerHour = 0
      await new Promise<void>((resolve) => {
        setTimeout(
          () => {
            resolve();
          },
          parameters.RESOURCE_DEFICIT_RECHECK_INTERVAL +
            Math.floor(Math.random() * (Math.random() < 0.5 ? -parameters.RESOURCE_DEFICIT_RECHECK_VARIANCE : parameters.RESOURCE_DEFICIT_RECHECK_VARIANCE)) // random variance of +/-30 seconds
        );
      });
      //                 _               _                                                                  _ _       _     _ _ _ _
      //   _ __ ___  ___| |__   ___  ___| | __   _ __ ___  ___  ___  _   _ _ __ ___ ___     __ ___   ____ _(_) | __ _| |__ (_) (_) |_ _   _
      //  | '__/ _ \/ __| '_ \ / _ \/ __| |/ /  | '__/ _ \/ __|/ _ \| | | | '__/ __/ _ \   / _` \ \ / / _` | | |/ _` | '_ \| | | | __| | | |
      //  | | |  __/ (__| | | |  __/ (__|   <   | | |  __/\__ \ (_) | |_| | | | (_|  __/  | (_| |\ V / (_| | | | (_| | |_) | | | | |_| |_| |
      //  |_|  \___|\___|_| |_|\___|\___|_|\_\  |_|  \___||___/\___/ \__,_|_|  \___\___|   \__,_| \_/ \__,_|_|_|\__,_|_.__/|_|_|_|\__|\__, |
      //                                                                                                                              |___/
      await startBuildingQueue(buildCompleted, recursiveCallCount, page);
    }
  } else {
    const errorMsg = `Not enough energy provided for ${nextBuilding.name} Level ${nextBuilding.level}. Needed: ${nextBuilding.cost.energy}. Available: ${currentRes.energyAvailable}`;
    logger.error(errorMsg);
    throw Error(errorMsg);
  }
}

/**
 * Expects the progressbar (queue) to be visible.
 * Extracts remaining queue time.
 * Waits for the queue to resolve via Promise.
 * Expects the progressbar (queue) to be hidden.
 * @param page
 */
async function waitForActiveQueue(page: Page) {
  const queueCompletionTime: number = Number(await page.locator('div#progressbar').getAttribute('data-time'));
  const queuePositionOneName = await page.locator(`div#buildlist div:has-text("1.") button.build_submit`).innerText();
  logger.info(`⏳ Active queue for ${queuePositionOneName} found. Waiting ${(queueCompletionTime / 60).toFixed(0)}min${queueCompletionTime % 60}s.`);
  await new Promise((resolve) => setTimeout(resolve, queueCompletionTime * 1000)); // Wait for queue to Complete
  await randomDelay(page); // wait a random time amount before page interaction
  await expect(page.locator(`div#buildlist div#progressbar`)).toBeHidden({
    timeout: parameters.ACTION_TIMEOUT
  });
}

/**
 * Check building completion in continuous intervals until it has finished building.
 * Adds random player interaction between refreshes.
 * @param {boolean} enableUserInteractions Flag enabling  random player interactions (disable to avoid spamming the pr0game server).
 * @param {boolean} buildCompleted - Flag indicating if the build within this queue has completed.
 * @param {number} recursiveCallCount - The queue number starting at 0.
 * @param {Page} page - The Playwright Page object representing the pr0game building page for interaction.
 */
// async function refreshUntilQueueCompletion(enableUserInteractions: boolean, buildCompleted: boolean, recursiveCallCount: number, page: Page) {
//   const buildCompletionTime = await page.locator('div#progressbar').getAttribute('data-time');
//   const queueRunning = new Promise((resolve, reject) => {
//     if (isNaN(Number(buildCompletionTime)) || Number(buildCompletionTime) <= 0)
//       reject(new Error('buildCompletionTime is not a number above 1. Got: ' + buildCompletionTime));
//     setTimeout(
//       () => {
//         resolve(`☑️ Build completed after ${buildCompletionTime}s`);
//       },
//       Number(buildCompletionTime) * 1000
//     );
//   });
//   queueRunning.then(
//     (queueCompletionMsg) => {
//       // resolved
//       buildCompleted = true;
//       logger.info(queueCompletionMsg);
//     },
//     (error) => {
//       // rejected
//       if (error instanceof Error) logger.error(`Queue has not successfully finished running:  + ${error.message}`);
//       throw error;
//     }
//   );
//   // Checks for queue completion every QUEUE_REFRESH_INTERVAL +/- QUEUE_REFRESH_INTERVAL_VARIANCE miliseconds
//   let refreshIntervalId;
//   await new Promise<void>((resolve) => {
//     refreshIntervalId = setInterval(
//       async () => {
//         logger.verbose(`Checking if build in queue ${recursiveCallCount} has finished...`);
//         if (buildCompleted) {
//           logger.debug('ENTER RECURSIVE FUNCTION CALL');
//           resolve();
//         } else {
//           if (enableUserInteractions) {
//             // only interacts with the pr0game server in between refreshes if the flag is set to true
//             await randomPlayerInteraction(page);
//           }
//         }
//       },
//       parameters.QUEUE_REFRESH_INTERVAL +
//         Math.floor(Math.random() * (Math.random() < 0.5 ? -parameters.QUEUE_REFRESH_INTERVAL_VARIANCE : parameters.QUEUE_REFRESH_INTERVAL_VARIANCE))
//     );
//   });
//   // so there aren't any lingering intervals from prior queues spamming refreshes
//   clearInterval(refreshIntervalId);
//   buildCompleted = false;
// }

/**
 * Starts the research after checking if the the research lab is not being upgraded and the research lab level is adequate.
 * @param {Page} page - The Playwright Page object representing the pr0game building page for interaction.
 * @param {boolean} buildCompleted - Flag indicating if the build within the initial building queue has completed.
 * @param {number} recursiveCallCount - The queue number of the initial building queue starting at 0.
 * @param {Resources} currentRes available resources
 * @param {ConstructedBuildings} currentBuildings available resources
 * @throws {Error} - If there are any issues during the building queue process, such as resource unavailability or unexpected errors.
 */
async function waitForResearchToStart(
  page: Page,
  buildCompleted: boolean,
  recursiveCallCount: number,
  currentRes: Resources,
  currentBuildings: ConstructedBuildings
) {
  await page.goto(`${process.env.PROGAME_UNI_RELATIVE_PATH}?page=research`, { timeout: parameters.ACTION_TIMEOUT });

  /**
   * Check whether the Research Lab is being upgraded.
   */
  let isResearchLabUnderConstruction = await page.getByText('Das Forschungslabor wird zurzeit ausgebaut!').isVisible({ timeout: parameters.ACTION_TIMEOUT });
  if (isResearchLabUnderConstruction) {
    logger.debug('Research Lab being upgraded message encountered. Navigate to building page and check for active build.');
    await randomDelay(page); // wait a random time amount before page interaction
    await page.goto(`${process.env.PROGAME_UNI_RELATIVE_PATH}?page=buildings`, { timeout: parameters.ACTION_TIMEOUT });
    isResearchLabUnderConstruction = await page
      .locator(`div#buildlist div:has-text("1."):has-text("Forschungslabor") button.build_submit`)
      .isVisible({ timeout: parameters.ACTION_TIMEOUT });
    if (isResearchLabUnderConstruction) {
      // if building queue is still active after navigating to building page - wait for queue to end.
      await waitForActiveQueue(page);
      await startBuildingQueue(buildCompleted, recursiveCallCount, page);
    } else {
      // Research Lab construction has finished in the meantime - restart queue to extract new building level
      await startBuildingQueue(buildCompleted, recursiveCallCount, page);
    }
  }

  /*
   * in case the test has restarted before the last queue finished executing, we have to wait for its completion and restart the queue to refresh resources.
   */
  const isQueueActive = await page.locator(`div#buildlist div#progressbar`).isVisible({ timeout: parameters.ACTION_TIMEOUT });
  if (isQueueActive) {
    await waitForActiveQueue(page);
    await startBuildingQueue(buildCompleted, recursiveCallCount, page);
  }

  // Merge original build with already built order
  let mergedResearchOrder: Research[];
  mergedResearchOrder = await mergeCurrentResearchOrderWithSource();
  const nextResearchOrder = getNextResearchOrder(mergedResearchOrder);
  const nextResearch = mergedResearchOrder[nextResearchOrder];
  const researchLabLevel = extractLevelFromBuildingHeader(currentBuildings.forschungslabor);
  if (researchLabLevel >= nextResearch.minResearchlabLevel) {
    if (
      nextResearch.cost.met <= currentRes.metAvailable &&
      nextResearch.cost.kris <= currentRes.krisAvailable &&
      nextResearch.cost.deut <= currentRes.deutAvailable
    ) {
      // Queue next Research
      await page.locator(`div.infos:has-text("${nextResearch.name}") button.build_submit`).click({
        timeout: parameters.ACTION_TIMEOUT
      });
      // Expect Queue to become visible
      await expect(page.locator('#buildlist')).toBeVisible({
        timeout: parameters.ACTION_TIMEOUT
      });
      // Expect Next Research to be in Position 1. in Queue
      await expect(page.locator(`div#buildlist div:has-text("1."):has-text("${nextResearch.name} ${nextResearch.level}") button.build_submit`)).toHaveCount(1, {
        timeout: parameters.ACTION_TIMEOUT
      });
      // Marks the next research in line as queued and updates the .json output file
      queueResearch(nextResearchOrder, mergedResearchOrder);
      // Notifies user of successful queue addition
      logger.info(`🧬 Next research added to queue: ${nextResearch.name} Level ${nextResearch.level}`);
      // Expect Queue to not have more than one value - we are a machine running cuntinuously and don't need a queue
      await expect(page.locator(`div#buildlist div:has-text("2.")`)).toHaveCount(0, { timeout: parameters.ACTION_TIMEOUT });
      //                                     _            _             _           _
      //   _ __ ___  ___  ___  __ _ _ __ ___| |__     ___| |_ __ _ _ __| |_ ___  __| |
      //  | '__/ _ \/ __|/ _ \/ _` | '__/ __| '_ \   / __| __/ _` | '__| __/ _ \/ _` |
      //  | | |  __/\__ \  __/ (_| | | | (__| | | |  \__ \ || (_| | |  | ||  __/ (_| |
      //  |_|  \___||___/\___|\__,_|_|  \___|_| |_|  |___/\__\__,_|_|   \__\___|\__,_|
      return;
    } else {
      const isMetMissing = nextResearch.cost.met > currentRes.metAvailable;
      const isKrisMissing = nextResearch.cost.kris > currentRes.krisAvailable;
      const isDeutMissing = nextResearch.cost.deut > currentRes.deutAvailable;
      const missingMet = isMetMissing ? nextResearch.cost.met - currentRes.metAvailable : 'none';
      const missingKris = isKrisMissing ? nextResearch.cost.kris - currentRes.krisAvailable : 'none';
      const missingDeut = isDeutMissing ? nextResearch.cost.deut - currentRes.deutAvailable : 'none';
      logger.info(
        `⏳ Waiting. ${nextResearch.name} ${nextResearch.level} requires ${isMetMissing ? missingMet + ' more Met' : ''}${isMetMissing && isKrisMissing ? ' and ' : ''}${isKrisMissing ? missingKris + ' more Kris' : ''}${isKrisMissing && !isDeutMissing ? '.' : ''}${isKrisMissing && isDeutMissing ? ' and ' : ''}${isDeutMissing ? missingDeut + ' more Deut.' : ''}`
      );
      logger.verbose(
        // Cost: Met [${nextResearch.cost.met}] Kris [${nextResearch.cost.kris}] Deut [${nextResearch.cost.deut}]
        // Available: Met [${metAvailable}] Kris [${krisAvailable}] Deut [${deutAvailable}]
        `Waiting for resources for ${nextResearch.name} ${nextResearch.level}. Checking again in approximately ${parameters.RESOURCE_DEFICIT_RECHECK_INTERVAL / 1000 / 60} minutes.
Missing: Met [${missingMet}] Kris [${missingKris}] Deut [${missingDeut}]`
      );
      // timeout of a couple minutes configured in RESOURCE_DEFICIT_RECHECK_INTERVAL +/- RESOURCE_DEFICIT_RECHECK_VARIANCE
      await new Promise<void>((resolve) => {
        setTimeout(
          () => {
            resolve();
          },
          parameters.RESOURCE_DEFICIT_RECHECK_INTERVAL +
            Math.floor(Math.random() * (Math.random() < 0.5 ? -parameters.RESOURCE_DEFICIT_RECHECK_VARIANCE : parameters.RESOURCE_DEFICIT_RECHECK_VARIANCE)) // random variance of +/-30 seconds
        );
      });
      //                 _               _                                                                  _ _       _     _ _ _ _
      //   _ __ ___  ___| |__   ___  ___| | __   _ __ ___  ___  ___  _   _ _ __ ___ ___     __ ___   ____ _(_) | __ _| |__ (_) (_) |_ _   _
      //  | '__/ _ \/ __| '_ \ / _ \/ __| |/ /  | '__/ _ \/ __|/ _ \| | | | '__/ __/ _ \   / _` \ \ / / _` | | |/ _` | '_ \| | | | __| | | |
      //  | | |  __/ (__| | | |  __/ (__|   <   | | |  __/\__ \ (_) | |_| | | | (_|  __/  | (_| |\ V / (_| | | | (_| | |_) | | | | |_| |_| |
      //  |_|  \___|\___|_| |_|\___|\___|_|\_\  |_|  \___||___/\___/ \__,_|_|  \___\___|   \__,_| \_/ \__,_|_|_|\__,_|_.__/|_|_|_|\__|\__, |
      //                                                                                                                              |___/
      await startBuildingQueue(buildCompleted, recursiveCallCount, page);
    }
  } else {
    // Research Lab Level requirement not met.
    const errorMsg = `Minimum Research Lab level [${nextResearch.minResearchlabLevel}] but existing is [${researchLabLevel}]`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * simulates player interactions and is ideally called in semi-random time amounts by the executing function.
 * @param page
 */
async function randomPlayerInteraction(page: Page) {
  logger.verbose('Simulating erratic player interaction.');
  await randomDelay(page); // wait a random time amount before page interaction
  const randomEvent = Math.floor(Math.random() * 7);
  switch (randomEvent) {
    case 1:
      logger.verbose('Refreshing current Page.');
      await page.reload();
      break;
    case 2:
      logger.verbose('Navigating to Imperium View.');
      await page.goto(`${process.env.PROGAME_UNI_RELATIVE_PATH}?page=Empire`);
      break;
    case 3:
      logger.verbose('Navigating to Research View.');
      await page.goto(`${process.env.PROGAME_UNI_RELATIVE_PATH}?page=research`);
      break;
    case 4:
      logger.verbose('Navigating to Overview.');
      await page.goto(`${process.env.PROGAME_UNI_RELATIVE_PATH}?page=overview`);
      break;
    case 5:
      logger.verbose('Navigating to Tech Tree.');
      await page.goto(`${process.env.PROGAME_UNI_RELATIVE_PATH}?page=techtree`);
      break;
    case 5:
      logger.verbose('Navigating to Galaxy.');
      await page.goto(`${process.env.PROGAME_UNI_RELATIVE_PATH}?page=galaxy`);
      break;
    case 6:
      logger.verbose('Navigating to Building Overview.');
      await page.goto(`${process.env.PROGAME_UNI_RELATIVE_PATH}?page=buildings`);
      break;
    default:
      // in all other cases
      logger.verbose('Do Nothing.');
      break;
  }

  await randomDelay(page); // wait a random time amount before page interaction
}

/**
 * loops through the build order and extracts next object that hasn't yet been queued.
 */
function getNextBuildingOrder(allBuildings: Building[]): number {
  if (allBuildings.filter((e) => e.hasBeenQueued === false).length === 0) {
    throw Error('End of building queue reached. Please add more entries.');
  }
  let order;
  allBuildings.every((e) => {
    if (!e.hasBeenQueued) {
      order = e.order;
      return false;
    } else {
      return true;
    }
  });
  return order ? order : 1;
}

/**
 * loops through the research order and extracts next object that hasn't yet been queued.
 */
function getNextResearchOrder(allResearch: Research[]): number {
  if (allResearch.filter((e) => e.hasBeenQueued === false).length === 0) {
    throw Error('End of building queue reached. Please add more entries.');
  }
  let order;
  allResearch.every((e) => {
    if (!e.hasBeenQueued) {
      order = e.order;
      return false;
    } else {
      return true;
    }
  });
  return order ? order : 1;
}

/**
 * Asynchronous function that writes a file but does not wait for completion, unless a callback is specified.
 * Persists the updatedBuildOrder to storage as json file with 2 spaces as indentation for readability
 * @param {Building[]} updatedBuildOrder
 * @param {string} path
 * @param {callback} writingFinished callback executed once file has been fully written
 */
function writeJSONToFile(updatedBuildOrder: Building[] | Research[], path: string, writingFinished: () => void) {
  fs.writeFile(path, JSON.stringify(updatedBuildOrder, null, 2), (err) => {
    if (err) {
      logger.error("Couldn't write JSON file: ", err);
    } else {
      logger.verbose(`Updated construction log at: ${path}`);
      writingFinished();
    }
  });
}
/**
 * Marks the next building in line as queued and updates the .json output file.
 * Receives a merged build order and the index of the next building to queue.
 * @param index index within build order array
 * @param buildOrder merged build order with updated hasBeenQueued and queuedAt values
 */
function queueBuilding(index: number, buildOrder: Building[]) {
  if (index >= 0 && index < buildOrder.length) {
    const building = buildOrder[index];
    if (!building.hasBeenQueued) {
      buildOrder[index].hasBeenQueued = true;
      buildOrder[index].queuedAt = new Date();
      writeJSONToFile(buildOrder, BUILT_ORDER_PATH, () => {
        // do not wait for json file to finish writing, we expect it to finish the next time it is required.
      });
    } else {
      const errorMsg = 'Building has already been queued.';
      logger.error(errorMsg);
      throw Error(errorMsg);
    }
  } else {
    const errorMsg = 'Invalid building index.';
    logger.error(errorMsg);
    throw Error(errorMsg);
  }
}

/**
 * Marks the next research in line as queued and updates the .json output file.
 * Receives a merged research order and the index of the next research to queue.
 * @param index index within research order array
 * @param buildOrder merged research order with updated hasBeenQueued and queuedAt values
 */
function queueResearch(index: number, queueOrder: Research[]) {
  if (index >= 0 && index < queueOrder.length) {
    const building = queueOrder[index];
    if (!building.hasBeenQueued) {
      queueOrder[index].hasBeenQueued = true;
      queueOrder[index].queuedAt = new Date();
      writeJSONToFile(queueOrder, RESEARCHED_ORDER_PATH, () => {
        // do not wait for json file to finish writing, we expect it to finish the next time it is required.
      });
    } else {
      const errorMsg = 'Research has already been queued.';
      logger.error(errorMsg);
      throw Error(errorMsg);
    }
  } else {
    const errorMsg = 'Invalid research index.';
    logger.error(errorMsg);
    throw Error(errorMsg);
  }
}
/**
 * Merges the original Build oder with the written .json output build order created by this program.
 * Updated values are:
 * - hasBeenQueued
 * - queuedAt
 * @returns source build order with updated values for queued status
 */
async function mergeCurrentBuildOrderWithSource(): Promise<Building[]> {
  try {
    await import('.'.concat(BUILT_ORDER_PATH));
  } catch (error: unknown) {
    // no built-order found. Initializing to default
    if (error instanceof Error) {
      logger.warn(`No prior built order found. Initialized to default in path ${BUILT_ORDER_PATH}`);
      await new Promise<void>((resolve) => {
        // fs.writeFile is asynchronous, so we have to wait for writing to complete before reading it from filesystem
        writeJSONToFile(BUILD_ORDER, BUILT_ORDER_PATH, () => {
          resolve();
        });
      });
    }
  }
  const updatedBuildOrderData: Building[] = JSON.parse(fs.readFileSync(BUILT_ORDER_PATH, 'utf-8'));
  const mergedBuildOrder: Building[] = ROBO_BUILD_ORDER.map((originalBuilding, index) => {
    let updatedBuilding;
    if (index < updatedBuildOrderData.length) {
      updatedBuilding = updatedBuildOrderData[index];
    }
    const mergedData = {
      ...originalBuilding,
      ...(updatedBuilding && {
        hasBeenQueued: updatedBuilding.hasBeenQueued,
        queuedAt: updatedBuilding.queuedAt
      })
    };
    return mergedData;
  });
  return mergedBuildOrder;
}

/**
 * Merges the original Research oder with the written .json output research order created by this program.
 * Updated values are:
 * - hasBeenQueued
 * - queuedAt
 * @returns source research order with updated values for queued status
 */
async function mergeCurrentResearchOrderWithSource() {
  try {
    await import('.'.concat(RESEARCHED_ORDER_PATH));
  } catch (error: unknown) {
    // no built-order found. Initializing to default
    if (error instanceof Error) {
      logger.warn(`No prior researched order found. Initialized to default in path ${RESEARCHED_ORDER_PATH}`);
      await new Promise<void>((resolve) => {
        // fs.writeFile is asynchronous, so we have to wait for writing to complete before reading it from filesystem
        writeJSONToFile(RESEARCH_ORDER, RESEARCHED_ORDER_PATH, () => {
          resolve();
        });
      });
    }
  }
  const updatedResearchOrderData: Research[] = JSON.parse(fs.readFileSync(RESEARCHED_ORDER_PATH, 'utf-8'));
  const mergedResearchOrder: Research[] = RESEARCH_ORDER.map((originalResearch, index) => {
    let updatedResearch;
    if (index < updatedResearchOrderData.length) {
      updatedResearch = updatedResearchOrderData[index];
    }
    const mergedData = {
      ...originalResearch,
      ...(updatedResearch && {
        hasBeenQueued: updatedResearch.hasBeenQueued,
        queuedAt: updatedResearch.queuedAt
      })
    };
    return mergedData;
  });
  return mergedResearchOrder;
}

/**
 *
 * @param {Page} page - The Playwright Page object representing the pr0game building page for interaction.
 * @returns
 */
async function extractCurrentResourceCount(page: Page): Promise<Resources> {
  // navigate to empire instead of refreshing for current prices because page.reload is fucked in playwright
  // await new Promise((resolve) => setTimeout(resolve, 2500)); // Add a delay of 2.5 seconds before page reload to avoid weird playwright behavior
  await page.goto(`${process.env.PROGAME_UNI_RELATIVE_PATH}?page=Empire`, { timeout: parameters.ACTION_TIMEOUT });
  // await new Promise((resolve) => setTimeout(resolve, 2500)); // Add a delay of 2.5 seconds before page reload to avoid weird playwright behavior
  // wait for 2 seconds to avoid erratic behavior when extracting dom node attributes
  await expect(page.locator('#current_metal')).toBeVisible({ timeout: parameters.ACTION_TIMEOUT });
  const metAmt = await page.locator('#current_metal').getAttribute('data-real');
  const krisAmt = await page.locator('#current_crystal').getAttribute('data-real');
  const deutAmt = await page.locator('#current_deuterium').getAttribute('data-real');
  const energieHtml = await page.getByRole('link', { name: /Energie[0-9\.\/\s]/ }).innerHTML(); // Energie followed by whitespace, numbers, a dot or backslash
  const { JSDOM } = jsdom;
  const energyDOM = new JSDOM(energieHtml);
  const energyDocument: Document = energyDOM.window.document;
  const energySpans = energyDocument.querySelectorAll('span');
  let energieAmt: string = '';
  energySpans.forEach((e) => {
    if (e.textContent?.includes('/')) {
      energieAmt = e.textContent.split('/')[0];
    }
  });
  const metAvailable = metAmt ? parseInt(metAmt) : 0;
  const krisAvailable = krisAmt ? parseInt(krisAmt) : 0;
  const deutAvailable = deutAmt ? parseInt(deutAmt) : 0;
  const energyAvailable = energieAmt ? parseInt(energieAmt) : 0;
  logger.currentResources(`Metall [${metAvailable}]\nKristall [${krisAvailable}] \nDeuterium [${deutAvailable}]\nEnergie [${energyAvailable}]`);
  return { metAvailable, krisAvailable, deutAvailable, energyAvailable };
}

/**
 * Extracts headers (name and level) for various building types from the provided building page.
 * @param {Page} page - The Playwright Page object representing the webpage to extract from.
 * @throws {Error} - If there are any issues during the extraction process.
 * @returns {ConstructedBuildings} currentBuildings Object
 */
async function extractCurrentBuildingLevels(page: Page): Promise<ConstructedBuildings> {
  await page.goto(`${process.env.PROGAME_UNI_RELATIVE_PATH}?page=buildings`, { timeout: parameters.ACTION_TIMEOUT });
  await expect(page.getByRole('button', { name: 'Rohstoffabbau' })).toBeVisible({ timeout: parameters.ACTION_TIMEOUT });
  const metallmineHeader = await page
    .locator('div[class="buildn"]')
    .and(page.getByText(/Metallmine(?:\s*\(Stufe\s*\d{1,2}\))?/g))
    .allInnerTexts();
  const solarkraftwerkHeader = await page
    .locator('div[class="buildn"]')
    .and(page.getByText(/Solarkraftwerk(?:\s*\(Stufe\s*\d{1,2}\))?/g))
    .allInnerTexts();
  const kristallmineHeader = await page
    .locator('div[class="buildn"]')
    .and(page.getByText(/Kristallmine(?:\s*\(Stufe\s*\d{1,2}\))?/g))
    .allInnerTexts();
  const deuteriumsynthetisiererHeader = await page
    .locator('div[class="buildn"]')
    .and(page.getByText(/Deuteriumsynthetisierer(?:\s*\(Stufe\s*\d{1,2}\))?/g))
    .allInnerTexts();
  const roboterfabrikHeader = await page
    .locator('div[class="buildn"]')
    .and(page.getByText(/Roboterfabrik(?:\s*\(Stufe\s*\d{1,2}\))?/g))
    .allInnerTexts();
  const raumschiffwerftHeader = await page
    .locator('div[class="buildn"]')
    .and(page.getByText(/Raumschiffwerft(?:\s*\(Stufe\s*\d{1,2}\))?/g))
    .allInnerTexts();
  const forschungslaborHeader = await page
    .locator('div[class="buildn"]')
    .and(page.getByText(/Forschungslabor(?:\s*\(Stufe\s*\d{1,2}\))?/g))
    .allInnerTexts();
  const metallspeicherHeader = await page
    .locator('div[class="buildn"]')
    .and(page.getByText(/Metallspeicher(?:\s*\(Stufe\s*\d{1,2}\))?/g))
    .allInnerTexts();
  const kristallspeicherHeader = await page
    .locator('div[class="buildn"]')
    .and(page.getByText(/Kristallspeicher(?:\s*\(Stufe\s*\d{1,2}\))?/g))
    .allInnerTexts();
  const deuteriumtankHeader = await page
    .locator('div[class="buildn"]')
    .and(page.getByText(/Deuteriumtank(?:\s*\(Stufe\s*\d{1,2}\))?/g))
    .allInnerTexts();
  const currentBuildings: ConstructedBuildings = {
    metallmine: metallmineHeader[0],
    solarkraftwerk: solarkraftwerkHeader[0],
    kristallmine: kristallmineHeader[0],
    deuteriumsynthetisierer: deuteriumsynthetisiererHeader[0],
    roboterfabrik: roboterfabrikHeader[0],
    raumschiffwerft: raumschiffwerftHeader[0],
    forschungslabor: forschungslaborHeader[0],
    metallspeicher: metallspeicherHeader[0],
    kristallspeicher: kristallspeicherHeader[0],
    deuteriumtank: deuteriumtankHeader[0]
  };
  let currentBuildingOverviewString: string = '';
  Object.keys(currentBuildings).forEach((e, i, arr) => {
    currentBuildingOverviewString += currentBuildings[e].concat(i < arr.length - 1 ? '\n' : '');
  });
  logger.buildingLevels(`${currentBuildingOverviewString}`);
  return currentBuildings;
}

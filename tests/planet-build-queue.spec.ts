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

test('start main planet build queue', async ({ page }) => {
  try {
    await page.goto(process.env.PROGAME_UNI_RELATIVE_PATH!);
    const userName = process.env.PROGAME_USERNAME!;
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
    logger.error(error);
    if (error instanceof Error) {
      // TODO handle error
    }
    throw error;
  }
});

/**
 * Starts an infinite recursive loop acting as the building queue process based on available resources.
 * It merges the original Build oder with the written .json output build order created by this program.
 * Then it starts a build, updates the build order output file and checks in set intervals for build completion.
 * In between checks it occasionally interacts with the page in random intervals to mimick user interactions.
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

  // Merge original build with already built order
  let mergedBuildOrder: Building[];
  mergedBuildOrder = mergeCurrentBuildOrderWithSource();
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

  if (page.url() !== process.env.PROGAME_BUILDING_PAGE_URL) {
    logger.verbose('Navigating to building overview.');
    await page.goto(`${process.env.PROGAME_UNI_RELATIVE_PATH}?page=buildings`, { timeout: parameters.ACTION_TIMEOUT });
    await randomDelay(page); // wait a random time amount before page interaction
  } else {
    logger.verbose(`Currently on building page. Attempting to queue next building ${nextBuilding.name} ${nextBuilding.level}.`);
    await randomDelay(page); // wait a random time amount before page interaction
  }

  // in case the test has restarted before the last queue finished executing, we have to wait for its completion and restart the queue to refresh resources.
  const isQueueActive = await page.locator(`div#buildlist div#progressbar`).isVisible();
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
      logger.info(`Next building added to queue: ${nextBuilding.name} Level ${nextBuilding.level}`);
      // Expect Queue to not have more than one value - we are a machine running cuntinuously and don't need a queue
      await expect(page.locator(`div#buildlist div:has-text("2.")`)).toHaveCount(0);
      // expects queue progressbar to have data-time attribute
      expect(Number(await page.locator('div#progressbar').getAttribute('data-time'))).toBeGreaterThan(0);
      // Check building completion status in queue and call startBuildingQueue recursively after completion
      await refreshUntilQueueCompletion(buildCompleted, recursiveCallCount, page);
      //   _           _ _     _                              _      _           _
      //  | |__  _   _(_) | __| |    ___ ___  _ __ ___  _ __ | | ___| |_ ___  __| |
      //  | '_ \| | | | | |/ _` |   / __/ _ \| '_ ` _ \| '_ \| |/ _ \ __/ _ \/ _` |
      //  | |_) | |_| | | | (_| |  | (_| (_) | | | | | | |_) | |  __/ ||  __/ (_| |
      //  |_.__/ \__,_|_|_|\__,_|   \___\___/|_| |_| |_| .__/|_|\___|\__\___|\__,_|
      //                                               |_|
      // recursively calls itself to run another round after building queue completion
      recursiveCallCount++;
      await startBuildingQueue(buildCompleted, recursiveCallCount, page);
    } else {
      // logger.missingResources(``)//TODO
      logger.verbose(
        // Cost: Met [${nextBuilding.cost.met}] Kris [${nextBuilding.cost.kris}] Deut [${nextBuilding.cost.deut}]
        // Available: Met [${metAvailable}] Kris [${krisAvailable}] Deut [${deutAvailable}]
        `Waiting for resources for ${nextBuilding.name} ${nextBuilding.level}. Checking again in a couple minutes.
Missing: Met [${nextBuilding.cost.met > currentRes.metAvailable ? nextBuilding.cost.met - currentRes.metAvailable : 'none'}] Kris [${nextBuilding.cost.kris > currentRes.krisAvailable ? nextBuilding.cost.kris - currentRes.krisAvailable : 'none'}] Deut [${nextBuilding.cost.deut > currentRes.deutAvailable ? nextBuilding.cost.deut - currentRes.deutAvailable : 'none'}]`
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
    const errorMsg = `Not enough energy provided for ${nextBuilding.name} Level ${nextBuilding.level}. Needed: ${nextBuilding.cost.energy}. Available: ${currentRes.energyAvailable}`;
    logger.error(errorMsg);
    throw Error(errorMsg);
  }
}

async function waitForActiveQueue(page: Page) {
  const queueCompletionTime: number = Number(await page.locator('div#progressbar').getAttribute('data-time'));
  logger.info(`Active queue found. Waiting for ${queueCompletionTime} seconds.`);
  await new Promise((resolve) => setTimeout(resolve, queueCompletionTime * 1000)); // Wait for queue to Complete
  await randomDelay(page); // wait a random time amount before page interaction
  await expect(page.locator(`div#buildlist div#progressbar`)).toBeHidden({
    timeout: parameters.ACTION_TIMEOUT
  });
}

/**
 * Check building completion in continuous intervals until it has finished building.
 * @param {boolean} buildCompleted - Flag indicating if the build within this queue has completed.
 * @param {number} recursiveCallCount - The queue number starting at 0.
 * @param {Page} page - The Playwright Page object representing the pr0game building page for interaction.
 */
async function refreshUntilQueueCompletion(buildCompleted: boolean, recursiveCallCount: number, page: Page) {
  const buildCompletionTime: number = Number(await page.locator('div#progressbar').getAttribute('data-time'));
  const queueRunning = new Promise((resolve, reject) => {
    if (buildCompletionTime <= 0) reject(new Error('buildCompletionTime smaller than 1s: ' + buildCompletionTime));
    setTimeout(() => {
      resolve(`Build completed after ${buildCompletionTime}s`);
    }, buildCompletionTime * 1000);
  });
  queueRunning.then(
    (queueCompletionMsg) => {
      // resolved
      buildCompleted = true;
      logger.info(queueCompletionMsg);
    },
    (error) => {
      // rejected
      if (error instanceof Error) logger.error(`Queue has not successfully finished running:  + ${error.message}`);
      throw error;
    }
  );
  // Checks for queue completion every QUEUE_REFRESH_INTERVAL +/- QUEUE_REFRESH_INTERVAL_VARIANCE miliseconds
  let refreshIntervalId;
  await new Promise<void>((resolve) => {
    refreshIntervalId = setInterval(
      async () => {
        logger.verbose(`Checking if build in queue ${recursiveCallCount} has finished...`);
        if (buildCompleted) {
          logger.debug('ENTER RECURSIVE FUNCTION CALL');
          resolve();
        } else {
          await randomPlayerInteraction(page);
        }
      },
      parameters.QUEUE_REFRESH_INTERVAL +
        Math.floor(Math.random() * (Math.random() < 0.5 ? -parameters.QUEUE_REFRESH_INTERVAL_VARIANCE : parameters.QUEUE_REFRESH_INTERVAL_VARIANCE))
    );
  });
  // so there aren't any lingering intervals from prior queues spamming refreshes
  clearInterval(refreshIntervalId);
  buildCompleted = false;
}

/**
 * Once research is initiazted, this function restarts the queue for as long as resources are missing.
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

  // in case the test has restarted before the last queue finished executing, we have to wait for its completion and restart the queue to refresh resources.
  const isQueueActive = await page.locator(`div#buildlist div#progressbar`).isVisible();
  if (isQueueActive) {
    await waitForActiveQueue(page);
    await startBuildingQueue(buildCompleted, recursiveCallCount, page);
  }

  // Merge original build with already built order
  let mergedResearchOrder: Research[];
  mergedResearchOrder = mergeCurrentResearchOrderWithSource();
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
      logger.info(`Next research added to queue: ${nextResearch.name} Level ${nextResearch.level}`);
      // Expect Queue to not have more than one value - we are a machine running cuntinuously and don't need a queue
      await expect(page.locator(`div#buildlist div:has-text("2.")`)).toHaveCount(0, { timeout: parameters.ACTION_TIMEOUT });
      //                                     _            _             _           _
      //   _ __ ___  ___  ___  __ _ _ __ ___| |__     ___| |_ __ _ _ __| |_ ___  __| |
      //  | '__/ _ \/ __|/ _ \/ _` | '__/ __| '_ \   / __| __/ _` | '__| __/ _ \/ _` |
      //  | | |  __/\__ \  __/ (_| | | | (__| | | |  \__ \ || (_| | |  | ||  __/ (_| |
      //  |_|  \___||___/\___|\__,_|_|  \___|_| |_|  |___/\__\__,_|_|   \__\___|\__,_|
      return;
    } else {
      logger.verbose(
        // Cost: Met [${nextResearch.cost.met}] Kris [${nextResearch.cost.kris}] Deut [${nextResearch.cost.deut}]
        // Available: Met [${metAvailable}] Kris [${krisAvailable}] Deut [${deutAvailable}]
        `Waiting for resources for ${nextResearch.name} ${nextResearch.level}. Checking again in a couple minutes.
  Missing: Met [${nextResearch.cost.met > currentRes.metAvailable ? nextResearch.cost.met - currentRes.metAvailable : 'none'}] Kris [${nextResearch.cost.kris > currentRes.krisAvailable ? nextResearch.cost.kris - currentRes.krisAvailable : 'none'}] Deut [${nextResearch.cost.deut > currentRes.deutAvailable ? nextResearch.cost.deut - currentRes.deutAvailable : 'none'}]`
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
    const errorMsg = `Minimum Research Lab level [${nextResearch.minResearchlabLevel}] but existing is [${researchLabLevel}]`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * simulates player interactions and is called in semi-random time amounts to not idle until queue completion.
 * @param page
 */
async function randomPlayerInteraction(page: Page) {
  logger.verbose('Simulating erratic player interaction.');
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
      logger.verbose('Do Nothing.');
      break;
  }
}

/**
 * loops through the build order and extracts next object that hasn't yet been queued.
 */
function getNextBuildingOrder(allBuildings: Building[]): number {
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
 * Persists the updatedBuildOrder to storage as json file with 2 spaces as indentation for readability
 * @param {Building[]} updatedBuildOrder
 * @param {string} path
 */
function writeJSONToFile(updatedBuildOrder: Building[] | Research[], path: string) {
  fs.writeFile(path, JSON.stringify(updatedBuildOrder, null, 2), (err) => {
    if (err) {
      logger.error("Couldn't write JSON file: ", err);
    } else {
      logger.verbose(`Updated construction log at: ${path}`);
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
      writeJSONToFile(buildOrder, './storage/built-order.json'); // Write updated data to JSON file
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
      writeJSONToFile(queueOrder, './storage/researched-order.json'); // Write updated data to JSON file
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
function mergeCurrentBuildOrderWithSource() {
  const updatedBuildOrderData: Building[] = JSON.parse(fs.readFileSync('./storage/built-order.json', 'utf-8'));
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
function mergeCurrentResearchOrderWithSource() {
  const updatedResearchOrderData: Research[] = JSON.parse(fs.readFileSync('./storage/researched-order.json', 'utf-8'));
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

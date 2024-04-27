import { test, expect, Page } from '@playwright/test';
import { randomDelay } from 'utils/sharedFunctions';
const jsdom = require('jsdom');
import { Building } from 'utils/customTypes';
import fs from 'fs';
import { parameters } from 'config/parameters';
// import { BUILD_ORDER } from 'utils/build_orders/build-order';
import { ROBO_BUILD_ORDER } from 'utils/build_orders/build-order-with-robo';

test('start main planet build queue', async ({ page }) => {
  try {
    await page.goto('/uni4/game.php');
    const userName = process.env.PROGAME_USERNAME!;
    await expect(page.getByRole('link', { name: userName })).toBeVisible();
    await expect(page.getByRole('link', { name: /Metall[0-9\.\s]/ })).toBeVisible(); // Metall followed by whitespace, numbers or a dot

    await randomDelay(page); // wait a random time amount before page interaction
    await page.getByRole('link', { name: 'Gebäude', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Rohstoffabbau' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lagerung' })).toBeVisible();
    // Extracts headers (name and level) for various building types from the provided building page.
    await extractCurrentBuildingLevels(page);
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
    console.error(error);
    if (error instanceof Error) {
      // TODO handle error
    }
    throw error;
  }
});

/**
 *
 * @param {Page} page - The Playwright Page object representing the pr0game building page for interaction.
 * @returns
 */
async function extractCurrentResourceCount(page: Page) {
  // refresh page for current prices
  await page.reload();
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
  console.log(`Trace: Resource Availability: Met [${metAvailable}] Kris [${krisAvailable}] Deut [${deutAvailable}] Energy [${energyAvailable}]`);
  return { metAvailable, krisAvailable, deutAvailable, energyAvailable };
}

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
  // fetch current resources since they could have changed since last execution
  const currentRes = await extractCurrentResourceCount(page);
  let metAvailable: number = currentRes.metAvailable;
  let krisAvailable: number = currentRes.krisAvailable;
  let deutAvailable: number = currentRes.deutAvailable;
  let energyAvailable: number = currentRes.energyAvailable;
  // Merge original build with already built order
  let mergedBuildOrder: Building[];
  mergedBuildOrder = mergeCurrentBuildOrderWithSource();
  const nextBuildingOrder = getNextBuildingOrder(mergedBuildOrder);
  const nextBuilding = mergedBuildOrder[nextBuildingOrder];

  // Check for resource constraints
  if (nextBuilding.cost.energy <= energyAvailable + parameters.ENERGY_DEFICIT_ALLOWED) {
    if (nextBuilding.cost.met <= metAvailable && nextBuilding.cost.kris <= krisAvailable && nextBuilding.cost.deut <= deutAvailable) {
      if (page.url() !== process.env.PROGAME_BUILDING_PAGE_URL) {
        console.log('Trace: Navigating back to building overview.');
        await page.goto('/uni4/game.php?page=buildings');
        await randomDelay(page); // wait a random time amount before page interaction
      } else {
        console.log(`Trace: Currently on building page and next building ${nextBuilding.name} ${nextBuilding.level} can be queued.`);
        await randomDelay(page); // wait a random time amount before page interaction
      }
      // Queue next Building
      await page.locator(`div.infos:has-text("${nextBuilding.name}") button.build_submit`).click();
      // Expect Queue to become visible
      await expect(page.locator('#buildlist')).toBeVisible();
      // Expect Next Building to be in Position 1. in Queue
      expect(
        await page.locator(`div#buildlist div:has-text("1."):has-text("${nextBuilding.name} ${nextBuilding.level}") button.build_submit`).innerText()
      ).toBe(`${nextBuilding.name} ${nextBuilding.level}`);
      // Expect Queue to not have more than one value - we are a machine running cuntinuously and don't need a queue
      await expect(page.locator(`div#buildlist div:has-text("2.")`)).toHaveCount(0);
      queueBuilding(nextBuildingOrder, mergedBuildOrder);
      // Notifies user of successful queue addition
      console.info(`INFO: Next building added to queue: ${nextBuilding.name} Level ${nextBuilding.level}`);
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
      await startBuildingQueue(buildCompleted, recursiveCallCount++, page);
    } else {
      console.log(
        // Cost: Met [${nextBuilding.cost.met}] Kris [${nextBuilding.cost.kris}] Deut [${nextBuilding.cost.deut}]
        // Available: Met [${metAvailable}] Kris [${krisAvailable}] Deut [${deutAvailable}]
        `Trace: Waiting for resources. Checking again in a couple minutes.
Missing: Met [${nextBuilding.cost.met > 0 ? nextBuilding.cost.met - metAvailable : 'none'}] Kris [${nextBuilding.cost.kris > 0 ? nextBuilding.cost.kris - krisAvailable : 'none'}] Deut [${nextBuilding.cost.deut > 0 ? nextBuilding.cost.deut - deutAvailable : 'none'}]`
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
      await startBuildingQueue(buildCompleted, recursiveCallCount++, page);
    }
  } else {
    const errorMsg = `ERROR: Not enough energy provided for ${nextBuilding.name} Level ${nextBuilding.level}. Needed: ${nextBuilding.cost.energy}. Available: ${energyAvailable}`;
    console.error(errorMsg);
    throw Error(errorMsg);
  }
}

/**
 * Check building completion in continuous intervals until it has finished building.
 * @param {Page} page - The Playwright Page object representing the pr0game building page for interaction.
 */
async function refreshUntilQueueCompletion(buildCompleted: boolean, recursiveCallCount: number, page: Page) {
  const buildCompletionTime: number = Number(await page.locator('div#progressbar').getAttribute('data-time'));
  const queueRunning = new Promise((resolve, reject) => {
    if (buildCompletionTime <= 0) reject(new Error('ERROR: buildCompletionTime smaller than 1s: ' + buildCompletionTime));
    setTimeout(() => {
      resolve('INFO: Build completed after ' + buildCompletionTime + 's');
    }, buildCompletionTime * 1000);
  });
  queueRunning.then(
    (queueCompletionMsg) => {
      // resolved
      buildCompleted = true;
      console.info(queueCompletionMsg);
    },
    (error) => {
      // rejected
      if (error instanceof Error) console.error('ERROR: queue has not successfully finished running: ' + error.message);
      throw error;
    }
  );
  // Checks for queue completion every QUEUE_REFRESH_INTERVAL +/- QUEUE_REFRESH_INTERVAL_VARIANCE miliseconds
  let refreshIntervalId;
  await new Promise<void>((resolve) => {
    refreshIntervalId = setInterval(
      async () => {
        console.log(`Trace: Checking if build in queue ${recursiveCallCount} has finished...`);
        if (buildCompleted) {
          console.debug('Trace: ENTER RECURSIVE FUNCTION CALL');
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
 * simulates player interactions and is called in semi-random time amounts to not idle until queue completion.
 * @param page
 */
async function randomPlayerInteraction(page: Page) {
  console.log('Trace: Simulating erratic player interaction.');
  const randomEvent = Math.floor(Math.random() * 7);
  switch (randomEvent) {
    case 1:
      console.log('Trace: Refreshing current Page.');
      await page.reload();
      break;
    case 2:
      console.log('Trace: Navigating to Imperium View.');
      await page.goto('/uni4/game.php?page=Empire');
      break;
    case 3:
      console.log('Trace: Navigating to Research View.');
      await page.goto('/uni4/game.php?page=research');
      break;
    case 4:
      console.log('Trace: Navigating to Overview.');
      await page.goto('/uni4/game.php?page=overview');
      break;
    case 5:
      console.log('Trace: Navigating to Tech Tree.');
      await page.goto('/uni4/game.php?page=techtree');
      break;
    case 5:
      console.log('Trace: Navigating to Galaxy.');
      await page.goto('/uni4/game.php?page=galaxy');
      break;
    case 6:
      console.log('Trace: Navigating to Building Overview.');
      await page.goto('/uni4/game.php?page=buildings');
      break;
    default:
      console.log('Trace: Do Nothing.');
      break;
  }
}

/**
 * loops through the build order and extracts mext value that hasn't yet been queued.
 */
function getNextBuildingOrder(buildings: Building[]): number {
  let order;
  buildings.every((e) => {
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
function writeJSONToFile(updatedBuildOrder: Building[], path: string) {
  fs.writeFile(path, JSON.stringify(updatedBuildOrder, null, 2), (err) => {
    if (err) {
      console.error("ERROR: Couldn't write JSON file: ", err);
    } else {
      console.log('Trace: Updated built-order at:', path);
    }
  });
}
/**
 * Marks the next building in line as queued and updates the .json output file.
 * Receives a merged build order and the index of the next building to queue.
 * @param index index within build order array
 * @param buildOrder merged build order with updated hasBeenQueued and queuedAt0 values
 */
function queueBuilding(index: number, buildOrder: Building[]) {
  if (index >= 0 && index < buildOrder.length) {
    const building = buildOrder[index];
    if (!building.hasBeenQueued) {
      buildOrder[index].hasBeenQueued = true;
      buildOrder[index].queuedAt = new Date();
      writeJSONToFile(buildOrder, './storage/built-order.json'); // Write updated data to JSON file
    } else {
      console.error('ERROR: Building has already been queued.');
    }
  } else {
    console.error('ERROR: Invalid building index.');
  }
}

/**
 * Merges the original Build oder with the written .json output build order created by this program.
 * Updates values are:
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
 * Extracts headers (name and level) for various building types from the provided building page.
 * @param {Page} page - The Playwright Page object representing the webpage to extract from.
 * @throws {Error} - If there are any issues during the extraction process.
 */
async function extractCurrentBuildingLevels(page: Page) {
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
  // TODO something with the header values
  console.info('INFO: Current building levels:');
  console.log(metallmineHeader);
  console.log(solarkraftwerkHeader);
  console.log(kristallmineHeader);
  console.log(deuteriumsynthetisiererHeader);
  console.log(roboterfabrikHeader);
  console.log(raumschiffwerftHeader);
  console.log(forschungslaborHeader);
  console.log(metallspeicherHeader);
  console.log(kristallspeicherHeader);
  console.log(deuteriumtankHeader);
}

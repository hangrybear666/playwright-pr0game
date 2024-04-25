import { test, expect, Page } from '@playwright/test';
import { getRandomDelayBetweenMiliseconds, randomDelay } from 'utils/sharedFunctions';
const jsdom = require('jsdom');
import { BUILD_ORDER } from 'utils/build-order';
import { Building } from 'utils/customTypes';
import fs from 'fs';
import { parameters } from 'config/parameters';

test('continue in session', async ({ page }) => {
  try {
    await page.goto('/uni4/game.php');
    const userName = process.env.PROGAME_USERNAME!;
    await expect(page.getByRole('link', { name: userName })).toBeVisible();
    await expect(page.getByRole('link', { name: /Metall[0-9\.\s]/ })).toBeVisible(); // Metall followed by whitespace, numbers or a dot
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
    const metAvailable: number = metAmt ? parseInt(metAmt) : 0;
    const krisAvailable: number = krisAmt ? parseInt(krisAmt) : 0;
    const deutAvailable: number = deutAmt ? parseInt(deutAmt) : 0;
    const energyAvailable: number = energieAmt ? parseInt(energieAmt) : 0;

    await randomDelay(page); // wait a random time amount before page interaction
    await page.getByRole('link', { name: 'Gebäude', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Rohstoffabbau' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lagerung' })).toBeVisible();
    // Extracts headers (name and level) for various building types from the provided building page.
    await extractBuildingLevels(page);
    // Starts an infinite recursive loop acting as the building queue process based on available resources.
    await startBuildingQueue(energyAvailable, metAvailable, krisAvailable, deutAvailable, page);
  } catch (error: unknown) {
    console.error(error);
    if (error instanceof Error) {
      // TODO handle error
    }
    throw error;
  }
});
/**
 * Extracts headers (name and level) for various building types from the provided building page.
 * @param {Page} page - The Playwright Page object representing the webpage to extract from.
 * @throws {Error} - If there are any issues during the extraction process.
 */
async function extractBuildingLevels(page: Page) {
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

/**
 * Starts an infinite recursive loop acting as the building queue process based on available resources.
 * It merges the original Build oder with the written .json output build order created by this program.
 * Then it starts a build, updates the build order output file and checks in set intervals for build completion.
 * In between checks it occasionally interacts with the page in random intervals to mimick user interactions.
 * @param {number} energyAvailable - The amount of energy available for building.
 * @param {number} metAvailable - The amount of metal available for building.
 * @param {number} krisAvailable - The amount of crystal available for building.
 * @param {number} deutAvailable - The amount of deuterium available for building.
 * @param {Page} page - The Playwright Page object representing the pr0game building page for interaction.
 * @throws {Error} - If there are any issues during the building queue process, such as resource unavailability or unexpected errors.
 */
async function startBuildingQueue(energyAvailable: number, metAvailable: number, krisAvailable: number, deutAvailable: number, page: Page) {
  let mergedBuildOrder: Building[];
  mergedBuildOrder = mergeCurrentBuildOrderWithSource();
  const nextBuildingOrder = getNextBuildingOrder(mergedBuildOrder);
  const nextBuilding = mergedBuildOrder[nextBuildingOrder];

  if (nextBuilding.cost.energy <= energyAvailable + 25) {
    if (nextBuilding.cost.met <= metAvailable && nextBuilding.cost.kris <= krisAvailable && nextBuilding.cost.deut <= deutAvailable) {
      await randomDelay(page); // wait a random time amount before page interaction

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
      await refreshUntilQueueCompletion(page);
      // recursively calls itself to run another round after building queue completion
      await startBuildingQueue(energyAvailable, metAvailable, krisAvailable, deutAvailable, page);
    } else {
      console.log(
        `Trace: Waiting for resources. Checking again in a couple minutes: Cost: ${JSON.stringify(nextBuilding.cost)} Available: ${JSON.stringify({ met: metAvailable, kris: krisAvailable, deut: deutAvailable })}`
      );
      // Wait for a couple minutes and check again.
      // TODO check for energy again.
    }
  } else {
    console.error(
      `ERROR: Not enough energy provided for ${nextBuilding.name} Level ${nextBuilding.level}. Needed: ${nextBuilding.cost.energy}. Available: ${energyAvailable}`
    );
  }
}

/**
 * Check building completion in continuous intervals until it has finished building.
 * @param {Page} page - The Playwright Page object representing the pr0game building page for interaction.
 */
async function refreshUntilQueueCompletion(page: Page) {
  const buildCompletionTime: number = Number(await page.locator('div#progressbar').getAttribute('data-time'));
  let buildCompleted = false;
  const queueRunning = new Promise((resolve, reject) => {
    if (buildCompletionTime <= 0) reject(new Error('ERROR: buildCompletionTime smaller than 1s: ' + buildCompletionTime));
    setTimeout(() => {
      resolve('INFO: Build completed after ' + buildCompletionTime + 's');
    }, buildCompletionTime * 1000);
  });
  queueRunning.then(
    (queueCompletionMsg) => {
      // resolve
      buildCompleted = true;
      console.info(queueCompletionMsg);
    },
    (error) => {
      // reject
      if (error instanceof Error) console.error('ERROR: queue has not successfully finished running: ' + error.message);
      throw error;
    }
  );
  // Checks for queue completion every 15 seconds
  await new Promise<void>((resolve) => {
    setInterval(() => {
      console.log('Trace: Checking if build has finished...');
      if (buildCompleted) {
        // QUEUE NEW BUILDING BRE
        console.log('WE ARE READY TO RECURSIVELY CALL THE BUILD QUEUE');
        resolve();
      }
    }, parameters.QUEUE_REFRESH_INTERVAL);
  });
  buildCompleted = false;
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
      console.info('INFO: Updated Build order written successfully to:', path);
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
  const mergedBuildOrder: Building[] = BUILD_ORDER.map((originalBuilding, index) => {
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

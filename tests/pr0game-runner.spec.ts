import { test, expect } from '@playwright/test';
import { randomDelay } from 'utils/pr0game-setup';
const jsdom = require('jsdom');
import { BUILD_ORDER } from 'utils/build-order';
import { Building } from 'utils/customTypes';

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

test('continue in session', async ({ page }) => {
  try {
    await page.goto('/uni4/game.php');
    const userName = process.env.PROGAME_USERNAME!;
    await expect(page.getByRole('link', { name: userName })).toBeVisible();
    await expect(page.getByRole('link', { name: /Metall[0-9\.\s]/ })).toBeVisible(); // Metall gefolgt von whitespace, Zahlen oder Punkt
    const metAmt = await page.locator('#current_metal').getAttribute('data-real');
    const krisAmt = await page.locator('#current_crystal').getAttribute('data-real');
    const deutAmt = await page.locator('#current_deuterium').getAttribute('data-real');
    const energieHtml = await page.getByRole('link', { name: /Energie[0-9\.\/\s]/ }).innerHTML(); // Energie gefolgt von whitespace, Zahlen, Punkt oder Backslash
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

    await randomDelay(page); // wait a random time amount between 1-5 seconds before clicking
    await page.getByRole('link', { name: 'Gebäude', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Rohstoffabbau' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lagerung' })).toBeVisible();
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

    const nextBuildingOrder = getNextBuildingOrder(BUILD_ORDER);
    const nextBuilding = BUILD_ORDER[nextBuildingOrder];

    if (nextBuilding.cost.energy && nextBuilding.cost.energy <= energyAvailable + 25) {
      if (
        nextBuilding.cost.met <= metAvailable &&
        nextBuilding.cost.kris <= krisAvailable &&
        nextBuilding.cost.deut <= deutAvailable
      ) {
        await randomDelay(page); // wait a random time amount between 1-5 seconds before clicking
        // Queue next Building
        await page.locator(`div.infos:has-text("${nextBuilding.name}") button.build_submit`).click();
        // Expect Queue to become visible
        await expect(page.locator('#buildlist')).toBeVisible();
        // Expect Next Building to be in Position 1. in Queue
        expect(
          await page
            .locator(
              `div#buildlist div:has-text("1."):has-text("${nextBuilding.name} ${nextBuilding.level}") button.build_submit`
            )
            .innerText()
        ).toBe(`${nextBuilding.name} ${nextBuilding.level}`);
        // Expect Queue to not have more than one value - we are a machine running cuntinuously and don't need a queue
        await expect(page.locator(`div#buildlist div:has-text("2.")`)).toHaveCount(0);
        console.log(`INFO: Next building added to queue: ${nextBuilding.name} Level ${nextBuilding.level}`);
      } else {
        console.log(
          `Trace: Waiting for resources. Checking again in a couple minutes: Cost: ${JSON.stringify(nextBuilding.cost)} Available: ${JSON.stringify({ met: metAvailable, kris: krisAvailable, deut: deutAvailable })}`
        );
        // Wait for a couple minutes and check again.
      }
    } else {
      console.error(
        `ERROR: Not enough energy provided for ${nextBuilding.name} Level ${nextBuilding.level}. Needed: ${nextBuilding.cost.energy}. Available: ${energyAvailable}`
      );
    }
  } catch (error: unknown) {
    console.error(error);
    if (error instanceof Error) {
      // handle error
    }
    throw error;
  }
});

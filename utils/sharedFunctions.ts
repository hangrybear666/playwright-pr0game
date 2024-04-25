import { Page } from '@playwright/test';
import { parameters } from 'config/parameters';

export async function randomDelay(page: Page) {
  await page.waitForTimeout(getRandomDelayBetweenMiliseconds(parameters.RANDOM_INTERACTION_DELAY_MIN, parameters.RANDOM_INTERACTION_DELAY_MAX));
}

export const getRandomDelayBetweenMiliseconds = (min: number, max: number) => {
  if (max <= min) {
    const defaultDelay = Math.floor(Math.random() * 4000) + 1001; // 1000-5000ms
    console.info('Trace: waiting for ' + defaultDelay + 'ms');
    return defaultDelay;
  } else {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    console.info('Trace: waiting for ' + delay + 'ms');
    return delay;
  }
};

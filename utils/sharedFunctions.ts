import { Page } from '@playwright/test';
import { parameters } from 'config/parameters';
import { logger } from './logger';
import { ResourcesHourly } from './customTypes';

export async function randomDelay(page: Page) {
  await page.waitForTimeout(getRandomDelayBetweenMiliseconds(parameters.RANDOM_INTERACTION_DELAY_MIN, parameters.RANDOM_INTERACTION_DELAY_MAX));
}

export const getRandomDelayBetweenMiliseconds = (min: number, max: number) => {
  if (max <= min) {
    const defaultDelay = Math.floor(Math.random() * 4000) + 1001; // 1000-5000ms
    logger.verbose('waiting for ' + defaultDelay + 'ms');
    return defaultDelay;
  } else {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    logger.verbose('waiting for ' + delay + 'ms');
    return delay;
  }
};

export function extractLevelFromBuildingHeader(str: string): number {
  const regex = /\d+/; // Matches one or more digits
  const match = str.match(regex);

  if (match) {
    const number = parseInt(match[0]); // Convert matched string to an integer
    return number;
  } else {
    logger.warn(`No Building Level found in ${str}. Defaulting to level 0.`);
    return 0;
  }
}

export function extractResourcesPerHour(metStr: string, krisStr: string, deutStr: string): ResourcesHourly {
  const res = {
    metProduced: metStr ? parseInt(metStr.trim().replace('.', '')) : 0,
    krisProduced: krisStr ? parseInt(krisStr.trim().replace('.', '')) : 0,
    deutProduced: deutStr ? parseInt(deutStr.trim().replace('.', '')) : 0
  };
  return res;
}

import { chromium } from 'playwright';
import { devices, expect } from 'playwright/test';
import { CustomBrowserContextOptions } from './customTypes';
import { randomDelay } from './sharedFunctions';
import { logger } from './logger';

const init = async () => {
  //          ___     __   __       ___  ___     ___
  // | |\ | |  |     /  ` /  \ |\ |  |  |__  \_/  |
  // | | \| |  |     \__, \__/ | \|  |  |___ / \  |
  const context = await chromium.launchPersistentContext('', {
    ...devices['Desktop Chrome'],
    ...(CustomBrowserContextOptions as any)
    // proxy: {
    //   server: ''
    // }
  });
  const page = await context.newPage();
  //   __   ___ ___  __          __        __      __   ___  __   __     __
  //  |__) |__   |  |__) \ /    /  \ |    |  \    /__` |__  /__` /__` | /  \ |\ |
  //  |  \ |___  |  |  \  |     \__/ |___ |__/    .__/ |___ .__/ .__/ | \__/ | \|
  let sessionCookies;
  let isSessionReusable: boolean = false;
  try {
    sessionCookies = await import('../storage/SessionCookies.json');
    const cookies = sessionCookies.cookies;
    context.addCookies(cookies as any);
    logger.http('Prior Session found. Testing validity...');
    const dashboardUrl = process.env.PROGAME_DASHBOARD_URL!;
    await page.goto(dashboardUrl);
    if (page.url() === dashboardUrl) {
      // Dashboard reached. old session is still valid
      isSessionReusable = true;
      logger.http('Stored Session is valid. Reusing prior cookies.');
    }
  } catch (error: unknown) {
    if (error instanceof Error) logger.error('ERROR: Retrying old session failed with: ' + error.message);
  }
  if (!isSessionReusable) {
    try {
      //   ___  __  ___       __          __                ___          __   ___  __   __     __
      //  |__  /__`  |   /\  |__) |    | /__` |__|    |\ | |__  |  |    /__` |__  /__` /__` | /  \ |\ |
      //  |___ .__/  |  /~~\ |__) |___ | .__/ |  |    | \| |___ |/\|    .__/ |___ .__/ .__/ | \__/ | \|
      logger.http('Establishing new session. Attempting to Login.');
      const baseUrl = process.env.PROGAME_BASE_URL!;
      // Navigate to Login Page
      await page.goto(baseUrl);
      const userEmail = process.env.PROGAME_EMAIL!;
      const userPswd = process.env.PROGAME_PW!;
      await expect(page).toHaveTitle(/pr0game/);
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
      await page.locator('#universe').selectOption('4');
      await randomDelay(page);
      await page.getByPlaceholder('E-Mail').fill(userEmail);
      await randomDelay(page);
      await page.getByPlaceholder('Passwort').fill(userPswd);
      await randomDelay(page);
      // Attempt Login
      await page.getByRole('button', { name: 'Login' }).click();
      const userName = process.env.PROGAME_USERNAME!;
      await expect(page.getByRole('link', { name: userName })).toBeVisible();
      await page.context().storageState({ path: './storage/SessionCookies.json' });
      logger.http('Login Successful. Session persisted in storage for later reuse.');
    } catch (error: unknown) {
      if (error instanceof Error) logger.error('ERROR: Establishing new session failed with: ' + error.message);
      throw error;
    }
  }
  logger.info(`User ${process.env.PROGAME_USERNAME} authenticated. Initializing Build Automation Procedure.`);
  await context.close();
};

export default init;

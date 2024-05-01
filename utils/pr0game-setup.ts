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
  try {
    //   __   ___ ___  __          __        __      __   ___  __   __     __
    //  |__) |__   |  |__) \ /    /  \ |    |  \    /__` |__  /__` /__` | /  \ |\ |
    //  |  \ |___  |  |  \  |     \__/ |___ |__/    .__/ |___ .__/ .__/ | \__/ | \|
    let sessionCookies;
    let isSessionReusable: boolean = false;
    const sessionCookiePath = `./storage/SessionCookies${process.env.CLI_PROGAME_USERNAME ? '-' + process.env.CLI_PROGAME_USERNAME : process.env.PROGAME_USERNAME_DEFAULT ? '-' + process.env.PROGAME_USERNAME_DEFAULT : ''}.json`;
    try {
      sessionCookies = await import(
        // ! import requires 2 dots for relative navigation !
        '.'.concat(sessionCookiePath)
      );
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
      logger.warn(`Old Session could not be restored.`);
    }
    if (!isSessionReusable) {
      //   ___  __  ___       __          __                ___          __   ___  __   __     __
      //  |__  /__`  |   /\  |__) |    | /__` |__|    |\ | |__  |  |    /__` |__  /__` /__` | /  \ |\ |
      //  |___ .__/  |  /~~\ |__) |___ | .__/ |  |    | \| |___ |/\|    .__/ |___ .__/ .__/ | \__/ | \|
      logger.http('Establishing new session. Attempting to Login.');
      const baseUrl = process.env.PROGAME_BASE_URL!;
      // Navigate to Login Page
      await page.goto(baseUrl);
      // preferably takes EMAIL address supplied in CLI npx command via cross-env, otherwise defaults to .env file
      const userEmail = process.env.CLI_PROGAME_EMAIL
        ? process.env.CLI_PROGAME_EMAIL
        : process.env.PROGAME_EMAIL_DEFAULT
          ? process.env.PROGAME_EMAIL_DEFAULT
          : '';
      // preferably takes PW address supplied in CLI npx command via cross-env, otherwise defaults to .env file
      const userPswd = process.env.CLI_PROGAME_PW ? process.env.CLI_PROGAME_PW : process.env.PROGAME_PW_DEFAULT ? process.env.PROGAME_PW_DEFAULT : '';
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
      // preferably takes PW address supplied in CLI npx command via cross-env, otherwise defaults to .env file
      const userName = process.env.CLI_PROGAME_USERNAME
        ? process.env.CLI_PROGAME_USERNAME
        : process.env.PROGAME_USERNAME_DEFAULT
          ? process.env.PROGAME_USERNAME_DEFAULT
          : '';
      await expect(page.getByRole('link', { name: userName })).toBeVisible();

      if (page.url() === process.env.PROGAME_DASHBOARD_URL) {
        await page.context().storageState({
          path: sessionCookiePath
        });
        logger.http('Login Successful. Session persisted in storage for later reuse.');
      } else {
        throw Error('Not forwarded to Dashboard url after Login.');
      }
    }
    logger.info(
      `☑️ User [${process.env.CLI_PROGAME_USERNAME ? process.env.CLI_PROGAME_USERNAME : process.env.PROGAME_USERNAME_DEFAULT}] authenticated. Initializing Build Automation.`
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Establishing new session failed: ' + error.message);
      throw error;
    }
  } finally {
    await context.close();
  }
};

export default init;

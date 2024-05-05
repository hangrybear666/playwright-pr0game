import { Request, Response } from 'express';
const express = require('express');
require('dotenv').config();
import { spawn } from 'node:child_process';
import { EnvironmentUserCreds } from 'utils/customTypes';
import { logger } from './utils/logger';

const app = express();

const morgan = require('morgan');
app.use(morgan(':method request to ":url" with length [:req[content-length]] bytes and status [:status] from [:remote-addr] :remote-user - :response-time ms'));

// extracts user credentials from process.env based on supplied user_id from REST URL
function getUserCredsById(userId: number): EnvironmentUserCreds {
  return {
    CLI_PROGAME_USERNAME: process.env[`PROGAME_USERNAME_${userId}`],
    CLI_PROGAME_EMAIL: process.env[`PROGAME_EMAIL_${userId}`],
    CLI_PROGAME_PW: process.env[`PROGAME_PW_${userId}`]
  };
}

app.get('/playwright/queue/:pw/:user_id?', (request: Request, response: Response) => {
  if (!request.params.pw || request.params.pw !== process.env.REST_PW) {
    response.status(403);
    response.send('ACCESS DENIED. please provide valid command in API route /playwright/queue/:pw');
    return;
  }
  let userCredsEnvVariables = {};
  if (!request.params.user_id || isNaN(Number(request.params.user_id))) {
    // start command with default user/credentials
    logger.http('No user id supplied in REST endpoint. Starting Playwright with default credentials.');
  } else if (request.params.user_id && Number(request.params.user_id) >= 1 && Number(request.params.user_id) < 10) {
    // user id supplied in request
    logger.http(`User id [${request.params.user_id}] read from REST request. Initializing Environment variables.`);
    userCredsEnvVariables = getUserCredsById(Number(request.params.user_id));
  }
  // Spawn the 'npx playwright test' command
  const testProcess = spawn('npx', ['playwright', 'test', 'tests/queue.spec.ts '], {
    shell: true,
    cwd: process.cwd(),
    env: userCredsEnvVariables
  });

  // Capture stdout data
  testProcess.stdout.on('data', (data: any) => {
    console.log(`stdout: ${data}`);
  });

  // Capture stderr data
  testProcess.stderr.on('data', (data: any) => {
    console.error(`stderr: ${data}`);
  });

  // Capture process exit event
  testProcess.on('close', (code: any) => {
    console.log(`child process exited with code ${code}`);
    // Respond to the client once the process exits
    response.send(`Test process exited with code ${code}`);
  });
});

app.get('/playwright/stats/:pw/:user_id?', (request: Request, response: Response) => {
  if (!request.params.pw || request.params.pw !== process.env.REST_PW) {
    response.status(403);
    response.send('ACCESS DENIED. please provide valid command in API route /playwright/start/:pw');
    return;
  }
  let userCredsEnvVariables = {};
  if (!request.params.user_id || isNaN(Number(request.params.user_id))) {
    // start command with default user/credentials
    logger.http('No user id supplied in REST endpoint. Starting Playwright with default credentials.');
  } else if (request.params.user_id && Number(request.params.user_id) >= 1 && Number(request.params.user_id) < 10) {
    // user id supplied in request
    logger.http(`User id [${request.params.user_id}] read from REST request. Initializing Environment variables.`);
    userCredsEnvVariables = getUserCredsById(Number(request.params.user_id));
  }
  // Spawn the 'npx playwright test' command
  const testProcess = spawn('npx', ['playwright', 'test', 'tests/stats.spec.ts '], {
    shell: true,
    cwd: process.cwd(),
    env: userCredsEnvVariables
  });

  // Capture stdout data
  testProcess.stdout.on('data', (data: any) => {
    console.log(`stdout: ${data}`);
  });

  // Capture stderr data
  testProcess.stderr.on('data', (data: any) => {
    console.error(`stderr: ${data}`);
  });

  // Capture process exit event
  testProcess.on('close', (code: any) => {
    console.log(`child process exited with code ${code}`);
    // Respond to the client once the process exits
    response.send(`Test process exited with code ${code}`);
  });
});

const port = 3000;

app.listen(port, () => {
  console.log(`
Server is running at address: http://localhost:${port}
In order to start playwright execution GET url with correct password:
http://localhost:${port}/playwright/queue/:pw/:user_id?
OR
http://localhost:${port}/playwright/stats/:pw/:user_id?`);
});

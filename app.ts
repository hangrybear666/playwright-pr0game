import { Request, Response } from 'express';
const express = require('express');
require('dotenv').config();
import { spawn } from 'node:child_process';

const app = express();

const morgan = require('morgan');
app.use(
  morgan(
    ':method request to ":url" with length [:req[content-length]] bytes and status [:status] from [:remote-addr] :remote-user - :response-time ms'
  )
);

app.get('/playwright/start/:pw', (request: Request, response: Response) => {
  if (!request.params.pw || request.params.pw !== process.env.PW_SECRET) {
    response.status(403);
    response.send('ACCESS DENIED. please provide valid pw in API route /playwright/start/:pw');
    return;
  }
  // Spawn the 'npx playwright test' command
  // const testProcess = spawn('npx', ['playwright', 'test']);
  const testProcess = spawn('npx', ['playwright', 'test'], {
    shell: true,
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH
    }
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
In order to start playwright execution POST the correct password to:
http://localhost:3000/playwright/start/:pw `);
});

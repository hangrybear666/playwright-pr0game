# Express/Playwright pr0game Automation

## Overview

This project is an Express server written in TypeScript that utilizes Playwright for browser automation. It enables continuous and autonomous gameplay of the browser game pr0game. It is able to construct buildings, queue researches, build ships and defense.
It can collect player stats in regular intervals and export them as .json files.
User Notifications of executed tasks is handled via Telegram Chatbot.

## Table of Contents

- [Technologies](#technologies)
- [Setup](#setup)
- [Usage](#usage)
- [License](#license)

## Technologies

- **TypeScript:** A statically typed superset of JavaScript.
- **Playwright:** Browser automation library for automating browser tasks.
- **Express:** A minimalist web framework for Node.js.
- **Node.js:** JavaScript runtime environment.
- **dotenv:** Module for loading environment variables.
- **fs:** File system module for Node.js.
- **Morgan:** HTTP request logger middleware for Node.js.
- **node-telegram-bot-api:** Telegram Bot API wrapper.
- **winston:** Logging library for Node.js.
- **Axios:** A promise-based HTTP client for exporting generated .json files via HTTP POST requests to an external server.
- **Nodemon:** Hot Reload upon file changes of the server during development, enhancing the development workflow.
- **ts-node:** Executing TypeScript files directly without the need for compilation, enhancing the development workflow.
- **ESLint and Prettier:** Linter and Formatter for ensuring code quality and enforcing coding standards.

## Setup

**Dependencies**

1. **Node.js:** Ensure Node.js is installed with a version compatible with the listed dependencies.

**Installation**

1. **Clone the Repository:**

```
git clone https://github.com/your-username/express-pr0game-automation.git
```

2. **Navigate to the Project Folder:**

```
cd playwright-pr0game
```

3. **Install Dependencies:**

```
npm install
```

4. **Configure Environment Variables:**

   - Create a `.env` file in the root directory.
   - Define the following variables:
   #### CONNECTION DETAILS
     - PROGAME_BASE_URL=https://pr0game.com/
     - PROGAME_UNI_RELATIVE_PATH=/uni4/game.php
     - PROGAME_DASHBOARD_URL=https://pr0game.com/uni4/game.php
     - PROGAME_BUILDING_PAGE_URL=https://pr0game.com/uni4/game.php?page=buildings
   #### TELEGRAM BOT
     - TELEGRAM_BOT_TOKEN=
     - TELEGRAM_BOT_USERNAME=
     - TELEGRAM_USER_CHAT_ID=
   #### REST API
     - REST_PW=
     - STAT_EXPORT_SERVER_URL=
   #### USER CREDS
     - PROGAME_USERNAME_DEFAULT=
     - PROGAME_EMAIL_DEFAULT=
     - PROGAME_PW_DEFAULT=

     #### Optional
     - PROGAME_USERNAME_1=
     - PROGAME_EMAIL_1=
     - PROGAME_PW_1=
     - PROGAME_USERNAME_2=
     - PROGAME_EMAIL_2=
     - PROGAME_PW_2=



## Usage with Playwright Test for VSCode

1. **Install the Extension**

2. **Follow the Extension Instructions**

3. **Start Test in VSCode GUI**


## Usage in CLI
```
npx playwright test tests/queue.spec.ts
npx playwright test tests/stats.spec.ts
npx playwright test --ui
```

## Usage with npm run

Add to package.json
```
  "scripts": {
    "server": "nodemon --ignore ./storage/ app.ts",
    "dev": "cross-env CLI_PROGAME_USERNAME=placeholder CLI_PROGAME_EMAIL=example@gmail.com CLI_PROGAME_PW=asdaspw npx playwright test"
  },
```

## Usage with REST API

1. **Run the Server:**

```
npm run server
```

2. **Start the queue:**

Send a http GET request to
http://localhost:3000/playwright/queue/:pw/:user_id?

if user_id is omitted, default credentials are used.
3. **Extract stats:**

Send a http GET request to
http://localhost:3000/playwright/stats/:pw/:user_id?

3. **Interact with the Telegram Bot:**

   - Add the telegram bot from the .env variable TELEGRAM_BOT_USERNAME
   - Text /start to your messenger to receive updates and log messages.

## License

This project is licensed under the [MIT License](LICENSE).

---
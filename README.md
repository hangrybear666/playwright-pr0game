# Express/Playwright pr0game Automation

## Overview

This project is an Express server written in TypeScript that utilizes Playwright for browser automation. It enables continuous and autonomous gameplay of the browser game pr0game.
It employs an Express server with fs middleware to handle HTTP requests, save .json files and a Telegram chatbot for user communication.

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
     - PROGAME_BASE_URL=https://pr0game.com/
     - PROGAME_UNI_RELATIVE_PATH=/uni4/game.php
     - PROGAME_DASHBOARD_URL=https://pr0game.com/uni4/game.php
     - PROGAME_BUILDING_PAGE_URL=https://pr0game.com/uni4/game.php?page=buildings
     - TELEGRAM_BOT_TOKEN=
     - TELEGRAM_BOT_USERNAME=
     - TELEGRAM_USER_CHAT_ID=
     - REST_PW=
     - PROGAME_USERNAME_DEFAULT=
     - PROGAME_EMAIL_DEFAULT=
     - PROGAME_PW_DEFAULT=
     - PROGAME_USERNAME_1=
     - PROGAME_EMAIL_1=
     - PROGAME_PW_1=
     - PROGAME_USERNAME_2=
     - PROGAME_EMAIL_2=
     - PROGAME_PW_2=


## Usage

1. **Run the Server:**

```
npm run server
```

2. **Start the queue:**

Send a http GET request to
http://localhost:3000/playwright/queue/:pw/:user_id?

3. **Extract stats:**

Send a http GET request to
http://localhost:3000/playwright/stats/:pw/:user_id?

3. **Interact with the Telegram Bot:**

   - Add the telegram bot from the .env variable TELEGRAM_BOT_USERNAME to your messenger to receive updates and log messages.

## License

This project is licensed under the [MIT License](LICENSE).

---
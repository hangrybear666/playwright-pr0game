Sure, here's the updated README without the curl example:

---

# pr0game Browser Automation via Playwright written in TypeScript running on Express Server

This project is an Express server written in TypeScript that utilizes Playwright for browser automation. It enables continuous and autonomous gameplay of the browser game pr0game.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Usage](#usage)
- [License](#license)

## Introduction

pr0game is a popular browser-based game that requires repetitive actions to progress. This project aims to automate these actions using Playwright, a powerful tool for automating Chromium, Firefox, and WebKit with a single API.

The server is built using Express for handling HTTP requests, and TypeScript for type safety and better development experience.

## Features

- **Continuous Gameplay**: Automates actions in pr0game continuously without manual intervention.
- **Autonomous Operation**: Once configured, the server runs autonomously, performing predefined actions without user input.
- **Customizable**: Customizable with desired build order.

## Usage

1. Start the server:

```bash
npm run server
```

2. To start the execution, send a POST request to `/playwright/start/:pw`, where `:pw` is a parameter representing your desired Playwright script.

## License

This project is licensed under the [MIT License](LICENSE).

---

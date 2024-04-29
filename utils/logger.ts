import { Logger, createLogger, format, transports } from 'winston';
import { sendBasicTelegramMessage, sendBuildingLevelsTelegramMessage, sendCurrentResourcesTelegramMessage, sendErrorTelegramMessage } from './telegramBot';
const colorizer = format.colorize();
const LEVEL = Symbol.for('level');

/**
 * Filters specific transports to only include provided `level`.
 */
function filterOnly(level: string) {
  return format(function (info) {
    if (info[LEVEL] === level) {
      return info;
    } else {
      return false;
    }
  })();
}

const customLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  buildingLevels: 4,
  currentResources: 5,
  verbose: 6,
  debug: 7
};

// Extend Logger interface to include custom log levels
interface CustomLogger extends Logger {
  buildingLevels: (message: string) => void;
  currentResources: (message: string) => void;
}

const logger = createLogger({
  level: 'info',
  // DEFAULTS: error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
  levels: customLevels,
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.printf((info) => `${info.level}: ${info.message ? info.message.trim() : null} at ${info.timestamp}`)
  ),
  // defaultMeta: { service: 'user-service' }, // define own metadata to be added
  transports: [
    // - Write all logs with importance level of `error` to `error.log`
    // - Write all logs with importance level of `info` or less to `info.log`
    // - Write all logs with importance level of `verbose` or less to `trace.log`
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/info.log', level: 'info' }),
    new transports.File({ filename: 'logs/trace.log', level: 'verbose' }),
    // Filter and apply logic to only error level.
    new transports.Stream({
      level: 'info',
      format: filterOnly('info'),
      stream: process.stdout,
      log(info, next) {
        sendBasicTelegramMessage(info.message);
        next();
      }
    }),
    // Filter and apply logic to only error level.
    new transports.Stream({
      level: 'error',
      format: filterOnly('error'),
      stream: process.stdout,
      log(info, next) {
        sendErrorTelegramMessage(info.message);
        next();
      }
    }),
    // Filter and apply logic to only buildingLevels level.
    new transports.Stream({
      level: 'buildingLevels',
      format: filterOnly('buildingLevels'),
      stream: process.stdout,
      log(info, next) {
        sendBuildingLevelsTelegramMessage(info.message);
        next();
      }
    }),
    // Filter and apply logic to only currentResources level.
    new transports.Stream({
      level: 'currentResources',
      format: filterOnly('currentResources'),
      stream: process.stdout,
      log(info, next) {
        sendCurrentResourcesTelegramMessage(info.message);
        next();
      }
    }),
    // Colorful Console logging for verbose and above.
    new transports.Console({
      level: 'verbose', // error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.colorize({
          level: true,
          message: false,
          // Font styles: bold, dim, italic, underline, inverse, hidden, strikethrough.
          // Font foreground colors: black, red, green, yellow, blue, magenta, cyan, white, gray, grey
          // Background colors: blackBG, redBG, greenBG, yellowBG, blueBG magentaBG, cyanBG, whiteBG
          colors: {
            info: 'bold blue blackBG',
            warn: 'italic yellow',
            error: 'bold red',
            http: 'inverse italic grey',
            verbose: 'dim grey',
            spoiler: 'italic dim gray',
            buildingLevels: 'italic cyan',
            currentResources: 'italic cyan',
            timestamp: 'dim green blackBG'
          }
        }),
        format.printf((info) => {
          return `${info.level}: ${info.message ? info.message.trim() : null} at ${colorizer.colorize('timestamp', info.timestamp)}`;
        })
      )
    })
  ]
}) as CustomLogger;

export { logger };

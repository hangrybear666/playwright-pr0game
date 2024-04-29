require('dotenv').config();
import TelegramBot from 'node-telegram-bot-api';
const token = process.env.TELEGRAM_BOT_TOKEN!;
const userCharId = process.env.TELEGRAM_USER_CHAT_ID!;
const bot = new TelegramBot(token, { polling: false, webHook: false, baseApiUrl: '', filepath: false, onlyFirstMatch: false, request: undefined });

function sendBasicTelegramMessage(msg: string) {
  // for custom emojis this might be necessary <tg-emoji emoji-id="5368324170671202286">✅</tg-emoji>
  bot.sendMessage(userCharId, `✅ ${msg}`, { parse_mode: 'HTML' });
}

function sendErrorTelegramMessage(msg: string) {
  // for custom emojis this might be necessary <tg-emoji emoji-id="5368324170671202286">❌</tg-emoji>
  bot.sendMessage(userCharId, `❌ ${msg}`, { parse_mode: 'HTML' });
}

function sendBuildingLevelsTelegramMessage(msg: string) {
  bot.sendMessage(userCharId, `${msg}`, {
    entities: [
      {
        type: 'pre',
        offset: 0,
        language: 'Building Levels',
        length: msg.length
      }
    ]
  });
}

function sendCurrentResourcesTelegramMessage(msg: string) {
  bot.sendMessage(userCharId, `${msg}`, {
    entities: [
      {
        type: 'pre',
        offset: 0,
        language: 'Current Resources',
        length: msg.length
      }
    ]
  });
}

export { sendBasicTelegramMessage, sendErrorTelegramMessage, sendBuildingLevelsTelegramMessage, sendCurrentResourcesTelegramMessage };

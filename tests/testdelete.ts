import fs from 'fs';
import axios from 'axios';
require('dotenv').config();

const STATS_JSON_PATH = `./storage/player-stats.json`;
async function exportstats() {
  try {
    const stats = await JSON.parse(fs.readFileSync(STATS_JSON_PATH, 'utf-8'));
    const postUrl = `${process.env.STAT_EXPORT_SERVER_URL}${process.env.REST_PW}`;
    const config = {
      // headers: { Authorization: `Bearer ${token}` }
    };
    const response = await axios.post(postUrl, stats, config);
    console.log(response);
    console.log(response.status);
    return response.status;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

exportstats();

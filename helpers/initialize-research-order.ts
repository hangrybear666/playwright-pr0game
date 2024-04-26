import fs from 'fs';
import { RESEARCH_ORDER } from '../utils/build_orders/research-order';

fs.writeFile('./storage/researched-order.json', JSON.stringify(RESEARCH_ORDER, null, 2), (err) => {
  if (err) {
    console.error("ERROR: Couldn't write JSON file: ", err);
  } else {
    console.info('INFO: Initialized researched-order at:', './storage/researched-order.json');
  }
});

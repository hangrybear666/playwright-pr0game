import fs from 'fs';
import { ROBO_BUILD_ORDER } from '../utils/build_orders/build-order-with-robo';

fs.writeFile('./storage/built-order.json', JSON.stringify(ROBO_BUILD_ORDER, null, 2), (err) => {
  if (err) {
    console.error("ERROR: Couldn't write JSON file: ", err);
  } else {
    console.info('INFO: Set built-order to ROBO at:', './storage/built-order.json');
  }
});

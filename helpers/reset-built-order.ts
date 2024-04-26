import fs from 'fs';
import { BUILD_ORDER } from '../utils/build_orders/build-order';

fs.writeFile('./storage/built-order.json', JSON.stringify(BUILD_ORDER, null, 2), (err) => {
  if (err) {
    console.error("ERROR: Couldn't write JSON file: ", err);
  } else {
    console.info('INFO: Reset built-order at:', './storage/built-order.json');
  }
});

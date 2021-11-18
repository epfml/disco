import fs from 'fs';
import { TASKS_FILE } from '../../config.js';

if (fs.existsSync(TASKS_FILE)) {
  var tasks = JSON.parse(fs.readFileSync(TASKS_FILE));
} else {
  throw new Error(`Could not read from tasks file ${TASKS_FILE}`);
}

export default Object.freeze(tasks);

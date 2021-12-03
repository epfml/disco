import fs from 'fs';
import * as config from '../../server.config.js';

if (fs.existsSync(config.TASKS_FILE)) {
  var tasks = JSON.parse(fs.readFileSync(config.TASKS_FILE));
} else {
  throw new Error(`Could not read from tasks file ${config.TASKS_FILE}`);
}

function writeNewTask(newTask, modelFile, weightsFile) {
  // store results in json file

  fs.writeFile(config.TASKS_FILE, JSON.stringify(tasks), (err) => {
    if (err) console.log('Error writing file:', err);
  });
  // synchronous directory creation so that next call to fs.writeFile doesn't fail.
  fs.mkdirSync(config.TASK_MODEL_DIR(newTask.taskID), { recursive: true });
  fs.writeFile(
    config.TASK_MODEL_FILE(newTask.taskID),
    JSON.stringify(modelFile),
    (err) => {
      if (err) console.log('Error writing file:', err);
    }
  );
  fs.writeFile(
    config.TASK_MODEL_WEIGHTS(newTask.taskID),
    weightsFile,
    (err) => {
      if (err) console.log('Error writing file:', err);
    }
  );
}

export { tasks, writeNewTask };

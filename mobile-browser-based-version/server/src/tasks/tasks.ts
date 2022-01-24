import fs from 'fs';
import * as config from '../../server.config';

interface DataExample {
  columnName: string;
  columnData: string | number;
}

interface TrainingInformation {
  modelID: string;
  epochs: number;
  roundDuration: number;
  validationSplit: number;
  batchSize: number;
  preprocessFunctions: string[];
  modelCompileData: ModelCompileData;
  receivedMessagesThreshold?: number;
  dataType: string;
  inputColumns?: string[];
  outputColumn?: string;
  threshold?: number;
  IMAGE_H?: number;
  IMAGE_W?: number;
  LABEL_LIST?: string[];
  aggregateImagesById?: boolean;
  learningRate?: number;
  NUM_CLASSES?: number;
  csvLabels?: boolean;
  batchwisePreprocessing?: boolean;
  RESIZED_IMAGE_H?: number;
  RESIZED_IMAGE_W?: number;
  LABEL_ASSIGNMENT?: DataExample[];
}

interface ModelCompileData {
  optimizer: string;
  loss: string;
  metrics: string[];
}

interface DisplayInformation {
  taskTitle: string;
  summary: string;
  overview: string;
  model?: string;
  tradeoffs: string;
  dataFormatInformation: string;
  dataExampleText: string;
  dataExample?: DataExample[];
  headers?: string[];
  dataExampleImage?: string;
  limitations?: string;
}

interface Task {
  taskID: string;
  displayInformation: DisplayInformation;
}

if (!fs.existsSync(config.TASKS_FILE)) {
  throw new Error(`Could not read from tasks file ${config.TASKS_FILE}`);
}

const tasks = JSON.parse(
  fs.readFileSync(config.TASKS_FILE) as unknown as string
) as Task[];

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

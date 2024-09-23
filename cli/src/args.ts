import { parse } from 'ts-command-line-args'
import { Map, Set } from 'immutable'

import type { DataType, TaskProvider } from "@epfml/discojs";
import { defaultTasks } from '@epfml/discojs'

interface BenchmarkArguments {
  provider: TaskProvider<DataType>
  numberOfUsers: number
  epochs: number
  roundDuration: number
  batchSize: number
  save: boolean
}

type BenchmarkUnsafeArguments = Omit<BenchmarkArguments, 'provider'> & {
  task: string
  help?: boolean
}

const argExample = 'e.g. npm start -- -u 2 -e 3 # runs 2 users for 3 epochs'

const unsafeArgs = parse<BenchmarkUnsafeArguments>(
  {
    task: { type: String, alias: 't', description: 'Task: titanic, simple_face, cifar10 or lus_covid', defaultValue: 'simple_face' },
    numberOfUsers: { type: Number, alias: 'u', description: 'Number of users', defaultValue: 1 },
    epochs: { type: Number, alias: 'e', description: 'Number of epochs', defaultValue: 10 },
    roundDuration: { type: Number, alias: 'r', description: 'Round duration (in epochs)', defaultValue: 2 },
    batchSize: { type: Number, alias: 'b', description: 'Training batch size', defaultValue: 10 },
    save: { type: Boolean, alias: 's', description: 'Save logs of benchmark', defaultValue: false },
    help: { type: Boolean, optional: true, alias: 'h', description: 'Prints this usage guide' }
  },
  {
    helpArg: 'help',
    headerContentSections: [{ header: 'DISCO CLI', content: 'npm start -- [Options]\n' + argExample }]
  }
)

const supportedTasks = Map(
  Set.of<TaskProvider<"image"> | TaskProvider<"tabular">>(
    defaultTasks.cifar10,
    defaultTasks.lusCovid,
    defaultTasks.simpleFace,
    defaultTasks.titanic,
  ).map((t) => [t.getTask().id, t]),
);

const provider = supportedTasks.get(unsafeArgs.task);
if (provider === undefined) {
  throw Error(`${unsafeArgs.task} not implemented.`)
}

export const args: BenchmarkArguments = {
  ...unsafeArgs,
  provider: {
    getTask() {
      const task = provider.getTask();

      // Override training information
      task.trainingInformation.batchSize = unsafeArgs.batchSize;
      task.trainingInformation.roundDuration = unsafeArgs.roundDuration;
      task.trainingInformation.epochs = unsafeArgs.epochs;

      // For DP
      // TASK.trainingInformation.clippingRadius = 10000000
      // TASK.trainingInformation.noiseScale = 0

      return task;
    },
    getModel: () => provider.getModel(),
  },
};

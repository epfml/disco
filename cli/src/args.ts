import { parse } from 'ts-command-line-args'
import { Map, Set } from 'immutable'

import type { DataType, Network, TaskProvider } from "@epfml/discojs";
import { defaultTasks } from '@epfml/discojs'

interface BenchmarkArguments {
	provider: TaskProvider<DataType, Network>;
  numberOfUsers: number
  epochs: number
  roundDuration: number
  batchSize: number
  validationSplit: number
  epsilon?: number
  delta?: number
  dpDefaultClippingRadius?: number
  save: boolean
  host: URL
}

type BenchmarkUnsafeArguments = Omit<BenchmarkArguments, 'provider'> & {
  task: string
  help?: boolean
}

const argExample = 'e.g. npm start -- -u 2 -e 3 # runs 2 users for 3 epochs'

const unsafeArgs = parse<BenchmarkUnsafeArguments>(
  {
    task: { type: String, alias: 't', description: 'Task: tinder_dog, titanic, simple_face, cifar10 or lus_covid', defaultValue: 'tinder_dog' },
    numberOfUsers: { type: Number, alias: 'u', description: 'Number of users', defaultValue: 2 },
    epochs: { type: Number, alias: 'e', description: 'Number of epochs', defaultValue: 10 },
    roundDuration: { type: Number, alias: 'r', description: 'Round duration (in epochs)', defaultValue: 2 },
    batchSize: { type: Number, alias: 'b', description: 'Training batch size', defaultValue: 10 },
    validationSplit : { type: Number, alias: 'v', description: 'Validation dataset ratio', defaultValue: 0.2 },
    epsilon: { type: Number, alias: 'n', description: 'Privacy budget', optional: true, defaultValue: undefined},
    delta: { type: Number, alias: 'd', description: 'Probability of failure, slack parameter', optional: true, defaultValue: undefined},
    dpDefaultClippingRadius: {type: Number, alias: 'f', description: 'Default clipping radius for DP', optional: true, defaultValue: undefined},
    save: { type: Boolean, alias: 's', description: 'Save logs of benchmark', defaultValue: false },
    host: {
      type: (raw: string) => new URL(raw),
      typeLabel: "URL",
      description: "Host to connect to",
      defaultValue: new URL("http://localhost:8080"),
    },

    help: { type: Boolean, optional: true, alias: 'h', description: 'Prints this usage guide' }
  },
  {
    helpArg: 'help',
    headerContentSections: [{ header: 'DISCO CLI', content: 'npm start -- [Options]\n' + argExample }]
  }
)

const supportedTasks = Map(
  await Promise.all(
    Set.of<TaskProvider<"image" | "tabular", Network>>(
      defaultTasks.cifar10,
      defaultTasks.lusCovid,
      defaultTasks.simpleFace,
      defaultTasks.titanic,
      defaultTasks.tinderDog,
      defaultTasks.mnist,
    ).map(
      async (t) =>
        [(await t.getTask()).id, t] as [
          string,
          TaskProvider<"image" | "tabular", Network>,
        ],
    ),
  ),
);

const provider = supportedTasks.get(unsafeArgs.task);
if (provider === undefined) {
  throw Error(`${unsafeArgs.task} not implemented.`)
}

export const args: BenchmarkArguments = {
  ...unsafeArgs,
  provider: {
    async getTask() {
      const task = await provider.getTask();

      // Override training information
      task.trainingInformation.batchSize = unsafeArgs.batchSize;
      task.trainingInformation.roundDuration = unsafeArgs.roundDuration;
      task.trainingInformation.epochs = unsafeArgs.epochs;
      task.trainingInformation.validationSplit = unsafeArgs.validationSplit;

      // For DP
      const {dpDefaultClippingRadius, epsilon, delta} = unsafeArgs;

      if (
        // dpDefaultClippingRadius !== undefined &&
        epsilon !== undefined &&
        delta !== undefined
      ){
        if (task.trainingInformation.scheme === "local")
          throw new Error("Can't have differential privacy for local training");

        const defaultRadius = dpDefaultClippingRadius ? dpDefaultClippingRadius : 1;
          
        // for the case where privacy parameters are not defined in the default tasks
        task.trainingInformation.privacy ??= {}
        task.trainingInformation.privacy.differentialPrivacy = {
          clippingRadius: defaultRadius,
          epsilon: epsilon,
          delta: delta,
        };
      }

      return task;
    },
    getModel: () => provider.getModel(),
  },
};

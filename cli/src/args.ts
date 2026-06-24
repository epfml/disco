import { parse } from "ts-command-line-args";
import { Map, Set } from "immutable";

import type { DataType, Network, TaskProvider } from "@epfml/discojs";
import { defaultTasks } from "@epfml/discojs";

type AggregationStrategy = "mean" | "byzantine" | "secure";

function parseAggregator(raw: string): AggregationStrategy {
  if (raw === "mean" || raw == "byzantine" || raw == "secure") return raw;
  else throw new Error(`Aggregator ${raw} is not supported.`);
}

export interface BenchmarkArguments {
  provider: TaskProvider<DataType, Network>;
  testID: string;
  numberOfUsers: number;
  epochs: number;
  roundDuration: number;
  batchSize: number;
  validationSplit: number;

  // DP
  epsilon?: number;
  delta?: number;
  dpDefaultClippingRadius?: number;
  // Aggregator
  aggregator: AggregationStrategy;
  // Byzantine aggregator
  clippingRadius?: number;
  maxIterations?: number;
  beta?: number;
  // Secure aggregator
  maxShareValue?: number;

  save: boolean;
  host: URL;
}

type BenchmarkUnsafeArguments = Omit<BenchmarkArguments, "provider"> & {
  task: string;
  help?: boolean;
};

const argExample = "e.g. pnpm start -u 2 -e 3 # runs 2 users for 3 epochs";

const unsafeArgs = parse<BenchmarkUnsafeArguments>(
  {
    testID: {
      type: String,
      alias: "i",
      description: "ID of the testcase",
    },
    task: {
      type: String,
      alias: "t",
      description:
        "Task: tinder_dog, titanic, simple_face, cifar10 or lus_covid",
      defaultValue: "tinder_dog",
    },
    numberOfUsers: {
      type: Number,
      alias: "u",
      description: "Number of users",
      defaultValue: 2,
    },
    epochs: {
      type: Number,
      alias: "e",
      description: "Number of epochs",
      defaultValue: 10,
    },
    roundDuration: {
      type: Number,
      alias: "r",
      description: "Round duration (in epochs)",
      defaultValue: 2,
    },
    batchSize: {
      type: Number,
      alias: "b",
      description: "Training batch size",
      defaultValue: 10,
    },
    validationSplit: {
      type: Number,
      alias: "v",
      description: "Validation dataset ratio",
      defaultValue: 0.2,
    },
    save: {
      type: Boolean,
      alias: "s",
      description: "Save logs of benchmark",
      defaultValue: false,
    },
    host: {
      type: (raw: string) => new URL(raw),
      typeLabel: "URL",
      description: "Host to connect to",
      defaultValue: new URL("http://localhost:8080"),
    },

    // Aggregator
    aggregator: {
      type: parseAggregator,
      description: "Type of weight aggregator",
      defaultValue: "mean",
    },

    // Byzantine aggregator
    clippingRadius: {
      type: Number,
      description: "Clipping radius for centered clipping",
      optional: true,
    },
    maxIterations: {
      type: Number,
      description: "Maximum centered clipping iterations",
      optional: true,
    },
    beta: {
      type: Number,
      description:
        "Momentum coefficient to smooth the aggregation over multiple rounds",
      optional: true,
    },

    // Secure aggregator
    maxShareValue: {
      type: Number,
      description: "Maximum absolute value over all the weights",
      optional: true,
    },

    // Differential Privacy
    epsilon: {
      type: Number,
      description: "Privacy budget",
      optional: true,
      defaultValue: undefined,
    },
    delta: {
      type: Number,
      description: "Probability of failure, slack parameter",
      optional: true,
      defaultValue: undefined,
    },
    dpDefaultClippingRadius: {
      type: Number,
      description: "Default clipping radius for DP",
      optional: true,
      defaultValue: undefined,
    },

    help: {
      type: Boolean,
      optional: true,
      alias: "h",
      description: "Prints this usage guide",
    },
  },
  {
    helpArg: "help",
    headerContentSections: [
      {
        header: "DISCO CLI",
        content: "pnpm start [Options]\n" + argExample,
      },
    ],
  },
);

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
  throw Error(`${unsafeArgs.task} not implemented.`);
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

      const { aggregator, clippingRadius, maxIterations, beta, maxShareValue } =
        unsafeArgs;

      // For aggregators
      if (aggregator !== undefined)
        task.trainingInformation.aggregationStrategy = aggregator;

      // For byzantine aggregator
      if (
        clippingRadius !== undefined &&
        maxIterations !== undefined &&
        beta !== undefined
      ) {
        if (task.trainingInformation.scheme === "local")
          throw new Error(
            "Byzantine aggregator is not supported for local training",
          );
        if (task.trainingInformation.aggregationStrategy !== "byzantine")
          throw new Error(
            "Byzantine parameters can be set only when aggregationStrategy is byzantine",
          );

        task.trainingInformation.privacy = {
          ...task.trainingInformation.privacy,
          byzantineFaultTolerance: {
            clippingRadius,
            maxIterations,
            beta,
          },
        };
      }

      // For secure aggregator
      if (maxShareValue !== undefined) {
        if (task.trainingInformation.scheme !== "decentralized")
          throw new Error(
            "Secure aggation is only supported for decentralized laerning",
          );
        if (task.trainingInformation.aggregationStrategy !== "secure")
          throw new Error(
            "maxShareValue can be set when aggregationStrategy is secure",
          );

        task.trainingInformation.maxShareValue = maxShareValue;
      }

      // For DP
      const { dpDefaultClippingRadius, epsilon, delta } = unsafeArgs;

      if (
        // dpDefaultClippingRadius !== undefined &&
        epsilon !== undefined &&
        delta !== undefined
      ) {
        if (task.trainingInformation.scheme === "local")
          throw new Error("Can't have differential privacy for local training");

        const defaultRadius = dpDefaultClippingRadius
          ? dpDefaultClippingRadius
          : 1;

        // for the case where privacy parameters are not defined in the default tasks
        task.trainingInformation.privacy ??= {};
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

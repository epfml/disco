import { parse } from "ts-command-line-args";
import { Map, Set } from "immutable";

import type { DataType, Network, TaskProvider } from "@epfml/discojs";
import { defaultTasks, models } from "@epfml/discojs";

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
  roundIterations?: number;
  batchSize: number;
  validationSplit: number;
  validationFrequency?: number;
  datasetPath?: string;
  validationDatasetPath?: string;
  outputPath?: string;
  goldfishLoss: boolean;
  goldfishK: number;
  goldfishH: number;
  goldfishPadTokenId?: number;
  learningRate?: number;

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

  saveLogs: boolean;
  saveModel: boolean;
  saveCheckpoints: boolean;
  host: URL;
}

type BenchmarkUnsafeArguments = Omit<BenchmarkArguments, "provider"> & {
  task: string;
  datasetPath?: string;
  validationDatasetPath?: string;
  help?: boolean;
};

const argExample = "e.g. pnpm start -u 2 -e 3 # runs 2 users for 3 epochs";

const unsafeArgs = parse<BenchmarkUnsafeArguments>(
  {
    testID: { type: String, alias: "i", description: "ID of the testcase" },
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
    roundIterations: {
      type: Number,
      description:
        "For GPT text tasks, aggregate every N training batches without rewinding the dataset",
      optional: true,
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
    validationFrequency: {
      type: Number,
      description:
        "Run validation every N aggregation rounds. Defaults to every round; use 0 to disable validation metrics.",
      optional: true,
    },
    datasetPath: {
      type: String,
      alias: "d",
      description: "Path to the dataset",
      optional: true,
    },
    validationDatasetPath: {
      type: String,
      alias: "V",
      description: "Path to the validation dataset",
      optional: true,
    },
    outputPath: {
      type: String,
      alias: "o",
      description: "Path to save logs and models. Defaults to ./<testID>",
      optional: true,
    },
    goldfishLoss: {
      type: Boolean,
      description: "Use Goldfish loss for GPT text tasks",
      defaultValue: false,
    },
    goldfishK: {
      type: Number,
      description:
        "Goldfish loss drop modulus k. Drops target if hash(context) mod k == 0",
      defaultValue: 4,
    },
    goldfishH: {
      type: Number,
      description: "Goldfish loss localized hash context length",
      defaultValue: 13,
    },
    goldfishPadTokenId: {
      type: Number,
      description:
        "Optional padding token id to exclude from Goldfish loss denominator",
      optional: true,
    },
    learningRate: {
      type: Number,
      description: "Override learning rate for GPT text tasks",
      optional: true,
    },
    saveLogs: {
      type: Boolean,
      alias: "s",
      description: "Save logs of benchmark",
      defaultValue: false,
    },
    saveModel: {
      type: Boolean,
      alias: "m",
      description: "Save trained model to disk",
      defaultValue: false,
    },
    saveCheckpoints: {
      type: Boolean,
      description:
        "Save each client model after every completed round/aggregation",
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
    Set.of<TaskProvider<"image" | "tabular" | "text", Network>>(
      defaultTasks.cifar10,
      defaultTasks.lusCovid,
      defaultTasks.simpleFace,
      defaultTasks.titanic,
      defaultTasks.tinderDog,
      defaultTasks.mnist,
      defaultTasks.privacyrun,
      defaultTasks.centralizedGPT2FineTune,
    ).map(
      async (t) =>
        [(await t.getTask()).id, t] as [
          string,
          TaskProvider<"image" | "tabular" | "text", Network>,
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
      task.trainingInformation.roundIterations = unsafeArgs.roundIterations;
      task.trainingInformation.validationFrequency =
        unsafeArgs.validationFrequency;

      if (unsafeArgs.goldfishLoss) {
        if (
          task.dataType !== "text" ||
          task.trainingInformation.tensorBackend !== "gpt"
        )
          throw new Error("Goldfish loss is only supported for GPT text tasks");
        if (!Number.isInteger(unsafeArgs.goldfishK) || unsafeArgs.goldfishK < 1)
          throw new Error("goldfishK must be a positive integer");
        if (!Number.isInteger(unsafeArgs.goldfishH) || unsafeArgs.goldfishH < 1)
          throw new Error("goldfishH must be a positive integer");

        task.trainingInformation.goldfishLoss = {
          enabled: true,
          k: unsafeArgs.goldfishK,
          h: unsafeArgs.goldfishH,
          padTokenId: unsafeArgs.goldfishPadTokenId,
        };
      }

      if (unsafeArgs.learningRate !== undefined) {
        if (
          task.dataType !== "text" ||
          task.trainingInformation.tensorBackend !== "gpt"
        )
          throw new Error(
            "learningRate override is only supported for GPT text tasks",
          );
        if (
          !Number.isFinite(unsafeArgs.learningRate) ||
          unsafeArgs.learningRate <= 0
        )
          throw new Error("learningRate must be a positive finite number");

        task.trainingInformation.learningRate = unsafeArgs.learningRate;
      }

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
    async getModel() {
      const model = await provider.getModel();

      if (unsafeArgs.learningRate !== undefined) {
        if (!(model instanceof models.GPT))
          throw new Error(
            "learningRate override is only supported for GPT models",
          );
        if (
          !Number.isFinite(unsafeArgs.learningRate) ||
          unsafeArgs.learningRate <= 0
        )
          throw new Error("learningRate must be a positive finite number");

        model.setLearningRate(unsafeArgs.learningRate);
        console.log(
          `Overriding GPT learning rate to ${unsafeArgs.learningRate}`,
        );
      }

      return model;
    },
  },
};

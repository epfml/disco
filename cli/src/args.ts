import { parse, type ExitReason } from "ts-command-line-args";
import { Map, Set as ImmutableSet } from "immutable";

import type {
  DataType,
  Network,
  TaskProvider,
  AggregationConfig,
  AggregationStrategy,
} from "@epfml/discojs";
import {
  defaultTasks,
  GPT,
  aggregationConfigSchema,
  DECENTRALIZED_AGGREGATION_STRATEGIES,
} from "@epfml/discojs";

const aggregationStrategies = new Set<AggregationStrategy>(
  DECENTRALIZED_AGGREGATION_STRATEGIES,
);

function parseAggregator(raw: string): AggregationStrategy {
  if (aggregationStrategies.has(raw as AggregationStrategy)) {
    return raw as AggregationStrategy;
  }
  throw new Error(`Aggregator ${raw} is not supported.`);
}

function parseAggregatorParams(raw: string): Record<string, unknown> {
  if (raw.trim().length === 0) {
    throw new Error(
      'Invalid aggregatorParams: expected comma-separated "key=value" pairs',
    );
  }

  const params: Record<string, unknown> = {};
  for (const pair of raw.split(",")) {
    const trimmedPair = pair.trim();
    if (trimmedPair.length === 0) {
      throw new Error(
        'Invalid aggregatorParams: empty entry, expected "key=value"',
      );
    }
    const eqIdx = trimmedPair.indexOf("=");
    if (eqIdx === -1) {
      throw new Error(
        `Invalid parameter format "${trimmedPair}", expected "key=value"`,
      );
    }
    const key = trimmedPair.slice(0, eqIdx).trim();
    const valStr = trimmedPair.slice(eqIdx + 1).trim();
    if (key.length === 0) {
      throw new Error(
        `Invalid parameter format "${trimmedPair}", key cannot be empty`,
      );
    }
    if (valStr.length === 0) {
      throw new Error(
        `Invalid parameter format "${trimmedPair}", value cannot be empty`,
      );
    }
    if (Object.hasOwn(params, key)) {
      throw new Error(`Duplicate parameter key "${key}"`);
    }

    const lower = valStr.toLowerCase();
    if (lower === "true") {
      params[key] = true;
    } else if (lower === "false") {
      params[key] = false;
    } else {
      const num = Number(valStr);
      params[key] = Number.isFinite(num) ? num : valStr;
    }
  }
  return params;
}

type ValidationMode = "before" | "after" | "both";

function parseValidationMode(raw: string): ValidationMode {
  if (raw === "before" || raw === "after" || raw === "both") return raw;
  else
    throw new Error(
      `Validation mode ${raw} is not supported, expected "before", "after" or "both".`,
    );
}

export interface BenchmarkArguments {
  provider: TaskProvider<DataType, Network>;
  testID: string;
  numberOfUsers: number;
  epochs: number;
  roundDuration: number;
  roundIterations?: number;
  batchSize: number;
  /**
   * Fraction of each client's training dataset reserved for validation.
   * Ignored when `validationDatasetPath` is set. A value of 0 leaves the
   * client without validation data unless `validationDatasetPath` is set.
   */
  validationSplit: number;
  /**
   * Validate the first aggregation round and every N rounds after it. If
   * omitted, validation runs every round; 0 disables validation metrics. This
   * only controls when validation runs, not whether its data comes from
   * `validationSplit` or `validationDatasetPath`.
   */
  validationFrequency?: number;
  /**
   * When to run validation relative to weight aggregation: "before" (on the
   * local model), "after" (on the freshly aggregated global model), or "both".
   * Defaults to "before".
   */
  validationMode?: ValidationMode;
  datasetPath?: string;
  /**
   * Path to a separate validation dataset. When set, this dataset is shared
   * by all clients and takes precedence over `validationSplit`, including
   * when `validationSplit` is non-zero.
   */
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
  aggregationConfig: AggregationConfig;

  saveLogs: boolean;
  saveModel: boolean;
  saveCheckpoints: boolean;
  host: URL;
  /** Token of the task, when it is private on the host */
  token?: string;
}

type BenchmarkUnsafeArguments = Omit<
  BenchmarkArguments,
  "provider" | "aggregationConfig"
> & {
  aggregator: AggregationStrategy;
  aggregatorParams?: Record<string, unknown>;
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
      description: "Task: tinder_dog, titanic, cifar10 or lus_covid",
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
      description:
        "Round duration (in epochs). Ignored if roundIterations is specified",
      defaultValue: 2,
    },
    roundIterations: {
      type: Number,
      description:
        "For GPT text tasks, aggregate every N training batches without rewinding the dataset. Takes precedence over roundIterations",
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
      description:
        "Fraction of each client's training data used for validation. Ignored when --validationDatasetPath is set; 0 disables split-based validation.",
      defaultValue: 0.2,
    },
    validationFrequency: {
      type: Number,
      description:
        "Validate the first aggregation round and every N rounds after it. Defaults to every round; use 0 to disable validation metrics.",
      optional: true,
    },
    validationMode: {
      type: parseValidationMode,
      typeLabel: "before|after|both",
      description:
        "When to run validation relative to weight aggregation: before (local model), after (aggregated global model), or both. Defaults to before.",
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
      description:
        "Path to a separate validation dataset shared by all clients. Takes precedence over --validationSplit.",
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
    token: {
      type: String,
      description:
        "Token of the task, when it is private on the host, as returned when creating it",
      optional: true,
    },

    // Aggregator
    aggregator: {
      type: parseAggregator,
      typeLabel: "mean|byzantine|secure",
      description: 'Type of weight aggregator ("mean", "byzantine", "secure")',
      defaultValue: "mean",
    },

    aggregatorParams: {
      type: parseAggregatorParams,
      typeLabel: "key=value,...",
      description:
        'Aggregator parameters as comma-separated key=value pairs (e.g. "clippingRadius=1.0,beta=0.8"). Supported keys: mean: none; byzantine: clippingRadius (number > 0, default 1.0), maxIterations (int > 0, default 1), beta (number in [0, 1], default 0.9); secure: maxShareValue (int > 0, default 100)',
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
    processExitCode: (reason: ExitReason) => (reason === "usageGuide" ? 0 : 1),
  },
);

const supportedTasks = Map(
  await Promise.all(
    ImmutableSet.of<TaskProvider<"image" | "tabular" | "text", Network>>(
      defaultTasks.cifar10,
      defaultTasks.lusCovid,
      defaultTasks.titanic,
      defaultTasks.tinderDog,
      defaultTasks.mnist,
      defaultTasks.goldfish,
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

const {
  aggregator: cliAggregator,
  aggregatorParams: cliAggregatorParams,
  ...restUnsafeArgs
} = unsafeArgs;

const baseTask = await provider.getTask();
if (baseTask.trainingInformation.scheme === "local") {
  if (cliAggregator !== "mean") {
    throw new Error(
      `${cliAggregator} aggregator is not supported for local training`,
    );
  }
} else if (
  cliAggregator === "secure" &&
  baseTask.trainingInformation.scheme !== "decentralized"
) {
  throw new Error(
    "Secure aggregation is only supported for decentralized learning",
  );
}

// Preserve task defaults for the same strategy when CLI omits or partially overrides params
const existingParams =
  baseTask.trainingInformation.scheme !== "local" &&
  baseTask.trainingInformation.aggregationStrategy === cliAggregator
    ? baseTask.trainingInformation.aggregationParams
    : undefined;

const aggregationConfig = aggregationConfigSchema.parse({
  aggregationStrategy: cliAggregator,
  aggregationParams:
    existingParams !== undefined || cliAggregatorParams !== undefined
      ? { ...existingParams, ...cliAggregatorParams }
      : undefined,
});

export const args: BenchmarkArguments = {
  ...restUnsafeArgs,
  aggregationConfig,
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
      task.trainingInformation.validationMode = unsafeArgs.validationMode;

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

      Object.assign(task.trainingInformation, aggregationConfig);

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
    modelCard: {
      card: provider.modelCard.card,
      async getModel() {
        const model = await provider.modelCard.getModel();

        try {
          if (unsafeArgs.learningRate !== undefined) {
            if (!(model instanceof GPT))
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
        } catch (e) {
          model.dispose();
          throw e;
        }

        return model;
      },
    },
  },
};

import { PreTrainedTokenizer } from "@xenova/transformers";
import { DataType } from "../types.js";

interface Privacy {
  // maximum weights difference between each round
  clippingRadius?: number;
  // variance of the Gaussian noise added to the shared weights.
  noiseScale?: number;
}

export type TrainingInformation<D extends DataType> = {
  // epochs: number of epochs to run training for
  epochs: number;
  // roundDuration: number of epochs between each weight sharing round.
  // e.g.if 3 then weights are shared every 3 epochs (in the distributed setting).
  roundDuration: number;
  // validationSplit: fraction of data to keep for validation, note this only works for image data
  validationSplit: number;
  // batchSize: batch size of training data
  batchSize: number;
  // scheme: Distributed training scheme, i.e. Federated and Decentralized
  scheme: "decentralized" | "federated" | "local";

  // use Differential Privacy, reduce training accuracy and improve privacy.
  privacy?: Privacy;
  // maxShareValue: Secure Aggregation: maximum absolute value of a number in a randomly generated share
  // default is 100, must be a positive number, check the docs/PRIVACY.md file for more information on significance of maxShareValue selection
  // only relevant if secure aggregation is true (for either federated or decentralized learning)
  maxShareValue?: number;
  // minNbOfParticipants: minimum number of participants required to train collaboratively
  // In decentralized Learning the default is 3, in federated learning it is 2
  minNbOfParticipants: number;
  // aggregationStrategy:  aggregator to be used by the server for federated learning, or by the peers for decentralized learning
  // default is 'mean'
  aggregationStrategy?: "mean" | "secure";
  // Tensor framework used by the model
  tensorBackend: "tfjs" | "gpt";
} & DataTypeToTrainingInformation[D];

interface DataTypeToTrainingInformation {
  image: {
    dataType: "image";

    // LABEL_LIST of classes, e.g. if two class of images, one with dogs and one with cats, then we would
    // define ['dogs', 'cats'].
    LABEL_LIST: string[];
    // IMAGE_H height of image (or RESIZED_IMAGE_H if ImagePreprocessing.Resize in preprocessingFunctions)
    IMAGE_H: number;
    // IMAGE_W width of image (or RESIZED_IMAGE_W if ImagePreprocessing.Resize in preprocessingFunctions)
    IMAGE_W: number;
  };
  tabular: {
    dataType: "tabular";

    // inputColumns: for tabular data, the columns to be chosen as input data for the model
    inputColumns: string[];
    // outputColumns: for tabular data, the columns to be predicted by the model
    outputColumn: string;
  };
  text: {
    dataType: "text";

    // tokenizer (string | PreTrainedTokenizer). This field should be initialized with the name of a Transformers.js pre-trained tokenizer, e.g., 'Xenova/gpt2'.
    // When the tokenizer is first called, the actual object will be initialized and loaded into this field for the subsequent tokenizations.
    tokenizer: string | PreTrainedTokenizer;

    // maxSequenceLength: the maximum length of a input string used as input to a GPT model. It is used during preprocessing to
    // truncate strings to a maximum length. The default value is tokenizer.model_max_length
    maxSequenceLength?: number;
  };
}

function isPrivacy(raw: unknown): raw is Privacy {
  if (typeof raw !== "object" || raw === null) {
    return false;
  }

  const {
    clippingRadius,
    noiseScale,
  }: Partial<Record<keyof Privacy, unknown>> = raw;

  if (
    (clippingRadius !== undefined && typeof clippingRadius !== "number") ||
    (noiseScale !== undefined && typeof noiseScale !== "number")
  )
    return false;

  const _: Privacy = {
    clippingRadius,
    noiseScale,
  } satisfies Record<keyof Privacy, unknown>;

  return true;
}

export function isTrainingInformation(
  raw: unknown,
): raw is TrainingInformation<DataType> {
  if (typeof raw !== "object" || raw === null) {
    return false;
  }

  const {
    aggregationStrategy,
    batchSize,
    dataType,
    privacy,
    epochs,
    maxShareValue,
    minNbOfParticipants,
    roundDuration,
    scheme,
    validationSplit,
    tensorBackend,
  }: Partial<Record<keyof TrainingInformation<DataType>, unknown>> = raw;

  if (
    typeof epochs !== "number" ||
    typeof batchSize !== "number" ||
    typeof roundDuration !== "number" ||
    typeof validationSplit !== "number" ||
    typeof minNbOfParticipants !== "number" ||
    (privacy !== undefined && !isPrivacy(privacy)) ||
    (maxShareValue !== undefined && typeof maxShareValue !== "number")
  ) {
    return false;
  }

  switch (aggregationStrategy) {
    case undefined:
    case "mean":
    case "secure":
      break;
    default:
      return false;
  }

  switch (tensorBackend) {
    case "tfjs":
    case "gpt":
      break;
    default:
      return false;
  }

  switch (scheme) {
    case "decentralized":
    case "federated":
    case "local":
      break;
    default:
      return false;
  }

  const repack = {
    aggregationStrategy,
    batchSize,
    epochs,
    maxShareValue,
    minNbOfParticipants,
    privacy,
    roundDuration,
    scheme,
    tensorBackend,
    validationSplit,
  };

  switch (dataType) {
    case "image": {
      type ImageOnly = Omit<
        TrainingInformation<"image">,
        keyof TrainingInformation<DataType>
      >;

      const { LABEL_LIST, IMAGE_W, IMAGE_H }: Partial<ImageOnly> = raw;

      if (
        !(
          Array.isArray(LABEL_LIST) &&
          LABEL_LIST.every((e) => typeof e === "string")
        ) ||
        typeof IMAGE_H !== "number" ||
        typeof IMAGE_W !== "number"
      )
        return false;

      const _: TrainingInformation<"image"> = {
        ...repack,
        dataType,
        LABEL_LIST,
        IMAGE_W,
        IMAGE_H,
      } satisfies Record<keyof TrainingInformation<"image">, unknown>;

      return true;
    }
    case "tabular": {
      type TabularOnly = Omit<
        TrainingInformation<"tabular">,
        keyof TrainingInformation<DataType>
      >;

      const { inputColumns, outputColumn }: Partial<TabularOnly> = raw;

      if (
        !(
          Array.isArray(inputColumns) &&
          inputColumns.every((e) => typeof e === "string")
        ) ||
        typeof outputColumn !== "string"
      )
        return false;

      const _: TrainingInformation<"tabular"> = {
        ...repack,
        dataType,
        inputColumns,
        outputColumn,
      } satisfies Record<keyof TrainingInformation<"tabular">, unknown>;

      return true;
    }
    case "text": {
      const {
        maxSequenceLength,
        tokenizer,
      }: Partial<
        Omit<TrainingInformation<"text">,
	keyof TrainingInformation<DataType>>
      > = raw;

      if (
        (typeof tokenizer !== "string" &&
          !(tokenizer instanceof PreTrainedTokenizer)) ||
        (maxSequenceLength !== undefined &&
          typeof maxSequenceLength !== "number")
      )
        return false;

      const _: TrainingInformation<"text"> = {
        ...repack,
        dataType,
        maxSequenceLength,
        tokenizer,
      } satisfies Record<keyof TrainingInformation<"text">, unknown>;

      return true;
    }
  }

  return false;
}

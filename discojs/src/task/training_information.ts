import { z } from "zod";

import { DataType, Tokenizer } from "../index.js";

export namespace TrainingInformation {
  const baseSchema = z.object({
    // number of epochs to run training for
    epochs: z.number().positive().int(),
    // number of epochs between each weight sharing round.
    // e.g.if 3 then weights are shared every 3 epochs (in the distributed setting).
    roundDuration: z.number().positive().int(),
    // fraction of data to keep for validation, note this only works for image data
    validationSplit: z.number().min(0).max(1),
    // batch size of training data
    batchSize: z.number().positive().int(),
    // Distributed training scheme, i.e. Federated and Decentralized
    scheme: z.enum(["decentralized", "federated", "local"]),
    // reduce training accuracy and improve privacy.
    privacy: z
      .object({
        // maximum weights difference between each round
        clippingRadius: z.number().optional(),
        // variance of the Gaussian noise added to the shared weights.
        noiseScale: z.number().optional(),
      })
      .transform((o) =>
        o.clippingRadius === undefined && o.noiseScale === undefined
          ? undefined
          : o,
      )
      .optional(),
    // Secure Aggregation: maximum absolute value of a number in a randomly generated share
    // default is 100, must be a positive number, check the docs/PRIVACY.md file for more information on significance of maxShareValue selection
    // only relevant if secure aggregation is true (for either federated or decentralized learning)
    maxShareValue: z.number().positive().int().optional(),
    // minimum number of participants required to train collaboratively
    // In decentralized Learning the default is 3, in federated learning it is 2
    minNbOfParticipants: z.number().positive().int(),
    // aggregator to be used by the server for federated learning, or by the peers for decentralized learning
    // default is 'mean'
    aggregationStrategy: z.enum(["mean", "secure"]).optional(),
    // Tensor framework used by the model
    tensorBackend: z.enum(["gpt", "tfjs"]),
  });

  export const schemas = {
    image: baseSchema.extend({
      // classes, e.g. if two class of images, one with dogs and one with cats, then we would
      // define ['dogs', 'cats'].
      LABEL_LIST: z.array(z.string()).min(1),
      // height of image to resize to
      IMAGE_W: z.number().positive().int(),
      // width of image to resize to
      IMAGE_H: z.number().positive().int(),
    }),
    tabular: baseSchema.extend({
      // the columns to be chosen as input data for the model
      inputColumns: z.array(z.string()),
      // the columns to be predicted by the model
      outputColumn: z.string(),
    }),
    text: baseSchema.extend({
      // should be set with the name of a Transformers.js pre-trained tokenizer, e.g., 'Xenova/gpt2'.
      tokenizer: z
        .string()
        .transform((name) => Tokenizer.from_pretrained(name)),
      // the maximum length of a input string used as input to a GPT model. It is used during preprocessing to
      // truncate strings to a maximum length. The default value is tokenizer.model_max_length
      contextLength: z.number().positive().int(),
    }),
  } satisfies Record<DataType, unknown>;
}

export type TrainingInformation<D extends DataType> =
  DataTypeToTrainingInformation[D];
interface DataTypeToTrainingInformation {
  image: z.infer<typeof TrainingInformation.schemas.image>;
  tabular: z.infer<typeof TrainingInformation.schemas.tabular>;
  text: z.infer<typeof TrainingInformation.schemas.text>;
}

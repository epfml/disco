import type tf from "@tensorflow/tfjs";

import type { WeightsContainer } from "../index.js";
import type { Dataset } from "../dataset/index.js";

export interface EpochLogs {
  epoch: number; // first epoch is zero
  loss: number; // TODO put in training/validation?
  training: { accuracy: number };
  validation: { accuracy: number };
}

// TODO still bound to tfjs
export type Prediction = tf.Tensor;
export type Sample = tf.Tensor;

/**
 * Trainable predictor
 *
 * Allow for various implementation of models (various train function, tensor-library, ...)
 **/
// TODO make it typesafe: same shape of data/input/weights
export abstract class Model {
  // TODO don't allow external access but upgrade train to return weights on every epoch
  /** Return training state */
  abstract get weights(): WeightsContainer;
  /** Set training state */
  abstract set weights(ws: WeightsContainer);

  /**
   * Improve predictor
   *
   * @param trainingData dataset to optimize for
   * @param validationData dataset to measure how well it is training
   * @param epochs number of pass over the training dataset
   * @param tracker watch the various steps
   * @yields on every epoch, training can be stop by `return`ing it
   */
  abstract train(
    trainingData: Dataset,
    validationData?: Dataset,
    epochs?: number,
  ): AsyncGenerator<EpochLogs, void>;

  /** Predict likely values */
  // TODO extract in separated TrainedModel?
  abstract predict(input: Sample): Promise<Prediction>;
}

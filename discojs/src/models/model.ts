import type tf from "@tensorflow/tfjs";

import type {
  Batched,
  Dataset,
  DataType,
  DataTypeToPreprocessedLabeled,
  WeightsContainer,
} from "../index.js";

import type { BatchLogs, EpochLogs } from "./logs.js";

// TODO still bound to tfjs
export type Prediction = tf.Tensor;
export type Sample = tf.Tensor;

/**
 * Trainable predictor
 *
 * Allow for various implementation of models (various train function, tensor-library, ...)
 **/
// TODO make it typesafe: same shape of data/input/weights
export abstract class Model<D extends DataType = DataType>
  implements Disposable
{
  // TODO don't allow external access but upgrade train to return weights on every epoch
  /** Return training state */
  abstract get weights(): WeightsContainer;
  /** Set training state */
  abstract set weights(ws: WeightsContainer);

  /**
   * Improve predictor
   *
   * @param trainingDataset dataset to optimize for
   * @param validationDataset dataset to measure how well it is training
   * @yields on every epoch, training can be stop by `return`ing or `throw`ing it
   */
  abstract train(
    trainingDataset: Dataset<Batched<DataTypeToPreprocessedLabeled[D]>>,
    validationDataset?: Dataset<Batched<DataTypeToPreprocessedLabeled[D]>>,
  ): AsyncGenerator<BatchLogs, EpochLogs>;

  /** Predict likely values */
  // TODO extract in separated TrainedModel?
  abstract predict(input: Sample): Promise<Prediction>;

  /**
   * This method is automatically called to cleanup the memory occupied by the model
   * when leaving the definition scope if the instance has been defined with the `using` keyword.
   * For example:
   * function f() {
   *   using model = new Model();
   * }
   * Calling f() will call the model's dispose method when exiting the function.
   */
  abstract [Symbol.dispose](): void;
}

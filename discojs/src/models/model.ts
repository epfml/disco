import type {
  Batched,
  Dataset,
  DataFormat,
  DataType,
  WeightsContainer,
} from "../index.js";

import * as tf from "@tensorflow/tfjs";

import type { BatchLogs, EpochLogs } from "./logs.js";

/**
 * Trainable predictor
 *
 * Allow for various implementation of models (various train function, tensor-library, ...)
 **/
// TODO make it typesafe: same shape of data/input/weights
export abstract class Model<D extends DataType> implements Disposable {
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
    trainingDataset: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
    validationDataset?: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
  ): AsyncGenerator<BatchLogs, EpochLogs>;

  /** Predict likely values */
  // TODO extract in separated TrainedModel?
  abstract predict(
    batch: Batched<DataFormat.ModelEncoded[D][0]>,
  ): Promise<Batched<DataFormat.ModelEncoded[D][1]>>;

  protected getBatchLogs(
    logs: number | number[],
  ): BatchLogs {
    if (!Array.isArray(logs) || logs.length != 2) 
      throw new Error("training output has unexpected shape")
    
    const [loss, accuracy] = logs
    
    if (
      typeof loss !== "number" || isNaN(loss) ||
      typeof accuracy !== "number" || isNaN(accuracy)
    )
      throw new Error("training loss or accuracy is undefined or NaN");

    return {
      accuracy,
      loss,
      memoryUsage: tf.memory().numBytes / 1024 / 1024 / 1024,
    };
  }
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

import type { DataFormat, DataType, Network } from "#dtypes/index";
import type { Task } from "#task/index";
import type { Dataset } from "#dataset/index";
import type { Model } from "#models/index";
import {
  preprocess,
  preprocessWithoutLabel,
  postprocess,
} from "#processing/index";

export class Validator<D extends DataType> {
  readonly #model: Model<D>;

  constructor(
    public readonly task: Task<D, Network>,
    model: Model<D>,
  ) {
    this.#model = model;
  }

  /** infer every line of the dataset and check that it is as labelled */
  test(
    dataset: Dataset<DataFormat.Raw[D]>,
  ): Dataset<Record<"predicted" | "truth", DataFormat.Inferred[D]>> {
    const preprocessed = preprocess(this.task, dataset);
    const batched = preprocessed.batch(this.task.trainingInformation.batchSize);

    const predictionWithTruth = batched
      .map(async (batch) =>
        (await this.#model.predict(batch.map(([inputs, _]) => inputs))).zip(
          batch.map(([_, outputs]) => outputs),
        ),
      )
      .flatten();

    return predictionWithTruth.map(([predicted, truth]) => ({
      predicted: postprocess(this.task, predicted),
      truth: postprocess(this.task, truth),
    }));
  }

  /** use the model to predict every line of the dataset */
  async *infer(
    dataset: Dataset<DataFormat.RawWithoutLabel[D]>,
  ): AsyncGenerator<DataFormat.Inferred[D], void> {
    const modelPredictions = preprocessWithoutLabel(this.task, dataset)
      .batch(this.task.trainingInformation.batchSize)
      .map((batch) => this.#model.predict(batch))
      .flatten();

    const predictions = modelPredictions.map((prediction) =>
      postprocess(this.task, prediction),
    );

    for await (const e of predictions) yield e;
  }
}

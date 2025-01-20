import { Dataset, DataFormat, DataType, Model, Task } from "./index.js";
import { processing } from "./index.js";

export class Validator<D extends DataType> {
  readonly #model: Model<D>;

  constructor(
    public readonly task: Task<D>,
    model: Model<D>,
  ) {
    this.#model = model;
  }

  /** infer every line of the dataset and check that it is as labelled */
	async test(
		dataset: Dataset<DataFormat.Raw[D]>,
	): Promise<Dataset<Record<"predicted" | "truth", DataFormat.Inferred[D]>>> {
		const preprocessed = await processing.preprocess(this.task, dataset);
		const batched = preprocessed.batch(this.task.trainingInformation.batchSize);

		const predictionWithTruth = batched
			.map(async (batch) =>
				(await this.#model.predict(batch.map(([inputs, _]) => inputs))).zip(
					batch.map(([_, outputs]) => outputs),
				),
			)
			.flatten();

		return predictionWithTruth.map(async ([predicted, truth]) => ({
			predicted: await processing.postprocess(this.task, predicted),
			truth: await processing.postprocess(this.task, truth),
		}));
	}

  /** use the model to predict every line of the dataset */
  async *infer(
    dataset: Dataset<DataFormat.RawWithoutLabel[D]>,
  ): AsyncGenerator<DataFormat.Inferred[D], void> {
    const modelPredictions = (
      await processing.preprocessWithoutLabel(this.task, dataset)
    )
      .batch(this.task.trainingInformation.batchSize)
      .map((batch) => this.#model.predict(batch))
      .flatten();

		const predictions = modelPredictions.map((prediction) =>
			processing.postprocess(this.task, prediction),
		);

    for await (const e of predictions) yield e;
  }
}

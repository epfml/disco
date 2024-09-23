import type {
  Dataset,
  DataType,
  Model,
  Raw,
  RawWithoutLabel,
  Task,
} from "./index.js";
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
  async *test(dataset: Dataset<Raw[D]>): AsyncGenerator<boolean, void> {
    const results = (await processing.preprocess(this.task, dataset))
      .batch(this.task.trainingInformation.batchSize)
      .map(async (batch) =>
        (await this.#model.predict(batch.map(([inputs, _]) => inputs)))
          .zip(batch.map(([_, outputs]) => outputs))
          .map(([inferred, truth]) => inferred === truth),
      );

    for await (const batch of results) for (const e of batch) yield e;
  }

  /** use the model to predict every line of the dataset */
  async *infer(
    dataset: Dataset<RawWithoutLabel[D]>,
  ): AsyncGenerator<number, void> {
    const results = (
      await processing.preprocessWithoutLabel(this.task, dataset)
    )
      .batch(this.task.trainingInformation.batchSize)
      .map((batch) => this.#model.predict(batch));

    for await (const batch of results) for await (const e of batch) yield e;
  }
}

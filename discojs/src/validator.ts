import type {
  Model,
  Task,
  TypedRawDataset,
  TypedRawWithoutLabelDataset,
} from "./index.js";
import { processing } from "./index.js";

export class Validator {
  readonly #model: Model;

  constructor(
    public readonly task: Task,
    model: Model,
  ) {
    this.#model = model;
  }

  /** infer every line of the dataset and check that it is as labeled */
  async *test(dataset: TypedRawDataset): AsyncGenerator<boolean, void> {
    const preprocessed = await processing.preprocess(this.task, dataset);

    const { batchSize } = this.task.trainingInformation;

    const results = preprocessed[1]
      .batch(batchSize)
      .map(async (batch) =>
        (await this.#model.predict(batch.map(([inputs, _]) => inputs)))
          .zip(batch.map(([_, outputs]) => outputs))
          .map(([inferred, truth]) => inferred === truth),
      );

    for await (const batch of results) for (const e of batch) yield e;
  }

  /** use the model to predict every line of the dataset */
  async *infer(
    dataset: TypedRawWithoutLabelDataset,
  ): AsyncGenerator<number, void> {
    const preprocessed = await processing.preprocessWithoutLabel(
      this.task,
      dataset,
    );

    const { batchSize } = this.task.trainingInformation;

    const gen = preprocessed[1]
      .batch(batchSize)
      .map((batch) => this.#model.predict(batch));

    for await (const batch of gen) for await (const e of batch) yield e;
  }
}

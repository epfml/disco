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
    switch (preprocessed[0]) {
      case "image": {
        // TODO unsafe cast, will get solved when fully generic
        const model = this.#model as Model<"image">;

        const results = preprocessed[1]
          .batch(batchSize)
          .map(async (batch) =>
            (await model.predict(batch.map(([image, _]) => image)))
              .zip(batch.map(([_, label]) => label))
              .map(([infered, truth]) => infered === truth),
          );

        for await (const batch of results) for (const e of batch) yield e;

        break;
      }
      case "tabular": {
        // TODO unsafe cast, will get solved when fully generic
        const model = this.#model as Model<"tabular">;

        const results = preprocessed[1]
          .batch(batchSize)
          .map(async (batch) =>
            (await model.predict(batch.map(([inputs, _]) => inputs)))
              .zip(batch.map(([_, outputs]) => outputs))
              .map(([infered, truth]) => infered.equals(truth)),
          );

        for await (const batch of results) for (const e of batch) yield e;

        break;
      }
      case "text":
        throw new Error("TODO implement");
    }
  }

  /** use the model to predict every line of the dataset */
  async *infer(
    dataset: TypedRawWithoutLabelDataset,
  ): AsyncGenerator<number, void> {
    const preprocessed = await processing.preprocessWithoutLabel(this.task, dataset);

    const { batchSize } = this.task.trainingInformation;
    switch (preprocessed[0]) {
      case "image": {
        // TODO unsafe cast, will get solved when fully generic
        const model = this.#model as Model<"image">;

        const gen = preprocessed[1]
          .batch(batchSize)
          .map((batch) => model.predict(batch));

        for await (const batch of gen) for await (const e of batch) yield e;

        break;
      }
      case "tabular": {
        // TODO unsafe cast, will get solved when fully generic
        const model = this.#model as Model<"tabular">;

        const gen = preprocessed[1]
          .batch(batchSize)
          .map((batch) => model.predict(batch));

        for await (const batch of gen)
          for await (const e of batch) {
            // TODO mutliple output tabular isn't supported, update types to reflect that
            yield e.first();
          }

        break;
      }
      case "text":
        throw new Error("TODO implement");
    }
  }
}

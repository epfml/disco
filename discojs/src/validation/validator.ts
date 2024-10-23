import * as tf from "@tensorflow/tfjs";

import type {
  Model,
  Task,
  TypedDataset,
  TypedLabeledDataset,
} from "../index.js";
import {
  datasetToData,
  labeledDatasetToData,
} from "../dataset/data/helpers.js";

function intoTFDataset<T extends tf.TensorContainer>(
  iter: AsyncIterable<T>,
): tf.data.Dataset<T> {
  // @ts-expect-error generator
  return tf.data.generator(async function* () {
    yield* iter;
  });
}

export class Validator {
  readonly #model: Model;

  constructor(
    public readonly task: Task,
    model: Model,
  ) {
    this.#model = model;
  }

  /** infer every line of the dataset and check that it is as labeled */
  async *test(dataset: TypedLabeledDataset): AsyncGenerator<boolean> {
    const preprocessed = (
      await labeledDatasetToData(this.task, dataset)
    ).preprocess();
    const batched = preprocessed.batch().dataset;

    const iterator = await tf.data
      .zip<[tf.Tensor1D | tf.Tensor2D, number]>([
        preprocessed.dataset.map((t) => {
          if (
            typeof t !== "object" ||
            !("ys" in t) ||
            !(t.ys instanceof tf.Tensor) ||
            !(t.ys.rank === 1 || t.ys.rank === 2)
          )
            throw new Error("unexpected preprocessed dataset");
          if ("xs" in t) tf.dispose(t.xs);
          return t.ys;
        }),
        intoTFDataset(this.#inferOnBatchedData(batched)),
      ])
      .iterator();
    for (
      let iter = await iterator.next();
      iter.done !== true;
      iter = await iterator.next()
    ) {
      const zipped = iter.value;

      const label = await getLabel(zipped[0]);
      tf.dispose(zipped[0]);
      const infered = zipped[1];

      yield label === infered;
    }
  }

  /** use the model to predict every line of the dataset */
  async *infer(dataset: TypedDataset): AsyncGenerator<number, void> {
    const data = await datasetToData(this.task, dataset);

    const batched = data.preprocess().batch().dataset;

    yield* this.#inferOnBatchedData(batched);
  }

  async *#inferOnBatchedData(
    batched: tf.data.Dataset<tf.TensorContainer>,
  ): AsyncGenerator<number, void> {
    const iterator = await batched.iterator();
    for (
      let iter = await iterator.next();
      iter.done !== true;
      iter = await iterator.next()
    ) {
      const row = iter.value;
      if (
        typeof row !== "object" ||
        !("xs" in row) ||
        !(row.xs instanceof tf.Tensor)
      )
        throw new Error("unexpected shape of dataset");

      // TODO: implement WebWorker to remove this wait
      // https://github.com/epfml/disco/issues/758
      // When running on cpu the inference hogs the main thread
      // and freezes the UI
      if (tf.getBackend() === "cpu") {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const prediction = await this.#model.predict(row.xs);
      tf.dispose(row);
      let predictions: number[];
      switch (prediction.rank) {
        case 2:
        case 3:
          predictions = await getLabels(
            // cast as rank was just checked
            prediction as tf.Tensor2D | tf.Tensor3D,
          );
          prediction.dispose();
          break;
        default:
          throw new Error("unexpected batched prediction shape");
      }
      prediction.dispose();

      for (const prediction of predictions) yield prediction;
    }
  }
}

async function getLabels(ys: tf.Tensor2D | tf.Tensor3D): Promise<number[]> {
  // cast as unstack drop a dimension and tfjs doesn't type correctly
  return Promise.all(
    tf.unstack(ys).map((y) => {
      const ret = getLabel(y as tf.Tensor1D | tf.Tensor2D);
      y.dispose();
      return ret;
    }),
  );
}

async function getLabel(ys: tf.Tensor1D | tf.Tensor2D): Promise<number> {
  switch (ys.rank) {
    case 1: {
      if (ys.shape[0] == 1) {
        // Binary classification
        const threshold = tf.scalar(0.5);
        const binaryTensor = ys.greaterEqual(threshold);

        const binaryArray = await binaryTensor.data();
        tf.dispose([binaryTensor, threshold]);

        return binaryArray[0];
      }

      // Multi-class classification
      const indexTensor = ys.argMax();

      const indexArray = await indexTensor.data();
      tf.dispose([indexTensor]);

      return indexArray[0];

      // Multi-label classification is not supported
    }
    case 2: {
      // it's LLM, we only extract the next token
      const firstToken = tf.tidy(() => ys.gather([0]).squeeze().argMax());
      const raw = await firstToken.data();
      firstToken.dispose();

      return raw[0];
    }
    default:
      throw new Error("unexpected tensor rank");
  }
}

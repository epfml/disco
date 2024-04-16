import { List } from "immutable";
import * as tf from "@tensorflow/tfjs";

import {
  convert_to_number,
  extract_column,
  index_in_list,
} from "../convertors.js";
import type { Task } from "../task/task.js";
import type { DataSplit } from "./data/data_split.js";

import { TypedDataset } from "./types.js";
import { ImageData } from "./data/image_data.js";
import { Data } from "./data/data.js";
import { TabularData } from "./data/tabular_data.js";

/** Immutable serie of data */
export class Dataset<T> implements AsyncIterable<T> {
  readonly #content: () => AsyncIterator<T, void, undefined>;

  /** Wrap given data generator
   *
   * To avoid loading everything in memory, it is a function that upon calling
   * should return a new AsyncGenerator with the same data as before.
   */
  constructor(content: () => AsyncIterator<T>) {
    this.#content = content;
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this.#content();
  }

  /** Apply function to each element
   *
   * @param mapper how to change each element
   */
  map<U>(mapper: (_: T) => U | Promise<U>): Dataset<U> {
    const content = {
      [Symbol.asyncIterator]: () => this.#content(),
    };

    return new Dataset(async function* () {
      for await (const e of content) yield await mapper(e);
    });
  }

  /** Combine with another Dataset.
   *
   * @param other what to yield after us
   */
  chain(other: Dataset<T>): Dataset<T> {
    const self = {
      [Symbol.asyncIterator]: () => this.#content(),
    };

    return new Dataset(async function* () {
      yield* self;
      yield* other;
    });
  }

  /** Divide into two based on given ratio
   *
   * @param ratio between 0 (all on left) and 1 (all on right)
   */
  split(ratio: number): [Dataset<T>, Dataset<T>] {
    if (ratio < 0 || ratio > 1) throw new Error("ratio out of range");

    const content = {
      [Symbol.asyncIterator]: () => this.#content(),
    };

    // to avoid using random sampling or knowing the size beforehand,
    // we compute the actual ratio and make it converge towards the wanted one
    return [
      new Dataset(async function* () {
        let yielded_by_other = 0;
        let total_size = 0;

        for await (const e of content) {
          total_size++;

          if (yielded_by_other / total_size >= ratio) {
            yield e;
          } else {
            yielded_by_other++;
          }
        }
      }),
      new Dataset(async function* () {
        let yielded = 0;
        let total_size = 0;

        for await (const e of content) {
          total_size++;

          if (yielded / total_size < ratio) {
            yielded++;
            yield e;
          }
        }
      }),
    ];
  }

  /** Slice into chunks
   *
   * Last slice is smaller if dataset isn't perfectly divisible
   *
   * @param size count of element per chunk
   */
  batch(size: number): Dataset<List<T>> {
    if (size <= 0 || !Number.isInteger(size)) throw new Error("invalid size");

    const content = {
      [Symbol.asyncIterator]: () => this.#content(),
    };

    return new Dataset(async function* () {
      let batch = List<T>();

      for await (const e of content) {
        batch = batch.push(e);

        if (batch.size === size) {
          yield batch;
          batch = List();
        }
      }

      if (!batch.isEmpty()) yield batch;
    });
  }

  /** Join side-by-side
   *
   * Stops as soon as one runs out
   *
   * @param other right side
   **/
  zip<U>(other: AsyncIterable<U> | Iterable<U>): Dataset<[T, U]> {
    const left = this.#content();
    let right;
    if (Symbol.asyncIterator in other) right = other[Symbol.asyncIterator]();
    else right = other[Symbol.iterator]();

    return new Dataset(async function* () {
      while (true) {
        const [l, r] = await Promise.all([left.next(), right.next()]);
        if (l.done || r.done) return;
        yield [l.value, r.value];
      }
    });
  }
}

function intoTFGenerator<T extends tf.TensorContainer>(
  iter: AsyncIterable<T>,
): tf.data.Dataset<T> {
  // @ts-expect-error generator
  return tf.data.generator(async function* () {
    yield* iter;
  });
}

export async function datasetToData(
  task: Task,
  [t, dataset]: TypedDataset,
): Promise<Data> {
  const labels = List(task.trainingInformation.LABEL_LIST);

  switch (t) {
    case "image": {
      const converted = dataset
        .map(([image, label]) => [image, index_in_list(label, labels)] as const)
        .map(
          ([image, label]) =>
            ({
              xs: tf.tensor3d(
                image.data,
                [image.width, image.height, 3],
                "int32",
              ),
              ys: tf.tensor(label),
            }) satisfies {
              xs: tf.Tensor3D;
              ys: tf.Scalar;
            },
        );
      return await ImageData.init(intoTFGenerator(converted), task);
    }
    case "tabular": {
      const outputColumn = task.trainingInformation.outputColumn;
      if (outputColumn === undefined)
        throw new Error("tabular dataset without output");

      const converted = dataset
        .map(
          (row) =>
            [
              List(task.trainingInformation.inputColumns)
                .map((column) => extract_column(row, column))
                .map(convert_to_number),
              index_in_list(extract_column(row, outputColumn), labels),
            ] as const,
        )
        .map(
          ([row, label]) =>
            ({
              xs: row.toArray(),
              ys: tf.tensor1d([label]),
            }) satisfies {
              xs: number[];
              ys: tf.Tensor1D;
            },
        );
      return await TabularData.init(intoTFGenerator(converted), task);
    }
    case "text":
      throw new Error("TODO implement");
  }
}

// TODO rm when fully generic
export async function datasetToDataSplit(
  task: Task,
  [t, dataset]: TypedDataset,
): Promise<DataSplit> {
  const split = task.trainingInformation.validationSplit;

  let train: Data;
  let validation: Data;
  switch (t) {
    case "image": {
      [train, validation] = await Promise.all(
        dataset.split(split).map((d) => datasetToData(task, [t, d])),
      );
      break;
    }
    case "tabular": {
      [train, validation] = await Promise.all(
        dataset.split(split).map((d) => datasetToData(task, [t, d])),
      );
      break;
    }
    case "text":
      throw new Error("TODO implement");
  }

  return { train, validation };
}

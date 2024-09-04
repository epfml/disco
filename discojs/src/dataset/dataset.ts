import { List } from "immutable";

import type { Batched } from "../index.js";

type DatasetLike<T> =
  | AsyncIterable<T>
  | Iterable<T>
  // generators
  | (() => AsyncIterator<T, void>)
  | (() => Iterator<T, void>);

/** Immutable series of data */
export class Dataset<T> implements AsyncIterable<T> {
  readonly #content: () => AsyncIterator<T, void, undefined>;

  /** Wrap given data generator
   *
   * To avoid loading everything in memory, it is a function that upon calling
   * should return a new AsyncGenerator with the same data as before.
   */
  constructor(content: DatasetLike<T>) {
    this.#content = async function* () {
      let iter: AsyncIterator<T, void> | Iterator<T, void>;
      if (typeof content === "function") iter = content();
      else if (Symbol.asyncIterator in content)
        iter = content[Symbol.asyncIterator]();
      else iter = content[Symbol.iterator]();

      while (true) {
        const result = await iter.next();
        if (result.done === true) break;
        yield result.value;
      }
    };
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
      [Symbol.asyncIterator]: () => this[Symbol.asyncIterator](),
    };

    return new Dataset(async function* () {
      for await (const e of content) yield await mapper(e);
    });
  }

  /** Combine with another Dataset.
   *
   * @param other what to yield after us
   */
  chain(other: Dataset<T> | DatasetLike<T>): Dataset<T> {
    if (!(other instanceof Dataset)) other = new Dataset(other);

    const self = { [Symbol.asyncIterator]: () => this[Symbol.asyncIterator]() };

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
      [Symbol.asyncIterator]: () => this[Symbol.asyncIterator](),
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
  batch(size: number): Dataset<Batched<T>> {
    if (size <= 0 || !Number.isInteger(size)) throw new Error("invalid size");

    const content = {
      [Symbol.asyncIterator]: () => this[Symbol.asyncIterator](),
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
  zip<U>(other: Dataset<U> | DatasetLike<U>): Dataset<[T, U]> {
    if (!(other instanceof Dataset)) other = new Dataset(other);

    const content = {
      [Symbol.asyncIterator]: () => this[Symbol.asyncIterator](),
    };

    return new Dataset(async function* () {
      const left = content[Symbol.asyncIterator]();
      const right = other[Symbol.asyncIterator]();

      while (true) {
        const [l, r] = await Promise.all([left.next(), right.next()]);
        if (l.done || r.done) return;
        yield [l.value, r.value];
      }
    });
  }

  /** Compute size
   *
   * This is a costly operation as we need to go through the whole Dataset.
   */
  async size(): Promise<number> {
    let ret = 0;
    for await (const _ of this) ret++;
    return ret;
  }
}

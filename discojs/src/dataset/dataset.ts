import createDebug from "debug";
import { List, Range } from "immutable";

import { Batched } from "./types.js";

const debug = createDebug("discojs:dataset");

type DatasetLike<T> =
  | AsyncIterable<T>
  | Iterable<T>
  // generators
  | (() => AsyncIterator<T, void>)
  | (() => Iterator<T, void>);

/** Convert a DatasetLike object to an async generator */
async function* datasetLikeToGenerator<U>(content: DatasetLike<U>):
  AsyncGenerator<U, void, undefined> {
  let iter: AsyncIterator<U, void> | Iterator<U, void>;
  if (typeof content === "function") iter = content();
  else if (Symbol.asyncIterator in content)
    iter = content[Symbol.asyncIterator]();
  else iter = content[Symbol.iterator]();

  while (true) {
    const result = await iter.next();
    if (result.done === true) break;
    yield result.value;
  }
}

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
      yield* datasetLikeToGenerator(content);
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this.#content();
  }

  /** Apply function to each element
   *
   * @param mapper how to change each element
   */
  map<U>(mapper: (_: T) => U | Promise<U>): Dataset<U> {
    return new Dataset(
      async function* (this: Dataset<T>) {
        for await (const e of this) yield await mapper(e);
      }.bind(this),
    );
  }

  /** Combine with another Dataset.
   *
   * @param other what to yield after us
   */
  chain(other: Dataset<T> | DatasetLike<T>): Dataset<T> {
    if (!(other instanceof Dataset)) other = new Dataset(other);

    return new Dataset(
      async function* (this: Dataset<T>) {
        yield* this;
        yield* other;
      }.bind(this),
    );
  }

  /** Divide into two based on given ratio
   *
   * @param ratio between 0 (all on left) and 1 (all on right)
   */
  split(ratio: number): [Dataset<T>, Dataset<T>] {
    if (ratio < 0 || ratio > 1) throw new Error("ratio out of range");

    // to avoid using random sampling or knowing the size beforehand,
    // we compute the actual ratio and make it converge towards the wanted one
    return [
      new Dataset(
        async function* (this: Dataset<T>) {
          let yielded_by_other = 0;
          let total_size = 0;

          for await (const e of this) {
            total_size++;

            if (yielded_by_other / total_size >= ratio) {
              yield e;
            } else {
              yielded_by_other++;
            }
          }
        }.bind(this),
      ),
      new Dataset(
        async function* (this: Dataset<T>) {
          let yielded = 0;
          let total_size = 0;

          for await (const e of this) {
            total_size++;

            if (yielded / total_size < ratio) {
              yielded++;
              yield e;
            }
          }
        }.bind(this),
      ),
    ];
  }

  /** Create batches of `size` elements with potential overlap.
   * Last batch is smaller if dataset isn't perfectly divisible
   * 
   * If overlap is set to a positive integer, the last `overlap` elements of a batch 
   * are the first `overlap` elements of the next batch.
   * 
   * This method is tailored to create text sequences where each token's label is the following token. 
   * In order to have a label for the last token of the input sequence, we include the first token
   * of the next sequence (i.e. with an overlap of 1).
   *
   * @param size count of element per chunk
   * @param overlap number of elements overlapping between two consecutive batches
   */
  batch(size: number, overlap = 0): Dataset<Batched<T>> {
    if (size <= 0 || !Number.isInteger(size))
      throw new Error("invalid size");
    if (overlap >= size || !Number.isInteger(overlap))
      throw new Error("invalid overlap");

    return new Dataset(
      async function* (this: Dataset<T>) {
        const iter = this[Symbol.asyncIterator]();

        let overlapped = List<T>();
        for (;;) {
          const batch = List(
            // get the first elements of the next batch
            await Promise.all(
              Range(overlapped.size, size).map(() => iter.next())
            )
          ).flatMap((res) => {
            if (res.done) return [];
            else return [res.value];
          });

          if (batch.isEmpty()) break;

          // yield the current batch with the first elements of the next batch
          yield overlapped.concat(batch);
          overlapped = batch.takeLast(overlap);

          // iterator couldn't generate more
          if (batch.size < size - overlap) break;
        }
      }.bind(this),
    );
  }

  /** Flatten batches/arrays of elements */
  flatten<U>(this: Dataset<DatasetLike<U>>): Dataset<U> {
    return new Dataset(
      async function* (this: Dataset<DatasetLike<U>>) {
        for await (const batch of this) {
          yield* datasetLikeToGenerator(batch);
        }
      }.bind(this),
    );
  }

  /** Join side-by-side
   *
   * Stops as soon as one runs out
   *
   * @param other right side
   **/
  zip<U>(other: Dataset<U> | DatasetLike<U>): Dataset<[T, U]> {
    if (!(other instanceof Dataset)) other = new Dataset(other);

    return new Dataset(
      async function* (this: Dataset<T>) {
        const left = this[Symbol.asyncIterator]();
        const right = other[Symbol.asyncIterator]();

        while (true) {
          const [l, r] = await Promise.all([left.next(), right.next()]);
          if (l.done || r.done) return;
          yield [l.value, r.value] as [T, U];
        }
      }.bind(this),
    );
  }

  /**
   * Repeat the dataset `times` times
   * @param times number of times to repeat the dataset, if undefined, the dataset is repeated indefinitely
   * @returns a dataset repeated `times` times
   */
  repeat(times?: number): Dataset<T> {
    if (times !== undefined && (!Number.isInteger(times) || times < 1))
      throw new Error("times needs to be a positive integer or undefined");

    return new Dataset(
      async function* (this: Dataset<T>) {
        let loop = 0;
        do {
          yield* this;
          loop++
        } while (times === undefined || loop < times)
      }.bind(this),
    );
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

  /** Try to keep generated elements to avoid recomputing
   *
   * Drops everything when memory pressure is applied.
   */
  cached(): Dataset<T> {
    return new CachingDataset(this.#content);
  }
}

/**
 * Avoid recomputing the parent dataset, without hogging memory
 *
 * As dataset operations can be time-consuming, this keeps a weak reference to
 * the generated elements so that a second iteration might yield theses directly.
 **/
class CachingDataset<T> extends Dataset<T> {
  // potential reference to all elements
  // tristate: undefined == empty, [false, _] == filling, [true, _] == filled
  #cache = new WeakRef<[filled: boolean, List<T>]>([false, List()]);

  override [Symbol.asyncIterator](): AsyncIterator<T> {
    const cached = this.#cache.deref();

    if (cached !== undefined && cached[0]) {
      debug("valid cache, reading from it");

      // eslint-disable-next-line @typescript-eslint/require-await
      return (async function* () {
        yield* cached[1];
      })();
    }

    debug("cache invalid, reading from dataset");

    this.#cache = new WeakRef([false, List()]);

    const parentContent = {
      [Symbol.asyncIterator]: () => super[Symbol.asyncIterator](),
    };
    return async function* (this: CachingDataset<T>) {
      for await (const e of parentContent) {
        yield e;

        const caching = this.#cache.deref();
        if (caching !== undefined) caching[1] = caching[1].push(e);
      }

      const caching = this.#cache.deref();
      if (caching === undefined) {
        debug("cache evicted while filling");
        return;
      }

      debug("cache filled");
      caching[0] = true;
    }.bind(this)();
  }
}

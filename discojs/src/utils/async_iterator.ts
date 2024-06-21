import { List } from "immutable";

// `Promise.withResolvers` not widely deployed
function PromiseWithResolvers<T>(): [
  Promise<T>,
  (_: T) => void,
  (_: unknown) => void,
] {
  let resolve: (_: T) => void, reject: (_: unknown) => void;
  resolve = reject = () => {
    // should not happen as Promise are run on creation
    throw new Error("race condition triggered");
  };

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return [promise, resolve, reject];
}

/**
 * Split yields from return value
 *
 * You need to consume the iterator to resolve the returned value
 **/
export function split<T, U>(
  iter: AsyncIterator<T, U>,
): [AsyncGenerator<T, U>, Promise<U>] {
  const [returnPromise, returnResolve, returnReject] =
    PromiseWithResolvers<U>();

  return [
    (async function* () {
      try {
        while (true) {
          const v = await iter.next();
          if (!v.done) {
            yield v.value;
            continue;
          }

          returnResolve(v.value);
          return v.value;
        }
      } catch (e) {
        returnReject(e);
        throw e;
      }
    })(),
    returnPromise,
  ];
}

/** Zip iterator with a infinite counter */
export function enumerate<T, U>(
  iter: AsyncIterator<T, U> | Iterator<T, U>,
): AsyncGenerator<[number, T], U> {
  return (async function* () {
    for (let i = 0; ; i++) {
      const v = await iter.next();
      if (v.done) return v.value;
      yield [i, v.value];
    }
  })();
}

/** Run the whole iterator to get yielded & returned */
export async function gather<T, U>(
  iter: AsyncIterator<T, U>,
): Promise<[List<T>, U]> {
  let elems = List<T>();
  for (;;) {
    const v = await iter.next();
    if (v.done) return [elems, v.value];
    elems = elems.push(v.value);
  }
}

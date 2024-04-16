interface Dimensions<T> {
  1: { shape: [T]; values: T[] };
  2: { shape: [T, T]; values: T[][] };
  3: { shape: [T, T, T]; values: T[][][] };
}

/**
 * Multidimentional array
 *
 * @typeParam T contained value
 * @typeParam D count of dimensions
 **/
export class Tensor<T, D extends keyof Dimensions<T>> {
  constructor(
    public readonly shape: Dimensions<T>[D]["shape"],
    public readonly values: Dimensions<T>[D]["values"],
  ) {
    // TODO check values are of correct shape
  }
}

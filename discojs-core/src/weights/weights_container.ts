import { List } from 'immutable'

import { tf, Weights } from '..'

export type TensorLike = tf.Tensor | ArrayLike<number>

export class WeightsContainer {
  private readonly _weights: List<tf.Tensor>

  constructor (weights: Iterable<TensorLike>) {
    this._weights = List(weights).map((w) =>
      w instanceof tf.Tensor ? w : tf.tensor(w))
  }

  get weights (): Weights {
    return this._weights.toArray()
  }

  add (other: WeightsContainer): WeightsContainer {
    return this.mapWith(other, tf.add)
  }

  sub (other: WeightsContainer): WeightsContainer {
    return this.mapWith(other, tf.sub)
  }

  mapWith (other: WeightsContainer, fn: (a: tf.Tensor, b: tf.Tensor) => tf.Tensor): WeightsContainer {
    return new WeightsContainer(
      this._weights
        .zip(other._weights)
        .map(([w1, w2]) => fn(w1, w2))
    )
  }

  map (fn: (t: tf.Tensor, i: number) => tf.Tensor): WeightsContainer
  map (fn: (t: tf.Tensor) => tf.Tensor): WeightsContainer
  map (fn: ((t: tf.Tensor) => tf.Tensor) | ((t: tf.Tensor, i: number) => tf.Tensor)): WeightsContainer {
    return new WeightsContainer(this._weights.map(fn))
  }

  reduce (fn: (acc: tf.Tensor, t: tf.Tensor) => tf.Tensor): tf.Tensor {
    return this._weights.reduce(fn)
  }

  get (index: number): tf.Tensor | undefined {
    return this._weights.get(index)
  }

  frobeniusNorm (): number {
    return Math.sqrt(this.map((w) => w.square().sum()).reduce((a, b) => a.add(b)).dataSync()[0])
  }

  static of (...weights: TensorLike[]): WeightsContainer {
    return new this(weights)
  }

  static from (model: tf.LayersModel): WeightsContainer {
    return new this(model.weights.map((w) => w.read()))
  }

  static add (a: Iterable<TensorLike>, b: Iterable<TensorLike>): WeightsContainer {
    return new this(a).add(new this(b))
  }

  static sub (a: Iterable<TensorLike>, b: Iterable<TensorLike>): WeightsContainer {
    return new this(a).sub(new this(b))
  }
}

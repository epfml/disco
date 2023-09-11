import { tf, Weights } from '..'
import { Model } from '../training/model'

import { List } from 'immutable'

export type TensorLike = tf.Tensor | ArrayLike<number>

/**
 * Convenient wrapper object reprensenting an immutable list of TF.js tensors.
 */
export class WeightsContainer {
  private readonly _weights: List<tf.Tensor>

  /**
   * Constructs a weights container based on the given weights iterable.
   * The iterable's elements can either be regular TF.js tensors or number arrays.
   * @param weights The weights iterable to build the weights container from
   */
  constructor (weights: Iterable<TensorLike>) {
    this._weights = List(weights).map((w) =>
      w instanceof tf.Tensor ? w : tf.tensor(w))
  }

  get weights (): Weights {
    return this._weights.toArray()
  }

  /**
   * Adds this weights container with another one. The addition is performed entry-wise.
   * The weights containers must be of the same shape.
   * @param other The other weights container
   * @returns A new subtracted weights container
   */
  add (other: WeightsContainer): WeightsContainer {
    return this.mapWith(other, tf.add)
  }

  /**
   * Subtracts another weights container from this one. The subtraction is performed entry-wise.
   * The weights containers must be of the same shape.
   * @param other The other weights container
   * @returns A new subtracted weights container
   */
  sub (other: WeightsContainer): WeightsContainer {
    return this.mapWith(other, tf.sub)
  }

  /**
   * Multiplies this weights container with this one. The multiplication is performed entry-wise.
   * The weights containers must be of the same shape.
   * @param other The other weights container
   * @returns A new multiplied weights container
   */
  mul (other: TensorLike | number): WeightsContainer {
    return new WeightsContainer(
      this._weights
        .map(w => w.mul(other))
    )
  }

  /**
   * Zips this weights container with another one and applies the given binary operator to the
   * coupled entries.
   * @param other The other weights container
   * @param fn The binary operator
   * @returns The mapping's result
   */
  mapWith (other: WeightsContainer, fn: (a: tf.Tensor, b: tf.Tensor) => tf.Tensor): WeightsContainer {
    return new WeightsContainer(
      this._weights
        .zip(other._weights)
        .map(([w1, w2]) => fn(w1, w2 as tf.Tensor<tf.Rank>))
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

  /**
   * Access the TF.js tensor located at the given index.
   * @param index The tensor's index
   * @returns The tensor located at the index
   */
  get (index: number): tf.Tensor | undefined {
    return this._weights.get(index)
  }

  /**
   * Computes the weights container's Frobenius norm
   * @returns The Frobenius norm
   */
  frobeniusNorm (): number {
    return Math.sqrt(this.map((w) => w.square().sum()).reduce((a, b) => a.add(b)).dataSync()[0])
  }

  concat (other: WeightsContainer): WeightsContainer {
    return WeightsContainer.of(
      ...this.weights,
      ...other.weights
    )
  }

  equals (other: WeightsContainer, margin = 0): boolean {
    return this._weights
      .zip(other._weights)
      .every(([w1, w2]) => w1.sub(w2).abs().lessEqual(margin).all().dataSync()[0] === 1)
  }

  /**
   * Instanciates a new weights container from the given tensors or arrays of numbers.
   * @param weights The tensors or number arrays
   * @returns The instanciated weights container
   */
  static of (...weights: TensorLike[]): WeightsContainer {
    return new this(weights)
  }

  /**
   * Instanciates a new weights container from the given model's weights.
   * @param model The TF.js model
   * @returns The instanciated weights container
   */
  static from (model: tf.LayersModel | Model): WeightsContainer {
    const m = model instanceof tf.LayersModel ? model : model.toTfjs()
    return new this(m.weights.map((w) => w.read()))
  }
}

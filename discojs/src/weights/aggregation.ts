import { List } from "immutable";
import * as tf from "@tensorflow/tfjs";

import type { TensorLike } from "#weights/weights_container";
import { WeightsContainer } from "#weights/weights_container";

type WeightsLike = Iterable<TensorLike>;

function parseWeights(
  weights: Iterable<WeightsLike | WeightsContainer>,
): List<WeightsContainer> {
  const r = List(weights).map((w) =>
    w instanceof WeightsContainer ? w : new WeightsContainer(w),
  );
  const size = r.first()?.weights.length;

  if (size === undefined) {
    throw new Error("no weights to work with");
  }
  r.rest().forEach((w) => {
    const actual = w.weights.length;
    if (actual !== size) {
      throw new Error(
        `weights dimensions are different for some of the operands: expected ${size} but found ${actual}`,
      );
    }
  });

  return r;
}

/**
 * Folds the given iterable of weights with the binary operator, disposing each
 * intermediate result immediately.
 *
 * `tf.tidy` only frees the intermediates once the whole
 * fold is over, so the peak memory would grow with the number of operands.
 */
function reduce(
  weights: Iterable<WeightsLike | WeightsContainer>,
  fn: (a: tf.Tensor, b: tf.Tensor) => tf.Tensor,
): WeightsContainer {
  const ws = parseWeights(weights);

  const first = ws.first();
  if (first === undefined) throw new Error("no weights to work with");

  let acc = first.clone();
  try {
    for (const operand of ws.rest()) {
      const next = acc.mapWith(operand, fn);
      acc.dispose();
      acc = next;
    }
  } catch (e) {
    acc.dispose();
    throw e;
  }

  return acc;
}

/**
 * Sums the given iterable of weights entry-wise.
 * @param weights The list of weights to sum
 * @returns The summed weights
 */
export function sum(
  weights: Iterable<WeightsLike | WeightsContainer>,
): WeightsContainer {
  return reduce(weights, tf.add);
}

/**
 * Computes the successive entry-wise difference between the weights of the given iterable.
 * The operation is not commutative w.r.t. the iterable's ordering.
 */
export function diff(
  weights: Iterable<WeightsLike | WeightsContainer>,
): WeightsContainer {
  return reduce(weights, tf.sub);
}

/**
 * Averages the given iterable of weights entry-wise.
 * @param weights The list of weights to average
 * @returns The averaged weights
 */
export function avg(
  weights: Iterable<WeightsLike | WeightsContainer>,
): WeightsContainer {
  const ws = parseWeights(weights);
  const summed = reduce(ws, tf.add);

  try {
    return summed.map((weight) => weight.div(ws.size));
  } finally {
    summed.dispose();
  }
}

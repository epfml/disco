import * as tf from "@tensorflow/tfjs";

import { WeightsContainer } from "./index.js";

import type { WeightNormHistory } from "./training/trainer.js";

/** Computes the Frobenius norm of the given weights. */
export async function frobeniusNorm(weights: tf.Tensor): Promise<number> {
  const squaredTensor = tf.tidy(() => weights.square().sum());
  const squared = await squaredTensor.data();
  squaredTensor.dispose();
  if (squared.length !== 1) throw new Error("unexpected weights shape");
  return Math.sqrt(squared[0]);
}

/** ALDP-FL implementation */
// Conditions need to be added for the first three epochs -> get the avg update from all of the available previous updates
export function getClippingRadius(
  weightNormHistory: WeightNormHistory,
  defaultClippingRadius: number,
): number[] {
  const WINDOW_SIZE = 3;
  const MIN_RADIUS = 1e-12;

  const radii = weightNormHistory.map((norms) => {
    const recent = norms.slice(-WINDOW_SIZE);
    const avg = recent.reduce((sum, n) => sum + n, 0) / recent.size;

    return Math.max(MIN_RADIUS, Math.min(avg, defaultClippingRadius));
  });

  // Convert List<number> to number[]
  return radii.toArray();
}

/** Optimized Gaussian noise using a clipping radius calculation of ALDP-FL for adaptive local differential privacy in federated learning,
 *  https://www.nature.com/articles/s41598-025-12575-6 */
/** Implementation of historical moving average based clipping radius calculation */
export async function addOptimalNoise(
  weightUpdates: WeightsContainer,
  epsilon: number,
  delta: number,
  clippingRadius: number[],
): Promise<WeightsContainer> {
  /**
   * In the original paper, the sensitivity is given as 2 * clippingRadius / d, though the meaning of d is unclear.
   * We believe the L2 sensitivity of the gradient update is 2 * clippingRadius.
   */
  // apply different sensitivity and noise to each of the layer
  // clippingRadius is now number[]
  const sens = clippingRadius.map((r) => 2 * r);
  const sigmas = sens.map(
    (s) => (s * Math.sqrt(2 * Math.log(1.25 / delta))) / epsilon,
  );
  const clippedWeights = await clipNorm(weightUpdates, clippingRadius);

  try {
    return clippedWeights.map((w, i) =>
      tf.tidy(() => w.add(tf.randomNormal(w.shape, 0, sigmas[i]))),
    );
  } finally {
    clippedWeights.dispose();
  }
}

/**
 * Keep weights' norm within radius
 **/
export async function clipNorm(
  weights: WeightsContainer,
  radius: number[],
): Promise<WeightsContainer> {
  /**
   * If radius.length === 1, interpret radius[0] as a global clipping radius (BFT)
   * If radius.length === numLayers, apply per-layer clipping (DP)
   */
  const layers = weights.weights;
  if (radius.length !== layers.length)
    throw new Error(
      `radius length mismatch: got ${radius.length}, expected ${layers.length}`,
    );

  /** Apply different clipping radius to each layer in the WeightsContainer */
  const clipped = await Promise.all(
    layers.map(async (l, i) => {
      const norm = await frobeniusNorm(l);
      const r = radius[i];

      // Check the invalid radius value
      if (!Number.isFinite(r) || r <= 0)
        throw new Error("Invalid radius value");
      const scaling = Math.max(1, norm / r);
      return l.div(scaling);
    }),
  );

  return new WeightsContainer(clipped);
}

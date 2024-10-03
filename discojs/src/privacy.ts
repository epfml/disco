import * as tf from "@tensorflow/tfjs";

import type { WeightsContainer } from "./index.js";

async function frobeniusNorm(weights: WeightsContainer): Promise<number> {
  const squared = await weights
    .map((w) => w.square().sum())
    .reduce((a, b) => a.add(b))
    .data();
  if (squared.length !== 1) throw new Error("unexpected weights shape");

  return Math.sqrt(squared[0]);
}

/** Scramble weights */
export function addNoise(
  weights: WeightsContainer,
  deviation: number,
): WeightsContainer {
  const variance = Math.pow(deviation, 2);
  return weights.map((w) => w.add(tf.randomNormal(w.shape, 0, variance)));
}

/**
 * Keep weights' norm within radius
 *
 * @param radius maximum norm
 **/
export async function clipNorm(
  weights: WeightsContainer,
  radius: number,
): Promise<WeightsContainer> {
  if (radius <= 0) throw new Error("invalid radius");

  const norm = await frobeniusNorm(weights);
  const scaling = Math.max(1, norm / radius);

  return weights.map((w) => w.div(scaling));
}

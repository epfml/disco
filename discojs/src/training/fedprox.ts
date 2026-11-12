import * as tf from "@tensorflow/tfjs";
import type { WeightsContainer } from "#weights/index";

/**
 * Creates the FedProx proximal regularization function:
 * penalty(w) = 0.5 * mu * ||w - w_t||^2
 *
 * @param startingWeights The initial weights (w_t) at the start of the current round
 * @param mu The proximal regularization coefficient (defaults to 0.01)
 * @returns A regularizer function computing the scalar penalty from the current weights (w)
 */
export function getProximalRegularizer(
  startingWeights: WeightsContainer,
  mu = 0.01,
): (weights: WeightsContainer) => tf.Scalar {
  return (weights: WeightsContainer) => {
    return tf.tidy(() => {
      let penalty = tf.scalar(0);
      for (let i = 0; i < weights.weights.length; i++) {
        const diff = weights.weights[i].sub(startingWeights.weights[i]);
        penalty = penalty.add(diff.square().sum());
      }
      return penalty.mul(mu / 2).asScalar();
    });
  };
}

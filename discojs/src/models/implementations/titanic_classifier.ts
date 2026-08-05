import * as tf from "@tensorflow/tfjs";

import { TFJS } from "../index.js";

export function model() {
  const model = tf.sequential();

  model.add(
    tf.layers.dense({
      inputShape: [5],
      units: 124,
      activation: "relu",
      kernelInitializer: "leCunNormal",
    }),
  );
  model.add(tf.layers.dense({ units: 64, activation: "relu" }));
  model.add(tf.layers.dense({ units: 32, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

  model.compile({
    optimizer: "adam",
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });

  return new TFJS("tabular", model);
}

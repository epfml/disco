import * as tf from "@tensorflow/tfjs";

import { TFJS } from "#models/tfjs";

export function model() {
  // Architecture from the PyTorch MNIST example (I made it slightly smaller, 650kB instead of 5MB)
  // https://github.com/pytorch/examples/blob/main/mnist/main.py
  const model = tf.sequential();

  model.add(
    tf.layers.conv2d({
      inputShape: [28, 28, 3],
      kernelSize: 5,
      filters: 8,
      activation: "relu",
    }),
  );
  model.add(
    tf.layers.conv2d({ kernelSize: 5, filters: 16, activation: "relu" }),
  );
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
  model.add(tf.layers.dropout({ rate: 0.25 }));

  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 32, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.25 }));
  model.add(tf.layers.dense({ units: 10, activation: "softmax" }));

  model.compile({
    optimizer: "adam",
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  return new TFJS("image", model);
}

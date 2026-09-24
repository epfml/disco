import * as tf from "@tensorflow/tfjs";

import { TFJS } from "#models/tfjs";

export function model() {
  const seed = 42; // set a seed to ensure reproducibility during GDHF demo
  const imageHeight = 64;
  const imageWidth = 64;
  const imageChannels = 3;

  const model = tf.sequential();

  model.add(
    tf.layers.conv2d({
      inputShape: [imageHeight, imageWidth, imageChannels],
      kernelSize: 5,
      filters: 8,
      activation: "relu",
      kernelInitializer: tf.initializers.heNormal({ seed }),
    }),
  );
  model.add(
    tf.layers.conv2d({
      kernelSize: 5,
      filters: 16,
      activation: "relu",
      kernelInitializer: tf.initializers.heNormal({ seed }),
    }),
  );
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
  model.add(tf.layers.dropout({ rate: 0.25, seed }));

  model.add(tf.layers.flatten());
  model.add(
    tf.layers.dense({
      units: 32,
      activation: "relu",
      kernelInitializer: tf.initializers.heNormal({ seed }),
    }),
  );
  model.add(tf.layers.dropout({ rate: 0.25, seed }));
  model.add(
    tf.layers.dense({
      units: 2,
      activation: "softmax",
      kernelInitializer: tf.initializers.heNormal({ seed }),
    }),
  );

  model.compile({
    optimizer: tf.train.adam(0.0005),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  return new TFJS("image", model);
}

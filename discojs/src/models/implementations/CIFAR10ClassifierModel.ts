import * as tf from "@tensorflow/tfjs";

import { TFJS } from "#models/tfjs";

import baseModel from "#models/implementations/mobileNet_v1_025_224";

export async function getModel() {
  const mobilenet = await tf.loadLayersModel({
    load: async () => Promise.resolve(baseModel),
  });

  const x = mobilenet.getLayer("global_average_pooling2d_1");
  const predictions = tf.layers
    .dense({ units: 10, activation: "softmax", name: "denseModified" })
    .apply(x.output) as tf.SymbolicTensor;

  const model = tf.model({
    inputs: mobilenet.input,
    outputs: predictions,
    name: "modelModified",
  });

  // free the weights of the original classification head (conv_preds, ...)
  // which are not part of the new model
  const kept = new Set(model.layers);
  mobilenet.layers
    .filter((layer) => !kept.has(layer))
    .forEach((layer) => layer.dispose());

  model.compile({
    optimizer: "sgd",
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  return new TFJS("image", model);
}

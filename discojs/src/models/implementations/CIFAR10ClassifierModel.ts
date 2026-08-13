import * as tf from "@tensorflow/tfjs";

import { TFJS } from "../index.js";

import baseModel from "./mobileNet_v1_025_224.js";

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

  model.compile({
    optimizer: "sgd",
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  return new TFJS("image", model);
}

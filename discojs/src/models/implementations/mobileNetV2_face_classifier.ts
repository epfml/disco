import * as tf from "@tensorflow/tfjs";

import { TFJS } from "../index.js";
import baseModel from "./mobileNetV2_35_alpha_2_classes.js";

export async function getModel() {
  const model = await tf.loadLayersModel({
    load: async () => Promise.resolve(baseModel),
  });

  model.compile({
    optimizer: tf.train.sgd(0.001),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  return new TFJS("image", model);
}

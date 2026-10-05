import * as tf from "@tensorflow/tfjs";
import { describe, expect, it } from "vitest";

import { getModel } from "#models/implementations/CIFAR10ClassifierModel";

describe("CIFAR10 classifier model", () => {
  it("frees every tensor on dispose", async () => {
    const before = tf.memory().numTensors;

    const model = await getModel();
    model.dispose();

    expect(tf.memory().numTensors).to.equal(before);
  });
});

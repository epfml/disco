import * as tf from "@tensorflow/tfjs-node";
import { describe, expect, it } from "vitest";

import type { ModelCard } from "@epfml/discojs";
import { GPT } from "@epfml/discojs";

import { ModelSet } from "../src/model_set.js";

describe("model set", () => {
  it("doesn't keep the models built from cards", async () => {
    // Tensorflow.js itself leaks the optimizer's iteration count
    // inside tfjs-layers' LayersModel.save
    // so this test uses GPT-nano
    const card: ModelCard<"text"> = {
      card: { id: "test-gpt", name: "test GPT", dataType: "text" },
      getModel: () =>
        Promise.resolve(new GPT({ modelType: "gpt-nano", contextLength: 8 })),
    };
    const baseline = tf.memory().numTensors;

    const modelSet = new ModelSet();
    await modelSet.addModel(card);

    expect(modelSet.models.has(card.card.id)).to.be.true;
    expect(tf.memory().numTensors).to.equal(baseline);
  });
});

import * as tf from "@tensorflow/tfjs";
import { List } from "immutable";
import { describe, expect, it } from "vitest";

import { TFJS } from "#models/tfjs";
import { Dataset } from "#dataset/index";
import { WeightsContainer } from "#weights/index";
import { getProximalRegularizer } from "#training/fedprox";
import type { DataFormat } from "#types/index";

describe("FedProx proximal regularizer", () => {
  it("produces correct proximal regularization penalty", async () => {
    const startWeights = WeightsContainer.of([1.0, 3.0]);
    const currentWeights = WeightsContainer.of([2.0, 5.0]);

    // diff: [1.0, 2.0], sum of squares: 1^2 + 2^2 = 5.0
    // penalty: (mu / 2) * 5.0 = (2.0 / 2) * 5.0 = 5.0
    const regularizer = getProximalRegularizer(startWeights, 2.0);
    const penaltyTensor = regularizer(currentWeights);
    const penalty = (await penaltyTensor.data())[0];

    expect(penalty).to.be.closeTo(5.0, 1e-5);

    penaltyTensor.dispose();
    startWeights.dispose();
    currentWeights.dispose();
  });

  it("pulls weights towards starting weights during local training", async () => {
    // Simple linear model: y = w * x
    const createModel = () => {
      const model = tf.sequential();
      model.add(
        tf.layers.dense({
          units: 1,
          inputShape: [1],
          useBias: false,
          kernelInitializer: tf.initializers.constant({ value: 1.0 }),
        }),
      );
      model.compile({
        optimizer: tf.train.sgd(0.1),
        loss: "meanSquaredError",
        metrics: ["accuracy"],
      });
      return new TFJS("tabular", model);
    };

    // Dataset pushing weights away from 1.0 (towards 5.0)
    // x = 1, y = 5 -> data gradient pulls w from 1.0 towards 1.8
    const rawData: Array<DataFormat.ModelEncoded["tabular"]> = [
      [List([1.0]), 5.0],
    ];
    const dataset = new Dataset(rawData).batch(1);

    // 1. Train with standard FedAvg (no regularizer)
    const modelFedAvg = createModel();
    for await (const _ of modelFedAvg.train(dataset)) {
      // train
    }
    const fedAvgVal = (await modelFedAvg.weights.weights[0].data())[0];

    // 2. Train with FedProx regularizer anchored at 0.0 with mu = 2.0
    // Proximal term pulls weights backwards towards 0.0
    const modelFedProx = createModel();
    const anchorWeights = WeightsContainer.of([0.0]);
    const regularizer = getProximalRegularizer(anchorWeights, 2.0);
    for await (const _ of modelFedProx.train(dataset, undefined, {
      startingWeights: anchorWeights,
      regularizer,
    })) {
      // train
    }
    const fedProxVal = (await modelFedProx.weights.weights[0].data())[0];

    // FedAvg updates to 1.8; FedProx with mu=2.0 and anchor=0.0 pulls it back to 1.6
    expect(fedAvgVal).to.be.closeTo(1.8, 1e-5);
    expect(fedProxVal).to.be.closeTo(1.6, 1e-5);
    expect(fedProxVal).to.be.lessThan(fedAvgVal);

    anchorWeights.dispose();
    modelFedAvg.dispose();
    modelFedProx.dispose();
  });

  it("leaves no dangling tensors after FedProx batch execution", async () => {
    const rawModel = tf.sequential();
    rawModel.add(
      tf.layers.dense({
        units: 2,
        inputShape: [2],
        activation: "softmax",
      }),
    );
    rawModel.compile({
      optimizer: tf.train.sgd(0.1),
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"],
    });
    const model = new TFJS("tabular", rawModel);
    const startWeights = new WeightsContainer(
      model.weights.weights.map((w) => w.clone()),
    );

    const initialTensors = tf.memory().numTensors;

    const data: Array<DataFormat.ModelEncoded["tabular"]> = [
      [List([1, 2]), 1],
      [List([2, 3]), 0],
    ];
    const dataset = new Dataset(data).batch(2);

    const regularizer = getProximalRegularizer(startWeights, 0.1);

    for await (const _ of model.train(dataset, undefined, {
      startingWeights: startWeights,
      regularizer,
    })) {
      // train
    }

    expect(tf.memory().numTensors).to.equal(initialTensors);

    startWeights.dispose();
    model.dispose();
  });
});

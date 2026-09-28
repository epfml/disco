import * as tf from "@tensorflow/tfjs";
import { assert, describe, it } from "vitest";

import { WeightsContainer } from "#weights/index";

describe("weights container", () => {
  it("equals same weights within margin", async () => {
    const a = WeightsContainer.of([1, 2], [3]);
    const b = WeightsContainer.of([1.05, 2], [3]);

    assert.isTrue(await a.equals(a));
    assert.isFalse(await a.equals(b));
    assert.isTrue(await a.equals(b, 0.1));

    a.dispose();
    b.dispose();
  });

  it("doesn't equal containers of different sizes", async () => {
    const a = WeightsContainer.of([1], [2]);
    const b = WeightsContainer.of([1]);

    assert.isFalse(await a.equals(b));
    assert.isFalse(await b.equals(a));

    a.dispose();
    b.dispose();
  });

  it("doesn't equal weights of different shapes", async () => {
    // would be equal if broadcasted
    const a = WeightsContainer.of([1]);
    const b = WeightsContainer.of([1, 1, 1]);

    assert.isFalse(await a.equals(b));

    a.dispose();
    b.dispose();
  });

  it("equals does not leak tensors", async () => {
    const a = WeightsContainer.of([1, 2], [3]);
    const b = WeightsContainer.of([1, 2], [4]);

    const before = tf.memory().numTensors;
    await a.equals(b);
    await a.equals(a);
    assert.equal(tf.memory().numTensors, before);

    a.dispose();
    b.dispose();
  });

  it("reduce only keeps the result", async () => {
    const weights = WeightsContainer.of([1], [2], [3], [4]);

    const before = tf.memory().numTensors;
    const reduced = weights.reduce((acc, t) => acc.add(t));
    assert.equal(tf.memory().numTensors, before + 1);
    assert.deepEqual(Array.from(await reduced.data()), [10]);

    reduced.dispose();
    weights.dispose();
  });
});

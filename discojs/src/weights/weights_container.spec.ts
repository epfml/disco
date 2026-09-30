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

  it("map doesn't alias the weights", async () => {
    const weights = WeightsContainer.of([1], [2]);
    const expected = WeightsContainer.of([1], [2]);

    const before = tf.memory().numTensors;
    const mapped = weights.map((t) => t);
    mapped.dispose();
    assert.equal(tf.memory().numTensors, before);

    assert.isFalse(weights.weights.some((t) => t.isDisposed));
    assert.isTrue(await weights.equals(expected));

    weights.dispose();
    expected.dispose();
  });

  it("mapWith doesn't alias the weights", () => {
    const a = WeightsContainer.of([1], [2]);
    const b = WeightsContainer.of([3], [4]);

    const before = tf.memory().numTensors;
    a.mapWith(b, (w) => w).dispose();
    a.mapWith(b, (_, w) => w).dispose();
    assert.equal(tf.memory().numTensors, before);

    assert.isFalse(a.weights.some((t) => t.isDisposed));
    assert.isFalse(b.weights.some((t) => t.isDisposed));

    a.dispose();
    b.dispose();
  });

  it("reduce doesn't alias the weights", async () => {
    const single = WeightsContainer.of([1]);
    const weights = WeightsContainer.of([1], [2]);

    const before = tf.memory().numTensors;
    const reducedSingle = single.reduce((acc, t) => acc.add(t));
    const reducedFirst = weights.reduce((acc) => acc);
    assert.equal(tf.memory().numTensors, before + 2);
    assert.deepEqual(Array.from(await reducedSingle.data()), [1]);
    assert.deepEqual(Array.from(await reducedFirst.data()), [1]);

    reducedSingle.dispose();
    reducedFirst.dispose();
    assert.equal(tf.memory().numTensors, before);
    assert.isFalse(single.weights.some((t) => t.isDisposed));
    assert.isFalse(weights.weights.some((t) => t.isDisposed));

    single.dispose();
    weights.dispose();
  });

  it("concat doesn't alias the weights", async () => {
    const a = WeightsContainer.of([1]);
    const b = WeightsContainer.of([2], [3]);
    const expected = WeightsContainer.of([1], [2], [3]);

    const before = tf.memory().numTensors;
    const concatenated = a.concat(b);
    assert.isTrue(await concatenated.equals(expected));
    concatenated.dispose();
    assert.equal(tf.memory().numTensors, before);

    assert.isFalse(a.weights.some((t) => t.isDisposed));
    assert.isFalse(b.weights.some((t) => t.isDisposed));

    a.dispose();
    b.dispose();
    expected.dispose();
  });
});

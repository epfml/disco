import * as tf from "@tensorflow/tfjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CausalSelfAttentionConfig, MLPConfig } from "./layers.js";
import {
  CausalSelfAttention,
  GELU,
  LMEmbedding,
  MLP,
  Range,
} from "./layers.js";

describe("GPT Layers", () => {
  // GELU Layer tests
  describe("GELU Layer", () => {
    afterEach(() => {
      // Dispose of variables to avoid name collisions in subsequent tests.
      tf.disposeVariables();
    });

    it("should compute GELU activation correctly for known inputs", async () => {
      const geluLayer = new GELU();

      const input = tf.tensor1d([0, 1, -1, 2, -2]);

      const output = geluLayer.apply(input) as tf.Tensor;
      const outputData = await output.data();

      // expected values based on the GELU tanh approximation
      const expected: number[] = [0, 0.8412, -0.1588, 1.955, -0.045];

      for (let i = 0; i < expected.length; i++) {
        expect(outputData[i]).to.be.closeTo(expected[i], 0.05);
      }
    });
  });

  // LMEmbedding Layer tests
  describe("LMEmbedding Layer", () => {
    it("should return token embeddings with shape [batch_size, sequence_length, nEmbd] for 2D input", () => {
      const vocabSize = 100;
      const nEmbd = 16;
      const seed = 42;

      const lmEmbedding = new LMEmbedding(vocabSize, nEmbd, seed);

      // dummy 2D input representing token indices: shape [batch_size, sequence_length]
      const tokenIndices = tf.randomUniformInt([2, 5], 0, 1);

      const output = lmEmbedding.apply(tokenIndices) as tf.Tensor;

      // expected output shape for 2D input: [2, 5, nEmbd]
      expect(output.shape).to.deep.equal([2, 5, nEmbd]);
    });

    it("should work for 2D & 3D inputs", () => {
      const vocabSize = 100;
      const nEmbd = 16;
      const seed = 42;

      const lmEmbedding = new LMEmbedding(vocabSize, nEmbd, seed);

      const tokenIndices = tf.randomUniformInt([2, 5], 0, 1);
      const embeddingsInput = tf.randomUniform([2, 5, nEmbd]);
      const outputForToken = lmEmbedding.apply(tokenIndices) as tf.Tensor;
      const outputForEmbedding = lmEmbedding.apply(
        embeddingsInput,
      ) as tf.Tensor;

      expect(outputForToken.shape).to.deep.equal([2, 5, nEmbd]);
      expect(outputForEmbedding.shape).to.deep.equal([2, 5, vocabSize]);
    });

    it("should throw appropriate errors for invalid input shapes", () => {
      const vocabSize = 100;
      const nEmbd = 16;
      const seed = 42;
      const lmEmbedding = new LMEmbedding(vocabSize, nEmbd, seed);

      // Case 1: 1D tensor input
      const invalidInput = tf.tensor1d([1, 2, 3], "int32");
      expect(() => lmEmbedding.apply(invalidInput)).to.throw(
        "unexpected input shape",
      );

      // Case 2: array with more than one tensor
      const input1 = tf.tensor2d([[1, 2, 3]], [1, 3], "int32");
      const input2 = tf.tensor2d([[4, 5, 6]], [1, 3], "int32");
      expect(() => lmEmbedding.apply([input1, input2])).to.throw(
        "expected exactly one tensor",
      );
    });

    it("should compute correct output shape for 2D input using computeOutputShape", () => {
      const vocabSize = 100;
      const nEmbd = 16;
      const seed = 42;
      const lmEmbedding = new LMEmbedding(vocabSize, nEmbd, seed);
      const outputShape = lmEmbedding.computeOutputShape([null, null]);
      expect(outputShape).to.deep.equal([null, null, nEmbd]);
    });
  });

  // Range Layer tests
  describe("Range Layer", () => {
    afterEach(() => {
      // dispose any created tensors/variables
      tf.disposeVariables();
    });

    it("should output a tensor with shape [1, T] for an input of shape [batch, T]", async () => {
      const rangeLayer = new Range();

      // dummy input tensor with shape [batch, T]
      const dummyInput = tf.zeros([3, 10], "int32");

      const output = rangeLayer.apply(dummyInput) as tf.Tensor;

      // We expect the output to have shape [1, T] i.e. [1, 10]
      expect(output.shape).to.deep.equal([1, 10]);

      // verify the content: the layer should output a range [0, 1, ..., T-1]
      expect(await output.data()).to.deep.equal(
        Int32Array.of(0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
      );
    });
  });

  // MLP Layer tests
  describe("MLP Layer", () => {
    it("should produce deterministic/non-NaN outputs with the same random seed", async () => {
      // an MLP config with a fixed seed
      const config: MLPConfig = {
        name: "testMLP",
        contextLength: 10,
        residDrop: 0, // no dropout for deterministic behavior
        nLayer: 2,
        seed: 42,
        nEmbd: 16,
        nHead: 4,
      };

      // two separate MLP model instances using the same config
      const model1 = MLP(config);
      const model2 = MLP(config);

      const input = tf.ones([1, config.contextLength, config.nEmbd]);

      // get predictions from both models
      const output1 = model1.predict(input) as tf.Tensor;
      const output2 = model2.predict(input) as tf.Tensor;

      const arr1 = await output1.data();
      const arr2 = await output2.data();

      // check that the models produce the same output
      expect(arr1).to.deep.equal(arr2);

      // Check that there are no NaN values in the outputs.
      for (const v of arr1) {
        expect(v).to.not.be.NaN;
      }
      for (const v of arr2) {
        expect(v).to.not.be.NaN;
      }
    });
  });

  // CausalSelfAttention Layer tests
  describe("CausalSelfAttention Helper Methods", () => {
    const config: CausalSelfAttentionConfig = {
      name: "testCSA",
      contextLength: 5,
      nHead: 2,
      nEmbd: 8, // divisible by nHead, so head size = 4
      attnDrop: 0.0, // no dropout for deterministic tests
      residDrop: 0.0,
      nLayer: 2,
      seed: 42,
    };

    let csa: CausalSelfAttention;

    // new instance of CausalSelfAttention before each test
    beforeEach(() => {
      csa = new CausalSelfAttention(config);
      // dummy input has shape [batch, T, nEmbd] = [1, contextLength, nEmbd].
      const dummyInput = tf.zeros(
        [1, config.contextLength, config.nEmbd],
        "float32",
      );
      csa.apply(dummyInput);
    });

    afterEach(() => {
      tf.disposeVariables();
    });

    describe("splitHeads", () => {
      it("should reshape and transpose the input correctly", () => {
        const B = 2;
        const T = 6;
        const totalChannels = config.nEmbd; // 8 channels
        // input tensor with shape [B, T, totalChannels]
        const input = tf.ones([B, T, totalChannels]);
        const output = csa.splitHeads(input, B, T, config.nHead);
        // expected shape: [B, nHead, T, totalChannels/nHead] = [2, 2, 6, 4]
        expect(output.shape).to.deep.equal([
          B,
          config.nHead,
          T,
          totalChannels / config.nHead,
        ]);
      });
    });

    describe("applyCausalMask", () => {
      it("should produce a causal mask that sets upper-triangular positions to -1e9", async () => {
        const T = config.contextLength;
        // dummy attention logits tensor with shape [1, 1, T, T] filled with zeros
        const att = tf.zeros([1, 1, T, T], "float32");
        const masked = csa.applyCausalMask(att, T);
        const data = await masked.data();
        // for each position (i,j): if j > i expect -1e9 else 0
        const expected = [
          [0, 1, 1, 1, 1],
          [0, 0, 1, 1, 1],
          [0, 0, 0, 1, 1],
          [0, 0, 0, 0, 1],
          [0, 0, 0, 0, 0],
        ]
          .flat()
          .map((v) => (v === 0 ? 0 : -1e9));

        expect(Array.from(data)).to.deep.equal(expected);
      });
    });

    describe("computeAttention", () => {
      it("should output attention weights that sum to 1 over the last dimension", async () => {
        const B = 1;
        const nHead = config.nHead;
        const T = config.contextLength;
        const headSize = config.nEmbd / config.nHead;
        const q = tf.randomUniform([B, nHead, T, headSize]);
        const k = tf.randomUniform([B, nHead, T, headSize]);
        const att = csa.computeAttention(q, k, false, T);
        // expected shape: [B, nHead, T, T]
        expect(att.shape).to.deep.equal([B, nHead, T, T]);
        // check that each row of the attention logits (last dimension) sums to approximately 1
        for (const rowSum of await att.sum(-1).data()) {
          expect(rowSum).to.be.closeTo(1, 1e-3);
        }
      });
    });
  });
});

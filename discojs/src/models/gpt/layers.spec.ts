import * as tf from '@tensorflow/tfjs';
import { expect } from 'chai';
import { GELU, LMEmbedding } from './layers.js';

describe('GPT Layers', function () {
  // GELU Layer tests
  describe('GELU Layer', function () {

    afterEach(() => {
      // Dispose of variables to avoid name collisions in subsequent tests.
      tf.disposeVariables();
    });

    it('should compute GELU activation correctly for known inputs', async function () {
      const geluLayer = new GELU();

      const input: tf.Tensor1D = tf.tensor1d([0, 1, -1, 2, -2]);

      const output = geluLayer.apply(input) as tf.Tensor;
      const outputData: Float32Array = await output.data() as Float32Array;

      // expected values based on the GELU tanh approximation
      const expected: number[] = [0, 0.8415, -0.1585, 1.955, -0.046];

      for (let i = 0; i < expected.length; i++) {
        expect(outputData[i]).to.be.closeTo(expected[i], 0.05);
      }
    });
  });

  // LMEmbedding Layer tests
  describe('LMEmbedding Layer', function () {

    it('should return token embeddings with shape [batch_size, sequence_length, nEmbd] for 2D input', function () {
      const vocabSize = 100;
      const nEmbd = 16;
      const seed = 42;

      const lmEmbedding = new LMEmbedding(vocabSize, nEmbd, seed);
      
      // dummy 2D input representing token indices: shape [batch_size, sequence_length]
      const tokenIndices = tf.tensor2d([[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]], [2, 5], 'int32');

      const output = lmEmbedding.apply(tokenIndices) as tf.Tensor;

      // expected output shape for 2D input: [2, 5, nEmbd]
      expect(output.shape).to.deep.equal([2, 5, nEmbd]);
    });

    it('should return token logits with shape [batch_size, sequence_length, vocabSize] for 3D input', function () {
      const vocabSize = 100;
      const nEmbd = 16;
      const seed = 42;

      const lmEmbedding = new LMEmbedding(vocabSize, nEmbd, seed);

      // dummy 3D input representing a batch of embeddings: shape [batch_size, sequence_length, nEmbd]
      const embeddingsInput = tf.randomUniform([2, 5, nEmbd]);

      const output = lmEmbedding.apply(embeddingsInput) as tf.Tensor;

      // expected output shape for 3D input: [2, 5, vocabSize]
      expect(output.shape).to.deep.equal([2, 5, vocabSize]);
    });

    it('should throw an error for unexpected input shape', function () {
      const vocabSize = 100;
      const nEmbd = 16;
      const seed = 42;

      const lmEmbedding = new LMEmbedding(vocabSize, nEmbd, seed);

      // invalid input tensor with 1D shape.
      const invalidInput = tf.tensor1d([1, 2, 3], 'int32');

      expect(() => lmEmbedding.apply(invalidInput)).to.throw('unexpected input shape');
    });

    it('should throw an error if input is an array with more than one tensor', function () {
      const vocabSize = 100;
      const nEmbd = 16;
      const seed = 42;
      const lmEmbedding = new LMEmbedding(vocabSize, nEmbd, seed);
      const input1 = tf.tensor2d([[1, 2, 3]], [1, 3], 'int32');
      const input2 = tf.tensor2d([[4, 5, 6]], [1, 3], 'int32');
      expect(() => lmEmbedding.apply([input1, input2])).to.throw('expected exactly one tensor');
    });

    it('should compute correct output shape for 2D input using computeOutputShape', function () {
      const vocabSize = 100;
      const nEmbd = 16;
      const seed = 42;
      const lmEmbedding = new LMEmbedding(vocabSize, nEmbd, seed);
      const outputShape = lmEmbedding.computeOutputShape([null, null]);
      expect(outputShape).to.deep.equal([null, null, nEmbd]);
    });

  });
});

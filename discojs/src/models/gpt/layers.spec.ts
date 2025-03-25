import * as tf from '@tensorflow/tfjs';
import { expect } from 'chai';
import { GELU, LMEmbedding, Range, MLP, MLPConfig, CausalSelfAttention, CausalSelfAttentionConfig } from './layers.js';

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
      const expected: number[] = [0, 0.8412, -0.1588, 1.955, -0.045];

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

  // Range Layer tests
  describe('Range Layer', function () {  

    afterEach(() => {
      // dispose any created tensors/variables
      tf.disposeVariables();
    });
  
    it('should output a tensor with shape [1, T] for an input of shape [batch, T]', async function () {
      const rangeLayer = new Range();
  
      // dummy input tensor with shape [batch, T]
      const dummyInput = tf.zeros([3, 10], 'int32');
  
      const output = rangeLayer.apply(dummyInput) as tf.Tensor;
  
      // We expect the output to have shape [1, T] i.e. [1, 10]
      expect(output.shape).to.deep.equal([1, 10]);
  
      // verify the content: the layer should output a range [0, 1, ..., T-1]
      const outputData = await output.data();
      for (let i = 0; i < 10; i++) {
        expect(outputData[i]).to.equal(i);
      }
    });
  });

  // MLP Layer tests
  describe('MLP Layer', function () {  

    it('should produce deterministic outputs with the same random seed', async function () {
      // an MLP config with a fixed seed
      const config: MLPConfig = {
        name: 'testMLP',
        contextLength: 10,
        residDrop: 0,  // no dropout for deterministic behavior
        nLayer: 2,
        seed: 42,
        nEmbd: 16,
        nHead: 4
      };
  
      // two separate MLP model instances using the same config
      const model1 = MLP(config);
      const model2 = MLP(config);

      //TODO: check if there are NANs
  
      const input = tf.ones([1, config.contextLength, config.nEmbd]);
  
      // get predictions from both models
      const output1 = model1.predict(input) as tf.Tensor;
      const output2 = model2.predict(input) as tf.Tensor;
  
      const arr1 = await output1.data();
      const arr2 = await output2.data();
  
      // check lengths are equal
      expect(arr1.length).to.equal(arr2.length);
  
      // check that the models produce the same output
      expect(arr1).to.deep.equal(arr2);
      
    });
  });

  // CausalSelfAttention Layer tests
  describe('CausalSelfAttention Helper Methods', function () {
  
    const config: CausalSelfAttentionConfig = {
      name: 'testCSA',
      contextLength: 5,
      nHead: 2,
      nEmbd: 8,          // divisible by nHead, so head size = 4
      dropout: 0.0,      // no dropout for deterministic tests
      nLayer: 2,
      seed: 42
    };
  
    let csa: CausalSelfAttention;
  
    // new instance of CausalSelfAttention before each test
    beforeEach(() => {
      csa = new CausalSelfAttention(config);
      // dummy input has shape [batch, T, nEmbd] = [1, contextLength, nEmbd].
      const dummyInput = tf.zeros([1, config.contextLength, config.nEmbd], 'float32');
      csa.apply(dummyInput);
    });
  
    afterEach(() => {
      tf.disposeVariables();
    });
  
    // describe('_dense', function () {
    //   it('should compute x * kernel + bias correctly using addWeight', async function () {
    //     const x = tf.tensor2d([[1, 2]], [1, 2]);
    //     const kernel = csa.addWeight(
    //       'dense_test_kernel',
    //       [2, 2],
    //       'float32',
    //       tf.initializers.constant({ value: [[1, 0], [0, 1]] })
    //     ) as tf.layers.LayerVariable;
    //     const bias = csa.addWeight(
    //       'dense_test_bias',
    //       [2],
    //       'float32',
    //       tf.initializers.constant({ value: [0.5, -0.5] })
    //     ) as tf.layers.LayerVariable;
  
    //     const output = csa._dense(x, kernel, bias);
    //     const outData = await output.data();
    //     // Expected calculation:
    //     // [1,2] dot [[1,0],[0,1]] = [1,2] and then add bias [0.5, -0.5] gives [1.5, 1.5]
    //     expect(Array.from(outData)).to.deep.equal([1.5, 1.5]);
    //   });
    // });
  
    describe('splitHeads', function () {
      it('should reshape and transpose the input correctly', function () {
        const B = 2;
        const T = 6;
        const totalChannels = config.nEmbd; // 8 channels
        // input tensor with shape [B, T, totalChannels]
        const input = tf.tensor3d(new Array(B * T * totalChannels).fill(1), [B, T, totalChannels]);
        const output = csa.splitHeads(input, B, T, config.nHead);
        // expected shape: [B, nHead, T, totalChannels/nHead] = [2, 2, 6, 4]
        expect(output.shape).to.deep.equal([B, config.nHead, T, totalChannels / config.nHead]);
      });
    });
  
    describe('applyCausalMask', function () {
      it('should produce a causal mask that sets upper-triangular positions to -1e9', async function () {
        const T = config.contextLength;
        // dummy attention logits tensor with shape [1, 1, T, T] filled with zeros
        const att = tf.zeros([1, 1, T, T], 'float32');
        const masked = csa.applyCausalMask(att, T);
        const data = await masked.data();
        // for each position (i,j): if j > i expect -1e9 else 0
        const expected: number[] = [];
        for (let i = 0; i < T; i++) {
          for (let j = 0; j < T; j++) {
            expected.push(j > i ? -1e9 : 0);
          }
        }
        expect(Array.from(data)).to.deep.equal(expected);
      });
    });
  
    describe('computeAttention', function () {
      it('should output attention weights that sum to 1 over the last dimension', async function () {
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
        const attData = await att.data();
        const attArray = Array.from(attData);
        for (let b = 0; b < B; b++) {
          for (let h = 0; h < nHead; h++) {
            for (let i = 0; i < T; i++) {
              // calculate the starting index for the i-th row in the flattened tensor
              const rowStart = b * nHead * T * T + h * T * T + i * T;
              const row = attArray.slice(rowStart, rowStart + T);
              const rowSum = row.reduce((sum, val) => sum + val, 0);
              expect(rowSum).to.be.closeTo(1, 1e-3);
            }
          }
        }
      });
    });
  
    // describe('_projectOutput', function () {
    //   it('should project the input correctly using dense operation with addWeight', async function () {
    //     const x = tf.tensor2d([[1, 2, 3]], [1, 3]);
    //     const projKernel = csa.addWeight(
    //       'project_test_kernel',
    //       [3, 2],
    //       'float32',
    //       tf.initializers.constant({ value: [[1, 0], [0, 1], [1, -1]] })
    //     ) as tf.layers.LayerVariable;
    //     const projBias = csa.addWeight(
    //       'project_test_bias',
    //       [2],
    //       'float32',
    //       tf.initializers.constant({ value: [0.5, 0.5] })
    //     ) as tf.layers.LayerVariable;
  
    //     const output = csa._projectOutput(x, projKernel, projBias);
    //     const data = await output.data();
    //     // Calculation:
    //     // [1,2,3] dot kernel = [1*1+2*0+3*1, 1*0+2*1+3*(-1)] = [4, -1]
    //     // Then add bias [0.5, 0.5] = [4.5, -0.5]
    //     expect(Array.from(data)).to.deep.equal([4.5, -0.5]);
    //   });
    // });
  });
  
});

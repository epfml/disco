import { expect } from 'chai'
import * as tf from '@tensorflow/tfjs-node'
import { AutoTokenizer } from '@xenova/transformers';
import { GPT } from './index.js'
import { type GPTConfig } from './config.js'

describe('gpt-tfjs', function() {
  const data = "Lorem ipsum dolor sit"

  const config: GPTConfig = {
    modelType: 'gpt-nano',
    lr: 0.01,
    maxIter: 10,
    evaluateEvery:10,
    maxEvalBatches: 10,
    blockSize: 8,
    vocabSize: 50258
  }
  
  it('can overfit one sentence', async function() {
    this.timeout("2m")

    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/gpt2')
    const datasetSource = new tf.data.FileDataSource(Buffer.from(data))
    const textDataset = new tf.data.TextLineDataset(datasetSource)
    const tokenDataset = textDataset.map((text: string) => {
      const { input_ids: tokens } = tokenizer(text, {
          padding: true,
          truncation: true,
          return_tensor: false,
          max_length: config.blockSize + 1,
      }) as { input_ids: number[] }
      const ys = tf.oneHot(tokens.slice(1), tokenizer.model.vocab.length + 1)
      const xs = tf.tensor(tokens.slice(0, config.blockSize), undefined, 'int32')
      return {xs, ys}
    }).repeat().batch(64) as tf.data.Dataset<{ xs: tf.Tensor2D, ys: tf.Tensor3D }>

    const model = new GPT(config)
    const logGenerator = model.train(tokenDataset, undefined, 5) // 5 epochs
    for await (const _ of logGenerator); // Await the end of training
    const generation = await model.generate("Lorem ipsum dolor", tokenizer, 1)
    expect(generation).equal(data) // Assert that the model completes 'Lorem ipsum dolor' with 'sit' 
  })
})

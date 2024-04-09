import { expect } from 'chai'
import * as tf from '@tensorflow/tfjs-node'
import { AutoTokenizer } from '@xenova/transformers';
import { GPT } from './index.js'

describe('gpt-tfjs', function() {
  this.timeout(30_000)
  const data = "Lorem ipsum dolor sit"
  
  it('can overfit one sentence', async () => {
    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/gpt2')
    const datasetSource = new tf.data.FileDataSource(Buffer.from(data))
    const textDataset = new tf.data.TextLineDataset(datasetSource)
    const tokenDataset = textDataset.map((text: string) => {
      const sequenceLength = 8
      const { input_ids: tokens } = tokenizer(text, {
          padding: true,
          truncation: true,
          return_tensor: false,
          max_length: sequenceLength + 1,
      })
      const ys = tf.oneHot(tokens.slice([1]), tokenizer.model.vocab.length + 1)
      const xs = tf.tensor(tokens.slice([0], sequenceLength), undefined, 'int32')
      return {xs, ys}
    }).repeat().batch(64)
    const model = new GPT()
    const logGenerator = model.train(tokenDataset, undefined, 5)
    for await (const logs of logGenerator); // Await the end of training
    const generation = await model.generate("Lorem ipsum dolor", tokenizer, 1)
    console.log(generation)
    expect(generation).equal(data) // Assert that the model completes 'Lorem ipsum dolor' with 'sit' 
  })
})
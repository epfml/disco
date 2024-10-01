import { TEXT_PREPROCESSING } from './index.js'
import { expect } from 'chai'    

import type { Task } from '../../../index.js'
import * as tf from '@tensorflow/tfjs'

describe('text preprocessing', function () {
  const [tokenize, leftPadding] = TEXT_PREPROCESSING
  // Use a function to create different task object for each test (otherwise the tokenizer gets cached)
  function initMockTask(): Task {
    return {
      id: 'mock-task-id',
      displayInformation: {
      taskTitle: 'mock title',
      summary: { overview: '', preview: '' }
    },
      trainingInformation: {
        epochs: 1,
        roundDuration: 1,
        validationSplit: 0,
        batchSize: 8,
        scheme: 'local',
        minNbOfParticipants: 1,
        dataType: 'text',
        tokenizer: 'Xenova/gpt2',
        tensorBackend: 'gpt'
      }}
    }
    
  const text = "Hello world, a bc 1 2345, '? 976. Wikipedia is a free content online encyclopedia written and maintained by a community \n of volunteers, known as Wikipedians. Founded by Jimmy Wales and Larry Sanger on January 15, 2001, Wikipedia is hosted by the Wikimedia Foundation, an American nonprofit organization that employs a staff of over 700 people.[7]"
  const expectedTokens = [15496, 995, 11, 257, 47125, 352, 2242, 2231, 11, 705, 30, 860, 4304, 13, 15312, 318, 257, 1479, 2695, 2691, 45352, 3194, 290, 9456, 416, 257, 2055, 220, 198, 286, 11661, 11, 1900, 355, 11145, 46647, 1547, 13, 4062, 276, 416, 12963, 11769, 290, 13633, 311, 2564, 319, 3269, 1315, 11, 5878, 11, 15312, 318, 12007, 416, 262, 44877, 5693, 11, 281, 1605, 15346, 4009, 326, 24803, 257, 3085, 286, 625, 13037, 661, 3693, 22, 60]

  it('can tokenize text', async () => {
    const { tokens } = await tokenize.apply(Promise.resolve(text), initMockTask()) as { tokens: number[]}
    expect(tokens).to.be.deep.equal(expectedTokens)
  }).timeout(4000)

  it('can truncate inputs when tokenizing', async () => {
    const truncationTask = initMockTask()
    truncationTask.trainingInformation.maxSequenceLength = 10
    const { tokens } = await tokenize.apply(Promise.resolve(text), truncationTask) as { tokens: number[] }
    const expectedLength = truncationTask.trainingInformation.maxSequenceLength + 1 // + 1 because tokenization includes an extra token label for next label prediction
    expect(tokens.length).to.be.equal(expectedLength)
    expect(tokens).to.be.deep.equal(expectedTokens.slice(0, expectedLength))
  }).timeout(4000)

  it('can left pad tokens', async () => {
    // Create a task where output token sequence should all have length 20
    const paddingTask = initMockTask()
    paddingTask.trainingInformation.maxSequenceLength = 20
    
    // Create a token sequence of length 10
    const tokens = { tokens: [0,1,2,3,4,5,6,7,8,9] }
    const { xs, ys } = await leftPadding.apply(Promise.resolve(tokens), paddingTask) as { xs: tf.Tensor1D, ys: tf.Tensor2D }
    const xsArray = await xs.array()
    const ysArray = await ys.array()
    
    // Output sequences should have shape (20) and (20, 50257), 50257 being the size of the vocab for gpt2
    expect(xsArray.length).to.be.equal(paddingTask.trainingInformation.maxSequenceLength)
    expect(ysArray.length).to.be.equal(paddingTask.trainingInformation.maxSequenceLength)
    expect(ysArray[0].length).to.be.equal(50257)

    // xs should be left pad with gpt2's padding token 50256 to be of length 20.
    // We expect the last token of input token sequence (9) to not be included in xs since it doesn't have a next token to be predicted
    const paddingToken = 50256
    const expectedXs = Array.from({length:11}).map(_ => paddingToken).concat(tokens.tokens.slice(0,9))
    expect(xsArray).to.be.deep.equal(expectedXs)

    // ys should be a one hot encoding of the next token in xs
    // if the input tokens are [0,1,2,3] then the labels are [1,2,3] which are then one-hot encoded
    // So the sum of each row should be equal to 1
    const expectedOneHot = Array.from({ length: 20 }).map(_ => 1)
    expect(await ys.sum(-1).array()).to.be.deep.equal(expectedOneHot)
    
    // In each row, the index of the 1 should be the token id
    const expectedYs = Array.from({length:10}).map(_ => paddingToken).concat(tokens.tokens)
    expect(await ys.argMax(-1).array()).to.be.deep.equal(expectedYs)
  })

  it('throws an error if no tokenizer is specified', async () => {
    const invalidTask = initMockTask()
    invalidTask.trainingInformation.tokenizer = undefined;
    try {
      await tokenize.apply(Promise.resolve("input text doesn't matter"), invalidTask)
    } catch {
      return
    }
    throw new Error("undefined tokenizer should have thrown an error")
  })
  it('throws an error if the tokenizer name is invalid', async () => {
    const invalidTask = initMockTask()
    invalidTask['trainingInformation']['tokenizer'] = 'invalid-tokenizer-name'
    try {
      await tokenize.apply(Promise.resolve("input text doesn't matter"), invalidTask)
    } catch {
      return
    }
    throw new Error("invalid tokenizer name should have thrown an error")
  })
  
})

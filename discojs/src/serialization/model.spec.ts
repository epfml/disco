import { assert, expect } from 'chai'
import * as tf from '@tensorflow/tfjs'

import type { DataType, Model } from "../index.js";
import type { GPTConfig } from '../models/index.js'
import { serialization, models } from '../index.js'

async function getRawWeights(
  model: Model<DataType>,
): Promise<Array<[number, Float32Array]>> {
  return Array.from(
    (await Promise.all(
      model.weights.weights.map(async (w) => await w.data<'float32'>()))
    ).entries()
  )
}

describe('serialization', () => {
  it('can encode & decode a TFJS model', async function () {
    const rawModel = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [32, 32, 3],
          kernelSize: 3,
          filters: 16,
          activation: 'relu'
        })
      ]
    })
    rawModel.compile({ optimizer: 'sgd', loss: 'hinge' })
    const model = new models.TFJS("image", rawModel)

    const encoded = await serialization.model.encode(model)
    assert.isTrue(serialization.model.isEncoded(encoded))
    const decoded = await serialization.model.decode(encoded)

    expect(decoded).to.be.an.instanceof(models.TFJS);
    expect((decoded as models.TFJS<DataType>).datatype).to.equal("image")
    assert.sameDeepOrderedMembers(
      await getRawWeights(model),
      await getRawWeights(decoded)
    )
  })

  it("can encode & decode a gpt-tfjs model", async () => {
    const config: GPTConfig = {
      modelType: 'gpt-nano',
      lr: 0.01,
      maxIter: 10,
      evaluateEvery:10,
      maxEvalBatches: 10,
      blockSize: 8,
      vocabSize: 50258
    }
    const model = new models.GPT(config)

    const encoded = await serialization.model.encode(model)
    assert.isTrue(serialization.model.isEncoded(encoded))
    const decoded = await serialization.model.decode(encoded)
    
    assert.instanceOf(decoded, models.GPT)

    assert.sameDeepOrderedMembers(
      await getRawWeights(model),
      await getRawWeights(decoded)
    )
    assert.deepEqual(
      model.config,
      (decoded as models.GPT).config
    )
  }).timeout("20s")
})

/**
 * this code is taken from gpt-tfjs with modifications from @peacefulotter and @lukemovement
 **/

import tf from '@tensorflow/tfjs'

import { WeightsContainer } from '../..'
import type { Dataset } from '../../dataset'
import { Sink } from '../../utils/event_emitter'

import type { EpochLogs, Prediction, Sample } from '../model'
import { Model } from '../model'

import { GPTLMHeadModel } from './model'

// TODO too big config
interface Config {
  modelType: 'gpt-nano'
  epochs: number // TODO mv to Task
  maxIter: number
  batchSize: number
  blockSize: number
  lr: number
  vocabSize: number
  maxEvalBatches: number
}

export class GPT extends Model {
  private readonly model: GPTLMHeadModel

  private static readonly batchSize = 4
  private static readonly blockSize = 128
  private static readonly vocabSize = 50258

  constructor () {
    super()

    // TODO sensible defaults?
    const config: Config = {
      modelType: 'gpt-nano',
      epochs: 1,
      maxIter: 2,
      batchSize: GPT.batchSize,
      blockSize: GPT.blockSize,
      lr: 0.001,
      vocabSize: GPT.vocabSize,
      maxEvalBatches: 1
    }

    this.model = new GPTLMHeadModel(config)
  }

  override get weights (): WeightsContainer {
    return new WeightsContainer(this.model.weights.map((w) => w.read()))
  }

  override set weights (ws: WeightsContainer) {
    this.model.setWeights(ws.weights)
  }

  // takes a stream of two bytes followed by a token ID
  private convertCharDataset (dataset: Dataset): tf.data.Dataset<{ xs: tf.Tensor2D, ys: tf.Tensor3D }> {
    const batchSize = 4
    const sampleSize = GPT.blockSize + 1
    const chunkSize = sampleSize * batchSize * 2

    function toUInt16 (low: number, high: number): number {
      low &= 0xff
      high &= 0xff
      return (high << 8) | low
    }

    // TODO add support for small last batch
    return dataset.batch(chunkSize, false).mapAsync(async (chunk) => {
      if (!(chunk instanceof tf.Tensor)) {
        throw new Error('chunk is not a Tensor')
      }
      if (chunk.shape.length !== 2 || chunk.shape[1] !== 1) {
        throw new Error('dataset is not a only char')
      }

      const buffer = await chunk.buffer()

      const xs = tf.buffer<tf.Rank.R2, 'int32'>([batchSize, GPT.blockSize], 'int32')
      const ys = tf.buffer<tf.Rank.R3, 'int32'>([batchSize, GPT.blockSize, GPT.vocabSize], 'int32')

      for (let i = 0; i < batchSize; i++) {
        for (let j = 0; j < sampleSize; j++) {
          const idx = (i * sampleSize + j) * 2
          const low = buffer.get(idx)
          const high = buffer.get(idx + 1)
          const token = toUInt16(low, high)
          if (j < sampleSize - 1) xs.set(token, i, j)
          if (j > 0) ys.set(1, i, j - 1, token)
        }
      }

      return { xs: xs.toTensor(), ys: ys.toTensor() }
    })
  }

  override async * train (
    trainingData: Dataset,
    validationData?: Dataset,
    epochs = 1,
    tracker = new Sink()
  ): AsyncGenerator<EpochLogs, void> {
    for (let i = 0; i < epochs; i++) {
      let logs: tf.Logs | undefined

      await this.model.fitDataset(
        this.convertCharDataset(trainingData), {
          epochs: 1,
          validationData: validationData !== undefined ? this.convertCharDataset(validationData) : validationData,
          callbacks: {
            onEpochEnd: (_, cur) => { logs = cur },
            onBatchBegin: () => { tracker.emit('batchBegin', undefined) },
            onBatchEnd: () => { tracker.emit('batchEnd', undefined) }
          }
        })

      yield logs
    }
  }

  override async predict (input: Sample): Promise<Prediction> {
    const ret = this.model.predict(input)
    if (Array.isArray(ret)) {
      throw new Error('prediction yield many Tensors but should have only returned one')
    }

    return ret
  }

  static deserialize (weights: WeightsContainer): Model {
    const model = new GPT()
    model.weights = weights
    return model
  }

  serialize (): WeightsContainer {
    return this.weights
  }
}

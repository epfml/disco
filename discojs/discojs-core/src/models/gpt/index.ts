/**
 * this code is taken from gpt-tfjs with modifications from @peacefulotter and @lukemovement
 **/

import tf from '@tensorflow/tfjs'

import { WeightsContainer } from '../..'
import type { Dataset } from '../../dataset'
import { Sink } from '../../utils/event_emitter'
import { encode, decode } from 'gpt-tokenizer/cjs/model/text-davinci-003'

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

  private static readonly batchSize = 8
  private static readonly blockSize = 128
  private static readonly vocabSize = 50258

  constructor () {
    super()

    // TODO sensible defaults?
    const config: Config = {
      modelType: 'gpt-nano',
      lr: 0.001,
      epochs: 1,
      maxIter: 10,
      maxEvalBatches: 10,
      batchSize: GPT.batchSize,
      blockSize: GPT.blockSize,
      vocabSize: GPT.vocabSize
    }

    this.model = new GPTLMHeadModel(config)
  }

  override get weights (): WeightsContainer {
    return new WeightsContainer(this.model.weights.map((w) => w.read()))
  }

  override set weights (ws: WeightsContainer) {
    this.model.setWeights(ws.weights)
  }

  private batchTokens (dataset: Dataset): Dataset {
    const batchSize = 16
    return dataset.batch(batchSize).mapAsync(async chunk => {
      let xs = (chunk as tf.TensorContainerObject).xs as tf.Tensor
      xs = tf.squeeze(xs) // Remove extra dimension
      const ys = tf.oneHot(xs, GPT.vocabSize)
      return { xs, ys }
    })
  }

  override async * train (
    trainingData: Dataset,
    validationData?: Dataset,
    epochs = 1,
    tracker = new Sink()
  ): AsyncGenerator<EpochLogs, void> {
    let logs: tf.Logs | undefined
    trainingData = this.batchTokens(trainingData)
    const trainingArgs: tf.ModelFitDatasetArgs<tf.TensorContainer> = {
      epochs: 1, // required to match the ModelFitDatasetArgs type but is currently unused
      validationData: validationData !== undefined ? this.batchTokens(validationData) : undefined,
      callbacks: {
        onEpochEnd: (epoch, cur) => {
          logs = cur
          if (logs !== undefined && cur !== undefined) {
            logs.loss = cur.val_loss
          }
        },
        onBatchBegin: () => { tracker.emit('batchBegin', undefined) },
        onBatchEnd: () => { tracker.emit('batchEnd', undefined) }
      }
    }
    for (let i = 0; i < epochs; i++) {
      await this.model.fitDataset(trainingData, trainingArgs)
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

  async generate (input: Sample, newTokens: number): Promise<string> {
    const string = ((input.arraySync() as unknown) as string[])[0]
    const tokenizer = { encode, decode }
    const tokens = tokenizer.encode(string)

    const generationConfig = {
      maxNewTokens: newTokens,
      temperature: 1.0,
      doSample: false,
      topK: null
    }
    const predictedTokens = await this.model.generate([tokens], generationConfig)
    const generatedWords = tokenizer.decode(predictedTokens[0])
    return generatedWords
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

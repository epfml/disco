/**
 * this code is taken from gpt-tfjs with modifications from @peacefulotter and @lukemovement
 **/

import * as tf from '@tensorflow/tfjs'

import { WeightsContainer } from '../../index.js'
import type { Dataset } from '../../dataset/index.js'
import { Sink } from '../../utils/event_emitter.js'
import { encode, decode } from 'gpt-tokenizer/cjs/model/text-davinci-003'

import type { EpochLogs, Prediction, Sample } from '../model.js'
import { Model } from '../model.js'

import { GPTLMHeadModel } from './model.js'

// TODO too big config
interface Config {
  modelType: 'gpt-nano'
  // epochs: number // TODO mv to Task
  maxIter: number
  blockSize: number
  vocabSize: number
  lr: number
  maxEvalBatches: number
}

export class GPT extends Model {
  private readonly model: GPTLMHeadModel

  constructor () {
    super()

    // TODO sensible defaults?
    const config: Config = {
      modelType: 'gpt-nano',
      lr: 0.001,
      maxIter: 10,
      maxEvalBatches: 10,
      blockSize: 128,
      vocabSize: 50258
    }

    this.model = new GPTLMHeadModel(config)
  }

  override get weights (): WeightsContainer {
    return new WeightsContainer(this.model.weights.map((w) => w.read()))
  }

  override set weights (ws: WeightsContainer) {
    this.model.setWeights(ws.weights)
  }

  /**
   * The GPT train methods wraps the model.fitDataset call in a for loop to act as a generator (of logs)
   * This allows for getting logs and stopping training without callbacks.
   *
   * @param trainingData training dataset
   * @param validationData validation dataset
   * @param epochs the number of passes of the training dataset
   * @param tracker
   */
  override async * train (
    trainingData: Dataset,
    validationData?: Dataset,
    epochs = 1,
    tracker = new Sink()
  ): AsyncGenerator<EpochLogs, void> {
    let logs: tf.Logs | undefined
    const trainingArgs: tf.ModelFitDatasetArgs<tf.TensorContainer> = {
      epochs: 1, // force fitDataset to do only one epoch because it is wrapped in a for loop
      validationData,
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

  override predict (input: Sample): Promise<Prediction> {
    const ret = this.model.predict(input)
    if (Array.isArray(ret)) {
      throw new Error('prediction yield many Tensors but should have only returned one')
    }

    return Promise.resolve(ret)
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

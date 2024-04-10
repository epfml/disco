/**
 * this code is taken from gpt-tfjs with modifications from @peacefulotter and @lukemovement
 **/

import * as tf from '@tensorflow/tfjs'

import { WeightsContainer } from '../../index.js'
import type { Dataset } from '../../dataset/index.js'
import { Sink } from '../../utils/event_emitter.js'
import { PreTrainedTokenizer } from '@xenova/transformers';


import type { EpochLogs, Prediction, Sample } from '../model.js'
import { Model } from '../model.js'

import { GPTLMHeadModel } from './model.js'

// TODO too big config
interface Config {
  modelType: 'gpt-nano'
  maxIter: number
  blockSize: number
  vocabSize: number
  evaluateEvery: number
  lr: number
  maxEvalBatches: number
}

interface TokenizerOutput {
    input_ids: number[]
  }

export class GPT extends Model {
  private readonly model: GPTLMHeadModel

  constructor () {
    super()

    // TODO sensible defaults?
    const config: Config = {
      modelType: 'gpt-nano',
      lr: 0.001,
      maxIter: 2,
      evaluateEvery:10,
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
  override async *train(
    trainingData: Dataset,
    validationData?: Dataset,
    epochs = 1,
    tracker = new Sink(),
  ): AsyncGenerator<EpochLogs, void> {
    let logs: tf.Logs | undefined;

    const trainingArgs: tf.ModelFitDatasetArgs<tf.TensorContainer> = {
      epochs: 1, // force fitDataset to do only one epoch because it is wrapped in a for loop
      validationData,
      callbacks: {
        onEpochEnd: (_, cur) => {
          logs = cur;
          if (logs !== undefined && cur !== undefined) {
            logs.loss = cur.val_loss;
          }
        },
        onBatchBegin: () => {
          tracker.emit("batchBegin", undefined);
        },
        onBatchEnd: () => {
          tracker.emit("batchEnd", undefined);
        },
      },
    };
    for (let epoch = 0; epoch < epochs; epoch++) {
      await this.model.fitDataset(trainingData, trainingArgs);

      if (logs === undefined) {
        throw new Error("epoch didn't gave any logs");
      }
      const { val_loss, acc, val_acc } = logs;
      if (
        val_loss === undefined ||
        isNaN(val_loss) ||
        acc === undefined ||
        isNaN(acc) ||
        val_acc === undefined ||
        isNaN(val_acc)
      ) {
        throw new Error("epoch gave invalid logs");
      }

      yield {
        epoch,
        loss: logs.val_loss,
        training: { accuracy: logs.acc },
        validation: { accuracy: logs.val_acc },
      };
    }
  }

  override predict (input: Sample): Promise<Prediction> {
    const ret = this.model.predict(input)
    if (Array.isArray(ret)) {
      throw new Error('prediction yield many Tensors but should have only returned one')
    }

    return Promise.resolve(ret)
  }

  async generate (input: string, tokenizer: PreTrainedTokenizer, newTokens: number = 10): Promise<string> {
    const { input_ids: tokens } = await tokenizer(input, { return_tensor: false}) as TokenizerOutput

    const generationConfig = {
      maxNewTokens: newTokens,
      temperature: 1.0,
      doSample: false,
      topK: null
    }
    const predictedTokens = await this.model.generate(tokens, generationConfig)
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

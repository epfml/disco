/**
 * this code is taken from gpt-tfjs with modifications from @peacefulotter and @lukemovement
 **/

import * as tf from '@tensorflow/tfjs'
import { PreTrainedTokenizer } from '@xenova/transformers';

import { WeightsContainer } from '../../index.js'

import { Model } from '../model.js'
import { GPTForCausalLM } from './model.js'
import type { EpochLogs, Prediction, Sample } from '../model.js'
import type { GPTConfig } from './config.js'


export class GPT extends Model {
  private readonly model: GPTForCausalLM

  constructor (partialConfig?: GPTConfig) {
    super()
    this.model = new GPTForCausalLM(partialConfig)
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
    trainingData: tf.data.Dataset<{ xs: tf.Tensor2D, ys: tf.Tensor3D }>,
    validationData?: tf.data.Dataset<{ xs: tf.Tensor2D, ys: tf.Tensor3D }>,
    epochs = 1,
  ): AsyncGenerator<EpochLogs, void> {
    this.model.compile()
    let logs: tf.Logs | undefined;
    const trainingArgs: tf.ModelFitDatasetArgs<{ xs: tf.Tensor2D, ys: tf.Tensor3D }> = {
      epochs: 1, // force fitDataset to do only one epoch because it is wrapped in a for loop
      validationData,
      callbacks: { onEpochEnd: (_, cur) => { logs = cur }},
    };
    for (let epoch = 0; epoch < epochs; epoch++) {
      await this.model.fitDataset(trainingData, trainingArgs);
      if (logs === undefined) {
        throw new Error("Epoch didn't gave any logs");
      }
      const { loss, val_acc, val_loss, peakMemory } = logs;
      if (loss === undefined || isNaN(loss)) {
        throw new Error("Training loss is undefined or nan");
      }
      const structuredLogs: EpochLogs = {
        epoch,
        peakMemory,
        training: {
          loss: logs.loss
        }
      }

      if (validationData !== undefined) {
        if(val_loss === undefined || isNaN(val_loss) ||
          val_acc === undefined || isNaN(val_acc)) {
          throw new Error("Invalid validation logs");
        }
        structuredLogs.validation = { accuracy: logs.val_acc, loss: logs.val_loss}
      }
      yield structuredLogs
    }
  }

  override predict (input: Sample): Promise<Prediction> {
    const ret = this.model.predict(input)
    if (Array.isArray(ret)) {
      throw new Error('prediction yield many Tensors but should have only returned one')
    }

    return Promise.resolve(ret)
  }

  async generate(input: string, tokenizer: PreTrainedTokenizer, newTokens: number = 10): Promise<string> {
    const { input_ids: tokens } = await tokenizer(input, { return_tensor: false}) as { input_ids: number[] }

    const generationConfig = {
      maxNewTokens: newTokens,
      temperature: 1.0,
      doSample: false
    }
    const predictedTokens = await this.model.generate(tokens, generationConfig)
    const generatedWords = tokenizer.decode(predictedTokens[0])
    return generatedWords
  }

  get config (): Required<GPTConfig> {
    return this.model.getGPTConfig
  }
  override get weights (): WeightsContainer {
    return new WeightsContainer(this.model.weights.map((w) => w.read()))
  }

  override set weights (ws: WeightsContainer) {
    this.model.setWeights(ws.weights)
  }

  static deserialize (data: GPTSerialization): Model {
    const model = new GPT(data.config)
    model.weights = data.weights
    return model
  }

  serialize (): GPTSerialization {
    return {
      weights: this.weights,
      config: this.config
    }
  }

  [Symbol.dispose](): void{
    console.log("Disposing model")
    if (this.model.optimizer !== undefined) {
      this.model.optimizer.dispose()
    }
    // Some tensors are not cleaned up when model.dispose is called 
    // So we dispose them manually
    this.model.disposeRefs()
    this.model.dispose()
  }
}

export type GPTSerialization = {
  weights: WeightsContainer
  config?: GPTConfig
}

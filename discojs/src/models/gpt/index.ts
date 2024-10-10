/**
 * Source: https://github.com/zemlyansky/gpt-tfjs and https://github.com/karpathy/build-nanogpt
 * With modifications from @peacefulotter, @lukemovement and the Disco team
 **/

import createDebug from "debug";
import { List } from 'immutable';
import * as tf from '@tensorflow/tfjs'
import { PreTrainedTokenizer } from '@xenova/transformers';

import { WeightsContainer } from '../../index.js'

import { BatchLogs, Model, EpochLogs } from "../index.js";
import type { Prediction, Sample } from '../model.js'

import { GPTForCausalLM } from './model.js'
import { DefaultGPTConfig, DefaultGenerationConfig } from './config.js'
import type { GPTConfig, GenerationConfig } from './config.js'
import evaluate from './evaluate.js';

const debug = createDebug("discojs:models:gpt");

export type GPTSerialization = {
  weights: WeightsContainer
  config?: GPTConfig
}

export class GPT extends Model {
  private readonly model: GPTForCausalLM

  readonly #maxBatchCount: number

  constructor (partialConfig?: GPTConfig, layersModel?: tf.LayersModel) {
    super()

    this.model = new GPTForCausalLM(partialConfig, layersModel)
    this.#maxBatchCount = partialConfig?.maxIter ?? DefaultGPTConfig.maxIter
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
  ): AsyncGenerator<BatchLogs, EpochLogs> {
    this.model.compile();

    const batches = await trainingData.iterator(); // tf.LazyIterator isn't an AsyncGenerator
    let batchesLogs = List<BatchLogs>();
    for (
      let batchNumber = 0;
      batchNumber < this.#maxBatchCount;
      batchNumber++
    ) {
      const iteration = await batches.next();
      if (iteration.done) break;
      const batch = iteration.value;

      const batchLogs = await this.#runBatch(batch);
      tf.dispose(batch);

      yield batchLogs;
      batchesLogs = batchesLogs.push(batchLogs);
    }

    const validation = validationData && (await this.#evaluate(validationData));
    return new EpochLogs(batchesLogs, validation);
  }

  async #runBatch(
    batch: tf.TensorContainer,
  ): Promise<BatchLogs> {
    let logs: tf.Logs | undefined;
    await this.model.fitDataset(tf.data.array([batch]), {
      epochs: 1,
      verbose: 0, // don't pollute
      callbacks: {
        onEpochEnd: (_, cur) => {
          logs = cur;
        },
      },
    });
    if (logs === undefined) throw new Error("batch didn't gave any logs");

    const { loss, acc: accuracy } = logs;
    if (loss === undefined || isNaN(loss))
      throw new Error("training loss is undefined or NaN");

    return {
      accuracy,
      loss,
      memoryUsage: tf.memory().numBytes / 1024 / 1024 / 1024,
    };
  }

  async #evaluate(
    dataset: tf.data.Dataset<tf.TensorContainer>,
  ): Promise<Record<"accuracy" | "loss", number>> {
    const evaluation = await evaluate(
      this.model,
      dataset.map((t) => {
        switch (t) {
          case null:
          case undefined:
            throw new Error("nullish value in dataset");
          default:
            // TODO unsafe cast
            return t as { xs: tf.Tensor2D; ys: tf.Tensor3D };
        }
      }),
      this.config.maxEvalBatches,
    );

    return {
      accuracy: evaluation.val_acc,
      loss: evaluation.val_loss,
    };
  }

  override predict(input: Sample): Promise<Prediction> {
    const ret = this.model.predict(input);
    if (Array.isArray(ret)) {
      throw new Error(
        "prediction yield many Tensors but should have only returned one",
      );
    }

    return Promise.resolve(ret);
  }

  /**
   * Generate text from a prompt sequence.
   * 
   * @param input prompt sequence to generate from
   * @param tokenizer tokenizer object
   * @param generationConfig config object for text generation
   * @param generationConfig.maxNewTokens default to 10, the number of tokens to generate
   * @param generationConfig.temperature default to 1.0, the generation temperature (higher means more randomness). 
   * Set to 0 for greedy decoding.
   * @param generationConfig.doSample default to false, if true, sample the next token according the model's probabilities
   * If false, predict the token with the highest probability.
   * @param generationConfig.topk default to 50, only consider the topk most likely tokens for sampling. 
   * Only used if doSample is true.
   * @param generationConfig.seed default to 42, random seed for sampling.
   * @returns the input prompt concatenated with the generated tokens
   */
  async generate(input: string, tokenizer: PreTrainedTokenizer, generationConfig?: Partial<GenerationConfig>): Promise<string> {
    const { input_ids: tokens } = await tokenizer(input, {
      return_tensor: false,
      padding: false,
    }) as { input_ids: number[] }

    const config = Object.assign({}, DefaultGenerationConfig, generationConfig) // overwrite default with user config
    const predictedTokens = await this.model.generate(tokens, config)
    const generatedWords = tokenizer.decode(predictedTokens[0], { skip_special_tokens: false })
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
  extract (): tf.LayersModel {
    return this.model
  }

  [Symbol.dispose](): void{
    if (this.model.optimizer !== undefined) {
      this.model.optimizer.dispose()
    }
    const disposeResults = this.model.dispose()
    if (disposeResults.refCountAfterDispose > 0)
      debug("model not disposed correctly: %o", disposeResults);
  }
}

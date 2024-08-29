/**
 * this code is taken from gpt-tfjs with modifications from @peacefulotter and @lukemovement
 **/

import createDebug from "debug";
import { List, Range } from "immutable";
import * as tf from '@tensorflow/tfjs'
import { PreTrainedTokenizer } from '@xenova/transformers';

import {
  Batched,
  Dataset,
  DataTypeToBatchedPreprocessedLabeledDataset,
  DataTypeToPreprocessedLabeled,
  WeightsContainer,
} from "../../index.js";

import { BatchLogs, Model, EpochLogs } from "../index.js";
import type { Prediction, Sample } from '../model.js'

import { GPTForCausalLM } from './model.js'
import { DEFAULT_CONFIG, type GPTConfig } from './config.js'
import evaluate from './evaluate.js';

const debug = createDebug("discojs:models:gpt");

export type GPTSerialization = {
  weights: WeightsContainer
  config?: GPTConfig
}

export class GPT extends Model<"text"> {
  private readonly model: GPTForCausalLM

  readonly #maxBatchCount: number
  readonly #vocabSize: number

  constructor (partialConfig?: GPTConfig, layersModel?: tf.LayersModel) {
    super()

    const model = new GPTForCausalLM(partialConfig, layersModel)
    model.compile();
    this.model = model;

    this.#maxBatchCount = partialConfig?.maxIter ?? DEFAULT_CONFIG.maxIter
    this.#vocabSize = partialConfig?.vocabSize ?? DEFAULT_CONFIG.vocabSize
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
    trainingDataset: Dataset<Batched<DataTypeToPreprocessedLabeled["text"]>>,
    validationDataset?: Dataset<Batched<DataTypeToPreprocessedLabeled["text"]>>,
  ): AsyncGenerator<BatchLogs, EpochLogs> {
    let batchesLogs = List<BatchLogs>();

    for await (const [batch, _] of trainingDataset.zip(
      Range(0, this.#maxBatchCount),
    )) {
      const batchLogs = await this.#runBatch(batch);

      yield batchLogs;
      batchesLogs = batchesLogs.push(batchLogs);
    }

    const validation =
      validationDataset && (await this.#evaluate(validationDataset));

    return new EpochLogs(batchesLogs, validation);
  }

  async #runBatch(
    batch: Batched<DataTypeToPreprocessedLabeled["text"]>,
  ): Promise<BatchLogs> {
    const tfBatch = this.#batchToTF(batch);

    let logs: tf.Logs | undefined;
    await this.model.fitDataset(tf.data.array([tfBatch]), {
      epochs: 1,
      verbose: 0, // don't pollute
      callbacks: {
        onEpochEnd: (_, cur) => {
          logs = cur;
        },
      },
    });
    tf.dispose(tfBatch);
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
    dataset: DataTypeToBatchedPreprocessedLabeledDataset["text"],
  ): Promise<Record<"accuracy" | "loss", number>> {
    const evaluation = await evaluate(
      this.model,
      intoTFDataset(dataset.map((batch) => this.#batchToTF(batch))),
      this.config.maxEvalBatches,
    );

    return {
      accuracy: evaluation.val_acc,
      loss: evaluation.val_loss,
    };
  }

  #batchToTF(batch: Batched<DataTypeToPreprocessedLabeled["text"]>): {
    xs: tf.Tensor2D;
    ys: tf.Tensor3D;
  } {
    return tf.tidy(() => ({
      xs: tf.stack(
        batch.map(([line]) => tf.tensor1d(line.toArray(), "int32")).toArray(),
      ) as tf.Tensor2D, // cast as stack doesn't type
      ys: tf.stack(
        batch
          .map(([_, next]) => tf.oneHot(next.toArray(), this.#vocabSize))
          .toArray(),
      ) as tf.Tensor3D, // cast as oneHot/stack doesn't type
    }));
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

  static deserialize (data: GPTSerialization): Model<'text'> {
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

function intoTFDataset<T extends tf.TensorContainer>(
  iter: AsyncIterable<T>,
): tf.data.Dataset<T> {
  // @ts-expect-error generator
  return tf.data.generator(async function* () {
    yield* iter;
  });
}

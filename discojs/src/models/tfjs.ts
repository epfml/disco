import { List, Map } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import { WeightsContainer } from '../index.js'
import type { Dataset } from '../dataset/index.js'

import { BatchLogs, EpochLogs } from './index.js'
import { Model } from './index.js'
import type { Prediction, Sample } from './model.js'

/** TensorFlow JavaScript model with standard training */
export class TFJS extends Model {
  /** Wrap the given trainable model */
  constructor (
    private readonly model: tf.LayersModel
  ) {
    super()

    if (model.loss === undefined) {
      throw new Error('TFJS models need to be compiled to be used')
    }
  }

  override get weights (): WeightsContainer {
    return new WeightsContainer(this.model.weights.map((w) => w.read()))
  }

  override set weights (ws: WeightsContainer) {
    this.model.setWeights(ws.weights)
  }

  override async *train(
    trainingData: Dataset,
    validationData?: Dataset,
  ): AsyncGenerator<BatchLogs, EpochLogs> {
    const batches = await trainingData.iterator(); // tf.LazyIterator isn't an AsyncGenerator
    let batchesLogs = List<BatchLogs>();
    for (let batchNumber = 0; true; batchNumber++) {
      const iteration = await batches.next();
      if (iteration.done) break;
      const batch = iteration.value;

      const batchLogs = {
        batch: batchNumber,
        ...(await this.#runBatch(batch)),
      };
      tf.dispose(batch);

      yield batchLogs;
      batchesLogs = batchesLogs.push(batchLogs);
    }

    const validation = validationData && (await this.#evaluate(validationData));
    return new EpochLogs(batchesLogs, validation);
  }

  async #runBatch(
    batch: tf.TensorContainer,
  ): Promise<Omit<BatchLogs, "batch">> {
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
    dataset: Dataset,
  ): Promise<Record<"accuracy" | "loss", number>> {
    const evaluation = await this.model.evaluateDataset(
      dataset.map((t) => {
        switch (t) {
          case null:
          case undefined:
            throw new Error("nullish value in dataset");
          default:
            return t as Exclude<tf.TensorContainer, void>;
        }
      }),
    );
    const metricToValue = Map(
      List(this.model.metricsNames).zip(
        Array.isArray(evaluation)
          ? List(await Promise.all(evaluation.map((t) => t.data())))
          : List.of(await evaluation.data()),
      ),
    ).map((values) => {
      if (values.length !== 1) throw new Error("more than one metric value");
      return values[0];
    });

    const [accuracy, loss] = [
      metricToValue.get("acc"),
      metricToValue.get("loss"),
    ];
    if (accuracy === undefined || loss === undefined)
      throw new Error("some needed metrics are missing");

    return { accuracy, loss };
  }

  override predict (input: Sample): Promise<Prediction> {
    const ret = this.model.predict(input)
    if (Array.isArray(ret)) {
      throw new Error('prediction yield many Tensors but should have only returned one')
    }

    return Promise.resolve(ret)
  }

  static async deserialize (raw: tf.io.ModelArtifacts): Promise<Model> {
    return new this(await tf.loadLayersModel({
      load: () => Promise.resolve(raw)
    }))
  }

  async serialize (): Promise<tf.io.ModelArtifacts> {
    let resolveArtifacts: (_: tf.io.ModelArtifacts) => void
    const ret = new Promise<tf.io.ModelArtifacts>((resolve) => { resolveArtifacts = resolve })

    await this.model.save({
      save: (artifacts) => {
        resolveArtifacts(artifacts)
        return Promise.resolve({
          modelArtifactsInfo: {
            dateSaved: new Date(),
            modelTopologyType: 'JSON'
          }
        })
      }
    }, {
      includeOptimizer: true // keep model compiled
    })

    return await ret
  }

  [Symbol.dispose](): void{
    this.model.dispose()
  }

  /**
   * extract wrapped model
   *
   * @deprecated use `Model` instead of relying on tf specifics
   */
  extract (): tf.LayersModel {
    return this.model
  }
}

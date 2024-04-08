import * as tf from '@tensorflow/tfjs'

import { Sink } from '../utils/event_emitter.js'
import { WeightsContainer } from '../index.js'

import { Model } from './index.js'
import type { EpochLogs, Prediction, Sample } from './model.js'
import type { Dataset } from '../dataset/index.js'

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
    epochs = 1,
    tracker = new Sink(),
  ): AsyncGenerator<EpochLogs> {
    for (let epoch = 0; epoch < epochs; epoch++) {
      let logs: tf.Logs | undefined;

      await this.model.fitDataset(trainingData, {
        epochs: 1,
        validationData,
        callbacks: {
          onEpochEnd: (_, cur) => {
            logs = cur;
          },
          onBatchBegin: () => {
            tracker.emit("batchBegin", undefined);
          },
          onBatchEnd: () => {
            tracker.emit("batchEnd", undefined);
          },
        },
      });

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

  /**
   * extract wrapped model
   *
   * @deprecated use `Model` instead of relying on tf specifics
   */
  extract (): tf.LayersModel {
    return this.model
  }
}

import * as tf from '@tensorflow/tfjs'

import { WeightsContainer } from '../index.js'

import { Model } from './index.js'
import type { EpochLogs, Prediction, Sample } from './model.js'

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
    trainingData: tf.data.Dataset<tf.TensorContainer>,
    validationData?: tf.data.Dataset<tf.TensorContainer>,
    epochs = 1,
  ): AsyncGenerator<EpochLogs> {
    for (let epoch = 0; epoch < epochs; epoch++) {
      let logs: tf.Logs | undefined;
      let peakMemory = 0
      await this.model.fitDataset(trainingData, {
        epochs: 1,
        validationData,
        callbacks: {
          onBatchEnd: (_) => { 
            const currentMemory = tf.memory().numBytes / 1024 / 1024 / 1024 // GB
            if (currentMemory > peakMemory) {
              peakMemory = currentMemory
            }
          },
          onEpochEnd: (_, cur) => { logs = cur }
        },
      });

      if (logs === undefined) {
        throw new Error("Epoch didn't gave any logs");
      }
      const { loss, acc, val_acc, val_loss } = logs;
      if (loss === undefined || isNaN(loss) || acc === undefined || isNaN(acc)) {
        throw new Error("Training loss is undefined or nan");
      }
      const structuredLogs: EpochLogs = {
        epoch,
        peakMemory,
        training: {
          loss: logs.loss,
          accuracy: logs.acc,
         }
      }
      if (validationData !== undefined) {
        if(val_loss === undefined || isNaN(val_loss) ||
          val_acc === undefined || isNaN(val_acc)) {
          throw new Error("Invalid validation logs");
        }
        structuredLogs.validation = {
          accuracy: logs.val_acc,
          loss: logs.val_loss
        }
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

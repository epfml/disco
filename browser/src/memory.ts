/**
 * Helper functions used to load and save TFJS models from IndexedDB. The
 * working model is the model currently being trained for a task. Saved models
 * are models that were explicitly saved to IndexedDB. The two working/ and saved/
 * folders are invisible to the user. The user only interacts with the saved/
 * folder via the model library. The working/ folder is only used by the backend.
 * The working model is loaded from IndexedDB for training (model.fit) only.
 */
import path from 'path'

import { tf, Memory, ModelType, Path, ModelInfo, ModelSource } from 'discojs'

export class IndexedDB extends Memory {
  pathFor (source: ModelSource): Path {
    if (typeof source === 'string') {
      return source
    }

    if (source.type === undefined || source.taskID === undefined || source.name === undefined) {
      throw new TypeError('source incomplete')
    }
    return 'indexeddb://' + path.join(source.type, source.taskID, source.name)
  }

  infoFor (source: ModelSource): ModelInfo {
    if (typeof source !== 'string') {
      return source
    }
    const [stringType, taskID, name] = source.split('/').splice(2)
    const type = stringType === 'working' ? ModelType.WORKING : ModelType.SAVED
    return { type, taskID, name }
  }

  async getModelMetadata (source: ModelSource): Promise<tf.io.ModelArtifactsInfo | undefined> {
    const models = await tf.io.listModels()
    return models[this.pathFor(source)]
  }

  async contains (source: ModelSource): Promise<boolean> {
    return await this.getModelMetadata(source) !== undefined
  }

  async getModel (source: ModelSource): Promise<tf.LayersModel> {
    return await tf.loadLayersModel(this.pathFor(source))
  }

  async deleteModel (source: ModelSource): Promise<void> {
    await tf.io.removeModel(this.pathFor(source))
  }

  async loadModel (source: ModelSource): Promise<void> {
    await tf.io.copyModel(
      this.pathFor(source),
      this.pathFor({ ...this.infoFor(source), type: ModelType.WORKING })
    )
  }

  /**
   * Saves the working model to the source.
   * @param source the destination
   * @param model the model
   */
  async updateWorkingModel (source: ModelSource, model: tf.LayersModel): Promise<void> {
    const src: ModelInfo = this.infoFor(source)
    if (src.type !== undefined && src.type !== ModelType.WORKING) {
      throw new TypeError('expected working model')
    }
    await model.save(this.pathFor({ ...src, type: ModelType.WORKING }))
  }

  /**
 * Creates a saved copy of the working model corresponding to the source.
 * @param source the source
 */
  async saveWorkingModel (source: ModelSource): Promise<void> {
    const src: ModelInfo = this.infoFor(source)
    if (src.type !== undefined && src.type !== ModelType.WORKING) {
      throw new TypeError('expected working model')
    }
    await tf.io.copyModel(
      this.pathFor({ ...src, type: ModelType.WORKING }),
      this.pathFor({ ...src, type: ModelType.SAVED })
    )
  }

  /**
 * Downloads the model corresponding to the source.
 * @param source the source
 */
  async downloadModel (source: ModelSource): Promise<void> {
    const src: ModelInfo = this.infoFor(source)
    await tf.io.copyModel(
      this.pathFor(source),
      `downloads://${src.taskID}_${src.name}`
    )
  }
}

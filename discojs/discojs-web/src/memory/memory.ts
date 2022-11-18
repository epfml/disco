/**
 * Helper functions used to load and save TFJS models from IndexedDB. The
 * working model is the model currently being trained for a task. Saved models
 * are models that were explicitly saved to IndexedDB. The two working/ and saved/
 * folders are invisible to the user. The user only interacts with the saved/
 * folder via the model library. The working/ folder is only used by the backend.
 * The working model is loaded from IndexedDB for training (model.fit) only.
 */
import { Map } from 'immutable'
import path from 'path'

import { tf, Memory, ModelType, Path, ModelInfo, ModelSource } from '..'

export class IndexedDB extends Memory {
  pathFor (source: ModelSource): Path {
    if (typeof source === 'string') {
      return source
    }

    if (source.type === undefined || source.taskID === undefined || source.name === undefined) {
      throw new TypeError('source incomplete')
    }

    const version = (source.version === undefined || source.version === 0)
      ? ''
      : source.version

    return `indexeddb://${path.join(source.type, source.taskID, source.name)}@${version}`
  }

  infoFor (source: ModelSource): ModelInfo {
    if (typeof source !== 'string') {
      return source
    }
    const [stringType, taskID, fullName] = source.split('/').splice(2)

    const type = stringType === 'working' ? ModelType.WORKING : ModelType.SAVED

    const [name, versionSuffix] = fullName.split('@')
    const version = versionSuffix === undefined ? 0 : Number(versionSuffix)
    return { type, taskID, name, version }
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
    const src = this.infoFor(source)
    if (src.type === ModelType.WORKING) {
      // Model is already loaded
      return
    }
    await tf.io.copyModel(
      this.pathFor(src),
      this.pathFor({ ...src, type: ModelType.WORKING, version: 0 })
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
      throw new Error('expected working model')
    }
    // Enforce version 0 to always keep a single working model at a time
    await model.save(this.pathFor({ ...src, type: ModelType.WORKING, version: 0 }))
  }

  /**
 * Creates a saved copy of the working model corresponding to the source.
 * @param source the source
 */
  async saveWorkingModel (source: ModelSource): Promise<Path> {
    const src: ModelInfo = this.infoFor(source)
    if (src.type !== undefined && src.type !== ModelType.WORKING) {
      throw new Error('expected working model')
    }
    const dst = this.pathFor(await this.duplicateSource({ ...src, type: ModelType.SAVED }))
    await tf.io.copyModel(
      this.pathFor({ ...src, type: ModelType.WORKING }),
      dst
    )
    return dst
  }

  async saveModel (source: ModelSource, model: tf.LayersModel): Promise<Path> {
    const src: ModelInfo = this.infoFor(source)
    if (src.type !== undefined && src.type !== ModelType.SAVED) {
      throw new Error('expected saved model')
    }
    const dst = this.pathFor(await this.duplicateSource({ ...src, type: ModelType.SAVED }))
    await model.save(dst)
    return dst
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

  async latestDuplicate (source: ModelSource): Promise<number | undefined> {
    if (typeof source !== 'string') {
      source = this.pathFor({ ...source, version: 0 })
    }

    // perform a single memory read
    const paths = Map(await tf.io.listModels())

    if (!paths.has(source)) {
      return undefined
    }

    const latest = Map(paths)
      .keySeq()
      .toList()
      .map((p) => this.infoFor(p).version)
      .max()

    if (latest === undefined) {
      return 0
    }

    return latest
  }

  async duplicateSource (source: ModelSource): Promise<ModelInfo> {
    const latestDuplicate = await this.latestDuplicate(source)
    source = this.infoFor(source)

    if (latestDuplicate === undefined) {
      return source
    }

    return { ...source, version: latestDuplicate + 1 }
  }
}

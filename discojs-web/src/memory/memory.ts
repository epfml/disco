/**
 * Helper functions used to load and save TFJS models from IndexedDB. The
 * working model is the model currently being trained for a task. Saved models
 * are models that were explicitly saved to IndexedDB. The two working/ and saved/
 * folders are invisible to the user. The user only interacts with the saved/
 * folder via the model library. The working/ folder is only used by the backend.
 * The working model is loaded from IndexedDB for training (model.fit) only.
 */
import { Map } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import type { Path, Model, ModelInfo, ModelSource } from '@epfml/discojs'
import { Memory, StoredModelType, models } from '@epfml/discojs'

export class IndexedDB extends Memory {
  override getModelMemoryPath (source: ModelSource): Path {
    if (typeof source === 'string') {
      return source
    }
    const version = source.version ?? 0
    return `indexeddb://${source.type}/${source.tensorBackend}/${source.taskID}/${source.name}@${version}`
  }

  override getModelInfo (source: ModelSource): ModelInfo {
    if (typeof source !== 'string') {
      return source
    }
    const [stringType, tensorBackend, taskID, fullName] = source.split('/').splice(2)

    const type = stringType === 'working' ? StoredModelType.WORKING : StoredModelType.SAVED

    const [name, versionSuffix] = fullName.split('@')
    const version = versionSuffix === undefined ? 0 : Number(versionSuffix)
    if (tensorBackend !== 'tfjs' && tensorBackend !== 'gpt') {
      throw Error("Unknown tensor backend")
    }
    return { type, taskID, name, version, tensorBackend }
  }

  async getModelMetadata (source: ModelSource): Promise<tf.io.ModelArtifactsInfo | undefined> {
    const models = await tf.io.listModels()
    return models[this.getModelMemoryPath(source)]
  }

  async contains (source: ModelSource): Promise<boolean> {
    return await this.getModelMetadata(source) !== undefined
  }

  override async getModel(source: ModelSource): Promise<Model> {
    const layersModel = await tf.loadLayersModel(this.getModelMemoryPath(source))
    
    const tensorBackend = this.getModelInfo(source).tensorBackend
    switch (tensorBackend) {
      case 'tfjs':
        return new models.TFJS(layersModel)
      case 'gpt':
        return new models.GPT(undefined, layersModel)
      default:
        const _exhaustiveCheck: never = tensorBackend;
        return _exhaustiveCheck;
    }
  }

  async deleteModel (source: ModelSource): Promise<void> {
    await tf.io.removeModel(this.getModelMemoryPath(source))
  }

  async loadModel(source: ModelSource): Promise<void> {
    const src = this.getModelInfo(source)
    if (src.type === StoredModelType.WORKING) {
      // Model is already loaded
      return
    }
    await tf.io.copyModel(
      this.getModelMemoryPath(src),
      this.getModelMemoryPath({ ...src, type: StoredModelType.WORKING, version: 0 })
    )
  }

  /**
   * Saves the working model to the source.
   * @param source the destination
   * @param model the model
   */
  override async updateWorkingModel (source: ModelSource, model: Model): Promise<void> {
    const src: ModelInfo = this.getModelInfo(source)
    if (src.type !== StoredModelType.WORKING) {
      throw new Error('expected working type model')
    }
    // Enforce version 0 to always keep a single working model at a time
    const modelInfo = { ...src, type: StoredModelType.WORKING, version: 0 }
    let includeOptimizer;
    if (model instanceof models.TFJS) {
      modelInfo['tensorBackend'] = 'tfjs'
      includeOptimizer = true
    } else if (model instanceof models.GPT) { 
      modelInfo['tensorBackend'] = 'gpt'
      includeOptimizer = false // true raises an error
    } else {
      throw new Error('unknown model type')
    }
    const indexedDBURL = this.getModelMemoryPath(modelInfo)
    await model.extract().save(indexedDBURL, { includeOptimizer })
  }

  /**
 * Creates a saved copy of the working model corresponding to the source.
 * @param source the source
 */
  async saveWorkingModel (source: ModelSource): Promise<Path> {
    const src: ModelInfo = this.getModelInfo(source)
    if (src.type !== StoredModelType.WORKING) {
      throw new Error('expected working type model')
    }
    const dst = this.getModelMemoryPath(await this.duplicateSource({ ...src, type: StoredModelType.SAVED }))
    await tf.io.copyModel(
      this.getModelMemoryPath({ ...src, type: StoredModelType.WORKING }),
      dst
    )
    return dst
  }

  override async saveModel (source: ModelSource, model: Model): Promise<Path> {
    const src: ModelInfo = this.getModelInfo(source)
    if (src.type !== StoredModelType.SAVED) {
      throw new Error('expected saved type model')
    }

    const modelInfo = await this.duplicateSource({ ...src, type: StoredModelType.SAVED })
    let includeOptimizer;
    if (model instanceof models.TFJS) {
        modelInfo['tensorBackend'] = 'tfjs'
        includeOptimizer = true
      } else if (model instanceof models.GPT) { 
        modelInfo['tensorBackend'] = 'gpt'
        includeOptimizer = false // true raises an error
      } else {
        throw new Error('unknown model type')
      }
      const indexedDBURL = this.getModelMemoryPath(modelInfo)
      await model.extract().save(indexedDBURL, { includeOptimizer })
    return indexedDBURL
  }

  /**
 * Downloads the model corresponding to the source.
 * @param source the source
 */
  async downloadModel (source: ModelSource): Promise<void> {
    const src: ModelInfo = this.getModelInfo(source)
    await tf.io.copyModel(
      this.getModelMemoryPath(source),
      `downloads://${src.taskID}_${src.name}`
    )
  }

  async latestDuplicate (source: ModelSource): Promise<number | undefined> {
    if (typeof source !== 'string') {
      source = this.getModelMemoryPath({ ...source, version: 0 })
    }
    // perform a single memory read
    const paths = Map(await tf.io.listModels())
    if (!paths.has(source)) {
      return undefined
    }

    const latest = Map(paths).keySeq().toList()
      .map((p) => this.getModelInfo(p).version).max()
    if (latest === undefined) {
      return 0
    }
    return latest
  }

  async duplicateSource (source: ModelSource): Promise<ModelInfo> {
    const latestDuplicate = await this.latestDuplicate(source)
    source = this.getModelInfo(source)

    if (latestDuplicate === undefined) {
      return source
    }

    return { ...source, version: latestDuplicate + 1 }
  }
}

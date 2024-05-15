import type { Model } from '../index.js'

import type { ModelInfo, Path } from './base.js'
import { Memory } from './base.js'

/**
 * Represents an empty model memory.
 */
export class Empty extends Memory {
  getModelMetadata (): Promise<undefined> {
    return Promise.resolve(undefined)
  }

  contains (): Promise<boolean> {
    return Promise.resolve(false)
  }

  getModel (): Promise<Model> {
    return Promise.reject(new Error('empty'))
  }

  loadModel (): Promise<void> {
    return Promise.reject(new Error('empty'))
  }

  updateWorkingModel (): Promise<void> {
    // nothing to do
    return Promise.resolve()
  }

  saveWorkingModel (): Promise<undefined> {
    return Promise.resolve(undefined)
  }

  saveModel (): Promise<undefined> {
    return Promise.resolve(undefined)
  }

  async deleteModel (): Promise<void> {
    // nothing to do
  }

  downloadModel (): Promise<void> {
    return Promise.reject(new Error('empty'))
  }

  getModelMemoryPath (): Path {
    throw new Error('empty')
  }

  getModelInfo (): ModelInfo {
    throw new Error('empty')
  }

  duplicateSource (): Promise<undefined> {
    return Promise.resolve(undefined)
  }
}

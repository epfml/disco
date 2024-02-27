import { type tf } from '..'

import { Memory, type ModelInfo, type Path } from './base'

/**
 * Represents an empty model memory.
 */
export class Empty extends Memory {
  async getModelMetadata (): Promise<undefined> {
    return undefined
  }

  async contains (): Promise<boolean> {
    return false
  }

  async getModel (): Promise<tf.LayersModel> {
    throw new Error('empty')
  }

  async loadModel (): Promise<void> {
    throw new Error('empty')
  }

  async updateWorkingModel (): Promise<void> {
    // nothing to do
  }

  async saveWorkingModel (): Promise<undefined> {
    return undefined
  }

  async saveModel (): Promise<undefined> {
    return undefined
  }

  async deleteModel (): Promise<void> {
    // nothing to do
  }

  async downloadModel (): Promise<void> {
    throw new Error('empty')
  }

  pathFor (): Path {
    throw new Error('empty')
  }

  infoFor (): ModelInfo {
    throw new Error('empty')
  }

  async duplicateSource (): Promise<undefined> {
    return undefined
  }
}

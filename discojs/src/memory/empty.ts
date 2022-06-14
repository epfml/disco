import * as tf from '@tensorflow/tfjs'

import { Memory } from './base'

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

  async loadSavedModel (): Promise<void> {
    throw new Error('empty')
  }

  async updateWorkingModel (): Promise<void> {
    // nothing to do
  }

  async saveWorkingModel (): Promise<void> {
    // nothing to do
  }

  async deleteModel (): Promise<void> {
    // nothing to do
  }

  async downloadSavedModel (): Promise<void> {
    throw new Error('empty')
  }
}

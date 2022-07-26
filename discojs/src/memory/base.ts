import * as tf from '@tensorflow/tfjs'

import { TaskID } from '..'
import { ModelType } from './model_type'

export type Path = string

export interface ModelInfo {
  type?: ModelType
  taskID: TaskID
  name?: string
}

export type ModelSource = ModelInfo | Path

export abstract class Memory {
  abstract getModel (source: ModelSource): Promise<tf.LayersModel>

  abstract deleteModel (source: ModelSource): Promise<void>

  abstract getModelMetadata (source: ModelSource): Promise<tf.io.ModelArtifactsInfo | undefined>

  abstract updateWorkingModel (source: ModelSource, model: tf.LayersModel): Promise<void>

  abstract saveWorkingModel (source: ModelSource): Promise<void>

  abstract loadSavedModel (source: ModelSource): Promise<void>

  abstract downloadModel (source: ModelSource): Promise<void>

  abstract contains (source: ModelSource): Promise<boolean>

  abstract pathFor (source: ModelSource): Path | undefined

  abstract infoFor (source: ModelSource): ModelInfo | undefined
}

// only used browser-side
// TODO: replace IO type

import type { Model, TaskID } from '../index.js'
import type { StoredModelType } from './model_type.js'

/**
 * Model path which uniquely identifies a model in memory.
 */
export type Path = string

/**
 * Model information which uniquely identifies a model in memory.
 */
export interface ModelInfo {
  // The model's type: "working" or "saved" model.
  type?: StoredModelType
  // The model's version, to allow for multiple saved models of a same task without
  // causing id conflicts
  version?: number
  // The model's corresponding task
  taskID: TaskID
  // The model's name
  name: string
  // Tensor framework used by the model
  tensorBackend: 'gpt'|'tfjs' // onnx in the future
}

/**
 * A model source uniquely identifies a model stored in memory.
 * It can be in the form of either a model info object or a Path string 
 * (one-to-one mapping between the two)
 */
export type ModelSource = ModelInfo | Path

/**
 * Represents a model memory system, providing functions to fetch, save, delete and update models.
 * Stored models can either be a model currently being trained ("working model") or a regular model
 * saved in memory ("saved model"). There can only be a single working model for a given task.
 */
export abstract class Memory {
  /**
   * Fetches the model identified by the given model source.
   * @param source The model source
   * @returns The model
   */
  abstract getModel (source: ModelSource): Promise<Model>

  /**
   * Removes the model identified by the given model source from memory.
   * @param source The model source
   * @returns The model
   */
  abstract deleteModel (source: ModelSource): Promise<void>

  /**
   * Replaces the corresponding working model with the saved model identified by the given model source.
   * @param source The model source
   */
  abstract loadModel (source: ModelSource): Promise<void>

  /**
   * Fetches metadata for the model identified by the given model source.
   * If the model does not exist in memory, returns undefined.
   * @param source The model source
   * @returns The model metadata or undefined
   */
  abstract getModelMetadata (source: ModelSource): Promise<object | undefined>

  /**
   * Replaces the working model identified by the given source with the newly provided model.
   * @param source The model source
   * @param model The new model
   */
  abstract updateWorkingModel (source: ModelSource, model: Model): Promise<void>

  /**
   * Creates a saved model copy from the working model identified by the given model source.
   * Returns the saved model's path.
   * @param source The model source
   * @returns The saved model's path
   */
  abstract saveWorkingModel (source: ModelSource): Promise<Path | undefined>

  /**
   * Saves the newly provided model to the given model source.
   * Returns the saved model's path
   * @param source The model source
   * @param model The new model
   * @returns The saved model's path
   */
  abstract saveModel (source: ModelSource, model: Model): Promise<Path | undefined>

  /**
   * Moves the model identified by the model source to a file system. This is platform-dependent.
   * @param source The model source
   */
  abstract downloadModel (source: ModelSource): Promise<void>

  /**
   * Checks whether the model memory contains the model identified by the given source.
   * @param source The model source
   * @returns True if the memory contains the model, false otherwise
   */
  abstract contains (source: ModelSource): Promise<boolean>

  /**
   * Computes the path in memory corresponding to the given model source, be it a path or model information.
   * This is used to easily switch between model path and information, which are both unique model identifiers
   * with a one-to-one equivalence. Returns undefined instead if no path could be inferred from the given
   * model source.
   * @param source The model source
   * @returns The model path
   */
  abstract getModelMemoryPath (source: ModelSource): Path | undefined

  /**
   * Computes the model information corresponding to the given model source, be it a path or model information.
   * This is used to easily switch between model path and information, which are both unique model identifiers
   * with a one-to-one equivalence. Returns undefined instead if no unique model information could be inferred
   * from the given model source.
   * @param source The model source
   * @returns The model information
   */
  abstract getModelInfo (source: ModelSource): ModelInfo | undefined

  /**
   * Computes the lowest version a model source can have without conflicting with model versions currently in memory.
   * @param source The model source
   * @returns The duplicated model source
   */
  abstract duplicateSource (source: ModelSource): Promise<ModelSource | undefined>
}

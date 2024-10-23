import { Set } from 'immutable'
import fs from 'node:fs/promises'
import '@tensorflow/tfjs-node'

import {
  EventEmitter,
  Model,
  Task,
  TaskProvider,
  isTask,
  serialization,
} from "@epfml/discojs";
import type { DataType, EncodedModel } from '@epfml/discojs'

/**
 * The TaskSet essentially handles initializing a Task and 
 * loading its associated EncodedModel.
 * 
 * We rely on a TaskSet to abstract the (asynchronous) logic of getting the model
 * when not provided.
 * Depending on the case, getting the model is done by reading the model files
 * from disk if they exists, downloading them from a URL or 
 * initializing the model from its architecture definition. 
 *  
 * We work with EncodedModels rather than Models because they are sent encoded 
 * to clients. Since the server doesn't need to use the Model, we
 * simply leave it already encoded and ready to be sent to clients
 * 
 * Due to the asynchronous nature of `addTask`, TaskSet is an EventEmitter, 
 * by registering callbacks on new tasks and emitting a 'newTask' event 
 * when a new task has been added.
 * 
 * Tasks are usually passed to TaskSet when booting the server
 * and objects depending on tasks and models can subscribe to 
 * the 'newTask' event to run callbacks whenever a new Task and EncodedModel are initialized.
 */
export class TaskSet extends EventEmitter<{
  "newTask": { task: Task<DataType>, encodedModel: EncodedModel }
}>{
  // Keep track of previously initialized task-model pairs
  #tasks = Set<[Task<DataType>, EncodedModel]>()

  get tasks(): Set<[Task<DataType>, EncodedModel]> {
    return this.#tasks
  }

  /**
   * Method to add a new task and optionally its associated model.
   * It accepts parameters in different formats and handles 
   * shaping them into a Task and an EncodedModel.
   * The method emits a 'newTask' event with the resulting Task and EncodedModel.
   * 
   * If a Task and the EncodedModel is provided as parameters the method does change them
   * Otherwise the method handles shaping the parameters into a Task and EncodedModel 
   * before emitting the event
   * 
   * @param taskOrProvider either a Task or TaskProvider
   * @param model optional model, can already be an EncodedModel, a Model or a URL for the model
   */
  async addTask<D extends DataType>(
    taskOrProvider: Task<D> | TaskProvider<D>,
    model?: Model<D> | EncodedModel,
  ): Promise<void> {
    // get the task
    const task = isTask(taskOrProvider) ? taskOrProvider : taskOrProvider.getTask()

    // get the model
    let encodedModel: EncodedModel
    if (serialization.model.isEncoded(model)) {
      encodedModel = model // don't do anything if already encoded
    } else {
      let tfModel: Model<DataType>
      if (model === undefined) { 
        // Get the model if nothing is provided
        tfModel = await this.loadModelFromTask(taskOrProvider)
      } else if (model instanceof Model) {
        // Don't do anything if the model is already specified
        tfModel = model
      } else {
        throw new Error('invalid model')
      }
      encodedModel = await serialization.model.encode(tfModel)
    }

    // Add the task-model pair to the set
    this.#tasks = this.#tasks.add([task, encodedModel])
    this.emit('newTask', { task, encodedModel })
  }

  /**
   * Gets the model associated to a task. First checks if the model has been saved to disk.
   * Otherwise, initializes it from its architecture definition (and saves it to disk)
   * 
   * @param taskOrProvider either a Task or a TaskProvider
   * @returns a promise for the associated model
   */
  private async loadModelFromTask(
    taskOrProvider: Task<DataType> | TaskProvider<DataType>,
  ): Promise<Model<DataType>> {
    const task = isTask(taskOrProvider) ? taskOrProvider : taskOrProvider.getTask()
    let model: Model<DataType> | undefined
    
    const modelPath = `./models/${task.id}/`
    try {
      const content = await fs.readFile(`${modelPath}/model.json`)
      // cast as we trust the task ID
      return await serialization.model.decode(content)
    } catch {
      // unable to read file (potentially doesn't exist), continuing
    }
    
    if (isTask(taskOrProvider)) {
      // if the model isn't already saved to disk then we need the TaskProvider
      // to get the model architecture definition
      throw new Error('saved model not found and no way to get it')
    } else {
      model = await taskOrProvider.getModel()
    }

    // Save the model to disk
    await fs.mkdir(modelPath, { recursive: true })
    const encoded = await serialization.model.encode(model)
    await fs.writeFile(`${modelPath}/model.json`, encoded)
    
    return model
  }
}

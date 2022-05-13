import * as tf from '@tensorflow/tfjs'

import { Client, Task, TrainingInformant } from 'discojs'

import { DistributedTrainer } from './distributed_trainer'
import { LocalTrainer } from './local_trainer'
import { Trainer } from './trainer'
import { getLatestModel } from '../../tasks'
import * as memory from '../../memory'

/**
 * A class that helps build the Trainer and auxiliary classes.
 */
export class TrainerBuilder {
  // eslint-disable-next-line no-useless-constructor
  constructor (
    public useIndexedDB: boolean,
    public readonly task: Task,
    public readonly trainingInformant: TrainingInformant
  ) {}

  /**
   * Builds a trainer object.
   *
   * @param client client to share weights with (either distributed or federated)
   * @param distributed whether to build a distributed or local trainer
   * @returns
   */
  async build (client: Client, distributed: boolean = false): Promise<Trainer> {
    const model = await this.getModel()
    if (distributed) {
      return new DistributedTrainer(
        this.task,
        this.trainingInformant,
        this.useIndexedDB,
        model,
        model,
        client
      )
    } else {
      return new LocalTrainer(
        this.task,
        this.trainingInformant,
        this.useIndexedDB,
        model
      )
    }
  }

  private async getModel (): Promise<tf.LayersModel> {
    const model = await this.getModelFromMemoryOrFetchIt()
    return this.updateModelInformation(model)
  }

  private async getModelFromMemoryOrFetchIt (): Promise<tf.LayersModel> {
    const modelExistsInMemory = await memory.getWorkingModelMetadata(
      this.task.taskID,
      this.task.trainingInformation.modelID
    )

    if (this.useIndexedDB && modelExistsInMemory) {
      await memory.getWorkingModel(
        this.task.taskID,
        this.task.trainingInformation.modelID
      )
    }
    return await getLatestModel(this.task.taskID)
  }

  private updateModelInformation (model: tf.LayersModel): tf.LayersModel {
    // Continue local training from previous epoch checkpoint
    if (model.getUserDefinedMetadata() === undefined) {
      model.setUserDefinedMetadata({ epoch: 0 })
    }

    const info = this.task.trainingInformation
    model.compile(info.modelCompileData)

    if (info.learningRate) {
      // TODO: Not the right way to change learningRate and hence we cast to any
      // the right way is to construct the optimiser and pass learningRate via
      // argument.
      (model.optimizer as any).learningRate = info.learningRate
    }

    return model
  }
}

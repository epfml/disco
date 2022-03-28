import { Task } from '../../task/task'
import { RoundTracker } from './round_tracker'
import { TrainingInformant } from '../training_informant'
import { Client } from '../../communication/client'
import { DistributedTrainer } from './distributed_trainer'
import { LocalTrainer } from './local_trainer'
import { Trainer } from './trainer'
import * as tf from '@tensorflow/tfjs'
import * as memory from '../../memory/memory'

/**
 * A class that helps build the Trainer and auxiliary classes.
 */
export class TrainerBuilder {
  useIndexedDB: boolean
  task: Task
  trainingInformant: TrainingInformant

  constructor (useIndexedDB: boolean, task: Task, trainingInformant: TrainingInformant) {
    this.useIndexedDB = useIndexedDB
    this.task = task
    this.trainingInformant = trainingInformant
  }

  /**
   * Builds a trainer object.
   *
   * @param trainSize number of samples in the training set
   * @param client client to share weights with (either distributed or federated)
   * @param local whether to build a local or distributed trainer
   * @returns
   */
  async build (trainSize: number, client: Client, local: boolean = false): Promise<Trainer> {
    const model = await this.getModel(client)
    if (local) {
      return new LocalTrainer(
        this.task,
        this.trainingInformant,
        this.useIndexedDB,
        this.buildRoundTracker(trainSize),
        model
      )
    } else {
      return new DistributedTrainer(
        this.task,
        this.trainingInformant,
        this.useIndexedDB,
        this.buildRoundTracker(trainSize),
        model,
        client
      )
    }
  }

  /**
   * Build a round tracker, this keeps track of what round a training environment is currently on.
   *
   * @param trainSize number of samples in the training set
   * @returns
   */
  buildRoundTracker (trainSize: number) {
    const batchSize = this.task.trainingInformation.batchSize
    const roundDuration = this.task.trainingInformation.roundDuration
    return new RoundTracker(roundDuration, trainSize, batchSize)
  }

  private async getModel (client: Client) {
    const model = await this.getModelFromMemoryOrFetchIt(client)
    return this.updateModelInformation(model)
  }

  /**
   *
   * @returns
   */
  private async getModelFromMemoryOrFetchIt (client: Client) {
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
    return await client.getLatestModel()
  }

  private updateModelInformation (model: tf.LayersModel) {
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

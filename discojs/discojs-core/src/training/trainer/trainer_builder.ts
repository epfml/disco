import type tf from '@tensorflow/tfjs'

import type { client as clients, Task, TrainingInformant, TrainingFunction, ModelInfo, Memory } from '../..'
import { ModelType } from '../..'
import type { Aggregator } from '../../aggregator'

import { DistributedTrainer } from './distributed_trainer'
import { LocalTrainer } from './local_trainer'
import type { Trainer } from './trainer'

/**
 * A class that helps build the Trainer and auxiliary classes.
 */
export class TrainerBuilder {
  constructor (
    private readonly memory: Memory,
    private readonly task: Task,
    private readonly trainingInformant: TrainingInformant,
    private readonly trainingFunction?: TrainingFunction
  ) {}

  /**
   * Builds a trainer object.
   *
   * @param client client to share weights with (either distributed or federated)
   * @param distributed whether to build a distributed or local trainer
   * @returns
   */
  async build (aggregator: Aggregator, client: clients.Client, distributed: boolean = false): Promise<Trainer> {
    const model = await this.getModel(client)
    if (distributed) {
      return new DistributedTrainer(
        this.task,
        this.trainingInformant,
        this.memory,
        model,
        client,
        this.trainingFunction
      )
    } else {
      return new LocalTrainer(
        this.task,
        this.trainingInformant,
        this.memory,
        model,
        this.trainingFunction
      )
    }
  }

  /**
   * If a model exists in memory, laod it, otherwise load model from server
   * @returns
   */
  private async getModel (client: clients.Client): Promise<tf.LayersModel> {
    const modelID = this.task.trainingInformation?.modelID
    if (modelID === undefined) {
      throw new TypeError('model ID is undefined')
    }

    const info: ModelInfo = { type: ModelType.WORKING, taskID: this.task.id, name: modelID }

    const model = await (
      await this.memory.contains(info) ? this.memory.getModel(info) : client.getLatestModel()
    )

    return await this.updateModelInformation(model)
  }

  private async updateModelInformation (model: tf.LayersModel): Promise<tf.LayersModel> {
    // Continue local training from previous epoch checkpoint
    if (model.getUserDefinedMetadata() === undefined) {
      model.setUserDefinedMetadata({ epoch: 0 })
    }

    const info = this.task.trainingInformation
    if (info === undefined) {
      throw new TypeError('training information is undefined')
    }

    model.compile(info.modelCompileData)

    if (info.learningRate !== undefined) {
      // TODO: Not the right way to change learningRate and hence we cast to any
      // the right way is to construct the optimiser and pass learningRate via
      // argument.
      (model.optimizer as any).learningRate = info.learningRate
    }

    return model
  }
}

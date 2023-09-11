import { client as clients, Task, TrainingInformant, Memory, ModelType, ModelInfo, training } from '../..'
import { Aggregator } from '../../aggregator'

import { DistributedTrainer } from './distributed_trainer'
import { LocalTrainer } from './local_trainer'
import { Trainer } from './trainer'

/**
 * A class that helps build the Trainer and auxiliary classes.
 */
export class TrainerBuilder {
  constructor (
    private readonly memory: Memory,
    private readonly task: Task,
    private readonly trainingInformant: TrainingInformant
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
        client
      )
    } else {
      return new LocalTrainer(
        this.task,
        this.trainingInformant,
        this.memory,
        model
      )
    }
  }

  /**
   * If a model exists in memory, laod it, otherwise load model from server
   * @returns
   */
  private async getModel (client: clients.Client): Promise<training.model.Model> {
    const modelID = this.task.trainingInformation?.modelID
    if (modelID === undefined) {
      throw new TypeError('model ID is undefined')
    }

    const info: ModelInfo = { type: ModelType.WORKING, taskID: this.task.taskID, name: modelID }

    const model = await (
      await this.memory.contains(info) ? this.memory.getModel(info) : client.getLatestModel()
    )

    return await this.updateModelInformation(model)
  }

  private async updateModelInformation (model: training.model.Model): Promise<training.model.Model> {
    const m = model.raw
    // Continue local training from previous epoch checkpoint
    if (m.getUserDefinedMetadata() === undefined) {
      m.setUserDefinedMetadata({ epoch: 0 })
    }

    const info = this.task.trainingInformation
    if (info === undefined) {
      throw new TypeError('training information is undefined')
    }

    m.compile(info.modelCompileData)

    if (info.learningRate !== undefined) {
      // TODO: Not the right way to change learningRate and hence we cast to any
      // the right way is to construct the optimiser and pass learningRate via
      // argument.
      m.optimizer.learningRate = info.learningRate
    }

    return model
  }
}

import { Memory } from '@/memory'
import { Map } from 'immutable'
import { Client, dataset, Logger, Task, TrainingInformant, TrainingSchemes } from '..'

import { Trainer } from './trainer/trainer'
import { TrainerBuilder } from './trainer/trainer_builder'

/**
 * Handles the training loop, server communication & provides the user with feedback.
 */
export class Disco {
  private forScheme = Map<TrainingSchemes, [Client, Trainer]>()
  private readonly trainer: Promise<Trainer>

  constructor (
    public readonly task: Task,
    public readonly logger: Logger,
    public readonly memory: Memory,
    scheme: TrainingSchemes,
    informant: TrainingInformant,
    private readonly clientBuilder: (scheme: TrainingSchemes, task: Task) => Client
  ) {
    this.trainer = this.getTrainer(scheme, informant)
  }

  private async getTrainer (scheme: TrainingSchemes, informant: TrainingInformant): Promise<Trainer> {
    const cached = this.forScheme.get(scheme)
    if (cached !== undefined) {
      return cached[1]
    }

    const client = this.clientBuilder(scheme, this.task)
    await client.connect()

    const trainerBuilder = new TrainerBuilder(this.memory, this.task, informant)
    const trainer = await trainerBuilder.build(
      client,
      scheme !== TrainingSchemes.LOCAL
    )

    this.forScheme = this.forScheme.set(scheme, [client, trainer])

    return trainer
  }

  /**
   * @param scheme
   * @param informant
   * @param data
   */
  async startTraining (data: dataset.Data): Promise<void> {
    if (data.size === 0) {
      this.logger.error('Training aborted. No uploaded file given as input.')
      throw new Error('No data in dataset')
    }

    this.logger.success(
      'Thank you for your contribution. Data preprocessing has started'
    )

    await (await this.trainer).trainModel(data.dataset)
  }

  /**
   * Stops the training function and disconnects from
   */
  // TODO: should specify scheme
  async stopTraining (): Promise<void> {
    await Promise.all(
      this.forScheme.valueSeq().map(async ([client, trainer]) => {
        await trainer.stopTraining()
        await client.disconnect()
      })
    )

    this.logger.success('Training was successfully interrupted.')
  }
}

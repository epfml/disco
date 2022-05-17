import { Memory } from '@/memory'
import { Map } from 'immutable'
import { TrainingInformant, Client, Task, Logger, dataset, TrainingSchemes } from '..'

import { Trainer } from './trainer/trainer'
import { TrainerBuilder } from './trainer/trainer_builder'

/**
 * Handles the training loop, server communication & provides the user with feedback.
 */
export class Disco {
  private forScheme = Map<TrainingSchemes, [Client, Trainer]>()

  constructor (
    public readonly task: Task,
    public readonly logger: Logger,
    public readonly memory: Memory,
    private readonly clientBuilder: (scheme: TrainingSchemes, task: Task) => Client
  ) {}

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
   * @param data The preprocessed dataset to train on
   * @param distributed Whether to train in a distributed or local fashion
   */
  async startTraining (scheme: TrainingSchemes, informant: TrainingInformant, data: dataset.Data): Promise<void> {
    if (data.size === 0) {
      this.logger.error('Training aborted. No uploaded file given as input.')
      throw new Error('No data in dataset')
    }

    const trainer = await this.getTrainer(scheme, informant)

    this.logger.success(
      'Thank you for your contribution. Data preprocessing has started'
    )

    // TODO: dataset.size = null, since we build it with an iterator (issues occurs with ImageLoader) see issue 279
    void trainer.trainModel(data.dataset)
  }

  /**
   * Stops the training function and disconnects from
   */
  // TODO should specify scheme
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

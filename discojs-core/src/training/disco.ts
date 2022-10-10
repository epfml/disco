import { Memory } from '@/memory'
import { Client, dataset, Logger, Task, TrainingInformant, TrainingSchemes } from '..'

import { Trainer } from './trainer/trainer'
import { TrainerBuilder } from './trainer/trainer_builder'
import { TrainerLog } from '../logging/trainer_logger'

// Handles the training loop, server communication & provides the user with feedback.
export class Disco {
  private readonly trainer: Promise<Trainer>

  // client need to be connected
  constructor (
    public readonly task: Task,
    public readonly logger: Logger,
    public readonly memory: Memory,
    scheme: TrainingSchemes,
    informant: TrainingInformant,
    private readonly client: Client
  ) {
    if (client.task !== task) {
      throw new Error('client not setup for given task')
    }
    if (informant.taskID !== task.taskID) {
      throw new Error('informant not setup for given task')
    }

    const trainerBuilder = new TrainerBuilder(this.memory, this.task, informant)
    this.trainer = trainerBuilder.build(this.client, scheme !== TrainingSchemes.LOCAL)
  }

  async startTraining (dataTuple: dataset.DataSplit): Promise<void> {
    this.logger.success(
      'Thank you for your contribution. Data preprocessing has started')

    const trainDataset = dataTuple.train.batch().preprocess()
    // Use train as val dataset if val is undefined
    const valDataset = dataTuple.validation !== undefined
      ? dataTuple.validation.batch().preprocess()
      : trainDataset

    await (await this.trainer).trainModel(trainDataset.dataset, valDataset.dataset)
  }

  // Stops the training function
  //
  // do not disconnect given client
  async stopTraining (): Promise<void> {
    await (await this.trainer).stopTraining()

    this.logger.success('Training was successfully interrupted.')
  }

  async getTrainerLog (): Promise<TrainerLog> {
    return (await this.trainer).getTrainerLog()
  }
}

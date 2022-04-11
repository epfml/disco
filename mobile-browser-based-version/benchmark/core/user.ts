import { UserConfig } from './config'
import { TrainerLogger, TrainerLog } from '../../src/core/training/trainer/trainer_logger'

export type UserId = string

export interface User {
    id: UserId
    config: UserConfig
    logger: TrainerLogger

    start(): Promise<void>
    getResult(): TrainerLog

}

export class DiscoUser implements User {
  id: string
  config: UserConfig
  logger: TrainerLogger
  start (): Promise<void> {
    throw new Error('Method not implemented.')
  }

  getResult (): TrainerLog {
    throw new Error('Method not implemented.')
  }
}

export function MockUserGenerator (config: UserConfig): MockUser[] {
  const users = []
  let count = config.numberOfUsers
  while (count--) {
    const id = count.toString()
    users.push(new MockUser(id, config))
  }

  return users
}
export class MockUser implements User {
    id: UserId
    config: UserConfig
    logger: TrainerLogger

    constructor (id: UserId, config: UserConfig) {
      this.id = id
      this.config = config
      this.logger = new TrainerLogger(true)
    }

    async start (): Promise<void> {
      this.simulateTraining()
    }

    private simulateEpoch (): void {
      const log = {
        acc: 0.5,
        val_acc: 0.5,
        loss: 0.5
      }
      this.logger.onEpochEnd(1, log)
    }

    private simulateTraining (): void {
      this.simulateEpoch()
      this.simulateEpoch()
      this.simulateEpoch()
    }

    getResult (): TrainerLog {
      return this.logger.getTrainerLog()
    }
}

import { UserConfig } from '../config'
import { TrainerLogger, TrainerLog } from '../../../src/core/training/trainer/trainer_logger'
// import { List } from 'immutable'
import { User } from './user'

export class DiscoUser implements User {
  readonly id: string
  readonly config: UserConfig
  readonly logger: TrainerLogger
  start (): Promise<void> {
    throw new Error('Method not implemented.')
  }

  getLog (): TrainerLog {
    throw new Error('Method not implemented.')
  }
}

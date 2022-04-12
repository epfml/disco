import { BenchmarkConfig } from './config'
import { User, UserId } from './user'
import { TrainerLog } from '../../src/core/training/trainer/trainer_logger'
import { List } from 'immutable'

export type BenchmarkLog = Map<UserId, TrainerLog>

export class Benchmark<U extends User> {
    readonly config: BenchmarkConfig
    readonly users: List<U>

    constructor (config: BenchmarkConfig, users: List<U>) {
      this.config = config
      this.users = users
    }

    async start (): Promise<void> {
      this.users.forEach(user => user.start())
    }

    getResult (): BenchmarkLog {
      const result = new Map<UserId, TrainerLog>()
      this.users.forEach(user => {
        result.set(user.id, user.getLog())
      })
      return result
    }
}

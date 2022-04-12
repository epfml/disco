import { BenchmarkConfig } from './config'
import { User, UserId } from './user'
import { TrainerLog } from '../../src/core/training/trainer/trainer_logger'

export type BenchmarkLog = Map<UserId, TrainerLog>

export class Benchmark<U extends User> {
    readonly config: BenchmarkConfig
    readonly users: U[]

    constructor (config: BenchmarkConfig, users: U[]) {
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

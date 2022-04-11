import { BenchmarkConfig } from './config'
import { User, UserId } from './user'
import { TrainerLog } from '../../src/core/training/trainer/trainer_logger'

export type BenchmarkResult = Map<UserId, TrainerLog>

export class Benchmark<U extends User> {
    config: BenchmarkConfig
    users: U[]

    constructor (config: BenchmarkConfig, users: U[]) {
      this.config = config
      this.users = users
    }

    async start (): Promise<void> {
      this.users.forEach(user => user.start())
    }

    getResult (): BenchmarkResult {
      const result = new Map<UserId, TrainerLog>()
      this.users.forEach(user => {
        result.set(user.id, user.getResult())
      })
      return result
    }
}

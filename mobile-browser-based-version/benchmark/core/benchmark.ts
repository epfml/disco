import { BenchmarkConfig } from './config'
import { User, UserId } from './user'
import { LoggerResult } from './benchmark_logger'

export type BenchmarkResult = Map<UserId, LoggerResult>

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
      const result = new Map<UserId, LoggerResult>()
      this.users.forEach(user => {
        result.set(user.id, user.getResult())
      })
      return result
    }
}

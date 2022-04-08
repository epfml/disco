import { BenchmarkConfig } from './config'
import { MockUser, User, UserId } from './user'
import { LoggerResult } from './benchmark_logger'

export type BenchmarkResult = Map<UserId, LoggerResult>

export class Benchmark {
    config: BenchmarkConfig
    users: User[]

    constructor (config: BenchmarkConfig) {
      this.config = config
      this.initUsers()
    }

    private initUsers () {
      this.users = []
      let count = this.config.numberOfUsers
      while (count--) {
        const id = count.toString()
        this.users = [...this.users, new MockUser(id, this.config.userConfig)]
      }
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

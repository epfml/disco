import { User, UserID } from './users/user'
import { TrainerLog } from '../../src/core/training/trainer/trainer_logger'
import { List } from 'immutable'

export type BenchmarkLog = Map<UserID, TrainerLog>

export class Benchmark<U extends User> {
    readonly users: List<U>

    constructor (users: List<U>) {
      this.users = users
    }

    async start (): Promise<void> {
      const runningUsers = this.users.map(user => user.start())
      await Promise.all(runningUsers)
    }

    getResult (): BenchmarkLog {
      const result = new Map<UserID, TrainerLog>()
      this.users.forEach(user => {
        result.set(user.id, user.getLog())
      })
      return result
    }
}

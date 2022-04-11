import { UserConfig } from './config'
import { BenchmarkLogger, LoggerResult } from './benchmark_logger'

export type UserId = string

export interface User {
    id: UserId
    config: UserConfig
    logger: BenchmarkLogger

    start(): Promise<void>
    getResult(): LoggerResult

}

export class DiscoUser implements User {
  id: string
  config: UserConfig
  logger: BenchmarkLogger
  start (): Promise<void> {
    throw new Error('Method not implemented.')
  }

  getResult (): LoggerResult {
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
    logger: BenchmarkLogger

    constructor (id: UserId, config: UserConfig) {
      this.id = id
      this.config = config
      this.logger = new BenchmarkLogger()
    }

    async start (): Promise<void> {
      this.simulateTraining()
    }

    private simulateTraining (): void {
      this.logger.success('connected.')
      this.logger.success('train accuracy:.10')
      this.logger.success('validation accuracy:.15')
      this.logger.success('train accuracy:.30')
      this.logger.success('validation accuracy:.15')
      this.logger.success('train accuracy:.10')
      this.logger.success('validation accuracy:.20')
      this.logger.success('disconnected.')
    }

    getResult (): LoggerResult {
      return this.logger.loggerResult
    }
}

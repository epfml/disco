import { UserConfig } from './config'
import { BenchmarkLogger, LoggerResult } from './benchmark_logger'

export type UserId = string

export interface User{
    id: UserId
    config: UserConfig
    logger: BenchmarkLogger

    start(): Promise<void>
    getResult(): LoggerResult

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
      // TODO: connect + join training of trainingManager here
      this.logger.success('train accuracy:10')
      this.logger.success('train accuracy:30')
      this.logger.success('train accuracy:10')
      this.logger.success('validation accuracy:15')
      this.logger.success('validation accuracy:20')
      this.logger.success('validation accuracy:15')
      this.logger.success(': 10')
    }

    getResult (): LoggerResult {
      return this.logger.loggerResult
    }
}

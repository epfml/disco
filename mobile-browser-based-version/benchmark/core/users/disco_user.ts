import { BenchmarkConfig, UserConfig } from '../config'
import { TrainerLog } from '../../../src/core/training/trainer/trainer_logger'
import { User } from './user'

import { loadTasks } from '../../../src/core/task/utils'
import { ImageLoader } from '../../../src/core/dataset/data_loader/image_loader'
import { Data } from '../../../src/core/dataset/data_loader/data_loader'
import { Disco } from '../../../src/core/training/disco'
import { Task } from '../../../src/core/task/task'
import { Platform } from '../../../src/platforms/platform'
import { logger } from '../../../src/core/logging/console_logger'
import fs from 'fs'
import _ from 'lodash'

export class DiscoUserGenerator {
  static async generateUsersForCIFAR10 (benchmarkConfig: BenchmarkConfig): Promise<DiscoUser[]> {
    const cifar10 = (await loadTasks())[3]
    const platform = benchmarkConfig.platform
    let id = 0
    const users = benchmarkConfig.usersConfig.map(async (userConfig: UserConfig) => {
      return await this.generateSingleUserForCIFAR10(id++, userConfig, cifar10, platform)
    })
    return Promise.all(users)
  }

  private static async generateSingleUserForCIFAR10 (id: number, userConfig: UserConfig, task: Task, platform: Platform) {
    const dir = userConfig.trainDir
    const files = fs.readdirSync(dir).map((file) => dir.concat(file))
    const labels = _.map(_.range(24), (label) => (label % 10).toString())

    const data = await new ImageLoader(task).loadAll(files, { labels: labels })
    const disco = new Disco(task, platform, logger, false, true)
    return new DiscoUser(id.toString(), userConfig, disco, data)
  }
}

export class DiscoUser implements User {
  readonly id: string
  readonly config: UserConfig
  private readonly disco: Disco
  private readonly data: Data

  constructor (id: string, config: UserConfig, disco: Disco, data: Data) {
    this.id = id
    this.config = config
    this.disco = disco
    this.data = data
  }

  async start (): Promise<void> {
    await this.disco.connect()
    await this.disco.startTraining(this.data, true)
    await this.disco.disconnect()
  }

  getLog (): TrainerLog {
    return this.disco.getTrainerLog()
  }
}

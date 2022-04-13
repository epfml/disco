import { BenchmarkConfig, UserConfig } from '../config'
import { TrainerLog } from '../../../src/core/training/trainer/trainer_logger'
import { User } from './user'

import { loadTasks } from '../../../src/core/task/utils'
import { ImageLoader } from '../../../src/core/dataset/data_loader/image_loader'
import { Disco } from '../../../src/core/training/disco'
import { Task } from '../../../src/core/task/task'
import { Platform } from '../../../src/platforms/platform'
import { logger } from '../../../src/core/logging/console_logger'
import fs from 'fs'
import _ from 'lodash'
import { Dataset } from '../../../src/core/dataset/dataset_builder'

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

    const dataset = await new ImageLoader(task).loadAll(files, { labels: labels })
    const bt = dataset.batch(2)
    console.log({ dataset, bt })
    const disco = new Disco(task, platform, logger, false, true)
    return new DiscoUser(id.toString(), userConfig, disco, dataset)
  }
}

export class DiscoUser implements User {
  readonly id: string
  readonly config: UserConfig
  private readonly disco: Disco
  private readonly dataset: Dataset

  constructor (id: string, config: UserConfig, disco: Disco, dataset: Dataset) {
    this.id = id
    this.config = config
    this.disco = disco
    this.dataset = dataset
  }

  async start (): Promise<void> {
    await this.disco.connect()
    // await this.disco.startTraining(this.dataset, true)
    await this.disco.disconnect()
  }

  getLog (): TrainerLog {
    return this.disco.getTrainerLog()
  }
}

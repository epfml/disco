
import { Platform } from '../src/platforms/platform'
import { BenchmarkConfig, UserConfig } from './core/config'
import { DiscoUserGenerator } from './core/users/disco_user'
import { Benchmark } from './core/benchmark'
import { List } from 'immutable'
import { save } from './core/result_io'

function getUserConfig (): UserConfig {
  return {
    trainDir: './example_training_data/CIFAR10/',
    validDir: './example_training_data/CIFAR10/',
    trainConfig: {
      epochs: 10
    }
  }
}

describe('Running benchmark', () => {
  it('start training cifar10', async () => {
    const taskID: string = 'cifar10'
    const config: BenchmarkConfig = {
      platform: Platform.federated,
      usersConfig: [getUserConfig()],
      saveConfig: {
        path: './benchmark/results/',
        fileName: `${taskID}.json`
      }
    }
    const users = await DiscoUserGenerator.generateUsersForCIFAR10(config)

    const benchmark = new Benchmark(List(users))
    await benchmark.start()
    // save(benchmark.getResult(), config.saveConfig)
  }).timeout(5 * 60 * 1000)
})

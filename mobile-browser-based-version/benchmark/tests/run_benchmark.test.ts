import { Benchmark } from '../core/benchmark'
import { MockUserGenerator } from './mock_user'
import { save } from '../core/result_io'

describe('Running benchmark', () => {
  it('MockUser', async () => {
    const taskId = 'test'
    // init config
    const config = {
      userConfig: {
        numberOfUsers: 2,
        trainingScheme: 'federated'
      },
      saveConfig: {
        path: './benchmark/tests/results/',
        fileName: `${taskId}.csv`
      }
    }

    // run benchmark
    const users = MockUserGenerator(config.userConfig)
    const benchmark = new Benchmark(config, users)
    await benchmark.start()
    save(benchmark.getResult(), config.saveConfig)
  })
})

import { Benchmark } from './core/benchmark'
import { save } from './core/result_io'

describe('Running benchmark', () => {
  it('simple', async () => {
    const taskId = 'test'
    // init config
    const config = {
      numberOfUsers: 2,
      userConfig: {
        trainingScheme: 'federated'
      },
      saveConfig: {
        path: './benchmark/experiments/test/',
        fileName: `${taskId}.csv`
      }
    }

    // run benchmark
    const benchmark = new Benchmark(config)
    await benchmark.start()
    save(benchmark.getResult(), config.saveConfig)
  })
})

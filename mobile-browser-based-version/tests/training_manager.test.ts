import { expect } from 'chai'
import { loadTasks } from '../src/core/task/utils'
import { TabularLoader } from '../src/core/dataset/data_loader/tabular_loader'
import { TrainingManager } from '../src/core/training/training_manager'
import { logger } from '../src/core/logging/console_logger'
import { Platform } from '../src/platforms/platform'

const platform = Platform.federated
const inputFiles = ['file://./example_training_data/titanic.csv']

describe('train test', () => {
  it('connect then start and stop training the titanic task', async () => {
    const titanic = (await loadTasks())[0]
    const loader = new TabularLoader(',')
    const dataset = loader.load(
      inputFiles[0],
      {
        features: titanic.trainingInformation.inputColumns,
        labels: titanic.trainingInformation.outputColumns
      }
    )
    const trainer = new TrainingManager(titanic, platform, logger, false)

    await trainer.connect()
    expect(trainer.isConnected).true
    await trainer.startTraining(dataset, false)
    expect(trainer.isTraining).true
    await trainer.stopTraining()
    expect(trainer.isTraining).false
    expect(trainer.isConnected).false
  })
})

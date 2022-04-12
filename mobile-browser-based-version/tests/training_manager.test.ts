import { expect } from 'chai'
import { loadTasks } from '../src/core/task/utils'
import { TabularLoader } from '../src/core/dataset/data_loader/tabular_loader'
import { Disco } from '../src/core/training/disco'
import { logger } from '../src/core/logging/console_logger'
import { TrainingSchemes } from '../src/core/training/trainingSchemes'

const trainingScheme = TrainingSchemes.FEDERATED
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
    const trainer = new Disco(titanic, logger, false)

    await trainer.connect()
    expect(trainer.isConnected).true
    await trainer.startTraining(dataset, trainingScheme)
    expect(trainer.isTraining).true
    await trainer.stopTraining()
    expect(trainer.isTraining).false
    expect(trainer.isConnected).false
  })
})

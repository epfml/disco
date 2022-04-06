import { expect } from 'chai'
import { TabularLoader } from '../../../../src/core/dataset/data_loader/tabular_loader'
import { loadTasks } from '../../../../src/core/task/utils'

const inputFiles = ['file://./example_training_data/titanic.csv']

describe('tabular loader test', () => {
  it('titanic csv column names', async () => {
    const titanic = (await loadTasks())[0]
    const loader = new TabularLoader(',')
    const features = titanic.trainingInformation.inputColumns
    const labels = titanic.trainingInformation.outputColumns
    const dataset = loader.load(
      inputFiles[0],
      {
        features: features,
        labels: labels
      }
    )
    expect(await dataset.columnNames()).eql(features.concat(labels))
  })

  it('titanic csv row types', async () => {
    const titanic = (await loadTasks())[0]
    const loader = new TabularLoader(',')
    const dataset = loader.load(
      inputFiles[0],
      {
        features: titanic.trainingInformation.inputColumns,
        labels: titanic.trainingInformation.outputColumns
      }
    )
    const iterator = await dataset.iterator()
    const sample = await iterator.next()
    /**
     * Data loaders simply return a dataset object read from input sources.
     * They do NOT apply any transform/conversion, which is left to the
     * dataset builder.
     */
    expect(sample).eql({
      value: {
        xs: {
          PassengerId: 1,
          Pclass: 3,
          Age: 22,
          SibSp: 1,
          Parch: 0,
          Fare: 7.25
        },
        ys: { Survived: 0 }
      },
      done: false
    })
  })
})

import { expect } from 'chai'

import { dataset } from 'discojs'

import { loadTasks } from '../../../src/tasks'

const inputFiles = ['./example_training_data/titanic.csv']

describe('tabular loader test', () => {
  it('titanic csv load  sample', async () => {
    const titanic = (await loadTasks())[0]
    const loaded = new dataset.TabularLoader(titanic, ',').load(
      'file://'.concat(inputFiles[0]),
      {
        features: titanic.trainingInformation.inputColumns,
        labels: titanic.trainingInformation.outputColumns
      }
    )
    const sample = await (await (await loaded).iterator()).next()
    /**
     * Data loaders simply return a dataset object read from input sources.
     * They do NOT apply any transform/conversion, which is left to the
     * dataset builder.
     */
    expect(sample).to.eql({
      value: {
        xs: [1, 3, 22, 1, 0, 7.25],
        ys: [0]
      },
      done: false
    })
  })
})

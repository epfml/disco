import { expect } from 'chai'
import * as tf from '@tensorflow/tfjs-node'

import { dataset, tasks } from '../../../src'

export class NodeTabularLoader extends dataset.TabularLoader<string> {
  loadTabularDatasetFrom (source: string, csvConfig: Record<string, unknown>): tf.data.CSVDataset {
    return tf.data.csv(source, csvConfig)
  }
}

const inputFiles = ['./example_training_data/titanic.csv']

describe('tabular loader test', () => {
  it('titanic csv load  sample', async () => {
    const titanic = tasks.titanic.task
    const loaded = new NodeTabularLoader(titanic, ',').load(
      'file://'.concat(inputFiles[0]),
      {
        features: titanic.trainingInformation?.inputColumns,
        labels: titanic.trainingInformation?.outputColumns
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

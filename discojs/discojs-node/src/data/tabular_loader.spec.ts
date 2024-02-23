import { assert, expect } from 'chai'
import { List } from 'immutable'
import tf from '@tensorflow/tfjs'

import type { Task } from '@epfml/discojs-core'

import { TabularLoader } from './tabular_loader'

const inputFiles = ['../../example_training_data/titanic_train.csv']

const titanicMock: Task = {
  id: 'titanic',
  displayInformation: {},
  trainingInformation: {
    modelID: 'titanic',
    epochs: 1,
    roundDuration: 1,
    validationSplit: 0,
    batchSize: 1,
    dataType: 'tabular',
    scheme: 'federated',
    inputColumns: [
      'PassengerId',
      'Age',
      'SibSp',
      'Parch',
      'Fare',
      'Pclass'
    ],
    outputColumns: [
      'Survived'
    ]
  }
}

describe('tabular loader', () => {
  it('loads a single sample', async () => {
    const loaded = new TabularLoader(titanicMock, ',').loadAll(
      inputFiles,
      {
        features: titanicMock.trainingInformation?.inputColumns,
        labels: titanicMock.trainingInformation?.outputColumns,
        shuffle: false
      }
    )
    const sample = await (await (await loaded).train.dataset.iterator()).next()
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

  it('shuffles samples', async () => {
    const titanic = titanicMock
    const loader = new TabularLoader(titanic, ',')
    const config = {
      features: titanic.trainingInformation?.inputColumns,
      labels: titanic.trainingInformation?.outputColumns,
      shuffle: false
    }
    const dataset = await (await loader
      .loadAll(inputFiles, config))
      .train.dataset.toArray()
    const shuffled = await (await loader
      .loadAll(inputFiles, { ...config, shuffle: true }))
      .train.dataset.toArray()

    const misses = List(dataset).zip(List(shuffled)).map(([d, s]) =>
      tf.notEqual((d as any).xs as tf.Tensor, (s as any).xs as tf.Tensor).any().dataSync()[0]
    ).reduce((acc: number, e) => acc + e)
    assert(misses > 0)
  })
})

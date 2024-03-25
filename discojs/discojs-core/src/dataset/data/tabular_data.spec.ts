import { assert, expect } from 'chai'
import { Map, Set } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import { TabularData } from './tabular_data.js'
import type { Task } from '../../index.js'

describe('tabular data checks', () => {
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

  const dataConfig = {
    features: titanicMock.trainingInformation.inputColumns,
    labels: titanicMock.trainingInformation.outputColumns
  }

  const columnConfigs = Map(
    Set(dataConfig.features).map((feature) => [feature, { required: false, isLabel: false }])
  ).merge(
    Set(dataConfig.labels).map((label) => [label, { required: true, isLabel: true }])
  )

  const csvConfig = {
    hasHeader: true,
    columnConfigs: columnConfigs.toObject(),
    configuredColumnsOnly: true,
    delimiter: ','
  }

  it('throw an error on incorrectly formatted data', async () => {
    try {
      await TabularData.init(tf.data.csv('file://../../datasets/cifar10-labels.csv', csvConfig), titanicMock, 3)
    } catch (e) {
      expect(e).to.be.an.instanceOf(Error)
      return
    }
    // no error means we failed
    assert(false)
  })

  it('do nothing on correctly formatted data', async () => {
    await TabularData.init(tf.data.csv('file://../../datasets/titanic_train.csv', csvConfig), titanicMock, 3)
  })
})

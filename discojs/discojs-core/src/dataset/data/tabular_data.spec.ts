import { assert, expect } from 'chai'
import { Map, Set } from 'immutable'

import { TabularData } from './tabular_data'
import { tf, type Task } from '../..'

describe('tabular data checks', () => {
  const titanicMock: Task = {
    taskID: 'titanic',
    displayInformation: {},
    trainingInformation: {
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
  } as unknown as Task

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
      await TabularData.init(tf.data.csv('file://../../example_training_data/cifar10-labels.csv', csvConfig), titanicMock, 3)
    } catch (e) {
      expect(e).to.be.an.instanceOf(Error)
      return
    }
    // no error means we failed
    assert(false)
  })

  it('do nothing on correctly formatted data', async () => {
    await TabularData.init(tf.data.csv('file://../../example_training_data/titanic_train.csv', csvConfig), titanicMock, 3)
  })
})

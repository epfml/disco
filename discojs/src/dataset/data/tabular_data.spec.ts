import { assert, expect } from 'chai'
import { Map, Set } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import { TabularData } from './tabular_data.js'
import { defaultTasks } from '../../index.js'


describe('tabular data checks', () => {
  const titanicTask = defaultTasks.titanic.getTask()
  

  const dataConfig = {
    features: titanicTask.trainingInformation.inputColumns,
    label: titanicTask.trainingInformation.outputColumn
  }

  const columnConfigs = Map(
    Set(dataConfig.features).map((feature) => [feature, { required: false, isLabel: false }])
  ).merge(
    Set.of(dataConfig.label).map((label) => [label, { required: true, isLabel: true }])
  )

  const csvConfig = {
    hasHeader: true,
    columnConfigs: columnConfigs.toObject(),
    configuredColumnsOnly: true,
    delimiter: ','
  }

  it('throw an error on incorrectly formatted data', async () => {
    try {
      await TabularData.init(tf.data.csv('file://../datasets/cifar10-labels.csv', csvConfig), titanicTask, 3)
    } catch (e) {
      expect(e).to.be.an.instanceOf(Error)
      return
    }
    // no error means we failed
    assert(false)
  })

  it('do nothing on correctly formatted data', async () => {
    await TabularData.init(tf.data.csv('file://../datasets/titanic_train.csv', csvConfig), titanicTask, 3)
  })
})

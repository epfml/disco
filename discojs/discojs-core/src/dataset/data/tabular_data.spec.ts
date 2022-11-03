import { assert, expect } from 'chai'

import { tasks, node } from '@epfml/discojs-node'

describe('tabular data checks', () => {
  const task = tasks.titanic.task
  const dataConfig = {
    features: task.trainingInformation.inputColumns,
    labels: task.trainingInformation.outputColumns
  }
  const loader = new node.data.NodeTabularLoader(task, ',')

  it('throw an error on incorrectly formatted data', async () => {
    try {
      await loader.loadAll(['../../example_training_data/cifar10-labels.csv'], dataConfig)
    } catch (e) {
      expect(e).to.be.an.instanceOf(Error)
      return
    }
    // no error means we failed
    assert(false)
  })

  it('do nothing on correctly formatted data', async () => {
    await loader.loadAll(['../../example_training_data/titanic_train.csv'], dataConfig)
  })
})

import { assert, expect } from 'chai'
import * as tf from '@tensorflow/tfjs'

import { defaultTasks } from '@epfml/discojs'

import { TabularLoader } from './tabular_loader.js'

describe('tabular loader', () => {
  const inputFiles = ['../datasets/titanic_train.csv']
  
  const titanicTask = defaultTasks.titanic.getTask()

  it('loads a single sample', async () => {
    const loaded = new TabularLoader(titanicTask, ',').loadAll(
      inputFiles,
      {
        features: titanicTask.trainingInformation?.inputColumns,
        labels: [titanicTask.trainingInformation?.outputColumn as string],
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
        xs: [3, 22, 1, 0, 7.25],
        ys: [0]
      },
      done: false
    })
  })

  it('shuffles samples', async () => {
    const titanic = titanicTask
    const loader = new TabularLoader(titanic, ',')
    const config = {
      features: titanic.trainingInformation?.inputColumns,
      labels: [titanic.trainingInformation?.outputColumn as string],
      shuffle: false
    }
    const dataset = (await (await loader
      .loadAll(inputFiles, config))
      .train.dataset.toArray()) as Array<Record<'xs' | 'ys', tf.Tensor>>
    const shuffled = (await (await loader
      .loadAll(inputFiles, { ...config, shuffle: true }))
      .train.dataset.toArray()) as Array<Record<'xs' | 'ys', tf.Tensor>>

    const misses = dataset.map((d, i) =>
      tf.notEqual(d.xs, shuffled[i].xs).any().dataSync()[0]
    ).reduce((acc: number, e) => acc + e)
    assert(misses > 0)
  })
})

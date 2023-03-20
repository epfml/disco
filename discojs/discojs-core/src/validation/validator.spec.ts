import { assert } from 'chai'
import fs from 'fs'

import { Task, node, Validator, ConsoleLogger, EmptyMemory, client, data } from '@epfml/discojs-node'

const simplefaceMock = {
  taskID: 'simple_face',
  displayInformation: {},
  trainingInformation: {
    modelID: 'simple_face-model',
    batchSize: 4,
    dataType: 'image',
    IMAGE_H: 200,
    IMAGE_W: 200,
    LABEL_LIST: ['child', 'adult'],
    modelCompileData: {
      optimizer: 'sgd',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    }
  }
} as unknown as Task

describe('validator', () => {
  it('works for simple_face', async () => {
    const dir = '../../example_training_data/simple_face/'
    const files: string[][] = ['child/', 'adult/']
      .map((subdir: string) => fs.readdirSync(dir + subdir)
        .map((file: string) => dir + subdir + file))
    const labels = files.flatMap((files, index) => Array(files.length).fill(index))

    const data: data.Data = (await new node.data.NodeImageLoader(simplefaceMock)
      .loadAll(files.flat(), { labels })).train
    const validator = new Validator(
      simplefaceMock,
      new ConsoleLogger(),
      new EmptyMemory(),
      undefined,
      new client.Local(new URL('http://localhost:8080'), simplefaceMock))
    await validator.assess(data)
    const size = data.size !== undefined ? data.size : -1
    if (size === -1) {
      console.log('data.size was undefined')
    }
    assert(
      validator.visitedSamples === data.size,
      `expected ${size} visited samples but got ${validator.visitedSamples}`
    )
    assert(
      validator.accuracy > 0.3,
      `expected accuracy greater than 0.3 but got ${validator.accuracy}`
    )
    console.table(validator.confusionMatrix)
  }).timeout(10_000)

  // TODO: fix titanic model (nan accuracy)
  // it('works for titanic', async () => {
  //   const data: Data = await new NodeTabularLoader(titanic.task, ',')
  //     .loadAll(['../../example_training_data/titanic.csv'], {
  //       features: titanic.task.trainingInformation?.inputColumns,
  //       labels: titanic.task.trainingInformation?.outputColumns
  //     })
  //   const validator = new Validator(titanic.task, new ConsoleLogger(), titanic.model())
  //   await validator.assess(data)

  //   assert(
  //     validator.visitedSamples() === data.size,
  //     `expected ${TITANIC_SAMPLES} visited samples but got ${validator.visitedSamples()}`
  //   )
  //   assert(
  //     validator.accuracy() > 0.5,
  //     `expected accuracy greater than 0.5 but got ${validator.accuracy()}`
  //   )
  // })
})

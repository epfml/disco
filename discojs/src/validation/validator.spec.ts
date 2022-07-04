import { Validator } from '.'
import { ConsoleLogger } from '../logging'
import { simple_face } from '../tasks'
import { Data } from '../dataset'
import { NodeImageLoader } from '../../tests/dataset/data_loader/image_loader.test'
import { assert } from 'chai'
import fs from 'fs'

describe('validator', () => {
  it('works for simple_face', async () => {
    const dir = './example_training_data/simple_face/'
    const files: string[][] = ['child/', 'adult/']
      .map((subdir: string) => fs.readdirSync(dir + subdir)
        .map((file: string) => dir + subdir + file))

    const data: Data = await new NodeImageLoader(simple_face.task)
      .loadAll(files.flat(), { labels: files.flatMap((files, index) => Array(files.length).fill(index)) })
    const validator = new Validator(simple_face.task, new ConsoleLogger(), simple_face.model())
    await validator.assess(data)

    assert(
      validator.visitedSamples() === data.size,
      `expected ${data.size} visited samples but got ${validator.visitedSamples()}`
    )
    assert(
      validator.accuracy() > 0.3,
        `expected accuracy greater than 0.3 but got ${validator.accuracy()}`
    )
  })
  // TODO: fix titanic model (nan accuracy)
  // it('works for titanic', async () => {
  //   const data: Data = await new NodeTabularLoader(titanic.task, ',')
  //     .loadAll(['file://./example_training_data/titanic.csv'], {
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

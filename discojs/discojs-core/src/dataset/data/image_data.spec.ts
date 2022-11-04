import { assert, expect } from 'chai'

import { tasks, node } from '@epfml/discojs-node'

describe('image data checks', () => {
  const task = tasks.simple_face.task
  const dataConfig = { labels: ['dummy'] }
  const loader = new node.data.NodeImageLoader(task)

  it('throw an error on incorrectly formatted data', async () => {
    try {
      await loader.loadAll(['../../example_training_data/9-mnist-example.png'], dataConfig)
    } catch (e) {
      expect(e).to.be.an.instanceOf(Error)
      return
    }
    // no error means we failed
    assert(false)
  })

  it('do nothing on correctly formatted data', async () => {
    await loader.loadAll(['../../example_training_data/simple_face-example.png'], dataConfig)
  })
})

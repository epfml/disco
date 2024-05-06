import { assert, expect } from 'chai'
import * as tf from '@tensorflow/tfjs'

import { ImageData } from './image_data.js'
import { defaultTasks } from '../../index.js'

describe('image data checks', () => {
  const simpleFaceTask = defaultTasks.simpleFace.getTask()
  it('throw an error on incorrectly formatted data', async () => {
    try {
      await ImageData.init(tf.data.array([tf.zeros([150, 150, 3]), tf.zeros([150, 150, 3])]), simpleFaceTask, 3)
    } catch (e) {
      expect(e).to.be.an.instanceOf(Error)
      return
    }
    // no error means we failed
    assert(false)
  })

  it('do nothing on correctly formatted data', async () => {
    await ImageData.init(tf.data.array([tf.zeros([200, 200, 3]), tf.zeros([200, 200, 3])]), simpleFaceTask, 3)
  })
})

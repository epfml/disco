import { assert, expect } from 'chai'
import * as tf from '@tensorflow/tfjs'

import { ImageData } from './image_data.js'
import type { Task } from '../../index.js'

describe('image data checks', () => {
  const simplefaceMock: Task = {
    id: 'simpleface',
    displayInformation: {},
    trainingInformation: {
      IMAGE_H: 200,
      IMAGE_W: 200
    }
  } as unknown as Task

  it('throw an error on incorrectly formatted data', async () => {
    try {
      await ImageData.init(tf.data.array([tf.zeros([150, 150, 3]), tf.zeros([150, 150, 3])]), simplefaceMock, 3)
    } catch (e) {
      expect(e).to.be.an.instanceOf(Error)
      return
    }
    // no error means we failed
    assert(false)
  })

  it('do nothing on correctly formatted data', async () => {
    await ImageData.init(tf.data.array([tf.zeros([200, 200, 3]), tf.zeros([200, 200, 3])]), simplefaceMock, 3)
  })
})

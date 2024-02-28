import { assert, expect } from 'chai'
import { List, Map, Range } from 'immutable'
import fs from 'fs'

import tf from '@tensorflow/tfjs'
import { node as tfNode } from '@tensorflow/tfjs-node'

import { node, type Task } from '../..'

const readFilesFromDir = (dir: string): string[] =>
  fs.readdirSync(dir).map((file: string) => dir + file)

const DIRS = {
  CIFAR10: '../../example_training_data/CIFAR10/'
}

const cifar10Mock: Task = {
  taskID: 'cifar10',
  displayInformation: {},
  trainingInformation: {
    IMAGE_H: 32,
    IMAGE_W: 32,
    LABEL_LIST: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  }
} as unknown as Task

const mnistMock: Task = {
  taskID: 'mnist',
  displayInformation: {},
  trainingInformation: {
    IMAGE_H: 28,
    IMAGE_W: 28,
    LABEL_LIST: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  }
} as unknown as Task

const LOADERS = {
  CIFAR10: new node.data.NodeImageLoader(cifar10Mock),
  MNIST: new node.data.NodeImageLoader(mnistMock)
}
const FILES = Map(DIRS).map((readFilesFromDir)).toObject()

describe('image loader', () => {
  it('loads single sample without label', async () => {
    const file = '../../example_training_data/9-mnist-example.png'
    const singletonDataset = await LOADERS.MNIST.load(file)
    const imageContent = tfNode.decodeImage(fs.readFileSync(file))
    await Promise.all((await singletonDataset.toArrayForTest()).map(async (entry) => {
      expect(await imageContent.bytes()).eql(await (entry as tf.Tensor).bytes())
    }))
  })

  it('loads multiple samples without labels', async () => {
    const imagesContent = FILES.CIFAR10.map((file) => tfNode.decodeImage(fs.readFileSync(file)))
    const datasetContent = await (await LOADERS.CIFAR10
      .loadAll(FILES.CIFAR10, { shuffle: false }))
      .train.dataset.toArray()
    expect(datasetContent.length).equal(imagesContent.length)
    expect((datasetContent[0] as tf.Tensor3D).shape).eql(imagesContent[0].shape)
  })

  it('loads single sample with label', async () => {
    const path = DIRS.CIFAR10 + '0.png'
    const imageContent = tfNode.decodeImage(fs.readFileSync(path))
    const datasetContent = await (await LOADERS.CIFAR10
      .load(path, { labels: ['example'] })).toArray()
    expect((datasetContent[0] as any).xs.shape).eql(imageContent.shape)
    expect((datasetContent[0] as any).ys).eql('example')
  })

  it('loads multiple samples with labels', async () => {
    const labels = Range(0, 24).map((label) => (label % 10))
    const stringLabels = labels.map((label) => label.toString())
    const oneHotLabels = List(tf.oneHot(labels.toArray(), 10).arraySync() as number[])

    const imagesContent = List(FILES.CIFAR10.map((file) => tfNode.decodeImage(fs.readFileSync(file))))
    const datasetContent = List(await (await LOADERS.CIFAR10
      .loadAll(FILES.CIFAR10, { labels: stringLabels.toArray(), shuffle: false }))
      .train.dataset.toArray())

    expect(datasetContent.size).equal(imagesContent.size)
    datasetContent.zip(imagesContent).zip(oneHotLabels).forEach(([[actual, sample], label]) => {
      if (!(
        typeof actual === 'object' && actual !== null &&
        'xs' in actual && 'ys' in actual
      )) {
        throw new Error('unexpected type')
      }
      const { xs, ys } = actual as { xs: tf.Tensor, ys: number[] }
      expect(xs.shape).eql(sample?.shape)
      expect(ys).eql(label)
    })
  })

  it('loads samples in order', async () => {
    const loader = new node.data.NodeImageLoader(cifar10Mock)
    const dataset = await ((await loader.loadAll(FILES.CIFAR10, { shuffle: false })).train.dataset).toArray()

    List(dataset).zip(List(FILES.CIFAR10))
      .forEach(async ([s, f]) => {
        const sample = (await (await loader.load(f)).toArray())[0]
        assert.deepEqual((await tf.equal(s as tf.Tensor, sample as tf.Tensor).all().array()), [1])
      })
    assert(true)
  })

  it('shuffles list', async () => {
    const loader = new node.data.NodeImageLoader(cifar10Mock)
    const list = Range(0, 100_000).toArray()
    const shuffled = [...list]

    loader.shuffle(shuffled)
    expect(list).to.not.eql(shuffled)

    shuffled.sort((a, b) => a - b)
    expect(list).to.eql(shuffled)
  })

  it('shuffles samples', async () => {
    const loader = new node.data.NodeImageLoader(cifar10Mock)
    const dataset = await (await loader.loadAll(FILES.CIFAR10, { shuffle: false })).train.dataset.toArray()
    const shuffled = await (await loader.loadAll(FILES.CIFAR10, { shuffle: true })).train.dataset.toArray()

    const misses = List(dataset).zip(List(shuffled)).map(([d, s]) =>
      tf.notEqual(d as tf.Tensor, s as tf.Tensor).any().dataSync()[0]
    ).reduce((acc: number, e) => acc + e)
    assert(misses > 0)
  })
  it('validation split', async () => {
    const validationSplit = 0.2
    const imagesContent = FILES.CIFAR10.map((file) => tfNode.decodeImage(fs.readFileSync(file)))
    const datasetContent = await new node.data.NodeImageLoader(cifar10Mock)
      .loadAll(FILES.CIFAR10, { shuffle: false, validationSplit })

    const trainSize = Math.floor(imagesContent.length * (1 - validationSplit))
    expect((await datasetContent.train.dataset.toArray()).length).equal(trainSize)
    if (datasetContent.validation === undefined) {
      assert(false)
    }
    expect((await datasetContent.validation.dataset.toArray()).length).equal(imagesContent.length - trainSize)
  })
})

import { assert, expect } from 'chai'
import { List, Range, Repeat } from 'immutable'
import fs from 'node:fs/promises'
import * as tf from '@tensorflow/tfjs'
import { node as tfNode } from '@tensorflow/tfjs-node'

import { defaultTasks } from '@epfml/discojs'
import { ImageLoader } from './image_loader.js'

const DATASET_DIR = '../datasets/'

async function readFilesFromDir(dir: string): Promise<string[]>{
  return (await fs.readdir(dir)).map((file: string) => dir + file)
}

const FILES = {
  CIFAR10: await readFilesFromDir(DATASET_DIR + 'CIFAR10/'),
  LUS_COVID: await readFilesFromDir(DATASET_DIR + 'lus_covid/COVID+/'),
}

const LOADERS = {
  CIFAR10: new ImageLoader(defaultTasks.cifar10.getTask()),
  LUS_COVID: new ImageLoader(defaultTasks.lusCovid.getTask()),
  MNIST: new ImageLoader(defaultTasks.mnist.getTask()),
  SIMPLE_FACE: new ImageLoader(defaultTasks.simpleFace.getTask()),
}

async function readImageTensor(source: string, channels?: number) {
  console.log(source)
  return tfNode.decodeImage(await fs.readFile(source), channels) as tf.Tensor3D
}

const imagesCIFAR10 = await Promise.all(FILES.CIFAR10.map(source => readImageTensor(source)))

describe('image loader', () => {
  it('loads single MNIST sample without label', async () => {
    const source = `${DATASET_DIR}/9-mnist-example.png`
    const singletonDataset = await LOADERS.MNIST.load(source)
    const imageContent = await readImageTensor(source)

    const datasetArr = await singletonDataset.toArrayForTest()
    await Promise.all(datasetArr.map(async (entry) => {
      expect(await imageContent.bytes()).eql(await (entry as tf.Tensor).bytes())
    }))
  })
  it('loads single simple face sample without label', async () => {
    const source = `${DATASET_DIR}/simple_face-example.png`
    const singletonDataset = await LOADERS.SIMPLE_FACE.load(source)
    const imageContent = await readImageTensor(source)

    const datasetArr = await singletonDataset.toArrayForTest()
    await Promise.all(datasetArr.map(async (entry) => {
      expect(await imageContent.bytes()).eql(await (entry as tf.Tensor).bytes())
    }))
  })

  it('loads lus images with 3 channels', async () => {
    const channels = 3 
    const imagesContent = FILES.LUS_COVID.map(source => readImageTensor(source, channels))
    const datasetContent = await (await LOADERS.LUS_COVID
      .loadAll(FILES.LUS_COVID, { shuffle: false, channels }))
      .train.dataset.toArray()
    
    expect(datasetContent.length).equal(imagesContent.length)
    expect((datasetContent[0] as tf.Tensor3D).shape[2]).equals(3)
    expect((datasetContent[0] as tf.Tensor3D).shape).eql((await imagesContent[0]).shape)
  })


  it('loads multiple samples without labels', async () => {
    const datasetContent = await (await LOADERS.CIFAR10
      .loadAll(FILES.CIFAR10, { shuffle: false }))
      .train.dataset.toArray()
    expect(datasetContent.length).equal(imagesCIFAR10.length)
    expect((datasetContent[0] as tf.Tensor3D).shape).eql((imagesCIFAR10[0]).shape)
  })

  it('loads single sample with label', async () => {
    const source = DATASET_DIR + 'CIFAR10/0.png'
    const imageContent = await readImageTensor(source)
    const datasetContent = await (await LOADERS.CIFAR10
      .load(source, { labels: ['example'] })).toArray() as Array<Record<'xs' | 'ys', tf.Tensor>>
    expect(datasetContent[0].xs.shape).eql(imageContent.shape)
    expect(datasetContent[0].ys).eql('example')
  })

  it('loads multiple samples with labels', async () => {
    const labels = Repeat(3, 24) //internally, disco maps string labels to their index in the task LABEL_LIST
    const stringLabels = labels.map(_ => 'cat') // so cat is mapped to integer 3
    const oneHotLabels = List(tf.oneHot(labels.toArray(), 10).arraySync() as number[])

    const datasetContent = List(await (await LOADERS.CIFAR10
      .loadAll(FILES.CIFAR10, { labels: stringLabels.toArray(), shuffle: false }))
      .train.dataset.toArray())

    expect(datasetContent.size).equal(imagesCIFAR10.length)
    datasetContent.zip(List(imagesCIFAR10)).zip(oneHotLabels).forEach(([[actual, sample], label]) => {
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
    const dataset = await ((await LOADERS.CIFAR10.loadAll(FILES.CIFAR10, { shuffle: false })).train.dataset).toArray()

    List(dataset).zip(List(FILES.CIFAR10))
      .forEach(async ([s, f]) => {
        const sample = (await (await LOADERS.CIFAR10.load(f)).toArray())[0]
        assert.deepEqual((await tf.equal(s as tf.Tensor, sample as tf.Tensor).all().array()), [1])
      })
    assert(true)
  })

  it('shuffles list', () => {
    const list = Range(0, 100_000).toArray()
    const shuffled = [...list]

    LOADERS.CIFAR10.shuffle(shuffled)
    expect(list).to.not.eql(shuffled)

    shuffled.sort((a, b) => a - b)
    expect(list).to.eql(shuffled)
  })

  it('shuffles samples', async () => {
    const dataset = await (await LOADERS.CIFAR10.loadAll(FILES.CIFAR10, { shuffle: false })).train.dataset.toArray()
    const shuffled = await (await LOADERS.CIFAR10.loadAll(FILES.CIFAR10, { shuffle: true })).train.dataset.toArray()

    const misses = List(dataset).zip(List(shuffled)).map(([d, s]) =>
      tf.notEqual(d as tf.Tensor, s as tf.Tensor).any().dataSync()[0]
    ).reduce((acc: number, e) => acc + e)
    assert(misses > 0)
  })
  it('validation split', async () => {
    const validationSplit = 0.2
    const datasetContent = await LOADERS.CIFAR10.loadAll(FILES.CIFAR10, { shuffle: false, validationSplit })

    const trainSize = Math.floor(imagesCIFAR10.length * (1 - validationSplit))
    expect((await datasetContent.train.dataset.toArray()).length).equal(trainSize)
    if (datasetContent.validation === undefined) {
      assert(false)
    }
    expect((await datasetContent.validation.dataset.toArray()).length).equal(imagesCIFAR10.length - trainSize)
  })
})

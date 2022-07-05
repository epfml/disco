import { assert, expect } from 'chai'
import * as tf from '@tensorflow/tfjs'
import * as tfNode from '@tensorflow/tfjs-node'
import fs from 'fs'
import _ from 'lodash'

import { dataset, tasks } from '../..'
import { List, Map, Range } from 'immutable'

export class NodeImageLoader extends dataset.ImageLoader<string> {
  async readImageFrom (source: string): Promise<tfNode.Tensor3D> {
    return tfNode.node.decodeImage(fs.readFileSync(source)) as tfNode.Tensor3D
  }
}

const readFilesFromDir = (dir: string): string[] =>
  fs.readdirSync(dir).map((file: string) => dir + file)
const DIRS = {
  CIFAR10: './example_training_data/CIFAR10/'
}
const FILES = Map(DIRS).map((readFilesFromDir)).toObject()

describe('image loader', () => {
  it('loads single sample without label', async () => {
    const file = './example_training_data/9-mnist-example.png'
    const singletonDataset = await new NodeImageLoader(tasks.mnist.task).load(file)
    const imageContent = tfNode.node.decodeImage(fs.readFileSync(file))
    await Promise.all((await singletonDataset.toArrayForTest()).map(async (entry) => {
      expect(await imageContent.bytes()).eql(await (entry as tf.Tensor).bytes())
    }))
  })

  it('loads multiple samples without labels', async () => {
    const imagesContent = FILES.CIFAR10.map((file) => tfNode.node.decodeImage(fs.readFileSync(file)))
    const datasetContent = await (await new NodeImageLoader(tasks.cifar10.task).loadAll(FILES.CIFAR10))
      .dataset.toArray()
    expect(datasetContent.length).equal(imagesContent.length)
    expect((datasetContent[0] as tfNode.Tensor3D).shape).eql(imagesContent[0].shape)
  })

  it('loads single sample with label', async () => {
    const path = DIRS.CIFAR10 + '0.png'
    const imageContent = tfNode.node.decodeImage(fs.readFileSync(path))
    const datasetContent = await (await new NodeImageLoader(tasks.cifar10.task)
      .load(path, { labels: ['example'] })).toArray()
    expect((datasetContent[0] as any).xs.shape).eql(imageContent.shape)
    expect((datasetContent[0] as any).ys).eql('example')
  })

  it('loads multiple samples with labels', async () => {
    const labels = _.map(_.range(24), (label) => (label % 10))
    const stringLabels = _.map(labels, (label) => label.toString())
    const oneHotLabels = tfNode.oneHot(labels, 10).arraySync()

    const imagesContent = FILES.CIFAR10.map((file) => tfNode.node.decodeImage(fs.readFileSync(file)))
    const datasetContent = await (await new NodeImageLoader(tasks.cifar10.task).loadAll(FILES.CIFAR10, { labels: stringLabels })).dataset.toArray()

    expect(datasetContent.length).equal(imagesContent.length)
    _.forEach(
      _.zip(datasetContent, imagesContent, oneHotLabels as any), ([actual, sample, label]) => {
        if (
          typeof actual !== 'object' ||
          !('xs' in actual && 'ys' in actual)
        ) {
          throw new Error('unexpected type')
        }
        const { xs, ys } = actual as { xs: tf.Tensor, ys: number[] }
        expect(xs.shape).eql(sample?.shape)
        expect(ys).eql(label)
      }
    )
  })

  it('loads samples in order', async () => {
    const loader = new NodeImageLoader(tasks.cifar10.task)
    const dataset = await ((await loader.loadAll(FILES.CIFAR10)).dataset).toArray()

    List(dataset).zip(List(FILES.CIFAR10))
      .forEach(async ([s, f]) => {
        const sample = (await (await loader.load(f)).toArray())[0]
        if (!tf.equal(s as tf.Tensor, sample as tf.Tensor).all()) {
          assert(false)
        }
      })
    assert(true)
  })

  it('shuffles list', async () => {
    const loader = new NodeImageLoader(tasks.cifar10.task)
    const list = Range(0, 100_000).toArray()
    const shuffled = [...list]

    loader.shuffle(shuffled)
    expect(list).to.not.eql(shuffled)

    shuffled.sort((a, b) => a - b)
    expect(list).to.eql(shuffled)
  })

  it('shuffles samples', async () => {
    const loader = new NodeImageLoader(tasks.cifar10.task)
    const dataset = await (await loader.loadAll(FILES.CIFAR10)).dataset.toArray()
    const shuffled = await (await loader.loadAll(FILES.CIFAR10, { shuffle: true })).dataset.toArray()

    const misses = List(dataset).zip(List(shuffled)).map(([d, s]) =>
      tf.notEqual(d as tf.Tensor, s as tf.Tensor).any().dataSync()[0]
    ).reduce((acc: number, e) => acc + e)
    assert(misses > 0)
  })
})

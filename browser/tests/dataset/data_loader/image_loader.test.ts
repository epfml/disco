import { expect } from 'chai'
import * as tfNode from '@tensorflow/tfjs-node'
import fs from 'fs'
import _ from 'lodash'

import { ConsoleLogger, dataset, TrainingSchemes } from 'discojs'

import { Disco } from '../../../src/training/disco'
import { loadTasks } from '../../../src/tasks'

export class NodeImageLoader extends dataset.ImageLoader<string> {
  async readImageFrom (source: string): Promise<tfNode.Tensor3D> {
    return tfNode.node.decodeImage(fs.readFileSync(source)) as tfNode.Tensor3D
  }
}

describe('image loader test', () => {
  it('load single mnist sample without label', async () => {
    const file = './example_training_data/9-mnist-example.png'
    const mnist = (await loadTasks())[1]
    const singletonDataset = await new NodeImageLoader(mnist).load(file)
    const imageContent = tfNode.node.decodeImage(fs.readFileSync(file))
    singletonDataset.forEachAsync((entry) => expect(entry).eql(imageContent))
  })

  it('load multiple cifar10 samples without labels', async () => {
    const dir = './example_training_data/CIFAR10/'
    const files = fs.readdirSync(dir).map((file) => dir.concat(file))
    const imagesContent = files.map((file) => tfNode.node.decodeImage(fs.readFileSync(file)))
    const cifar10 = (await loadTasks())[3]
    const datasetContent = await (await new NodeImageLoader(cifar10).loadAll(files)).dataset.toArray()
    expect(datasetContent.length).equal(imagesContent.length)
    expect((datasetContent[0] as tfNode.Tensor3D).shape).eql(imagesContent[0].shape)
  })

  it('load single cifar10 sample with label', async () => {
    const path = './example_training_data/CIFAR10/0.png'
    const imageContent = tfNode.node.decodeImage(fs.readFileSync(path))
    const cifar10 = (await loadTasks())[3]
    const datasetContent = await (await new NodeImageLoader(cifar10).load(path, { labels: ['example'] })).toArray()
    expect((datasetContent[0] as any).xs.shape).eql(imageContent.shape)
    expect((datasetContent[0] as any).ys).eql('example')
  })

  it('load multiple cifar10 samples with labels', async () => {
    const dir = './example_training_data/CIFAR10/'
    const files = fs.readdirSync(dir).map((file) => dir.concat(file))
    const labels = _.map(_.range(24), (label) => (label % 10))
    const stringLabels = _.map(labels, (label) => label.toString())
    const oneHotLabels = tfNode.oneHot(labels, 10).arraySync()

    const cifar10 = (await loadTasks())[3]

    const imagesContent = files.map((file) => tfNode.node.decodeImage(fs.readFileSync(file)))
    const datasetContent = await (await new NodeImageLoader(cifar10).loadAll(files, { labels: stringLabels })).dataset.toArray()

    expect(datasetContent.length).equal(imagesContent.length)
    _.forEach(
      _.zip(datasetContent, imagesContent, oneHotLabels as any), ([actual, sample, label]) => {
        expect((actual as any).xs.shape).eql(sample.shape)
        expect((actual as any).ys).eql(label)
      }
    )
  })

  it('start training cifar10', async () => {
    const dir = './example_training_data/CIFAR10/'
    const files = fs.readdirSync(dir).map((file) => dir.concat(file))
    const labels = _.map(_.range(24), (label) => (label % 10).toString())

    const cifar10 = (await loadTasks())[3]
    const loaded = await new NodeImageLoader(cifar10).loadAll(files, { labels: labels })

    const logger = new ConsoleLogger()
    const disco = new Disco(cifar10, logger, false)

    await disco.startTraining(loaded, TrainingSchemes.FEDERATED)
  }).timeout(5 * 60 * 1000)
})

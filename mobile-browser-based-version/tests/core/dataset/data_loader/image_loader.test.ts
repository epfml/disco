import { expect } from 'chai'
import { ImageLoader } from '../../../../src/core/dataset/data_loader/image_loader'
import * as tfNode from '@tensorflow/tfjs-node'
import fs from 'fs'
import _ from 'lodash'

describe('image loader test', () => {
  it('load single mnist sample without label', () => {
    const file = './example_training_data/9-mnist-example.png'
    const singletonDataset = new ImageLoader().load(file)
    const imageContent = tfNode.node.decodeImage(fs.readFileSync(file))
    singletonDataset.forEachAsync((entry) => expect(entry).eql(imageContent))
  })

  it('load multiple cifar10 samples without labels', async () => {
    const dir = './example_training_data/CIFAR10/'
    const files = fs.readdirSync(dir).map((file) => dir.concat(file))
    const imagesContent = files.map((file) => tfNode.node.decodeImage(fs.readFileSync(file)))
    const datasetContent = await new ImageLoader().loadAll(files).toArray()
    expect(datasetContent.length).equal(imagesContent.length)
    expect((datasetContent[0] as tfNode.Tensor3D).shape).eql(imagesContent[0].shape)
  })

  it('load single cifar10 sample with label', async () => {
    const path = './example_training_data/CIFAR10/0.png'
    const imageContent = tfNode.node.decodeImage(fs.readFileSync(path))
    const datasetContent = await new ImageLoader().load(path, { labels: ['example'] }).toArray()
    expect((datasetContent[0] as any).xs[0].shape).eql(imageContent.shape)
    expect((datasetContent[0] as any).ys[0]).eql('example')
  })

  it('load multiple cifar10 samples with labels', async () => {
    const dir = './example_training_data/CIFAR10/'
    const files = fs.readdirSync(dir).map((file) => dir.concat(file))
    const labels = _.map(_.range(24), (label) => label.toString())

    const imagesContent = files.map((file) => tfNode.node.decodeImage(fs.readFileSync(file)))
    const datasetContent = await new ImageLoader().loadAll(files, { labels: labels }).toArray()

    expect(datasetContent.length).equal(imagesContent.length)
    _.forEach(
      _.zip(datasetContent, imagesContent, labels), ([actual, sample, label]) => {
        expect((actual as any).xs[0].shape).eql(sample.shape)
        expect((actual as any).ys[0]).eql(label)
      }
    )
  })
})

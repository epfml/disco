import { expect } from 'chai'
import { ImageLoader } from '../../../../src/core/dataset/data_loader/image_loader'
import * as tfNode from '@tensorflow/tfjs-node'
import fs from 'fs'

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
    expect((datasetContent[0] as any).shape).eql(imagesContent[0].shape)
  })

  it('load multiple cifar10 samples with labels', () => {
    // TODO @s314cy
  })
})

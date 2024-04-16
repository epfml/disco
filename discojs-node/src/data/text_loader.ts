import * as tf from '@tensorflow/tfjs'
import { data as tfData } from '@tensorflow/tfjs-node'
import fs from 'node:fs/promises'
import { data } from '@epfml/discojs'

export class TextLoader extends data.TextLoader<string> {
  async loadDatasetFrom (source: string): Promise<tfData.Dataset<tf.TensorContainer>> {
    // TODO: reads all the file at once, 
    // inputting the file path to FileDataSource isn't supported anymore
    const inputFile = await fs.readFile(source)
    const file = new tfData.FileDataSource(inputFile, { chunkSize: 1024 })
    // TODO: reading files line by line is an issue for LLM tokenization
    const dataset = new tfData.TextLineDataset(file).filter(s => s !== ' ') // newline creates empty strings
    return Promise.resolve(dataset)
  }
}

import { data as tfData } from '@tensorflow/tfjs-node'
import fs from 'node:fs'
import { data } from '@epfml/discojs-core'

export class TextLoader extends data.TextLoader<string> {
  async loadDatasetFrom (source: string): Promise<data.Dataset> {
    // TODO: reads all the file at once, 
    // inputting the file path to FileDataSource isn't supported anymore
    const inputFile = fs.readFileSync(source)
    const file = new tfData.FileDataSource(inputFile, { chunkSize: 1024 })
    // TODO: reading files line by line is an issue for LLM tokenization
    return new tfData.TextLineDataset(file).filter(s => s != ' ') // newline creates empty strings
  }
}

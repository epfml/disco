import { data as tfData } from '@tensorflow/tfjs-node'

import { data } from '@epfml/discojs-core'

export class TextLoader extends data.TextLoader<string> {
  async loadDatasetFrom (source: string): Promise<data.Dataset> {
    // Lazy chunk file reader
    const file = new tfData.FileDataSource(source, { chunkSize: 1024 })
    // TODO: reading files line by line is an issue for LLM tokenization
    return new tfData.TextLineDataset(file)
  }
}

import fs from 'node:fs/promises'
import { data as tfData } from '@tensorflow/tfjs-node'

import { data } from '@epfml/discojs-core'

export class TextLoader extends data.TextLoader<string> {
  async loadDatasetFrom (source: string): Promise<data.Dataset> {
    // TODO sure, good idea to load the whole dataset in memory #irony
    const content = await fs.readFile(source)
    const file = new tfData.FileDataSource(content)

    return new tfData.TextLineDataset(file)
  }
}

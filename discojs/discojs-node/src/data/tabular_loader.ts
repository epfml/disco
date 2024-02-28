import { data as tfData } from '@tensorflow/tfjs-node'

import { data } from '@epfml/discojs-core'

export class TabularLoader extends data.TabularLoader<string> {
  async loadDatasetFrom (source: string, csvConfig: Record<string, unknown>): Promise<data.Dataset> {
    const prefix = 'file://'
    if (source.slice(0, 7) !== prefix) {
      source = prefix + source
    }
    return tfData.csv(source, csvConfig)
  }
}

// import fs from 'node:fs'

// import split2 from 'split2'

// import { tf } from '../..'
// import { TextLoader } from '../../core/dataset/data_loader/text_loader'
// import { Dataset } from '../../core/dataset'
// import { DataConfig } from '../../core/dataset/data_loader'

// export class NodeTextLoader extends TextLoader<string> {
//   async loadDatasetFrom (source: string, config?: DataConfig): Promise<Dataset> {
//     const prefix = 'file://'
//     if (source.slice(0, 7) !== prefix) {
//       source = prefix + source
//     }
//     // create stream being read by generator
//     const stream = fs.createReadStream(source, { encoding: 'utf-8' })
//     // eslint-disable-next-line @typescript-eslint/no-this-alias
//     const self = this

//     async function * dataGenerator (): AsyncGenerator<tf.TensorContainer> {
//       // TODO @s314cy
//       const withLabels = config?.labels !== undefined
//       stream.pipe(split2())
//       stream.on('data', (data) => yield self.tokenize(data))
//     }

//     return tf.data.generator(dataGenerator)
//   }
// }

import tf from '@tensorflow/tfjs'
import msgpack from 'msgpack-lite'

export type Encoded = Uint8Array

export function isEncoded (raw: unknown): raw is Encoded {
  return raw instanceof Uint8Array
}

export async function encode (model: tf.LayersModel): Promise<Encoded> {
  const saved = await new Promise((resolve) => {
    void model.save({
      save: async (artifacts) => {
        resolve(artifacts)
        return {
          modelArtifactsInfo: {
            dateSaved: new Date(),
            modelTopologyType: 'JSON'
          }
        }
      }
    }, { includeOptimizer: true })
  })

  return msgpack.encode(saved)
}

export async function decode (encoded: unknown): Promise<tf.LayersModel> {
  if (!isEncoded(encoded)) {
    throw new Error('invalid encoding')
  }
  const raw = msgpack.decode(encoded)

  return await tf.loadLayersModel({
    load: () => raw
  })
}

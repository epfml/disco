import { tf } from '..'
import msgpack from 'msgpack-lite'

export type Encoded = number[]

export function isEncoded (raw: unknown): raw is Encoded {
  return Array.isArray(raw) && raw.every((r) => typeof r === 'number')
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
    })
  })

  return [...msgpack.encode(saved).values()]
}

export async function decode (encoded: Encoded): Promise<tf.LayersModel> {
  const raw = msgpack.decode(encoded)

  return await tf.loadLayersModel({
    load: () => raw
  })
}

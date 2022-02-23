import '@tensorflow/tfjs-node'
import { deserializeTensor, serializeWeights } from './tensor_serializer'

// TODO: important function to test
export async function averageWeights (roundSerializedWeights) {
  const firstWeights = roundSerializedWeights[0]
  const otherWeights = roundSerializedWeights.slice(1)
  const resultWeights = []
  firstWeights.forEach((weight, idx) => {
    let tensorSum = deserializeTensor(weight.$variable.val)
    otherWeights.forEach((serializedWeights) => {
      const serializedWeight = serializedWeights[idx].$variable
      const tensor = deserializeTensor(serializedWeight.val)
      tensorSum = tensor.add(tensorSum)
      tensor.dispose()
    })
    const val = tensorSum.div(roundSerializedWeights.length)
    const newWeight = {
      name: weight.$variable.name,
      val: val
    }
    resultWeights.push(newWeight)
    tensorSum.dispose()
  })
  const serializedWeights = serializeWeights(resultWeights)
  return serializedWeights
}

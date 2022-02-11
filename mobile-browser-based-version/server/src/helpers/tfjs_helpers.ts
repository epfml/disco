import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-node'

async function serializeTensor (tensor) {
  return {
    $tensor: {
      data: await tensor.data(), // doesn't copy (maybe depending on runtime)!
      shape: tensor.shape,
      dtype: tensor.dtype
    }
  }
}

function deserializeTensor (dict) {
  const { data, shape, dtype } = dict.$tensor
  return tf.tensor(data, shape, dtype).clone() // doesn't copy (maybe depending on runtime)!
}

async function serializeVariable (variable) {
  return {
    $variable: {
      name: variable.name,
      val: await serializeTensor(variable.val)
    }
  }
}

export async function serializeWeights (weights) {
  return await Promise.all(weights.map(serializeVariable))
}

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

export function assignWeightsToModel (model, serializedWeights) {
  model.weights.forEach((weight, idx) => {
    const tensor = deserializeTensor(serializedWeights[idx].$variable.val)
    weight.val.assign(tensor)
    tensor.dispose()
  })
}

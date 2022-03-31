import * as tf from '@tensorflow/tfjs-node'

async function serializeTensor (tensor) {
  return {
    $tensor: {
      data: await tensor.data(), // doesn't copy (maybe depending on runtime)!
      shape: tensor.shape,
      dtype: tensor.dtype
    }
  }
}

export function deserializeTensor (dict) {
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

export function assignWeightsToModel (model, serializedWeights) {
  model.weights.forEach((weight, idx) => {
    const tensor = deserializeTensor(serializedWeights[idx].$variable.val)
    weight.val.assign(tensor)
    tensor.dispose()
  })
}

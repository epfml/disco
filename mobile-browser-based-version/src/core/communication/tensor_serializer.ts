import * as tf from '@tensorflow/tfjs'

async function serializeTensor (tensor) {
  return {
    $tensor: {
      // Doesn't copy (maybe depending on runtime)!
      data: await tensor.data(),
      shape: tensor.shape,
      dtype: tensor.dtype
    }
  }
}

export function deserializeTensor (dict) {
  const { data, shape, dtype } = dict.$tensor
  // Doesn't copy (maybe depending on runtime)!
  return tf.tensor(data, shape, dtype)
}

export async function serializeVariable (variable) {
  return {
    $variable: {
      name: variable.name,
      val: await serializeTensor(variable.val)
    }
  }
}

export function serializeWeights (weights) {
  return Promise.all(weights.map(serializeVariable))
}

/**
 * Assumes the serialized weights are in the right order.
 */
export function assignWeightsToModel (model, serializedWeights) {
  model.weights.forEach((weight, idx) => {
    const serializedWeight = serializedWeights[idx].$variable
    const tensor = deserializeTensor(serializedWeight.val)
    weight.val.assign(tensor)
    tensor.dispose()
  })
}

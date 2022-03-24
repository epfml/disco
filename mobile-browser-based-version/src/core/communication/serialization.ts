import tf from '@tensorflow/tfjs'

// TODO pack it more
export type SerializedVariable<R extends tf.Rank = tf.Rank> = {
  $variable: {
    name: string
    val: {
      $tensor: {
        data: tf.TypedArray
        shape: tf.ShapeMap[R]
        dtype: tf.DataType
      }
    }
  }
}

export function isSerializedVariable (data: unknown): data is SerializedVariable {
  // TODO check more

  if (typeof data !== 'object') {
    return false
  }
  if (data === null) {
    return false
  }

  if (!('$variable' in data)) {
    return false
  }

  // ensure full check
  // eslint-disable-next-line no-unused-vars
  // TODO const _: SerializedVariable = data

  return true
}

export async function serializeVariable (variable: tf.LayerVariable): Promise<SerializedVariable<tf.Rank>> {
  const tensor = variable.read()

  return {
    $variable: {
      name: variable.name,
      val: {
        $tensor: {
          // Doesn't copy (maybe depending on runtime)!
          data: await tensor.data(),
          shape: tensor.shape,
          dtype: tensor.dtype
        }
      }
    }
  }
}

export function deserializeVariable (serialized: SerializedVariable): tf.LayerVariable {
  const serializedTensor = serialized.$variable.val.$tensor
  const tensor = tf.tensor(serializedTensor.data, serializedTensor.shape, serializedTensor.dtype)

  return new tf.LayerVariable(tensor, undefined, serialized.$variable.name)
}

export function serializeWeights (weights: tf.LayerVariable[]): Promise<SerializedVariable[]> {
  return Promise.all(weights.map(serializeVariable))
}

export function deserializeWeights (serialized: SerializedVariable[]): tf.LayerVariable[] {
  return serialized.map(deserializeVariable)
}

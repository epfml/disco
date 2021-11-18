import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';

async function serializeTensor(tensor) {
  return {
    $tensor: {
      data: await tensor.data(), // doesn't copy (maybe depending on runtime)!
      shape: tensor.shape,
      dtype: tensor.dtype,
    },
  };
}

function deserializeTensor(dict) {
  const { data, shape, dtype } = dict['$tensor'];
  return tf.tensor(data, shape, dtype).clone(); // doesn't copy (maybe depending on runtime)!
}

async function serializeVariable(variable) {
  return {
    $variable: {
      name: variable.name,
      val: await serializeTensor(variable.val),
    },
  };
}

async function serializeWeights(weights) {
  return await Promise.all(weights.map(serializeVariable));
}

async function averageWeights(peersSerializedWeights) {
  const firstWeights = peersSerializedWeights[0];
  const otherWeights = peersSerializedWeights.slice(1);
  let resultWeights = [];
  firstWeights.forEach((weight, idx) => {
    let tensorSum = deserializeTensor(weight['$variable'].val);
    otherWeights.forEach((serializedWeights, peer) => {
      const serializedWeight = serializedWeights[idx]['$variable'];
      const tensor = deserializeTensor(serializedWeight.val);
      tensorSum = tensor.add(tensorSum);
      tensor.dispose();
    });
    let val = tensorSum.div(peersSerializedWeights.length);
    let newWeight = {
      name: weight['$variable'].name,
      val: val,
    };
    resultWeights.push(newWeight);
    tensorSum.dispose();
  });
  let serializedWeights = serializeWeights(resultWeights);
  return serializedWeights;
}

export { serializeWeights, averageWeights };

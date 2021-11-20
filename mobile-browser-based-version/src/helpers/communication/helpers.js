import * as tf from '@tensorflow/tfjs';
import { Hashes } from 'jshashes';
import { DecentralisedClient } from './decentralised/client';
import { FederatedClient } from './federated/client';

export function getClient(platform, task, ...args) {
  switch (platform) {
    case 'decentralised':
      return new DecentralisedClient(
        process.env.VUE_APP_DEAI_SERVER,
        task,
        ...args
      );
    case 'federated':
      return new FederatedClient(
        process.env.VUE_APP_FEAI_SERVER,
        task,
        ...args
      );
    default:
      throw new Error('Platform does not exist');
  }
}

async function serializeTensor(tensor) {
  return {
    $tensor: {
      // Doesn't copy (maybe depending on runtime)!
      data: await tensor.data(),
      shape: tensor.shape,
      dtype: tensor.dtype,
    },
  };
}

export function deserializeTensor(dict) {
  const { data, shape, dtype } = dict['$tensor'];
  // Doesn't copy (maybe depending on runtime)!
  return tf.tensor(data, shape, dtype);
}

export async function serializeVariable(variable) {
  return {
    $variable: {
      name: variable.name,
      val: await serializeTensor(variable.val),
    },
  };
}

export function serializeWeights(weights) {
  return Promise.all(weights.map(serializeVariable));
}

/**
 * Assumes the serialized weights are in the right order.
 */
export function assignWeightsToModel(model, serializedWeights) {
  model.weights.forEach((weight, idx) => {
    const serializedWeight = serializedWeights[idx]['$variable'];
    const tensor = deserializeTensor(serializedWeight.val);
    weight.val.assign(tensor);
    tensor.dispose();
  });
}

export async function makeID(length) {
  var result = '';
  var characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function authenticate(hash, username, password) {
  return new Hashes.SHA256().hex(username + ' ' + password) === hash;
}

//////////// TESTING functions - generate random data and labels
export function* dataGenerator() {
  for (let i = 0; i < 100; i++) {
    // Generate one sample at a time.
    yield tf.randomNormal([784]);
  }
}

export function* labelGenerator() {
  for (let i = 0; i < 100; i++) {
    // Generate one sample at a time.
    yield tf.randomUniform([10]);
  }
}

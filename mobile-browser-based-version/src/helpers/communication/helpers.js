/* eslint-disable prettier/prettier */
import * as tf from '@tensorflow/tfjs';
import { Hashes } from 'jshashes';


async function serializeTensor(tensor) {
  return {
    $tensor: {
      data: await tensor.data(), // doesn't copy (maybe depending on runtime)!
      shape: tensor.shape,
      dtype: tensor.dtype,
    },
  };
}

export function deserializeTensor(dict) {
  const { data, shape, dtype } = dict['$tensor'];
  return tf.tensor(data, shape, dtype); // doesn't copy (maybe depending on runtime)!
}

export async function serializeVariable(variable) {
  return {
    $variable: {
      name: variable.name,
      val: await serializeTensor(variable.val),
    },
  };
}

export async function serializeWeights(weights) {
  return await Promise.all(weights.map(serializeVariable));
}

export function assignWeightsToModel(model, serializedWeights) {
  // This assumes the weights are in the right order
  model.weights.forEach((weight, idx) => {
    const serializedWeight = serializedWeights[idx]['$variable'];
    const tensor = deserializeTensor(serializedWeight.val);
    weight.val.assign(tensor);
    tensor.dispose();
  });
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
///////////////////////////////////////////////

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generates a random string
export async function makeid(length) {
  var result = '';
  var characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function authenticate(data, senderId, password) {
  if (password) {
    if (!('password_hash' in data)) {
      console.log('Rejected message due to missing password hash');
      return false;
    }
    var SHA256 = new Hashes.SHA256();
    if (SHA256.hex(senderId + ' ' + password) !== data.password_hash) {
      console.log('Rejected message due to incorrect password hash');
      return false;
    }
  }
  return true;
}

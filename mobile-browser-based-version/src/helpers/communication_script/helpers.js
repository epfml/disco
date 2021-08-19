import * as tf from '@tensorflow/tfjs';

import { sendData, handleDataEnd, handleData, CMD_CODES } from './peer';

const TIME_PER_TRIES = 100; // in miliseconds
const MAX_TRIES = 100; // corresponds to waiting 10 seconds (since each try is performed every 100ms)

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

export async function serializeWeights(model) {
  return await Promise.all(model.weights.map(serializeVariable));
}

export function assignWeightsToModel(serializedWeights, model) {
  // This assumes the weights are in the right order
  model.weights.forEach((weight, idx) => {
    const serializedWeight = serializedWeights[idx]['$variable'];
    const tensor = deserializeTensor(serializedWeight.val);
    weight.val.assign(tensor);
    tensor.dispose();
  });
}

export function averageWeightsIntoModel(peersSerializedWeights, model) {
  model.weights.forEach((weight, idx) => {
    let tensorSum = weight.val;
    peersSerializedWeights.forEach((serializedWeights, peer) => {
      const serializedWeight = serializedWeights[idx]['$variable'];
      const tensor = deserializeTensor(serializedWeight.val);
      tensorSum = tensor.add(tensorSum);
      tensor.dispose();
    });
    weight.val.assign(tensorSum.div(peersSerializedWeights.length + 1)); //average
    tensorSum.dispose();
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

/**
 * Wait to receive data by checking if recvBuffer.key is defined
 * @param {Object} recvBuffer
 * @param {*} key
 */
export function dataReceived(recvBuffer, key) {
  return new Promise(resolve => {
    (function waitData() {
      if (recvBuffer[key]) {
        console.log(recvBuffer);
        return resolve();
      }
      setTimeout(waitData, TIME_PER_TRIES);
    })();
  });
}

/**
 * Same as dataReceived, but break after maxTries
 * @param {Object} recvBuffer
 * @param {*} key
 */
export function dataReceivedBreak(recvBuffer, key) {
  return new Promise(resolve => {
    (function waitData(n) {
      if (recvBuffer[key] || n >= MAX_TRIES - 1) {
        return resolve();
      }
      setTimeout(() => waitData(n + 1), TIME_PER_TRIES);
    })(0);
  });
}

/**
 * Waits until an array reaches a given length. Used to make
 * sure that all weights from peers are received.
 * @param {Array} recvBuffer where you will get the avgWeights from
 * @param {int} len
 * @param {Boolean} isCommon true if this function is called on epoch common
 * @param {int} epoch epoch when this function is called
 */
export function checkArrayLen(recvBuffer, len, isCommon, epoch) {
  return new Promise(resolve => {
    (function waitData(n) {
      let arr = [];
      if (isCommon) {
        arr = Object.values(recvBuffer.avgWeights).flat(1);
      } else {
        arr = recvBuffer.avgWeights[epoch];
      }

      if (arr.length >= len || MAX_TRIES <= n) {
        return resolve();
      }
      setTimeout(() => waitData(n + 1), TIME_PER_TRIES);
    })(0);
  });
}

// generates a random string
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

/**
 * Sends weights to all peers, waits to receive weights from all peers
 * and then averages peers' weights into the model.
 */
// Added peerjs in argument
export async function onEpochEndSync(
  model,
  epoch,
  receivers,
  recvBuffer,
  peerjs
) {
  const serializedWeights = await serializeWeights(model);
  const epochWeights = { epoch: epoch, weights: serializedWeights };

  for (var i in receivers) {
    console.log('Sending weights to: ', receivers[i]);
    await sendData(epochWeights, CMD_CODES.AVG_WEIGHTS, peerjs, receivers[i]);
  }

  if (recvBuffer.avgWeights === undefined) {
    console.log('Waiting to receive weights...');
    await dataReceived(recvBuffer, 'avgWeights');
  }
  if (recvBuffer.avgWeights[epoch] === undefined) {
    console.log('Waiting to receive weights for this epoch...');
    await dataReceived(recvBuffer.avgWeights, epoch.toString());
  }
  console.log('Waiting to receive all weights for this epoch...');
  await checkArrayLen(recvBuffer, receivers.length, false, epoch).then(() => {
    console.log('Averaging weights');

    averageWeightsIntoModel(recvBuffer.avgWeights[epoch], model);

    // might want to delete weights after using them to avoiding hogging memory
    // delete recvBuffer.avgWeights[epoch]
  });
}

/**
 * Request weights from peers, carry on if the number of received weights is
 * greater than the provided threshold
 */
// added peerjs in argument
export async function onEpochEndCommon(
  model,
  epoch,
  receivers,
  recvBuffer,
  username,
  threshold,
  peerjs,
  trainingInformant
) {
  const serializedWeights = await serializeWeights(model);
  var epochWeights = { epoch: epoch, weights: serializedWeights };

  if (threshold == undefined) {
    threshold = 1;
  }

  console.log('Receivers are: ' + receivers);
  // request weights and send to all who requested
  for (var i in receivers) {
    // Sending  weight request
    await sendData(
      { name: username },
      CMD_CODES.WEIGHT_REQUEST,
      peerjs,
      receivers[i]
    );
    trainingInformant.addMessage('Sending weight request to: ' + receivers[i]);

    if (
      recvBuffer.weightRequests !== undefined &&
      recvBuffer.weightRequests.has(receivers[i])
    ) {
      console.log('Sending weights to: ', receivers[i]);
      trainingInformant.addMessage('Sending weights to: ' + receivers[i]);
      trainingInformant.updateWhoReceivedMyModel(receivers[i]);
      await sendData(epochWeights, CMD_CODES.AVG_WEIGHTS, peerjs, receivers[i]);
    }
  }
  if (recvBuffer.weightRequests !== undefined) {
    trainingInformant.updateNbrWeightsRequests(recvBuffer.weightRequests.size);
    recvBuffer.weightRequests.clear();
  }

  // wait to receive weights only if other peers are connected (i.e I have receivers for now, might need to be updates)
  // For now, no distinction between receivers and being connected to the server
  if (receivers.length !== 0) {
    // wait to receive weights
    if (recvBuffer.avgWeights === undefined) {
      var startTime = new Date();

      console.log('Waiting to receive weights...');
      trainingInformant.addMessage('Waiting to receive weights...');
      await dataReceivedBreak(recvBuffer, 'avgWeights', 100).then(value => {
        var endTime = new Date();
        var timeDiff = endTime - startTime; //in ms
        timeDiff /= 1000;
        trainingInformant.updateWaitingTime(Math.round(timeDiff));
      }); // timeout to avoid deadlock (10s)

      // update the waiting time
    }

    if (recvBuffer.avgWeights !== undefined) {
      // check if any weights were received
      console.log('Waiting to receive enough weights...');
      await checkArrayLen(recvBuffer, threshold, true, epoch).then(() => {
        console.log('Averaging weights');
        trainingInformant.updateNbrUpdatesWithOthers(1);
        trainingInformant.addMessage('Averaging weights');

        averageWeightsIntoModel(
          Object.values(recvBuffer.avgWeights).flat(1),
          model
        );

        delete recvBuffer.avgWeights; // NOTE: this might delete useful weights...
      });
    }
  } else {
    trainingInformant.addMessage(
      'No one is connected. Move to next epoch without waiting.'
    );
  }

  // change data handler for future requests if this is the last epoch
  if (epoch == recvBuffer.trainInfo.epochs) {
    // Modify the end buffer (same buffer, but with one additional components: lastWeights)
    recvBuffer.peerjs = peerjs;
    recvBuffer.lastUpdate = epochWeights;
    peerjs.setDataHandler(handleDataEnd, recvBuffer);
  }
  /*
    if (epoch == recvBuffer.trainInfo.epochs) { // Modify the end buffer (same buffer, but with one additional components: lastWeights)
        var endBuffer = epochWeights
        endBuffer.peerjs = peerjs
        peerjs.setDataHandler(handleDataEnd, endBuffer)
    }*/
}

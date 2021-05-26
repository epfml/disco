import * as tf from '@tensorflow/tfjs';

import {
    send_data,
    handle_data_end,
    handle_data,
    CMD_CODES,

} from './peer'

async function serializeTensor(tensor) {
    return {
        "$tensor": {
            "data": await tensor.data(), // doesn't copy (maybe depending on runtime)!
            "shape": tensor.shape,
            "dtype": tensor.dtype
        }
    }
}
export function deserializeTensor(dict) {
    const { data, shape, dtype } = dict["$tensor"];
    return tf.tensor(data, shape, dtype); // doesn't copy (maybe depending on runtime)!
}
export async function serializeVariable(variable) {
    return {
        "$variable": {
            "name": variable.name,
            "val": await serializeTensor(variable.val),
        }
    }
}

export async function serializeWeights(model) {
    return await Promise.all(model.weights.map(serializeVariable));
}

export function assignWeightsToModel(serializedWeights, model) {
    // This assumes the weights are in the right order
    model.weights.forEach((weight, idx) => {
        const serializedWeight = serializedWeights[idx]["$variable"];
        const tensor = deserializeTensor(serializedWeight.val);
        weight.val.assign(tensor);
        tensor.dispose();
    });
}

export function averageWeightsIntoModel(serializedWeights, model) {
    model.weights.forEach((weight, idx) => {
        const serializedWeight = serializedWeights[idx]["$variable"];

        const tensor = deserializeTensor(serializedWeight.val);
        weight.val.assign(tensor.add(weight.val).div(2)); //average
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


/**
 * Wait to receive data by checking if recv_buffer.key is defined
 * @param {Object} recv_buffer
 * @param {*} key
 */
export function data_received(recv_buffer, key) {
    return new Promise((resolve) => {
        (function wait_data() {
            if (recv_buffer[key]) {
                console.log(recv_buffer)
                return resolve();
            }
            setTimeout(wait_data, 100);
        })();
    });
}

/**
 * Same as data_received, but break after max_tries
 * @param {Object} recv_buffer
 * @param {*} key
 * @param {int} max_tries
 */
export function data_received_break(recv_buffer, key, max_tries) {
    return new Promise((resolve) => {
        (function wait_data(n) {
            if (recv_buffer[key] || n >= max_tries - 1) {
                return resolve();
            }
            setTimeout(() => wait_data(n + 1), 100);
        })(0);
    });
}


/**
 * Waits until an array reaches a given length. Used to make
 * sure that all weights from peers are received.
 * @param {Array} arr
 * @param {int} len
 */
export function check_array_len(arr, len) {
    return new Promise((resolve) => {
        (function wait_data() {
            console.log(arr.length)
            if (arr.length >= len) {
                return resolve();
            }
            setTimeout(wait_data, 100);
        })();
    });
}


/**
 * Sends weights to all peers, waits to receive weights from all peers
 * and then averages peers' weights into the model.
*/
// Added peerjs in argument
export async function onEpochEnd_Sync(model, epoch, receivers, recv_buffer, peerjs) {
    const serialized_weights = await serializeWeights(model)
    const epoch_weights = { epoch: epoch, weights: serialized_weights }

    for (var i in receivers) {
        console.log("Sending weights to: ", receivers[i])
        await send_data(epoch_weights, CMD_CODES.AVG_WEIGHTS, peerjs, receivers[i])
    }

    if (recv_buffer.avg_weights === undefined) {
        console.log("Waiting to receive weights...")
        await data_received(recv_buffer, "avg_weights")
    }
    if (recv_buffer.avg_weights[epoch] === undefined) {
        console.log("Waiting to receive weights for this epoch...")
        await data_received(recv_buffer.avg_weights, epoch.toString())
    }
    console.log("Waiting to receive all weights for this epoch...")
    await check_array_len(recv_buffer.avg_weights[epoch], receivers.length)
        .then(() => {
            console.log("Averaging weights")
            for (i in recv_buffer.avg_weights[epoch]) {
                averageWeightsIntoModel(recv_buffer.avg_weights[epoch][i], model)
            }
            // might want to delete weights after using them to avoiding hogging memory
            // delete recv_buffer.avg_weights[epoch]
        })
}

/**
 * Request weights from peers, carry on if the number of received weights is
 * greater than the provided threshold
*/
// added peerjs in argument
export async function onEpochEnd_common(model, epoch, receivers, recv_buffer, username, threshold, peerjs, training_informant) {
    const serialized_weights = await serializeWeights(model)
    var epoch_weights = { epoch: epoch, weights: serialized_weights }

    console.log("Receivers are: " + receivers)
    // request weights and send to all who requested
    for (var i in receivers) {
        // Sending  weight request
        await send_data({ name: username }, CMD_CODES.WEIGHT_REQUEST, peerjs, receivers[i])
        training_informant.addMessage("Sending weight request to: " + receivers[i])

        if (recv_buffer.weight_requests !== undefined && recv_buffer.weight_requests.has(receivers[i])) {
            console.log("Sending weights to: ", receivers[i])
            training_informant.addMessage("Sending weights to: " + receivers[i])
            training_informant.updateWhoReceivedMyModel(receivers[i])
            await send_data(epoch_weights, CMD_CODES.AVG_WEIGHTS, peerjs, receivers[i])
        }
    }
    if (recv_buffer.weight_requests !== undefined) {
        training_informant.updateNbrWeightsRequests(recv_buffer.weight_requests.size)
        recv_buffer.weight_requests.clear()
    }

    // wait to receive weights only if other peers are connected (i.e I have receivers for now, might need to be updates)
    // For now, no distinction between receivers and being connected to the server
    if (receivers.length !== 0) {
        // wait to receive weights
        if (recv_buffer.avg_weights === undefined) {
            var startTime = new Date();

            console.log("Waiting to receive weights...")
            training_informant.addMessage("Waiting to receive weights...")
            await data_received_break(recv_buffer, "avg_weights", 100).then((value) => {
            var endTime = new Date();
            var timeDiff = endTime - startTime; //in ms
            timeDiff /= 1000;
            training_informant.updateWaitingTime(Math.round(timeDiff));
            }) // timeout to avoid deadlock (10s)

            // update the waiting time

        }

        if (recv_buffer.avg_weights !== undefined) { // check if any weights were received
            console.log("Waiting to receive enough weights...")
            await check_array_len(Object.values(recv_buffer.avg_weights).flat(1), threshold)
                .then(() => {
                    console.log("Averaging weights")
                    training_informant.updateNbrUpdatesWithOthers(1)
                    training_informant.addMessage("Averaging weights")
                    Object.values(recv_buffer.avg_weights).flat(1).forEach(
                        (w) => { averageWeightsIntoModel(w, model) }
                    )
                    delete recv_buffer.avg_weights // NOTE: this might delete useful weights...
                })
        }
    } else {
        training_informant.addMessage("No one is connected. Move to next epoch without waiting.")
    }


    // change data handler for future requests if this is the last epoch
    if (epoch == recv_buffer.train_info.epochs) { // Modify the end buffer (same buffer, but with one additional components: last_weights)
        recv_buffer.peerjs = peerjs
        recv_buffer.last_update = epoch_weights
        peerjs.set_data_handler(handle_data_end, recv_buffer)
    }
    /*
    if (epoch == recv_buffer.train_info.epochs) { // Modify the end buffer (same buffer, but with one additional components: last_weights)
        var end_buffer = epoch_weights
        end_buffer.peerjs = peerjs
        peerjs.set_data_handler(handle_data_end, end_buffer)
    }*/
}

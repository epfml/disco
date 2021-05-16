import * as tf from '@tensorflow/tfjs';
import {
  handle_data,
} from '../Communication Script/peer'

/**
 * Trains the model given as argument
 * @param {TFJS Model} model the model used for training
 * @param {Tensor} trainData the tensor holding the training data
 * @param {1D-Tensor} labels the tensor holding the labels
 * @param {Number} _batchSize the batch size used for training
 * @param {Number} _validationSplit the size of the validation set
 * @param {Number} _epochs the number of epochs used for training
 * @param {function} updateUI a function called to update the UI to give feedbacks on the training
 */
export async function training(model, trainData, labels, _batchSize, _validationSplit, _epochs, training_informant) {
  console.log('Start Training')
  console.log(labels)
  
  model.summary()



  // TO DO: access these parameters as training argument
  model.compile({
    optimizer: "rmsprop",
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });

  await model.fit(trainData, labels, {
    batchSize: _batchSize,
    epochs: _epochs,
    validationSplit: _validationSplit,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        training_informant.updateCharts(epoch + 1, (logs.val_acc * 100).toFixed(2), (logs.acc * 100).toFixed(2))
        console.log(`EPOCH (${epoch + 1}): Train Accuracy: ${(
          logs.acc * 100
        ).toFixed(2)},
             Val Accuracy:  ${(
            logs.val_acc * 100
          ).toFixed(2)}\n`);
        //await tf.nextFrame();
      }
    }
  });


}

/**
 * 
 * @param {TFJS} model the TFJS model used for training
 * @param {Tensor} trainData the training data
 * @param {Tensor} labels the labels of the data
 * @param {Number} _batchSize the batchsize used for training
 * @param {Number} _validationSplit the validation split used for trainig
 * @param {Object} model_compile_data compiling data (optimizer, lost, metric ...)
 * @param {Object} model_train_data compiling data (containing number of epoch)
 * @param {*} _onEpochBegin function called at the start of each epoch
 * @param {*} _onEpochEnd function called at the end of each epoch
 * @param {PeerJS} peerjs peerJS object

 */
export async function training_distributed(model, trainData, labels, _epochs, _batchSize, _validationSplit, model_compile_data, training_manager, peerjs, recv_buffer) {
  // shuffle to avoid having the same thing on all peers
  //var indices = tf.linspace(0, trainData.shape[0]).cast('int32')
  //tf.util.shuffle(indices)
  //const x_train_1d = trainData.gather(indices)
  //const y_train_1d = labels.gather(indices)

  peerjs.set_data_handler(handle_data, recv_buffer)

  // compile the model
  model.compile(model_compile_data)
  

  // start training
  console.log("Training started")
  await model.fit(trainData, labels, {
    epochs : _epochs,
    batchSize: _batchSize,
    validationSplit: _validationSplit,
    callbacks: 
    {onEpochBegin: training_manager.onEpochBegin(), 
      onEpochEnd: async (epoch, logs) => {
        await training_manager.onEpochEnd(epoch + 1, (logs.acc * 100).toFixed(2), (logs.val_acc * 100).toFixed(2))
        console.log(`EPOCH (${epoch + 1}): Train Accuracy: ${(
          logs.acc * 100
        ).toFixed(2)},
             Val Accuracy:  ${(
            logs.val_acc * 100
          ).toFixed(2)}\n`);
        //await tf.nextFrame();
      }
    }
  }).then( (info) => console.log("Training finished", info.history) )



}

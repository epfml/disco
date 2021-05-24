import * as tf from '@tensorflow/tfjs';
import {
  handleData,
} from '../communication_script/peer'

/**
 * Trains the model given as argument
 * @param {TFJS Model} model the model used for training
 * @param {Tensor} trainData the tensor holding the training data
 * @param {1D-Tensor} labels the tensor holding the labels
 * @param {Number} batchSize the batch size used for training
 * @param {Number} validationSplit the size of the validation set
 * @param {Number} epochs the number of epochs used for training
 * @param {function} updateUI a function called to update the UI to give feedbacks on the training
 */
export async function training(model, trainData, labels, batchSize, validationSplit, epochs, trainingInformant) {
  console.log('Start Training')
  console.log(labels)
  
  model.summary()


  // TO DO: access these parameters as training argument
  const optimizer = tf.train.adam();
  optimizer.learningRate = 0.05;
  model.compile({
    optimizer: optimizer,
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });

  await model.fit(trainData, labels, {
    batchSize: batchSize,
    epochs: epochs,
    validationSplit: validationSplit,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        trainingInformant.updateCharts(epoch + 1, (logs.val_acc * 100).toFixed(2), (logs.acc * 100).toFixed(2))
        console.log(`EPOCH (${epoch + 1}): Train Accuracy: ${(
          logs.acc * 100
        ).toFixed(2)},
             Val Accuracy:  ${(
            logs.val_acc * 100
          ).toFixed(2)}\n`);
          console.log(`loss ${logs.loss.toFixed(4)}`)
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
 * @param {Number} batchSize the batchsize used for training
 * @param {Number} validationSplit the validation split used for trainig
 * @param {Object} modelCompileData compiling data (optimizer, lost, metric ...)
 * @param {Object} modelTrainData compiling data (containing number of epoch)
 * @param {*} onEpochBegin function called at the start of each epoch
 * @param {*} onEpochEnd function called at the end of each epoch
 * @param {PeerJS} peerjs peerJS object

 */
export async function trainingDistributed(model, trainData, labels, epochs, batchSize, validationSplit, modelCompileData, trainingManager, peerjs, recvBuffer) {
  // shuffle to avoid having the same thing on all peers
  //var indices = tf.linspace(0, trainData.shape[0]).cast('int32')
  //tf.util.shuffle(indices)
  //const xTrain1d = trainData.gather(indices)
  //const yTrain1d = labels.gather(indices)

  peerjs.setDataHandler(handleData, recvBuffer)

  // compile the model
  model.compile(modelCompileData)
  

  // start training
  console.log("Training started")
  await model.fit(trainData, labels, {
    epochs : epochs,
    batchSize: batchSize,
    validationSplit: validationSplit,
    callbacks: 
    {onEpochBegin: trainingManager.onEpochBegin(), 
      onEpochEnd: async (epoch, logs) => {
        await trainingManager.onEpochEnd(epoch + 1, (logs.acc * 100).toFixed(2), (logs.val_acc * 100).toFixed(2))
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

import * as tf from '@tensorflow/tfjs';

/**
 * Trains the model given as argument
 * @param {String} model_name the name of the model used to store the model in memory
 * @param {Tensor} trainData the tensor holding the training data
 * @param {1D-Tensor} labels the tensor holding the labels
 * @param {Number} _batchSize the batch size used for training
 * @param {Number} _validationSplit the size of the validation set
 * @param {Number} _epochs the number of epochs used for training
 * @param {function} updateUI a function called to update the UI to give feedbacks on the training
 */
export default async function training(model_name, trainData, labels, _batchSize, _validationSplit, _epochs, updateUI) {
  console.log('Start Training')
  console.log(labels)

  const model_path = "localstorage://".concat(model_name);
  const loadedModel = await tf.loadLayersModel(model_path);

  // TO DO: access these parameters as training argument
  loadedModel.compile({
    optimizer: "rmsprop",
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });

  await loadedModel.fit(trainData, labels, {
    batchSize: _batchSize,
    epochs: _epochs,
    validationSplit: _validationSplit,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        updateUI(epoch + 1, (logs.acc * 100).toFixed(2), (logs.val_acc * 100).toFixed(2))
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

  const saveResults = await loadedModel.save(model_path);


  // TODO: Enter distributed training loop
}

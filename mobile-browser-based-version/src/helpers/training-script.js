import * as tf from '@tensorflow/tfjs';

/**
 * Trains the model given as argument
 * @param {TFJS Model} model the model used for training
 * @param {String} model_name the name of the model used to store the model in memory
 * @param {Tensor} trainData the tensor holding the training data
 * @param {1D-Tensor} labels the tensor holding the labels
 * @param {Number} _batchSize the batch size used for training
 * @param {Number} _validationSplit the size of the validation set
 * @param {Number} _epochs the number of epochs used for training
 * @param {function} updateUI a function called to update the UI to give feedbacks on the training
 */
export async function training(model, model_name, trainData, labels, _batchSize, _validationSplit, _epochs, updateUI) {
  console.log('Start Training')
  console.log(labels)

  const model_path = "indexeddb://".concat(model_name);

  // TO DO: access these parameters as training argument
  const optimizer = tf.train.adam();
  optimizer.learningRate = 0.05;
  model.compile({
    optimizer: optimizer,
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });

  await model.fit(trainData, labels, {
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
          console.log(`loss ${logs.loss.toFixed(4)}`)
        //await tf.nextFrame();
      }
    }
  });

  const saveResults = await model.save(model_path);

}

/**
 * 
 * @param {TFJS} model the TFJS model used for training
 * @param {String} model_name the model's name
 * @param {Tensor} trainData the training data
 * @param {Tensor} labels the labels of the data
 * @param {Number} _batchSize the batchsize used for training
 * @param {Number} _validationSplit the validation split used for trainig
 * @param {Object} model_compile_data compiling data (optimizer, lost, metric ...)
 * @param {Object} model_train_data compiling data (containing number of epoch)
 * @param {*} _onEpochBegin function called at the start of each epoch
 * @param {*} _onEpochEnd function called at the end of each epoch
 */
export async function training_distributed(model, model_name, trainData, labels, model_train_data, _batchSize, _validationSplit, model_compile_data, _onEpochBegin, _onEpochEnd) {
  // shuffle to avoid having the same thing on all peers
  //var indices = tf.linspace(0, trainData.shape[0]).cast('int32')
  //tf.util.shuffle(indices)
  //const x_train_1d = trainData.gather(indices)
  //const y_train_1d = labels.gather(indices)

  // compile the model
  model.compile(model_compile_data)
  

  // start training
  console.log("Training started")
  await model.fit(trainData, labels, {
    epochs : model_train_data.epochs,
    batchSize: _batchSize,
    validationSplit: _validationSplit,
    callbacks: 
    {_onEpochBegin, 
      onEpochEnd: async (epoch, logs) => {
        _onEpochEnd(epoch + 1, (logs.acc * 100).toFixed(2), (logs.val_acc * 100).toFixed(2))
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

  // save the resulting model in the local storage
  const model_path = "indexeddb://".concat(model_name);
  const saveResults = await model.save(model_path);

}

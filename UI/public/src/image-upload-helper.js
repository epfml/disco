//import * as tf from '@tensorflow/tfjs';

// Data is passed under the form of Dictionary[ImageURL: label]
function helperJoinTraining(training_data){
    console.log("In auxiliary method")
    console.log(training_data)
    labels = []
    image_uri = []

    Object.keys(training_data).forEach(key => {
        console.log(key, training_data[key])
        labels.push(training_data[key])
        image_uri.push(key)
    });

    const model = createConvModel()
    
    train(model, image_uri, labels)
}

const IMAGE_H = 28;
const IMAGE_W = 28;
const IMAGE_SIZE = IMAGE_H * IMAGE_W;
const NUM_CLASSES = 10;
const LABEL_LIST = [0,1,2,3,4,5,6,7,8,9]

function image_preprocessing(src){
    // Fill the image & call predict.
    let imgElement = document.createElement('img');
    imgElement.src = src;
    imgElement.width = IMAGE_SIZE;
    imgElement.height = IMAGE_SIZE;

    // tf.browser.fromPixels() returns a Tensor from an image element.
    const img = tf.browser.fromPixels(imgElement).toFloat();

    const offset = tf.scalar(127.5);
    // Normalize the image from [0, 255] to [-1, 1].
    const normalized = img.sub(offset).div(offset);

    // Reshape to a single-element batch so we can pass it to predict.
    const batched = normalized.reshape([1, IMAGE_SIZE, IMAGE_SIZE, 3]);

    return batched
}

function labels_preprocessing(labels){
    const labels_one_hot_encoded = []
    labels.forEach(label =>
        labels_one_hot_encoded.push(one_hot_encode(label))
    )

    return tf.tensor2d(labels_one_hot_encoded, [labels.length, NUM_CLASSES])
}

function one_hot_encode(label){
    const result = []
    for (i = 0; i < LABEL_LIST.length; i++){
        if(LABEL_LIST[i]==label){
            result.push(1)
        }else{
            result.push(0)
        }
    }
}

  /**
   * Get all training data as a data tensor and a labels tensor.
   *
   * @returns
   *   xs: The data tensor, of shape `[numTrainExamples, 28, 28, 1]`.
   *   labels: The one-hot encoded labels tensor, of shape
   *     `[numTrainExamples, 10]`.
   */
   function getTrainData(image_uri, labels) {
    // Do feature preprocessing
    const labels_tensor = labels_preprocessing(labels)
    const image_tensors = []

    image_uri.forEach( image => 
      image_tensors.push(image_preprocessing(image))
    )

    const final_image_tensor = tf.concat(image_tensors, 0)
    
    return {final_image_tensor, labels_tensor};
  }

  /**
 * Creates a convolutional neural network (Convnet) for the MNIST data.
 *
 * @returns {tf.Model} An instance of tf.Model.
 */
function createConvModel() {
    // Create a sequential neural network model. tf.sequential provides an API
    // for creating "stacked" models where the output from one layer is used as
    // the input to the next layer.
    const model = tf.sequential();
  
    // The first layer of the convolutional neural network plays a dual role:
    // it is both the input layer of the neural network and a layer that performs
    // the first convolution operation on the input. It receives the 28x28 pixels
    // black and white images. This input layer uses 16 filters with a kernel size
    // of 5 pixels each. It uses a simple RELU activation function which pretty
    // much just looks like this: __/
    model.add(tf.layers.conv2d({
      inputShape: [IMAGE_H, IMAGE_W, 1],
      kernelSize: 3,
      filters: 16,
      activation: 'relu'
    }));
  
    // After the first layer we include a MaxPooling layer. This acts as a sort of
    // downsampling using max values in a region instead of averaging.
    // https://www.quora.com/What-is-max-pooling-in-convolutional-neural-networks
    model.add(tf.layers.maxPooling2d({poolSize: 2, strides: 2}));
  
    // Our third layer is another convolution, this time with 32 filters.
    model.add(tf.layers.conv2d({kernelSize: 3, filters: 32, activation: 'relu'}));
  
    // Max pooling again.
    model.add(tf.layers.maxPooling2d({poolSize: 2, strides: 2}));
  
    // Add another conv2d layer.
    model.add(tf.layers.conv2d({kernelSize: 3, filters: 32, activation: 'relu'}));
  
    // Now we flatten the output from the 2D filters into a 1D vector to prepare
    // it for input into our last layer. This is common practice when feeding
    // higher dimensional data to a final classification output layer.
    model.add(tf.layers.flatten({}));
  
    model.add(tf.layers.dense({units: 64, activation: 'relu'}));
  
    // Our last layer is a dense layer which has 10 output units, one for each
    // output class (i.e. 0, 1, 2, 3, 4, 5, 6, 7, 8, 9). Here the classes actually
    // represent numbers, but it's the same idea if you had classes that
    // represented other entities like dogs and cats (two output classes: 0, 1).
    // We use the softmax function as the activation for the output layer as it
    // creates a probability distribution over our 10 classes so their output
    // values sum to 1.
    model.add(tf.layers.dense({units: 10, activation: 'softmax'}));
  
    return model;
  }

  /**
 * Compile and train the given model.
 *
 * @param {tf.Model} model The model to train.
 * @param {onIterationCallback} onIteration A callback to execute every 10
 *     batches & epoch end.
 * @param {Array} labels labels corresponding to each image 
 * @param {Array[String]} image_uri array of image urls for the training 
 */
async function train(model, image_uri, labels) {
    //TODO: onIteration method
    ui.logStatus('Training model...');
  
    // Now that we've defined our model, we will define our optimizer. The
    // optimizer will be used to optimize our model's weight values during
    // training so that we can decrease our training loss and increase our
    // classification accuracy.
  
    // We are using rmsprop as our optimizer.
    // An optimizer is an iterative method for minimizing an loss function.
    // It tries to find the minimum of our loss function with respect to the
    // model's weight parameters.
    const optimizer = 'rmsprop';
  
    // We compile our model by specifying an optimizer, a loss function, and a
    // list of metrics that we will use for model evaluation. Here we're using a
    // categorical crossentropy loss, the standard choice for a multi-class
    // classification problem like MNIST digits.
    // The categorical crossentropy loss is differentiable and hence makes
    // model training possible. But it is not amenable to easy interpretation
    // by a human. This is why we include a "metric", namely accuracy, which is
    // simply a measure of how many of the examples are classified correctly.
    // This metric is not differentiable and hence cannot be used as the loss
    // function of the model.
    model.compile({
      optimizer,
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });
  
    // Batch size is another important hyperparameter. It defines the number of
    // examples we group together, or batch, between updates to the model's
    // weights during training. A value that is too low will update weights using
    // too few examples and will not generalize well. Larger batch sizes require
    // more memory resources and aren't guaranteed to perform better.
    const batchSize = 320;
  
    // Leave out the last 15% of the training data for validation, to monitor
    // overfitting during training.
    const validationSplit = 0.15;
  
    // Get number of training epochs from the UI.
    const trainEpochs = ui.getTrainEpochs();
  
    // We'll keep a buffer of loss and accuracy values over time.
    let trainBatchCount = 0;
  
    const trainData = data.getTrainData(image_uri, labels);
    //const testData = data.getTestData();
  
    const totalNumBatches =
        Math.ceil(trainData.xs.shape[0] * (1 - validationSplit) / batchSize) *
        trainEpochs;
  
    // During the long-running fit() call for model training, we include
    // callbacks, so that we can plot the loss and accuracy values in the page
    // as the training progresses.
    let valAcc;
    await model.fit(trainData.xs, trainData.labels, {
      batchSize,
      validationSplit,
      epochs: trainEpochs,
      callbacks: {
        onBatchEnd: async (batch, logs) => {
          trainBatchCount++;
          ui.logStatus(
              `Training... (` +
              `${(trainBatchCount / totalNumBatches * 100).toFixed(1)}%` +
              ` complete). To stop training, refresh or close page.`);
          ui.plotLoss(trainBatchCount, logs.loss, 'train');
          ui.plotAccuracy(trainBatchCount, logs.acc, 'train');
          if (onIteration && batch % 10 === 0) {
            onIteration('onBatchEnd', batch, logs);
          }
          await tf.nextFrame();
        },
        onEpochEnd: async (epoch, logs) => {
          valAcc = logs.val_acc;
          ui.plotLoss(trainBatchCount, logs.val_loss, 'validation');
          ui.plotAccuracy(trainBatchCount, logs.val_acc, 'validation');
          if (onIteration) {
            onIteration('onEpochEnd', epoch, logs);
          }
          await tf.nextFrame();
        }
      }
    });
  
    //const testResult = model.evaluate(testData.xs, testData.labels);
    //const testAccPercent = testResult[1].dataSync()[0] * 100;
    //const finalValAccPercent = valAcc * 100;
    //ui.logStatus(
    //    `Final validation accuracy: ${finalValAccPercent.toFixed(1)}%; ` +
    //    `Final test accuracy: ${testAccPercent.toFixed(1)}%`);
  }
  
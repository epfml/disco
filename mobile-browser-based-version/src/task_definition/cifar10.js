import * as tf from '@tensorflow/tfjs';
import { checkData } from '../helpers/data_validation_script/helpers-image-tasks';
import { getTopKClasses } from '../helpers/testing_script/testing_script';

export class CIFAR10Task {
  constructor() {
    this.displayInformation = displayInformation;
    this.trainingInformation = trainingInformation;

    this.trainDatas = [];
    this.trainLabels = [];

    this.trainM = 0;
    this.trainIndices = [];
    this.shuffledTrainIndex = 0;

    this.currentTrainIndex = 0;
  }

  /**
   * @returns {tf.Model} new instance of TensorflowJS model
   */
  async createModel() {
    const model = tf.sequential();
    model.add(
      tf.layers.conv2d({
        kernelSize: 3,
        filters: 32,
        activation: 'relu',
        padding: 'same',
        inputShape: [32, 32, 3],
      })
    );
    model.add(
      tf.layers.conv2d({
        kernelSize: 3,
        filters: 32,
        activation: 'relu',
      })
    );
    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
    model.add(tf.layers.dropout({ rate: 0.25 }));

    model.add(
      tf.layers.conv2d({
        kernelSize: 3,
        filters: 64,
        activation: 'relu',
        padding: 'same',
      })
    );
    model.add(
      tf.layers.conv2d({
        kernelSize: 3,
        filters: 64,
        activation: 'relu',
      })
    );
    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
    model.add(tf.layers.dropout({ rate: 0.25 }));

    model.add(tf.layers.flatten());
    model.add(
      tf.layers.dense({
        units: 512,
        activation: 'relu',
      })
    );
    model.add(tf.layers.dropout({ rate: 0.5 }));
    model.add(
      tf.layers.dense({
        units: 10,
        activation: 'softmax',
      })
    );

    let savePath = 'indexeddb://working_'.concat(trainingInformation.modelId);
    await model.save(savePath);

    return model;
  }

  nextBatch(batchSize, [data, lables], index) {
    const batchImagesArray = new Float32Array(batchSize * this.IMAGE_SIZE);
    const batchLabelsArray = new Uint8Array(batchSize * this.NUM_CLASSES);

    const batchLables = [];

    for (let i = 0; i < batchSize; i++) {
      const idx = index();
      const currentIdx = idx % this.DATA_PRE_NUM;
      const dataIdx = Math.floor(idx / this.DATA_PRE_NUM);

      const image = data[dataIdx].slice(
        currentIdx * this.IMAGE_SIZE,
        currentIdx * this.IMAGE_SIZE + this.IMAGE_SIZE
      );
      batchImagesArray.set(image, i * this.IMAGE_SIZE);
      batchLables.push(lables[idx]);
    }
    const xs = tf.tensor2d(batchImagesArray, [batchSize, this.IMAGE_SIZE]);
    const ys = tf.oneHot(batchLables, this.NUM_CLASSES);

    return { xs, ys };
  }

  nextTrainBatch(batchSize = this.trainM) {
    this.shuffledTrainIndex =
      (this.shuffledTrainIndex + 1) % this.trainIndices.length;

    return this.nextBatch(
      batchSize,
      [this.trainDatas, this.trainLabels],
      () => {
        this.shuffledTrainIndex =
          (this.shuffledTrainIndex + 1) % this.trainIndices.length;
        return this.trainIndices[this.shuffledTrainIndex];
      }
    );
  }

  /**
   * This functions takes as input a file (of type File) uploaded by the reader and checks
   * if the said file meets the constraints requirements and if so prepare the training data.
   * @param {Dictionary[ImageURL: String]} trainingData is a dictionary between the image_url and the label
   * @returns an object of the form: {accepted: Boolean, Xtrain: training data, ytrain: data's labels}
   */
  async dataPreprocessing(trainingData) {
    console.log('Start: Processing Uploaded File');
    var Xtrain = null;
    var ytrain = null;

    // Check some basic prop. in the user's uploaded file

    var checkResult = await checkData(trainingData);
    var startTraining = checkResult.accepted;

    // If user's file respects our format, parse it and start training
    if (startTraining) {
      const labels = [];
      const imageUri = [];

      Object.keys(trainingData).forEach((key) => {
        labels.push(trainingData[key]['label']);
        imageUri.push(key);
      });

      console.log('User File Validated. Start parsing.');

      // Do feature preprocessing
      ytrain = this.labelsPreprocessing(labels);
      const imageTensors = [];

      for (let i = 0; i < imageUri.length; ++i) {
        const tensor = await this.imagePreprocessing(imageUri[i]);
        imageTensors.push(tensor);
      }

      Xtrain = tf.concat(imageTensors, 0);
      // object to return
    } else {
      console.log('Cannot start training.');
    }
    return { accepted: startTraining, Xtrain: Xtrain, ytrain: ytrain };
  }

  async loadLocalImage(filename) {
    return new Promise((res, rej) => {
      var img = new Image();
      img.src = filename;
      img.width = this.trainingInformation.IMAGE_W;
      img.height = this.trainingInformation.IMAGE_H;
      img.onload = () => {
        var output = tf.browser.fromPixels(img);
        res(output);
      };
    });
  }

  async imagePreprocessing(src) {
    // load image from local
    const img_tensor = await this.loadLocalImage(src);
    const representation = tf.tidy(() => {
      const offset = tf.scalar(127.5);
      // Normalize the image from [0, 255] to [-1, 1].
      const normalized = img_tensor.sub(offset).div(offset);

      // Reshape to a single-element batch so we can pass it to predict.
      const batched = normalized.reshape([
        1,
        this.trainingInformation.IMAGE_H,
        this.trainingInformation.IMAGE_W,
        3,
      ]);
      return batched;
    });
    tf.dispose(img_tensor);

    return representation;
  }

  labelsPreprocessing(labels) {
    const nbLabels = labels.length;
    const labelsOneHotEncoded = [];
    labels.forEach((label) =>
      labelsOneHotEncoded.push(this.oneHotEncode(label))
    );
    return tf.tensor2d(labelsOneHotEncoded, [
      nbLabels,
      this.trainingInformation.LABEL_LIST.length,
    ]);
  }

  oneHotEncode(label) {
    const result = [];
    for (let i = 0; i < this.trainingInformation.LABEL_LIST.length; i++) {
      if (this.trainingInformation.LABEL_LIST[i] == label) {
        result.push(1);
      } else {
        result.push(0);
      }
    }
    return result;
  }

  /**
   * fetch model from local storage or indexdb
   * This function sould be moved as it is not task specific
   *
   * @returns Returns a tf.model or null if there is no model
   */
  async getModelFromStorage() {
    let savePath = 'indexeddb://saved_'.concat(trainingInformation.modelId);
    let model = await tf.loadLayersModel(savePath);
    return model;
  }

  /**
   *
   * @param {Array[ImgElement]} imgElementArray array of all images to be predicted
   * @returns Array with predictions by the model of all of the images passed as parameters
   */
  async predict(testingData) {
    console.log('Loading model...');
    var loadedModel = null;

    try {
      loadedModel = await this.getModelFromStorage();
    } catch {
      console.log('No model found.');
      return null;
    }

    if (loadedModel != null) {
      console.log('Model loaded.');
      const classes_dict = {};
      let i = 0;
      for (let url of Object.keys(testingData)) {
        const img_tensor = await this.imagePreprocessing(url);

        const logits = loadedModel.predict(img_tensor);

        // Convert logits to probabilities and class names.
        const classes = await getTopKClasses(
          logits,
          5,
          this.trainingInformation.LABEL_LIST
        );

        classes_dict[i] = classes;

        i++;
      }

      console.log('Prediction Sucessful!');

      return classes_dict;
    } else {
      console.log('No model has been trained or found!');
    }
  }
}

/**
 * Object used to contain information abfout the task in general, the model's limitations
 * and the data accepted by the model
 */
export const displayInformation = {
  // {String} title of the task (keep it short ex: Titanic)
  taskTitle: 'CIFAR10',
  // {String} informal summary of the task (used by tasks' list)
  summary:
    "In this challenge, we ask you to classify images into categories based on the objects shown on the image.",
  // {String} simple overview of the task (i.e what is the goal of the model? Why its usefull ...)
  overview:
    'The CIFAR-10 dataset is a collection of images that are commonly used to train machine learning and computer vision algorithms. It is one of the most widely used datasets for machine learning research.',
  // {String} potential limitations of the model
  limitations:
    'TODO',
  // {String} trade-offs of the model
  tradeoffs:
    'TODO',
  // {String} information about expected data
  dataFormatInformation:
    'TODO',
  // {String} description of the datapoint given as example
  dataExampleText:
    'Below you can find 10 random examples from each of the 10 classes in the dataset.',
  // {String} local url to an image data example
  dataExampleImage: './cifar10-example.png',
};

/**
 * Object used to contain the model's training specifications
 */
export const trainingInformation = {
  // {String} model's identification name
  modelId: 'cifar10-model',
  // {Number} port of the peerjs server
  port: 9001,
  // {Number} number of epoch used for training
  epoch: 10,
  // {Number} validation split
  validationSplit: 0.2,
  // {Number} batchsize
  batchSize: 30,
  // {Object} Compiling information
  modelCompileData: {
    optimizer: 'rmsprop',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  },
  // {Object} Training information
  modelTrainData: {
    epochs: 10,
  },
  threshold: 1,
  dataType: 'image',
  csvLabels: true, 
  IMAGE_H: 28,
  IMAGE_W: 28,
  LABEL_LIST: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
};

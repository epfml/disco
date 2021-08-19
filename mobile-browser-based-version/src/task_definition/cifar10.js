import * as tf from '@tensorflow/tfjs';
import { train } from '@tensorflow/tfjs';
import { checkData } from '../helpers/data_validation_script/helpers-image-tasks';
import { getTopKClasses } from '../helpers/testing_script/testing_script';
import Papa from 'papaparse';


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

  async createLabels(filenames,label_file){
    const label_assignment = {
      "airplane": 0,
      "automobile": 1,
      "bird":2,
      "cat":3,
      "deer":4,
      "dog":5,
      "frog":6,
      "horse":7,
      "ship":8,
      "truck":9,
    }
    let labels = new Array(filenames.length)
    console.log('Reading csv file', label_file)

    return new Promise((resolve,reject) => {
      Papa.parse(label_file,{
        download: true,	
        step: function(row) {
          let idx = filenames.indexOf(row.data[0]);
          if (idx>=0)
            labels[idx] = label_assignment[row.data[1]]
        },
        complete: function() {
            console.log("Read labels:", labels);
            resolve(labels)
        },
        error(err, file) {
          reject(err)
        }
      });
    })

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

    const filenames = []
    const imageUri = [];

    Object.keys(trainingData).forEach((key) => {
      imageUri.push(key);
      filenames.push(trainingData[key]['label']);
    });

    //last file sent over is the csv file, remove from normal training data
    var label_file = imageUri.pop();
    filenames.pop()

    let labels_sorted = await this.createLabels(filenames,label_file);

    // Do feature preprocessing
    ytrain = this.labelsPreprocessing(labels_sorted);
    const imageTensors = [];
    console.log('Done preprocessing labels')
    console.log('Loading images to tensors : ', imageUri.length)
    console.log('Last image ', imageUri[imageUri.length-1])

    for (let i = 0; i < imageUri.length; ++i) {
      try{ 
        const tensor = await this.imagePreprocessing(imageUri[i]);
        imageTensors.push(tensor);}
        catch(err){
          console.log('Error during tensor loading ', err)
        }
      console.log('Image to tensor nr: ', i)
    }
    console.log('Done pushing image to tensor')

    Xtrain = tf.concat(imageTensors, 0);
    console.log('Done converting to tensor')
      // object to return
    return { accepted: true, Xtrain: Xtrain, ytrain: ytrain };
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
    'The training data is limited to small images of size 32x32.',
  // {String} trade-offs of the model
  tradeoffs:
    'Training success strongly depends on label distribution',
  // {String} information about expected data
  dataFormatInformation:
    'colorful PNG images of size 32x32',
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
  IMAGE_H: 32,
  IMAGE_W: 32,
  LABEL_LIST: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
};

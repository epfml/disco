import * as tf from '@tensorflow/tfjs';
import { Task } from './task.js';
import { getTopKClasses } from '../helpers/testing_script/testing_script';
import Papa from 'papaparse';

export class ImageTask extends Task {
  async loadPretrainedNet() {
    this.net = await tf.loadLayersModel(
      'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_1.0_224/model.json'
    );
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
    if (this.trainingInformation.aggregateImagesById) {
      if (this.net == null) {
        await this.loadPretrainedNet();
      }
    }
    const tensor = await this.loadLocalImage(src);

    const representation = tf.tidy(() => {
      const batched = tensor.reshape([
        this.trainingInformation.IMAGE_H,
        this.trainingInformation.IMAGE_W,
        3,
      ]);

      const processedImg = batched
        .toFloat()
        .div(127.5)
        .sub(1)
        .expandDims(0);

      let result = null;
      console.log(this.trainingInformation.aggregateImagesById);
      if (this.trainingInformation.aggregateImagesById) {
        result = this.net.predict(processedImg);
      } else {
        result = processedImg;
      }

      return result;
    });

    tf.dispose(tensor);

    return representation;
  }

  async dataPreprocessing(trainingData) {
    console.log('Start: Processing Uploaded Files');
    var Xtrain = null;
    var ytrain = null;

    let labels = [];
    let imageUri = [];
    let imageNames = [];

    Object.keys(trainingData).forEach((key) => {
      labels.push(trainingData[key]['label']);
      imageNames.push(trainingData[key]['name']);
      imageUri.push(key);
    });

    console.log('User Files Validated. Start parsing.');
    if ('LABEL_ASSIGNMENT' in this.trainingInformation){
      var label_file = imageUri.pop();
      labels.pop();
      labels = await this.createLabels(labels, label_file);
    }
    const dictImages = {};
    const dictLabels = {};
    let ids = new Set();
    let imageTensors = [];

    for (let i = 0; i < imageUri.length; ++i) {
      const tensor = await this.imagePreprocessing(imageUri[i]);
      imageTensors.push(tensor);
      if (this.trainingInformation.aggregateImagesById) {
        const id = parseInt(imageNames[i].split('_')[0]);
        ids.add(id);
        dictLabels[id] = labels[i];
        let res = id in dictImages ? dictImages[id] : [];
        res.push(tensor);
        dictImages[id] = res;
      }
    }
    if (this.trainingInformation.aggregateImagesById) {
      console.log('Number of ids found was ' + Object.keys(dictImages).length);

      const xsArray = [];
      const labelsToProcess = [];
      ids = Array.from(ids);
      // shuffle ids
      ids.sort(() => 0.5 - Math.random());
      for (let i = 0; i < ids.length; ++i) {
        const id = ids[i];
        // Do mean pooling over same patient representations
        let imageTensorPerId = tf
          .mean(tf.concat(dictImages[id], 0), 0)
          .expandDims(0);
        xsArray.push(imageTensorPerId);
        labelsToProcess.push(dictLabels[id]);
        labels = labelsToProcess;
        imageTensors = xsArray;
      }
    }

    // Do feature preprocessing
    ytrain = this.labelsPreprocessing(labels);
    Xtrain = tf.concat(imageTensors, 0);

    return { accepted: true, Xtrain: Xtrain, ytrain: ytrain };
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

  async aggregateTestData(imageUri, imageNames) {
    const dictImages = {};
    const dictLabels = {};
    let ids = new Set();

    for (let i = 0; i < imageNames.length; ++i) {
      const id = parseInt(imageNames[i].split('_')[0]);
      ids.add(id);

      let res = [];

      if (id in dictImages) {
        res = dictImages[id];
      }

      res.push(await this.imagePreprocessing(imageUri[i]));

      dictImages[id] = res;
    }

    console.log('Number of ids found was ' + Object.keys(dictImages).length);

    let imageTensorsPerId = {};
    ids = Array.from(ids);
    for (let i = 0; i < ids.length; ++i) {
      const id = ids[i];
      // Do mean pooling over same patient representations
      imageTensorsPerId[id] = tf
        .mean(tf.concat(dictImages[id], 0), 0)
        .expandDims(0);
    }

    const xsArray = [];
    const labelsToProcess = [];

    for (let i = 0; i < ids.length; ++i) {
      const id = ids[i];
      xsArray.push(imageTensorsPerId[id]);
      labelsToProcess.push(dictLabels[id]);
    }

    // const xs = tf.concat(xsArray, 0);
    console.log('IDS')
    console.log(ids)

    return { xTest: xsArray, ids: ids };
  }

  async predict(testingData) {
    console.log('Loading model...');
    let loadedModel = null;

    try {
      loadedModel = await this.getModelFromStorage();
    } catch {
      console.log('No model found.');
      return null;
    }

    if (loadedModel) {
      console.log('Model loaded.');

      if (this.trainingInformation.aggregateImagesById && this.net == null) {
        await this.loadPretrainedNet();
      }

      const imageUri = [];
      const imageNames = [];

      Object.keys(testingData).forEach((key) => {
        imageNames.push(testingData[key].name);
        imageUri.push(key);
      });

      let xTest = [];
      let ids = null;
      if (this.trainingInformation.aggregateImagesById) {
        const preprocessedData = await this.aggregateTestData(
          imageUri,
          imageNames
        );
        xTest = await preprocessedData.xTest;
        ids = await preprocessedData.ids;
      } else {
        for (let url of Object.keys(testingData)) {
          const img_tensor = await this.imagePreprocessing(url);
          xTest.push(img_tensor);
        }
      }

      const classes_dict = {};

      // xTest = xTest.split(xTest.shape[0]);
      for (let i = 0; i < xTest.length; ++i) {
        const logits = loadedModel.predict(xTest[i]);

        // Convert logits to probabilities and class names.
        const classes = await getTopKClasses(
          logits,
          this.trainingInformation.LABEL_LIST.length,
          this.trainingInformation.LABEL_LIST
        );

        let idx = ids == null ? i : ids[i];

        classes_dict[idx] = classes;

        console.log(classes);
      }

      console.log('Prediction Sucessful!');

      return classes_dict;
    } else {
      console.log('No model has been trained or found!');
    }
  }

  async createLabels(filenames, label_file) {
    let labels = new Array(filenames.length);
    let lnames = this.trainingInformation.LABEL_ASSIGNMENT;
    console.log('Reading csv file', label_file);
    console.log(
      'Using label assignment ',
      this.trainingInformation.LABEL_ASSIGNMENT
    );
    console.log('Filenames', filenames);

    return new Promise((resolve, reject) => {
      Papa.parse(label_file, {
        download: true,
        step: function(row) {
          let idx = filenames.indexOf(row.data[0]);
          if (idx >= 0) labels[idx] = lnames[row.data[1]];
        },
        complete: function() {
          console.log('Read labels:', labels);
          resolve(labels);
        },
        error(err, file) {
          reject(err);
        },
      });
    });
  }
}

import path from 'path';
import * as tf from '@tensorflow/tfjs';
import mobilenet from '@tensorflow-models/mobilenet';
import '@tensorflow/tfjs-node';
import * as config from '../../server.config.js';
import fs from 'fs';

/**
 * Create the models directory for the TFJS model files of
 * the tasks defined below.
 */
if (!fs.existsSync(config.MODELS_DIR)) {
  fs.mkdirSync(config.MODELS_DIR);
}

async function createTitanicModel() {
  const model = tf.sequential();
  model.add(
    tf.layers.dense({
      inputShape: [6],
      units: 124,
      activation: 'relu',
      kernelInitializer: 'leCunNormal',
    })
  );
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
  const savePath = path.join(config.MODELS_DIR, 'titanic');
  await model.save(config.SAVING_SCHEME.concat(savePath));
}

async function createMnistModel() {
  const model = tf.sequential();
  model.add(
    tf.layers.conv2d({
      inputShape: [28, 28, 3],
      kernelSize: 3,
      filters: 16,
      activation: 'relu',
    })
  );
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
  model.add(
    tf.layers.conv2d({ kernelSize: 3, filters: 32, activation: 'relu' })
  );
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
  model.add(
    tf.layers.conv2d({ kernelSize: 3, filters: 32, activation: 'relu' })
  );
  model.add(tf.layers.flatten({}));
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 10, activation: 'softmax' }));
  const savePath = path.join(config.MODELS_DIR, 'mnist');
  await model.save(config.SAVING_SCHEME.concat(savePath));
}

async function createLUSCovidModel() {
  const model = tf.sequential();
  model.add(
    tf.layers.dense({ inputShape: [1000], units: 512, activation: 'relu' })
  );
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 2, activation: 'softmax' }));
  const savePath = path.join(config.MODELS_DIR, 'lus_covid');
  await model.save(config.SAVING_SCHEME.concat(savePath));
}

async function createCifar10Model() {
  const mobilenet = await tf.loadLayersModel(
    'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json'
  );
  const x = mobilenet.getLayer('global_average_pooling2d_1');
  const predictions = tf.layers
    .dense({ units: 10, activation: 'softmax', name: 'denseModified' })
    .apply(x.output);
  const model = tf.model({
    inputs: mobilenet.input,
    outputs: predictions,
    name: 'modelModified',
  });

  const savePath = path.join(config.MODELS_DIR, 'cifar10');
  await model.save(config.SAVING_SCHEME.concat(savePath));
}

export default [
  createTitanicModel,
  createMnistModel,
  createLUSCovidModel,
  createCifar10Model,
];

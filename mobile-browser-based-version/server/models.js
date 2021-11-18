import path from 'path';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';

// Saving scheme (URL-like)
const SCHEME = 'file://';
/*
 * Define a __dirname similar to CommonJS. We unpack the pathname
 * from the URL and use it in the path library. We do this instead
 * of directly working with URLs because the path library is just
 * easier to read, especially when functions don't support URL
 * objects.
 */
const __dirname = path.dirname(new URL(import.meta.url).pathname);

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
  await model.save(SCHEME.concat(path.join(__dirname, 'titanic')));
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
  await model.save(SCHEME.concat(path.join(__dirname, 'mnist')));
}

async function createLUSCovidModel() {
  const model = tf.sequential();
  model.add(
    tf.layers.dense({ inputShape: [1000], units: 512, activation: 'relu' })
  );
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 2, activation: 'softmax' }));
  await model.save(SCHEME.concat(path.join(__dirname, 'lus_covid')));
}

async function createCifar10Model() {
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
  await model.save(SCHEME.concat(path.join(__dirname, 'cifar10')));
}

export const models = [
  createTitanicModel,
  createMnistModel,
  createLUSCovidModel,
  createCifar10Model,
];

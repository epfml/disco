const fs     = require('fs');
const path   = require('path');
const tf     = require('@tensorflow/tfjs')
require('@tensorflow/tfjs-node')

const SCHEME = 'file://';

async function createTitanicModel() {
    let model = tf.sequential();
    model.add(tf.layers.dense({
        inputShape: [8],
        units: 124,
        activation: 'relu',
        kernelInitializer: 'leCunNormal',
    }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
    model.save(SCHEME + path.join(__dirname, 'titanic'));
}

async function createMnistModel() {
    let model = tf.sequential();
    model.add(tf.layers.conv2d({
        inputShape: [28, 28, 3],
        kernelSize: 3,
        filters: 16,
        activation: 'relu'
    }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
    model.add(tf.layers.conv2d({ kernelSize: 3, filters: 32, activation: 'relu' }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
    model.add(tf.layers.conv2d({ kernelSize: 3, filters: 32, activation: 'relu' }));
    model.add(tf.layers.flatten({}));
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 10, activation: 'softmax' }));
    model.save(SCHEME + path.join(__dirname, 'mnist'));
}

async function createLUSCovidModel() {
    let model = tf.sequential();
    model.add(tf.layers.dense({inputShape:[1000], units:512, activation:'relu'}))
    model.add(tf.layers.dense({units: 64, activation: 'relu'}))
    model.add(tf.layers.dense({units: 2, activation:"softmax"}));
    await model.save(SCHEME + path.join(__dirname, 'lus_covid'));
}


module.exports = {
    models: [createTitanicModel, createMnistModel, createLUSCovidModel],
}
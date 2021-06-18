const fs     = require('fs');
const tf     = require('@tensorflow/tfjs')
const tfNode = require('@tensorflow/tfjs-node')


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
    model.save(SCHEME + path.join(__dirname + 'titanic'));
}

function createMnistModel() {
    return null;
}


module.exports = {
    models: [createTitanicModel, createMnistModel],
}

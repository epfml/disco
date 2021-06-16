<<<<<<< HEAD
const fs     = require('fs');
const tf     = require('@tensorflow/tfjs')
const tfNode = require('@tensorflow/tfjs-node')


async function createTitanicModel() {
=======
const tf = require('@tensorflow/tfjs')


function createTitanicModel() {
>>>>>>> cb0b2030da39be6c13947e4ef3af3852a38b905e
    let model = tf.sequential()
    model.add(tf.layers.dense({
        inputShape: [8],
        units: 124,
        activation: "relu",
        kernelInitializer: "leCunNormal",
    }))
    model.add(tf.layers.dense({ units: 64, activation: "relu" }))
    model.add(tf.layers.dense({ units: 32, activation: "relu" }))
    model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }))
<<<<<<< HEAD
    model.save('file://./titanic/')
=======
    model.summary()
    return model
    // Do we want to save models on disk? Currently sits in RAM.
    /*const save_path_db = "indexeddb://working_".concat(
        training_information.model_id
    );
    await model.save(save_path_db);*/
>>>>>>> cb0b2030da39be6c13947e4ef3af3852a38b905e
}

function createMnistModel() {
    return null
}

<<<<<<< HEAD

module.exports = {
    models: [createTitanicModel, createMnistModel]
=======
const titanicModel = createTitanicModel()
const mnistModel = createMnistModel()

module.exports = {
    models: new Map([
        ['titanic', titanicModel],
        ['mnist', mnistModel],
    ])
>>>>>>> cb0b2030da39be6c13947e4ef3af3852a38b905e
}

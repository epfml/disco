import * as tf from "@tensorflow/tfjs";



/**
 * Object used to contain information about the task in general, the model's limitations
 * and the data accepted by the model 
 */
export const display_informations = {
    // {String} title of the task (keep it short ex: Titanic)
    taskTitle: "MNIST",
    // {String} simple overview of the task (i.e what is the goal of the model? Why its usefull ...)
    overview: "The MNIST handwritten digit classification problem is a standard dataset used in computer vision and deep learning. Although the dataset is effectively solved, we use it to test our Decentralised Learning algorithms and platform.",
    // {String} potential limitations of the model 
    limitations: "The current model is a very simple CNN and its main goal is to test the app and the Decentralizsed Learning functionality.",
    // {String} trade-offs of the model 
    tradeoffs: "We are using a simple model, first a 2d convolutional layer > max pooling > 2d convolutional layer > max pooling > convolutional layer > 2 dense layers.",
    // {String} information about expected data 
    dataFormatInformation: 
    "This model takes as input an image dataset. You can upload each digit image of your dataset in the box corresponding to its label. The size of the image will be reduced to 28x28. Finally, the image should be in grey scale.",
    // {String} description of the datapoint given as example
    dataExampleText: "Below you can find an example of an expected image representing the digit 9.",
};

/**
 * Object used to contain the model's training specifications
 */
export const training_information = {
    // {String} model's identification name
    model_id: "mnist-model",
    // {Number} port of the peerjs server
    port: 1,
    // {Number} number of epoch used for training
    epoch: 10,
    // {Number} validation split
    validation_split: 0.2,
    // {Number} batchsize
    batch_size: 30,
    // {Object} Compiling information 
    model_compile_data: {
        optimizer: "rmsprop",
        loss: "binaryCrossentropy",
        metrics: ["accuracy"],
    },
    // {Object} Training information 
    model_train_data: {
        epochs: 10,
    },
}

/**
 * This functions takes as input a file (of type File) uploaded by the reader and checks 
 * if the said file meets the constraints requirements and if so prepare the training data. 
 * @param {Dictionary[ImageURL: String]} training_data is a dictionary between the image_url and the label
 * @returns an object of the form: {accepted: Boolean, Xtrain: training data, ytrain: data's labels}
 */
export async function data_preprocessing(training_data) {
    console.log("Start: Processing Uploaded File");
    var Xtrain = null;
    var ytrain = null;

    // Check some basic prop. in the user's uploaded file
    
    var check_result= await check_data(training_data)
    var startTraining = check_result.accepted

    // If user's file respects our format, parse it and start training
    if (startTraining) {
        const labels = []
        const image_uri = []

        Object.keys(training_data).forEach(key => {
            console.log(key, training_data[key])
            labels.push(training_data[key])
            image_uri.push(key)
        });

        console.log("User File Validated. Start parsing.");

        // Do feature preprocessing
        ytrain = labels_preprocessing(labels)
        const image_tensors = []
    
        image_uri.forEach( image => 
        image_tensors.push(image_preprocessing(image))
        )
 
        Xtrain = tf.concat(image_tensors, 0)
        // object to return 
    } else {
        console.log("Cannot start training.")
    }
    return {accepted: startTraining, Xtrain: Xtrain, ytrain: ytrain}
}

async function check_data(training_data){
    return {accepted: Object.keys(training_data).length>1}
}

const IMAGE_H = 28;
const IMAGE_W = 28;
const NUM_CLASSES = 10;
const LABEL_LIST = ["0","1","2","3","4","5","6","7","8","9"]

function image_preprocessing(src){
    // Fill the image & call predict.
    let imgElement = document.createElement('img');
    imgElement.src = src;
    imgElement.width = IMAGE_W;
    imgElement.height = IMAGE_H;

    // tf.browser.fromPixels() returns a Tensor from an image element.
    const img = tf.browser.fromPixels(imgElement).toFloat();

    const offset = tf.scalar(127.5);
    // Normalize the image from [0, 255] to [-1, 1].
    const normalized = img.sub(offset).div(offset);

    // Reshape to a single-element batch so we can pass it to predict.
    const batched = normalized.reshape([1, IMAGE_H, IMAGE_W, 3]);

    return batched
}

function labels_preprocessing(labels){
    const nb_labels = labels.length
    const labels_one_hot_encoded = []
    labels.forEach(label =>
        labels_one_hot_encoded.push(one_hot_encode(label))
    )
    
    console.log(labels_one_hot_encoded)
    return tf.tensor2d(labels_one_hot_encoded, [nb_labels, NUM_CLASSES])
}

function one_hot_encode(label){
    const result = []
    for (let i = 0; i < LABEL_LIST.length; i++){
        if(LABEL_LIST[i]==label){
            result.push(1)
        }else{
            result.push(0)
        }
    }
    return result
}
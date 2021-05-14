import * as tf from '@tensorflow/tfjs';

const FEATURES = 1000
let net = null

export const display_informations = {
    // {String} title of the task (keep it short ex: Titanic)
    taskTitle: "LUS-COVID",
    // {String} simple overview of the task (i.e what is the goal of the model? Why its usefull ...)
    overview: "The LUS-COVID dataset is a dataset by iGH at EPFL and consists on a set of lung ultrasound images for a group of patients and the labels corresponding to wether they were diagnosed as COVID-positive or COVID-negative.",
    // {String} potential limitations of the model 
    limitations: "The current model is a simpler version of the DeepChest model developped by the iGH team. We are not doing position embedding and instead of that we are doing mean pooling over the feature vector of the images for each patient. Moreover, since it is a browser application we cannot use the ResNet18 because of its size and hence we are using a simpler feature extractor, Mobilenet.",
    // {String} trade-offs of the model 
    tradeoffs: "We are using a simpler version of DeepChest in order to be able to run it on the browser.",
    // {String} information about expected data 
    dataFormatInformation: 
    "This model takes as input an image dataset. It consists on a set of lung ultrasound images per patient with its corresponding label of covid positive or negative. Moreover, to identify the images per patient you have to follow the follwing naming pattern: \"patientId_*.png\"",
    // {String} description of the datapoint given as example
    dataExampleText: "Below you can find an example of an expected lung image for patient 2 named: 2_QAID_1.masked.reshaped.squared.224.png",
};

/**
 * Object used to contain the model's training specifications
 */
export const training_information = {
    // {String} model's identification name
    model_id: "lus-covid-model",
    // {Number} port of the peerjs server
    port: 3,
    // {Number} number of epoch used for training
    epoch: 15,
    // {Number} validation split
    validation_split: 0.2,
    // {Number} batchsize
    batch_size: 2,
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

    IMAGE_H : 224,
    IMAGE_W : 224,
    LABEL_LIST : ["COVID-Positive", "COVID-Negative"],
    NUM_CLASSES : 2
}

export function create_model(){
    let new_model = tf.sequential();

    new_model.add(tf.layers.dense({inputShape:[FEATURES], units:512, activation:'relu'}))

    new_model.add(tf.layers.dense({units: 64, activation: 'relu'}))

    new_model.add(tf.layers.dense({units: 2, activation:"softmax"}));

    new_model.summary()
    
    return new_model
}

// Data is passed under the form of Dictionary{ImageURL: label}
export async function data_preprocessing(training_data){
    if (net == null){
        console.log("loading mobilenet...")

        net = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_1.0_224/model.json');

        net.summary()

        console.log("Successfully loaded model")
    }

    const labels = []
    const image_uri = []
    const image_names = []

    Object.keys(training_data).forEach(key => {
        labels.push(training_data[key].label)
        image_names.push(training_data[key].name)
        image_uri.push(key)
    });

    const preprocessed_data = await getTrainData(image_uri, labels, image_names);    
    
    return preprocessed_data
}


async function loadLocalImage(filename) {
    return new Promise((res, rej) => {
        var img = new Image();
        img.src = filename
        img.width = training_information.IMAGE_W
        img.height = training_information.IMAGE_H
        img.onload = () =>{
            var output = tf.browser.fromPixels(img)
            res(output)
        }
    });
}


async function image_preprocessing(src){
    const tensor = await loadLocalImage(src)
    
    const batched = tensor.reshape([training_information.IMAGE_H, training_information.IMAGE_W, 3])

    const processedImg = batched.toFloat().div(127).sub(1).expandDims(0);

    let representation = net.predict(processedImg)

    return representation
}

function labels_preprocessing(labels){
    const nb_labels = labels.length
    const labels_one_hot_encoded = []
    for(let i = 0; i< labels.length; ++i){
        labels_one_hot_encoded.push(one_hot_encode(labels[i]))
    }
    
    console.log(labels_one_hot_encoded)
    return tf.tensor2d(labels_one_hot_encoded, [nb_labels, training_information.NUM_CLASSES])
}

function mean_tensor(tensors){
    let result = tensors[0]

    for(let i = 1; i< tensors.length; ++i){
        const tensor = tensors[i]
        result = result.add(tensor)
    }
    result = result.div(tf.scalar(tensors.length))

    return result
}

function one_hot_encode(label){
    const result = []
    for (let i = 0; i < training_information.NUM_CLASSES; i++){
        if(training_information.LABEL_LIST[i]==label){
            result.push(1)
        }else{
            result.push(0)
        }
    }
    return result
}

  /**
   * Get all training data as a data tensor and a labels tensor.
   *
   * @returns
   *   xs: The data tensor, of shape `[numTrainExamples, 28, 28, 1]`.
   *   labels: The one-hot encoded labels tensor, of shape
   *     `[numTrainExamples, 2]`.
   */
   async function getTrainData(image_uri, labels_preprocessed, image_names) {
    const dict_images = {}
    const dict_labels = {}
    let patients = new Set()

    for(let i = 0; i<image_names.length; ++i){
        const id = parseInt(image_names[i].split("_")[0])
        patients.add(id)

        let res = []

        if(id in dict_images){ 
            res = dict_images[id]
        }else{
            dict_labels[id] = labels_preprocessed[i]
        }

        res.push(await image_preprocessing(image_uri[i]))

        dict_images[id] = res
    }


    console.log("Number of patients found was of "+Object.keys(dict_images).length)

    let image_tensors1 = {}
    patients = Array.from(patients)
    for(let i = 0; i < patients.length; ++i){
        const id = patients[i]
        // Do mean pooling over same patient representations
        image_tensors1[id] = mean_tensor(dict_images[id])
    }

    console.log("patient 2 " +image_tensors1[2].dataSync())
    
    const xs_array = []
    const labels_to_process = []

    // shuffle patients
    patients.sort( () => .5 - Math.random() );
    for (let i = 0; i< patients.length; ++i ){
        const id = patients[i]
        xs_array.push(image_tensors1[id])
        labels_to_process.push(dict_labels[id])
    }

    console.log(xs_array)
    const xs = tf.concat(xs_array, 0)
    const labels = labels_preprocessing(labels_to_process)
   
    console.log(xs)
    console.log(labels)

    return {xs: xs, labels: labels}
  }
  
  
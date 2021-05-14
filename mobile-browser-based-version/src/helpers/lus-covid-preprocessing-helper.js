import * as tf from '@tensorflow/tfjs';

const IMAGE_H = 224;
const IMAGE_W = 224;
const LABEL_LIST = ["COVID-Positive","COVID-Negative"]
const NUM_CLASSES = LABEL_LIST.length;
const FEATURES = 1000
let net = null

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
        img.width = IMAGE_W
        img.height = IMAGE_H
        img.onload = () =>{
            var output = tf.browser.fromPixels(img)
            res(output)
        }
    });
}


async function image_preprocessing(src){
    const tensor = await loadLocalImage(src)
    
    const batched = tensor.reshape([IMAGE_H, IMAGE_W, 3])

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
    return tf.tensor2d(labels_one_hot_encoded, [nb_labels, NUM_CLASSES])
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
    for (let i = 0; i < LABEL_LIST.length; i++){
        if(LABEL_LIST[i]==label){
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
  

  export function createDeepChestModel(){
    let new_model = tf.sequential();

    new_model.add(tf.layers.dense({inputShape:[FEATURES], units:512, activation:'relu'}))

    new_model.add(tf.layers.dense({units: 64, activation: 'relu'}))

    new_model.add(tf.layers.dense({units: 2, activation:"softmax"}));

    new_model.summary()
    return new_model
  }
  
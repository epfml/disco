import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet'

const IMAGE_H = 224;
const IMAGE_W = 224;
const LABEL_LIST = ["COVID-Positive","COVID-Negative"]
const NUM_CLASSES = LABEL_LIST.length;
const FEATURES = 1000 //TODO: in python I get 1000 as features
//const SITE_POSITIONS = ["QAID", "QAIG", "QASD", "QASG", "QLD", "QLG", "QPID", "QPIG", "QPSD"]
const SITE_POSITIONS = ["QAID", "QAIG", "QASD", "QASG", "QLD", "QLG", "QPID", "QPIG", "QPSD", "QPSG", "QPG"]
// Data is passed under the form of Dictionary{ImageURL: label}
let net = null

//TODO: improve by averaging from the same site and then average all together??

export default async function data_preprocessing(training_data, batchSize){
    if (net == null){
        console.log("loading mobilenet...")
        //net = await mobilenet.load()
        net = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');
        net.summary()
        //console.log(net.layers[net.layers.length-2])
        //net = tf.model({inputs:net.input, outputs:net.layers[net.layers.length-2].output})

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

    const preprocessed_data = getTrainData(image_uri, labels, image_names);    
    
    return preprocessed_data
}
function image_preprocessing(src){

    // Fill the image & call predict.
    let imgElement = document.createElement('img');
    imgElement.src = src;
    imgElement.width = IMAGE_W;
    imgElement.height = IMAGE_H;

    // tf.browser.fromPixels() returns a Tensor from an image element.
    const img = tf.browser.fromPixels(imgElement).toFloat();
    // ATTENTION: not normalizing
    const batched = img.reshape([1,IMAGE_H, IMAGE_W, 3])

    let representation = net.predict(batched) // Get embeddings for transfer learning
    return representation
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

function mean_tensor(tensors){
    let result = tf.zeros([1, FEATURES])
    for(let i = 0; i< tensors.length; ++i){
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
   function getTrainData(image_uri, labels_preprocessed, image_names) {
    const dict_images = {}
    const dict_labels = {}
    const patients = new Set()

    for(let i = 0; i<image_names.length; ++i){
        const id = parseInt(image_names[i].split("_")[0])
        patients.add(id)

        if(!(id in dict_images)){
            dict_images[id] = []
            dict_labels[id] = labels_preprocessed[i]
        }

        const site = image_names[i].split("_")[1]
        dict_images[id].push(image_uri[i])
    }

    console.log("Number of patients found was of "+Object.keys(dict_images).length)

    let image_tensors1 = {}
    for(let id in Object.keys(dict_images)){
        const image_tensors2 = []
        for(let image_uri in dict_images[id]){
            // Get representation from Mobilenet for each image
            image_tensors2.push(image_preprocessing(image_uri))
        }
        // Do mean pooling over same patient representations
        image_tensors1[id] = mean_tensor(image_tensors2)
    }
    
    const xs_array = []
    const labels_to_process = []

    // shuffle patients
    let patients_list = Array.from(patients)
    patients_list = patients_list.sort(() => Math.random() - 0.5)
    for (let id in patients_list){
        xs_array.push(image_tensors1[id])
        labels_to_process.push(dict_labels[id])
    }

    

    console.log(xs_array)
    const xs = tf.concat(xs_array, 0)
    const labels = labels_preprocessing(labels_to_process)
   
    console.log(xs)
    console.log(labels)
    return {xs, labels};
  }
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet'

const IMAGE_H = 256;
const IMAGE_W = 256;
const IMAGE_SIZE = IMAGE_H * IMAGE_W;
const NUM_CLASSES = 2;
const FEATURES = 1024
const LABEL_LIST = ["COVID-Positive","COVID-Negative"]
//const SITE_POSITIONS = ["QAID", "QAIG", "QASD", "QASG", "QLD", "QLG", "QPID", "QPIG", "QPSD"]
const SITE_POSITIONS = ["QAID", "QAIG", "QASD", "QASG", "QLD", "QLG", "QPID", "QPIG", "QPSD", "QPSG", "QPG"]
// Data is passed under the form of Dictionary{ImageURL: label}
let net = null
let MAX_PICTURES_IN_PATIENT = 0

//TODO: improve by averaging from the same site and then average all together??

export default async function data_preprocessing(training_data){
    if (net == null){
        console.log("loading mobilenet...")
        net = await mobilenet.load()
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
    let values = Array.from(net.infer(imgElement, true).dataSync())
    let new_values = []
    for(let value in values){
        new_values.push(tf.scalar(value, 'float32'))
    }

    //console.log(values)
    let activation = tf.tensor2d(values , [1, FEATURES]) 
    //console.log("activation: "+activation)

    return activation
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
    //console.log("tensors "+ tensors)
    let result = tf.zeros([1, FEATURES])
    for(let i = 0; i< tensors.length; ++i){
        const tensor = tensors[i]
        //console.log("tensor compare")
        //console.log(tensor)
        //console.log(tf.zeros([1, FEATURES]))
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

    for(let i = 0; i<image_names.length; ++i){
        const id = image_names[i].split("_")[0]
        if(!(id in dict_images)){
            dict_images[id] = []
            dict_labels[id] = labels_preprocessed[i]
        }
        const site = image_names[i].split("_")[1]
        dict_images[id].push(image_uri[i])
    }
    for(let id in dict_images){
       MAX_PICTURES_IN_PATIENT = Math.max(MAX_PICTURES_IN_PATIENT, dict_images[id].length)
    }
    console.log("Max num of pictures in a patient is "+ MAX_PICTURES_IN_PATIENT)

    const image_tensors1 = []
    for(let id in dict_images){
        const image_tensors2 = []
        for(let image_uri in dict_images[id]){
            image_tensors2.push(image_preprocessing(image_uri))
        }
        //image_tensors1.push(tf.concat(image_tensors2, 1))
        image_tensors1.push(mean_tensor(image_tensors2))
    }
    
    // Do feature preprocessing
    const labels_to_process = []
    for(let id in dict_labels){
        labels_to_process.push(dict_labels[id])
    }
    console.log(labels_to_process)
    const labels = labels_preprocessing(labels_to_process)
    const image_tensors = []
    
    image_uri.forEach( image => 
      image_tensors.push(image_preprocessing(image))
    )

    console.log("end")
    console.log(image_tensors1)
    console.log(labels)
    const xs = tf.concat(image_tensors1, 0)
    
    return {xs, labels};
  }
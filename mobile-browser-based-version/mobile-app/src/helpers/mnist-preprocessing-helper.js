import * as tf from '@tensorflow/tfjs';

const IMAGE_H = 28;
const IMAGE_W = 28;
const IMAGE_SIZE = IMAGE_H * IMAGE_W;
const NUM_CLASSES = 10;
const LABEL_LIST = ["0","1","2","3","4","5","6","7","8","9"]

// Data is passed under the form of Dictionary{ImageURL: label}
export default function data_preprocessing(training_data){
    const labels = []
    const image_uri = []

    Object.keys(training_data).forEach(key => {
        console.log(key, training_data[key])
        labels.push(training_data[key])
        image_uri.push(key)
    });

    const preprocessed_data = getTrainData(image_uri, labels);    
    
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

  /**
   * Get all training data as a data tensor and a labels tensor.
   *
   * @returns
   *   xs: The data tensor, of shape `[numTrainExamples, 28, 28, 1]`.
   *   labels: The one-hot encoded labels tensor, of shape
   *     `[numTrainExamples, 10]`.
   */
   function getTrainData(image_uri, labels_preprocessed) {
    // Do feature preprocessing
    const labels = labels_preprocessing(labels_preprocessed)
    const image_tensors = []

    image_uri.forEach( image => 
      image_tensors.push(image_preprocessing(image))
    )

    const xs = tf.concat(image_tensors, 0)
    
    return {xs, labels};
  }
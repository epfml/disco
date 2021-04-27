import * as tf from '@tensorflow/tfjs';
import {categoricalCrossentropy} from '@tensorflow/tfjs-layers/dist/exports_metrics';

export function get_model(){
    //return getModifiedMobilenet()
    return buildObjectDetectionModel() 
}
//-------------------------------------------------------------
// modifies the pre-trained mobilenet, freezes layers to train 
// only the last couple of layers
//-------------------------------------------------------------
async function getModifiedMobilenet()
{
    const trainableLayers = ['denseModified','conv_pw_13_bn','conv_pw_13','conv_dw_13_bn','conv_dw_13'];
    const mobilenet =  await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');
    console.log('Mobilenet model is loaded')

    const x=mobilenet.getLayer('global_average_pooling2d_1');
    const predictions= tf.layers.dense({units: 2, activation: 'softmax',name: 'denseModified'}).apply(x.output);
    let mobilenetModified = tf.model({inputs: mobilenet.input, outputs: predictions, name: 'modelModified' });
    console.log('Mobilenet model is modified')
  
    mobilenetModified = freezeModelLayers(trainableLayers,mobilenetModified)
    console.log('ModifiedMobilenet model layers are freezed')

    //mobilenetModified.compile({loss: categoricalCrossentropy, optimizer: tf.train.adam(1e-3), metrics: ['accuracy','crossentropy']});


    return mobilenetModified 
}

const topLayerGroupNames = ['conv_pw_9', 'conv_pw_10', 'conv_pw_11'];  // A:
const topLayerName =
    `${topLayerGroupNames[topLayerGroupNames.length - 1]}_relu`;
 
async function loadTruncatedBase() {
  const mobilenet = await tf.loadLayersModel(
      'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');
 
  const fineTuningLayers = [];
  const layer = mobilenet.getLayer(topLayerName);  // B:
  const truncatedBase =
      tf.model({inputs: mobilenet.inputs, outputs: layer.output});  // C:
  for (const layer of truncatedBase.layers) {
    layer.trainable = false;  // D:
    for (const groupName of topLayerGroupNames) { 
      if (layer.name.indexOf(groupName) === 0) {  // E:
        fineTuningLayers.push(layer);
        break;
      }
    }
  }
  return {truncatedBase, fineTuningLayers};
}
 
function buildNewHead(inputShape) {  // F:
  const newHead = tf.sequential();
  newHead.add(tf.layers.flatten({inputShape}));
  newHead.add(tf.layers.dense({units: 200, activation: 'relu'}));
  newHead.add(tf.layers.dense({units: LABEL_LIST.length}));  // G:
  return newHead;
}
 
async function buildObjectDetectionModel() {
  const {truncatedBase, fineTuningLayers} = await loadTruncatedBase();
 
  const newHead = buildNewHead(truncatedBase.outputs[0].shape.slice(1));
  const newOutput = newHead.apply(truncatedBase.outputs[0]);
  const model = tf.model({inputs: truncatedBase.inputs, outputs: newOutput});  // H:
 
  return model
}
 
// A: Sets what layers to unfreeze for fine-tuning
// B: Get an intermediate layer: the last feature-extraction layer
// C: Forms the truncated MobileNet
// D: Freeze all feature-extraction layers for the initial phase of transfer learning
// E: Keeps track of layers that will be unfrozen during fine-tuning
// F: Build the new head model for the simple object detection task
// G: The length-5 output consists of a length-1 shape indicator and a length-4
//    bounding box (see Figure 5.14)
// H: Put the new head model on top of the truncated MobileNet to form the entire
//    model for object detection

//-------------------------------------------------------------
// freezes mobilenet layers to make them untrainable
// just keeps final layers trainable with argument trainableLayers
//-------------------------------------------------------------
function freezeModelLayers(trainableLayers,mobilenetModified)
{
    for (const layer of mobilenetModified.layers) 
    {
      layer.trainable = false;
      for (const tobeTrained of trainableLayers) 
      {
        if (layer.name.indexOf(tobeTrained) === 0) 
        {
          layer.trainable = true;
          break;
        }
      }
    }
    return mobilenetModified;
}



const IMAGE_H = 224;
const IMAGE_W = 224;
const NUM_CLASSES = 2;
const LABEL_LIST = ["COVID-Positive","COVID-Negative"]
//const SITE_POSITIONS = ["QAID", "QAIG", "QASD", "QASG", "QLD", "QLG", "QPID", "QPIG", "QPSD"]
const SITE_POSITIONS = ["QAID", "QAIG", "QASD", "QASG", "QLD", "QLG", "QPID", "QPIG", "QPSD", "QPSG", "QPG"]
// Data is passed under the form of Dictionary{ImageURL: label}
export function data_preprocessing_mobilenet(training_data){
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

    const offset = tf.scalar(127.5);
    // Normalize the image from [0, 255] to [-1, 1].
    const normalized = img.div(offset).sub(tf.scalar(1));

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
   *     `[numTrainExamples, 2]`.
   */
   function getTrainData(image_uri, labels_for_preprocessing, image_names) {  
       const images_to_process = []
       const labels_to_process = []

        for(let i = 0; i<image_names.length; ++i){
            const id = image_names[i].split("_")[0]
            const site = image_names[i].split("_")[1]
            if(site == SITE_POSITIONS[0]){
                images_to_process.push(image_uri[i])
                labels_to_process.push(labels_for_preprocessing[i])
            }
        }

    // Do feature preprocessing
    console.log(labels_to_process)
    const labels = labels_preprocessing(labels_to_process)
    const image_tensors = []
    
    images_to_process.forEach( image => 
      image_tensors.push(image_preprocessing(image))
    )

    console.log("end")
    console.log(labels)
    const xs = tf.concat(image_tensors, 0)
    
    return {xs, labels};
  }
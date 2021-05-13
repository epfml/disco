import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet'

const IMAGE_H = 224;
const IMAGE_W = 224;
const LABEL_LIST = ["COVID-Positive","COVID-Negative"]
const NUM_CLASSES = LABEL_LIST.length;
const FEATURES = 1000 //TODO: in python I get 1000 as features
const SITE_POSITIONS = ["QAID", "QAIG", "QASD", "QASG", "QLD", "QLG", "QPID", "QPIG", "QPSD", "QPSG", "QPG"]
// Data is passed under the form of Dictionary{ImageURL: label}
let net = null

//TODO: improve by averaging from the same site and then average all together??

export async function data_preprocessing(training_data){
    if (net == null){
        console.log("loading mobilenet...")
        /*net = await mobilenet.load({
            version: 1,
            alpha: 1.0,
          })*/
        net = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_1.0_224/model.json');
        //net =  await tf.loadLayersModel('https://storage.googleapis.com/mobilenet_v2/checkpoints/mobilenet_v2_1.4_224/model.json')
        net.summary()
        //console.log(net.layers[net.layers.length-2])
        //const layer = net.getLayer('conv_pw_13_relu')
        //net = tf.model({inputs:net.input, outputs:layer.output})

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
    /*// Fill the image & call predict.
    let imgElement = document.createElement('img');
    imgElement.src = src;
    imgElement.width = IMAGE_W;
    imgElement.height = IMAGE_H;

    // tf.browser.fromPixels() returns a Tensor from an image element.
    const img = tf.browser.fromPixels(imgElement).toFloat();
    // ATTENTION: not normalizing*/

    const tensor = await loadLocalImage(src)
    //console.log(tensor.dataSync())
    
    const batched = tensor.reshape([IMAGE_H, IMAGE_W, 3])

    const processedImg = batched.toFloat().div(127).sub(1).expandDims(0);

    //console.log("image "+processedImg.dataSync())
    //let representation = net.infer(processedImg) // , true for Get embeddings for transfer learning
    let representation = net.predict(processedImg)
    //console.log(representation.dataSync())
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
    /*console.log("tensors:")
    console.log(tensors)
    console.log(tensors.length)*/

    let result = tensors[0]

    for(let i = 1; i< tensors.length; ++i){
        const tensor = tensors[i]
        result = result.add(tensor)
    }
    result = result.div(tf.scalar(tensors.length))
    //console.log("mean"+(representation1==result))
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

        //console.log("image uri")
        //console.log(image_uri[i])
        res.push(await image_preprocessing(image_uri[i]))

        dict_images[id] = res
    }


    console.log("Number of patients found was of "+Object.keys(dict_images).length)

    let image_tensors1 = {}
    patients = Array.from(patients)
    for(let i = 0; i < patients.length; ++i){
        const id = patients[i]
        //console.log("patient id "+id)
        // Do mean pooling over same patient representations
        image_tensors1[id] = mean_tensor(dict_images[id])
    }

    console.log("patient 2 " +image_tensors1[2].dataSync())
    
    const xs_array = []
    const labels_to_process = []
    console.log(patients)
    patients.sort( () => .5 - Math.random() );
    console.log(patients)
    for (let i = 0; i< patients.length; ++i ){
        const id = patients[i]
        /*console.log("patient id"+id)
        console.log(image_tensors1[id])
        console.log(dict_labels[id])*/
        xs_array.push(image_tensors1[id])
        labels_to_process.push(dict_labels[id])
    }



    console.log(xs_array)
    const xs = tf.concat(xs_array, 0)
    const labels = labels_preprocessing(labels_to_process)
   
    console.log(xs)
    console.log(labels)

    //fit(xs, labels)
    return {xs: xs, labels: labels}
  }

  function fit(xs, labels){
      tf.ENV.set("WEBGL_PACK", true)
    // Fit model
    const optimizer = tf.train.adam();
    optimizer.learningRate = 0.05;

    const model = createDeepChestModel()

    model.compile({
        optimizer: optimizer,
        loss: "binaryCrossentropy",
        metrics: ["accuracy"],
    });

    model.fit(xs, labels, {
        epochs: 50,
        validationSplit: 0.1,
        callbacks: {
        onEpochEnd: async (epoch, logs) => {
            console.log(`EPOCH (${epoch + 1}): Train Accuracy: ${(
            logs.acc * 100
            ).toFixed(2)},
                Val Accuracy:  ${(
                logs.val_acc * 100
            ).toFixed(2)}\n`);
            console.log(`loss ${logs.loss.toFixed(4)}`)
            //await tf.nextFrame();
        }
        }
    });
  }

  export function createDeepChestModel(){
    let new_model = tf.sequential();

    /*new_model.add(tf.layers.flatten(
        {inputShape: net.outputs[0].shape.slice(1)}))

    new_model.add(tf.layers.dense({units:512, activation:'relu'}))*/

    new_model.add(tf.layers.dense({inputShape:[FEATURES], units:512, activation:'relu'}))

    new_model.add(tf.layers.dense({units: 64, activation: 'relu'}))

    new_model.add(tf.layers.dense({units: 2, activation:"softmax"}));

    new_model.summary()
    return new_model
  }
  
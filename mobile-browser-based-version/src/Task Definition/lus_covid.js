import * as tf from '@tensorflow/tfjs';

const FEATURES = 1000
const MOBILENET_V1_1_PATH = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_1.0_224/model.json'
let net = null

export class LusCovidTask {
    constructor() {
        this.display_information = display_information
        this.training_information = training_information
    }

    /**
     * fetch model from local storage or indexdb
     * 
     * @returns Returns a tf.model or null if there is no model
     */
     async get_model_from_storage() {
        let model = await tf.loadLayersModel(training_information.save_path_db)
        return model
    }

    /**
     * @returns new instance of TensorflowJS model
     */
    create_model() {
        let new_model = tf.sequential();

        new_model.add(tf.layers.dense({inputShape:[FEATURES], units:512, activation:'relu'}))

        new_model.add(tf.layers.dense({units: 64, activation: 'relu'}))

        new_model.add(tf.layers.dense({units: 2, activation:"softmax"}));

        new_model.summary()

        new_model.save(training_information.save_path_db);

        return new_model
    }

    create_deep_learning_model(){
        let new_model = tf.sequential();

        new_model.add(tf.layers.dense({inputShape:[FEATURES], units:512, activation:'relu'}))

        new_model.add(tf.layers.dense({units: 64, activation: 'relu'}))

        new_model.add(tf.layers.dense({units: 2, activation:"softmax"}));

        new_model.summary()
        
        return new_model
    }

    // Data is passed under the form of Dictionary{ImageURL: label}
    async data_preprocessing(training_data){
        if (net == null){
            console.log("loading mobilenet...")

            net = await tf.loadLayersModel(MOBILENET_V1_1_PATH);

            net.summary()

            console.log("Successfully loaded mobilenet model")
        }

        const labels = []
        const image_uri = []
        const image_names = []

        Object.keys(training_data).forEach(key => {
            labels.push(training_data[key].label)
            image_names.push(training_data[key].name)
            image_uri.push(key)
        });

        const preprocessed_data = await this.getTrainData(image_uri, labels, image_names);    
        
        return preprocessed_data
    }


    async loadLocalImage(filename) {
        return new Promise((res, rej) => {
            var img = new Image();
            img.src = filename
            img.width = this.training_information.IMAGE_W
            img.height = this.training_information.IMAGE_H
            img.onload = () =>{
                var output = tf.browser.fromPixels(img)
                res(output)
            }
        });
    }


    async image_preprocessing(src){
        const tensor = await this.loadLocalImage(src)
        
        const batched = tensor.reshape([this.training_information.IMAGE_H, this.training_information.IMAGE_W, 3])

        const processedImg = batched.toFloat().div(127).sub(1).expandDims(0);

        let representation = net.predict(processedImg)

        return representation
    }

    labels_preprocessing(labels){
        const nb_labels = labels.length
        const labels_one_hot_encoded = []
        for(let i = 0; i< labels.length; ++i){
            labels_one_hot_encoded.push(this.one_hot_encode(labels[i]))
        }
        
        console.log(labels_one_hot_encoded)
        return tf.tensor2d(labels_one_hot_encoded, [nb_labels, this.training_information.NUM_CLASSES])
    }

    one_hot_encode(label){
        const result = []
        for (let i = 0; i < this.training_information.NUM_CLASSES; i++){
            if(this.training_information.LABEL_LIST[i]==label){
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
     * @param image_uri Array of image uris
     * @param labels_per_image Array of label per each image
     * @param image_names Array of names of images
     *
     * @returns
     *   xs: The data tensor, of shape `[numTrainExamples, 28, 28, 1]`.
     *   labels: The one-hot encoded labels tensor, of shape
     *     `[numTrainExamples, 2]`.
     */
    async getTrainData(image_uri, labels_per_image, image_names) {
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
                dict_labels[id] = labels_per_image[i]
            }

            res.push(await this.image_preprocessing(image_uri[i]))

            dict_images[id] = res
        }


        console.log("Number of patients found was "+Object.keys(dict_images).length)

        let image_tensors_per_patient = {}
        patients = Array.from(patients)
        for(let i = 0; i < patients.length; ++i){
            const id = patients[i]
            // Do mean pooling over same patient representations
            image_tensors_per_patient[id] = tf.mean(tf.concat(dict_images[id], 0),0).expandDims(0)
        }
        
        const xs_array = []
        const labels_to_process = []

        // shuffle patients
        patients.sort( () => .5 - Math.random() );
        for (let i = 0; i< patients.length; ++i ){
            const id = patients[i]
            xs_array.push(image_tensors_per_patient[id])
            labels_to_process.push(dict_labels[id])
        }

        const xs = tf.concat(xs_array, 0)
        const labels = this.labels_preprocessing(labels_to_process)
    
        console.log(xs)
        console.log(labels)

        return {Xtrain: xs, ytrain: labels}
    }
}


export const display_information = {
    // {String} title of the task (keep it short ex: Titanic)
    taskTitle: "LUS-COVID",
    // {String} informal summary of the task (used by tasks' list)
    summary: "The COVID-19 pandemic has been harmfull to millions of people, collaborate to train a model that will detect the COVID-19 virus from lung ultrasound images.",
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
    // {String} local url to an image data example
    dataExampleImage: "./2_QAID_1.masked.reshaped.squared.224.png",
};

/**
 * Object used to contain the model's training specifications
 */
export const training_information = {
    // {String} model's identification name
    model_id: "lus-covid-model",
    // {String} indexedDB path where the model is stored
    save_path_db: "indexeddb://working_lus_covid_model",
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
    NUM_CLASSES : 2,
    data_type:"image"
}
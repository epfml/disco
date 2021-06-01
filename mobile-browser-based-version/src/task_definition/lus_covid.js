import * as tf from '@tensorflow/tfjs';
import {getTopKClasses} from '../helpers/testing_script/testing_script'

const FEATURES = 1000
const MOBILENET_V1_1_PATH = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_1.0_224/model.json'
let net = null
let loadedModel = null

export class LusCovidTask {
    constructor() {
        this.displayInformation = displayInformation
        this.trainingInformation = trainingInformation
    }

    /**
     * fetch model from local storage or indexdb
     * 
     * @returns Returns a tf.model or null if there is no model
     */
     async getModelFromStorage() {
        let savePath = "indexeddb://working_".concat(trainingInformation.modelId)
        let model = await tf.loadLayersModel(savePath)
        return model
    }

    /**
     * @returns new instance of TensorflowJS model
     */
    async createModel() {
        let newModel = tf.sequential();

        newModel.add(tf.layers.dense({inputShape:[FEATURES], units:512, activation:'relu'}))

        newModel.add(tf.layers.dense({units: 64, activation: 'relu'}))

        newModel.add(tf.layers.dense({units: 2, activation:"softmax"}));

        newModel.summary()

        let savePath = "indexeddb://working_".concat(trainingInformation.modelId)

        await newModel.save(savePath);

        return newModel
    }

    async loadMobilenet(){
        console.log("loading mobilenet...")

        net = await tf.loadLayersModel(MOBILENET_V1_1_PATH);

        net.summary()

        console.log("Successfully loaded mobilenet model")
    }

    // Data is passed under the form of Dictionary{ImageURL: {label, name}}
    async dataPreprocessing(trainingData, shuffle=true){
        if (net == null){
           await this.loadMobilenet()
        }

        const labels = []
        const imageUri = []
        const imageNames = []

        Object.keys(trainingData).forEach(key => {
            labels.push(trainingData[key].label)
            imageNames.push(trainingData[key].name)
            imageUri.push(key)
        });

        const preprocessedData = await this.getTrainData(imageUri, labels, imageNames, shuffle);    
        
        return preprocessedData
    }


    async loadLocalImage(filename) {
        return new Promise((res, rej) => {
            var img = new Image();
            img.src = filename
            img.width = this.trainingInformation.IMAGE_W
            img.height = this.trainingInformation.IMAGE_H
            img.onload = () =>{
                var output = tf.browser.fromPixels(img)
                res(output)
            }
        });
    }

    async imagePreprocessing(src){
        const tensor = await this.loadLocalImage(src)

        const representation = tf.tidy(() => {
            const batched = tensor.reshape([this.trainingInformation.IMAGE_H, this.trainingInformation.IMAGE_W, 3])

            const processedImg = batched.toFloat().div(127).sub(1).expandDims(0);

            return net.predict(processedImg)
          });

        tf.dispose(tensor)
        
        return representation
    }

    labelsPreprocessing(labels){
        const nbLabels = labels.length
        const labelsOneHotEncoded = []
        for(let i = 0; i< labels.length; ++i){
            labelsOneHotEncoded.push(this.oneHotEncode(labels[i]))
        }
        
        console.log(labelsOneHotEncoded)
        return tf.tensor2d(labelsOneHotEncoded, [nbLabels, this.trainingInformation.NUM_CLASSES])
    }

    oneHotEncode(label){
        const result = []
        for (let i = 0; i < this.trainingInformation.NUM_CLASSES; i++){
            if(this.trainingInformation.LABEL_LIST[i]==label){
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
     * @param imageUri Array of image uris
     * @param labelsPerImage Array of label per each image
     * @param imageNames Array of names of images
     *
     * @returns
     *   xs: The data tensor, of shape `[numTrainExamples, 28, 28, 1]`.
     *   labels: The one-hot encoded labels tensor, of shape
     *     `[numTrainExamples, 2]`.
     */
    async getTrainData(imageUri, labelsPerImage, imageNames, shuffle=true) {
        const dictImages = {}
        const dictLabels = {}
        let patients = new Set()

        for(let i = 0; i<imageNames.length; ++i){
            const id = parseInt(imageNames[i].split("_")[0])
            patients.add(id)

            let res = []

            if(id in dictImages){ 
                res = dictImages[id]
            }else{
                dictLabels[id] = labelsPerImage[i]
            }
            let result = await this.imagePreprocessing(imageUri[i])
            res.push(result)

            dictImages[id] = res
        }


        console.log("Number of patients found was "+Object.keys(dictImages).length)

        let imageTensorsPerPatient = {}
        patients = Array.from(patients)
        for(let i = 0; i < patients.length; ++i){
            const id = patients[i]
            // Do mean pooling over same patient representations
            imageTensorsPerPatient[id] = tf.mean(tf.concat(dictImages[id], 0),0).expandDims(0)
        }
        
        const xsArray = []
        const labelsToProcess = []

        // shuffle patients
        if(shuffle){
            patients.sort( () => .5 - Math.random() );
        }
        for (let i = 0; i< patients.length; ++i ){
            const id = patients[i]
            xsArray.push(imageTensorsPerPatient[id])
            labelsToProcess.push(dictLabels[id])
        }

        const xs = tf.concat(xsArray, 0)
        const labels = this.labelsPreprocessing(labelsToProcess)
    
        console.log(xs)
        console.log(labels)

        return {Xtrain: xs, ytrain: labels}
    }

    async predict(testingData){
        console.log("Loading model...")
        loadedModel = null
        
        try{
            loadedModel = await this.getModelFromStorage()
        }catch {
            console.log("No model found.")
            return null
        }

        if (loadedModel){
            console.log("Model loaded.")

            let preprocessed_data = await (await this.dataPreprocessing(testingData, false)).Xtrain

            loadedModel.summary()
            const classes_array = []

            preprocessed_data = preprocessed_data.split(preprocessed_data.shape[0])
            for(let i = 0; i < preprocessed_data.length; ++i){
                const logits = loadedModel.predict(preprocessed_data[i])

                // Convert logits to probabilities and class names.
                const classes = await getTopKClasses(logits, 2, this.trainingInformation.LABEL_LIST);

                classes_array.push(classes)
            }
            

            console.log("Prediction Sucessful!")

            return classes_array
        }else{
            console.log("No model has been trained or found!")
        }
    }
}

export const displayInformation = {
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
    dataFormatInformation: "This model takes as input an image dataset. It consists on a set of lung ultrasound images per patient with its corresponding label of covid positive or negative. Moreover, to identify the images per patient you have to follow the follwing naming pattern: \"patientId_*.png\"",
    // {String} description of the datapoint given as example
    dataExampleText: "Below you can find an example of an expected lung image for patient 2 named: 2_QAID_1.masked.reshaped.squared.224.png",
    // {String} local url to an image data example
    dataExampleImage: "./2_QAID_1.masked.reshaped.squared.224.png",
};

/**
 * Object used to contain the model's training specifications
 */
export const trainingInformation = {
    // {String} model's identification name
    modelId: "lus-covid-model",
    // {Number} port of the peerjs server
    port: 3,
    // {Number} number of epoch used for training
    epoch: 15,
    // {Number} validation split
    validationSplit: 0.2,
    // {Number} batchsize
    batchSize: 2,
    // {Object} Compiling information 
    modelCompileData: {
        optimizer: "adam",
        loss: "binaryCrossentropy",
        metrics: ["accuracy"],
    },
    learningRate: 0.05,
    // {Object} Training information 
    modelTrainData: {
        epochs: 10,
    },
    threshold: 1,
    IMAGE_H : 224,
    IMAGE_W : 224,
    LABEL_LIST : ["COVID-Positive", "COVID-Negative"],
    NUM_CLASSES : 2,
    dataType:"image"
}
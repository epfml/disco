import * as tf from '@tensorflow/tfjs';
import {getTopKClasses} from '../helpers/testing_script/testing_script'

const FEATURES = 1000
const MOBILENET_V1_1_PATH = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_1.0_224/model.json'
let net = null
let loadedModel = null

export class LusCovidTask {
    constructor(taskId, displayInformation, trainingInformation) {
        this.taskId = taskId
        this.displayInformation = displayInformation
        this.trainingInformation = trainingInformation
    }

    /**
     * fetch model from local storage or indexdb
     * 
     * @returns Returns a tf.model or null if there is no model
     */
     async getModelFromStorage() {
        let savePath = "indexeddb://working_".concat(this.trainingInformation.modelId)
        let model = await tf.loadLayersModel(savePath)
        return model
    }

    /**
     * @returns new instance of TensorflowJS model
     */
    async createModel() {
        let newModel = await tf.loadLayersModel('https://deai-313515.ew.r.appspot.com/tasks/' + this.taskId + '/model.json')
        const savePathDb = "indexeddb://working_".concat(
            this.trainingInformation.modelId
        );

        // only keep this here
        await newModel.save(savePathDb);
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

            const prediction = net.predict(processedImg)

            return prediction
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

    async testing_preprocessing(testingData){
        if (net == null){
            await this.loadMobilenet()
         }
 
         const imageUri = []
         const imageNames = []
 
         Object.keys(testingData).forEach(key => {
             imageNames.push(testingData[key].name)
             imageUri.push(key)
         });
 
         const preprocessedData = await this.getTestData(imageUri, imageNames);    
         
         return preprocessedData
    }

    async getTestData(imageUri, imageNames){
        const dictImages = {}
        const dictLabels = {}
        let patients = new Set()

        for(let i = 0; i<imageNames.length; ++i){
            const id = parseInt(imageNames[i].split("_")[0])
            patients.add(id)

            let res = []

            if(id in dictImages){ 
                res = dictImages[id]
            }

            res.push(await this.imagePreprocessing(imageUri[i]))

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

        for (let i = 0; i< patients.length; ++i ){
            const id = patients[i]
            xsArray.push(imageTensorsPerPatient[id])
            labelsToProcess.push(dictLabels[id])
        }

        const xs = tf.concat(xsArray, 0)
    
        console.log(xs)
        console.log(patients)

        return {xTest: xs, ids: patients}
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

            let preprocessed_data =  await this.testing_preprocessing(testingData, false)
            let xTest = await preprocessed_data.xTest
            let ids = await preprocessed_data.ids


            loadedModel.summary()
            const classes_dict = {}

            xTest = xTest.split(xTest.shape[0])
            for(let i = 0; i < xTest.length; ++i){
                const logits = loadedModel.predict(xTest[i])

                // Convert logits to probabilities and class names.
                const classes = await getTopKClasses(logits, 2, this.trainingInformation.LABEL_LIST);

                classes_dict[ids[i]] = classes

                console.log(classes)
            }
            
            console.log("Prediction Sucessful!")

            return classes_dict
        }else{
            console.log("No model has been trained or found!")
        }
    }
}
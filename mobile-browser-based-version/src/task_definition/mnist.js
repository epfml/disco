import * as tf from "@tensorflow/tfjs";
import { checkData } from "../helpers/data_validation_script/helpers-image-tasks"
import { getTopKClasses } from "../helpers/testing_script/testing_script"

export class MnistTask {
    constructor(taskId, displayInformation, trainingInformation) {
        this.taskId = taskId
        this.displayInformation = displayInformation
        this.trainingInformation = trainingInformation
    }

    /**
     * @returns {tf.Model} new instance of TensorflowJS model
     */
    async createModel() {
        let newModel = await tf.loadLayersModel('https://deai-313515.ew.r.appspot.com/tasks/' + this.taskId + '/model.json')
        const savePathDb = "indexeddb://working_".concat(
            this.trainingInformation.modelId
        );

        // only keep this here
        await newModel.save(savePathDb);
    }

    /**
     * This functions takes as input a file (of type File) uploaded by the reader and checks 
     * if the said file meets the constraints requirements and if so prepare the training data. 
     * @param {Dictionary[ImageURL: String]} trainingData is a dictionary between the image_url and the label
     * @returns an object of the form: {accepted: Boolean, Xtrain: training data, ytrain: data's labels}
     */
    async dataPreprocessing(trainingData) {
        console.log("Start: Processing Uploaded File");
        var Xtrain = null;
        var ytrain = null;

        const labels = []
        const imageUri = []

        Object.keys(trainingData).forEach(key => {
            labels.push(trainingData[key]['label'])
            imageUri.push(key)
        });

        console.log("User File Validated. Start parsing.");

        // Do feature preprocessing
        ytrain = this.labelsPreprocessing(labels)
        const imageTensors = []

        for (let i = 0; i < imageUri.length; ++i) {
            const tensor = await this.imagePreprocessing(imageUri[i])
            imageTensors.push(tensor)
        }

        Xtrain = tf.concat(imageTensors, 0)

        return { Xtrain: Xtrain, ytrain: ytrain }
    }

    async loadLocalImage(filename) {
        return new Promise((res, rej) => {
            var img = new Image();
            img.src = filename
            img.width = this.trainingInformation.IMAGE_W
            img.height = this.trainingInformation.IMAGE_H
            img.onload = () => {
                var output = tf.browser.fromPixels(img)
                res(output)
            }
        });
    }

    async imagePreprocessing(src) {
        // load image from local 
        const img_tensor = await this.loadLocalImage(src);
        const representation = tf.tidy(() => {
            const offset = tf.scalar(127.5);
            // Normalize the image from [0, 255] to [-1, 1].
            const normalized = img_tensor.sub(offset).div(offset);

            // Reshape to a single-element batch so we can pass it to predict.
            const batched = normalized.reshape([1, this.trainingInformation.IMAGE_H, this.trainingInformation.IMAGE_W, 3]);
            return batched
        })
        tf.dispose(img_tensor)

        return representation
    }

    labelsPreprocessing(labels) {
        const nbLabels = labels.length
        const labelsOneHotEncoded = []
        labels.forEach(label =>
            labelsOneHotEncoded.push(this.oneHotEncode(label))
        )
        return tf.tensor2d(labelsOneHotEncoded, [nbLabels, this.trainingInformation.LABEL_LIST.length])
    }

    oneHotEncode(label) {
        const result = []
        for (let i = 0; i < this.trainingInformation.LABEL_LIST.length; i++) {
            if (this.trainingInformation.LABEL_LIST[i] == label) {
                result.push(1)
            } else {
                result.push(0)
            }
        }
        return result
    }

    /**
     * fetch model from local storage or indexdb
     * This function sould be moved as it is not task specific 
     * 
     * @returns Returns a tf.model or null if there is no model
    */
    async getModelFromStorage() {
        let savePath = "indexeddb://saved_".concat(this.trainingInformation.modelId)
        let model = await tf.loadLayersModel(savePath)
        return model
    }

    /**
     * 
     * @param {Array[ImgElement]} imgElementArray array of all images to be predicted
     * @returns Array with predictions by the model of all of the images passed as parameters
     */
    async predict(testingData) {
        console.log("Loading model...")
        var loadedModel = null

        try {
            loadedModel = await this.getModelFromStorage()
        } catch {
            console.log("No model found.")
            return null
        }

        if (loadedModel != null) {
            console.log("Model loaded.")
            const classes_dict = {}
            let i = 0
            for (let url of Object.keys(testingData)) {
                const img_tensor = await this.imagePreprocessing(url)

                const logits = loadedModel.predict(img_tensor)

                // Convert logits to probabilities and class names.
                const classes = await getTopKClasses(logits, 5, this.trainingInformation.LABEL_LIST);

                classes_dict[i] = classes
                
                i++
            }

            console.log("Prediction Sucessful!")

            return classes_dict;
        } else {
            console.log("No model has been trained or found!")
        }
    }
}
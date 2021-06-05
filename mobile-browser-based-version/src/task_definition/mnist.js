import * as tf from "@tensorflow/tfjs";
import { checkData } from "../helpers/data_validation_script/helpers-image-tasks"
import { getTopKClasses } from "../helpers/testing_script/testing_script"

export class MnistTask {
    constructor() {
        this.displayInformation = displayInformation
        this.trainingInformation = trainingInformation
    }

    /**
     * @returns {tf.Model} new instance of TensorflowJS model
     */
    async createModel() {
        // only keep this here
        // Create a sequential neural network model. tf.sequential provides an API
        // for creating "stacked" models where the output from one layer is used as
        // the input to the next layer.
        const model = tf.sequential();

        // The first layer of the convolutional neural network plays a dual role:
        // it is both the input layer of the neural network and a layer that performs
        // the first convolution operation on the input. It receives the 28x28 pixels
        // black and white images. This input layer uses 16 filters with a kernel size
        // of 5 pixels each. It uses a simple RELU activation function which pretty
        // much just looks like this: /
        model.add(tf.layers.conv2d({
            inputShape: [this.trainingInformation.IMAGE_H, this.trainingInformation.IMAGE_W, 3],
            kernelSize: 3,
            filters: 16,
            activation: 'relu'
        }));

        // After the first layer we include a MaxPooling layer. This acts as a sort of
        // downsampling using max values in a region instead of averaging.
        // https://www.quora.com/What-is-max-pooling-in-convolutional-neural-networks
        model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));

        // Our third layer is another convolution, this time with 32 filters.
        model.add(tf.layers.conv2d({ kernelSize: 3, filters: 32, activation: 'relu' }));

        // Max pooling again.
        model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));

        // Add another conv2d layer.
        model.add(tf.layers.conv2d({ kernelSize: 3, filters: 32, activation: 'relu' }));

        // Now we flatten the output from the 2D filters into a 1D vector to prepare
        // it for input into our last layer. This is common practice when feeding
        // higher dimensional data to a final classification output layer.
        model.add(tf.layers.flatten({}));

        model.add(tf.layers.dense({ units: 64, activation: 'relu' }));

        // Our last layer is a dense layer which has 10 output units, one for each
        // output class (i.e. 0, 1, 2, 3, 4, 5, 6, 7, 8, 9). Here the classes actually
        // represent numbers, but it's the same idea if you had classes that
        // represented other entities like dogs and cats (two output classes: 0, 1).
        // We use the softmax function as the activation for the output layer as it
        // creates a probability distribution over our 10 classes so their output
        // values sum to 1.
        model.add(tf.layers.dense({ units: 10, activation: 'softmax' }));

        let savePath = "indexeddb://working_".concat(trainingInformation.modelId)
        await model.save(savePath);

        return model;
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

        // Check some basic prop. in the user's uploaded file

        var checkResult = await checkData(trainingData)
        var startTraining = checkResult.accepted

        // If user's file respects our format, parse it and start training
        if (startTraining) {
            const labels = []
            const imageUri = []

            Object.keys(trainingData).forEach(key => {
                labels.push(trainingData[key])
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
            // object to return 
        } else {
            console.log("Cannot start training.")
        }
        return { accepted: startTraining, Xtrain: Xtrain, ytrain: ytrain }
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

        const offset = tf.scalar(127.5);
        // Normalize the image from [0, 255] to [-1, 1].
        const normalized = img_tensor.sub(offset).div(offset);

        // Reshape to a single-element batch so we can pass it to predict.
        const batched = normalized.reshape([1, this.trainingInformation.IMAGE_H, this.trainingInformation.IMAGE_W, 3]);

        return batched
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
        let savePath = "indexeddb://working_".concat(trainingInformation.modelId)
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

/**
 * Object used to contain information abfout the task in general, the model's limitations
 * and the data accepted by the model 
 */
export const displayInformation = {
    // {String} title of the task (keep it short ex: Titanic)
    taskTitle: "MNIST",
    // {String} informal summary of the task (used by tasks' list)
    summary: "Life started by learning numbers, well you've come a full circle! let's get back to it ! From the MNIST dataset of handwritten digits, can you identify them?",
    // {String} simple overview of the task (i.e what is the goal of the model? Why its usefull ...)
    overview: "The MNIST handwritten digit classification problem is a standard dataset used in computer vision and deep learning. Although the dataset is effectively solved, we use it to test our Decentralised Learning algorithms and platform.",
    // {String} potential limitations of the model 
    limitations: "The current model is a very simple CNN and its main goal is to test the app and the Decentralizsed Learning functionality.",
    // {String} trade-offs of the model 
    tradeoffs: "We are using a simple model, first a 2d convolutional layer > max pooling > 2d convolutional layer > max pooling > convolutional layer > 2 dense layers.",
    // {String} information about expected data 
    dataFormatInformation:
        "This model takes as input an image dataset. You can upload each digit image of your dataset in the box corresponding to its label. The size of the image will be reduced to 28x28. Finally, the image should be in grey scale.",
    // {String} description of the datapoint given as example
    dataExampleText: "Below you can find an example of an expected image representing the digit 9.",
    // {String} local url to an image data example
    dataExampleImage: "./9-mnist-example.png",
};

/**
 * Object used to contain the model's training specifications
 */
export const trainingInformation = {
    // {String} model's identification name
    modelId: "mnist-model",
    // {Number} port of the peerjs server
    port: 1,
    // {Number} number of epoch used for training
    epoch: 10,
    // {Number} validation split
    validationSplit: 0.2,
    // {Number} batchsize
    batchSize: 30,
    // {Object} Compiling information 
    modelCompileData: {
        optimizer: "rmsprop",
        loss: "binaryCrossentropy",
        metrics: ["accuracy"],
    },
    // {Object} Training information 
    modelTrainData: {
        epochs: 10,
    },
    threshold: 1,
    dataType: 'image',
    IMAGE_H: 28,
    IMAGE_W: 28,
    LABEL_LIST: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
}

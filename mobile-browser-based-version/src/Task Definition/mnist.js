import * as tf from "@tensorflow/tfjs";
import { check_data } from "../helpers/Data Validation Script/helpers-image-tasks"

export class MnistTask {
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
        let model = await tf.loadLayersModel('indexeddb:://working_'.concat(this.training_information.model_id))
        return model
    }

    /**
     * @returns new instance of TensorflowJS model
     */
    create_model() {
        const save_path_db = "indexeddb://working_".concat(
            this.training_information.model_id
        );
        // only keep this here
        this.createConvModel().save(save_path_db);
    }

    /**
     * Creates a convolutional neural network (Convnet) for the MNIST data.
     *
     * @returns {tf.Model} An instance of tf.Model.
     */
    createConvModel() {
        // Create a sequential neural network model. tf.sequential provides an API
        // for creating "stacked" models where the output from one layer is used as
        // the input to the next layer.
        const model = tf.sequential();

        // The first layer of the convolutional neural network plays a dual role:
        // it is both the input layer of the neural network and a layer that performs
        // the first convolution operation on the input. It receives the 28x28 pixels
        // black and white images. This input layer uses 16 filters with a kernel size
        // of 5 pixels each. It uses a simple RELU activation function which pretty
        // much just looks like this: __/
        model.add(tf.layers.conv2d({
            inputShape: [this.training_information.IMAGE_H, this.training_information.IMAGE_W, 3],
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

        return model;
    }

    /**
     * This functions takes as input a file (of type File) uploaded by the reader and checks 
     * if the said file meets the constraints requirements and if so prepare the training data. 
     * @param {Dictionary[ImageURL: String]} training_data is a dictionary between the image_url and the label
     * @returns an object of the form: {accepted: Boolean, Xtrain: training data, ytrain: data's labels}
     */
    async data_preprocessing(training_data) {
        console.log("Start: Processing Uploaded File");
        var Xtrain = null;
        var ytrain = null;

        // Check some basic prop. in the user's uploaded file

        var check_result = await check_data(training_data)
        var startTraining = check_result.accepted

        // If user's file respects our format, parse it and start training
        if (startTraining) {
            const labels = []
            const image_uri = []

            Object.keys(training_data).forEach(key => {
                labels.push(training_data[key])
                image_uri.push(key)
            });

            console.log("User File Validated. Start parsing.");

            // Do feature preprocessing
            ytrain = this.labels_preprocessing(labels)
            const image_tensors = []

            image_uri.forEach(image =>
                image_tensors.push(this.image_preprocessing(image))
            )

            Xtrain = tf.concat(image_tensors, 0)
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
            img.width = this.training_information.IMAGE_W
            img.height = this.training_information.IMAGE_H
            img.onload = () =>{
                var output = tf.browser.fromPixels(img)
                res(output)
            }
        });
    }

    async image_preprocessing(src) {
        // load image from local 
        const img_tensor = await this.loadLocalImage(src);

        const offset = tf.scalar(127.5);
        // Normalize the image from [0, 255] to [-1, 1].
        const normalized = img_tensor.sub(offset).div(offset);

        // Reshape to a single-element batch so we can pass it to predict.
        const batched = normalized.reshape([1, this.training_information.IMAGE_H, this.training_information.IMAGE_W, 3]);

        return batched
    }

    labels_preprocessing(labels) {
        const nb_labels = labels.length
        const labels_one_hot_encoded = []
        labels.forEach(label =>
            labels_one_hot_encoded.push(this.one_hot_encode(label))
        )

        return tf.tensor2d(labels_one_hot_encoded, [nb_labels, this.training_information.task_labels.length])
    }

    one_hot_encode(label) {
        const result = []
        for (let i = 0; i < this.training_information.task_labels.length; i++) {
            if (this.training_information.task_labels[i] == label) {
                result.push(1)
            } else {
                result.push(0)
            }
        }
        return result
    }

    async predict(imgElement){
        console.log("Loading model...")
        var loadedModel = null
        try{
            loadedModel = await this.get_model_from_storage()
        }catch {
            console.log("No model found.")
            return null
        }

        if (loadedModel != null){
            console.log("Model loaded.")
          const logits = tf.tidy(async() => {
            const img_tensor = await this.image_preprocessing(imgElement.src)
            // Make a prediction through model.
            return loadedModel.predict(img_tensor);
          })
          // Convert logits to probabilities and class names.
          const classes = await this.getTopKClasses(logits, 5);
          console.log(classes);

          console.log("Prediction Sucessful!")

          return classes;
        }else{
          console.log("No model has been trained or found!")
        }
    }

    async getTopKClasses(logits, topK) {
        const values = await logits.data();
        const valuesAndIndices = [];
        for (let i = 0; i < values.length; i++) {
            valuesAndIndices.push({ value: values[i], index: i });
        }
        valuesAndIndices.sort((a, b) => {
            return b.value - a.value;
        });
        const topkValues = new Float32Array(topK);
        const topkIndices = new Int32Array(topK);
        for (let i = 0; i < topK; i++) {
            topkValues[i] = valuesAndIndices[i].value;
            topkIndices[i] = valuesAndIndices[i].index;
        }
        const topClassesAndProbs = [];
        for (let i = 0; i < topkIndices.length; i++) {
            topClassesAndProbs.push({
            className: this.training_information.task_labels[topkIndices[i]],
            probability: topkValues[i],
            });
        }
        return topClassesAndProbs;
    }
}

/**
 * Object used to contain information about the task in general, the model's limitations
 * and the data accepted by the model 
 */
export const display_information = {
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
    // {String} url of data example 
    dataExampleImage: "./9-mnist-example.png"
};

/**
 * Object used to contain the model's training specifications
 */
export const training_information = {
    // {String} model's identification name
    model_id: "mnist-model",
    // {Number} port of the peerjs server
    port: 1,
    // {Number} number of epoch used for training
    epoch: 10,
    // {Number} validation split
    validation_split: 0.2,
    // {Number} batchsize
    batch_size: 30,
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
    threshold: 1,
    data_type: 'image',
    IMAGE_H: 28,
    IMAGE_W: 28,
    task_labels: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
}

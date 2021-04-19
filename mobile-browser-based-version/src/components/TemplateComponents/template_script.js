
/**
 * Object used to contain information about the task in general, the model's limitations
 * and the data accepted by the model 
 */
 export const display_informations = {
    // {String} title of the task (keep it short ex: Titanic)
    taskTitle: "*******TO_COMPLETE*******", 
    // {String} simple overview of the task (i.e what is the goal of the model? Why its usefull ...)
    overview: "*******TO_COMPLETE*******", 
    // {String} potential limitations of the model 
    limitations: "*******TO_COMPLETE*******", 
    // {String} trade-offs of the model 
    tradeoffs: "*******TO_COMPLETE*******", 
    // {String} information about expected data 
    dataFormatInformation: "*******TO_COMPLETE*******", 
    // {String} description of the datapoint given as example
    dataExampleText: "*******TO_COMPLETE*******",
    // {Array} a simple datapoint given as example. Respect the format 
    dataExample: [
        {column_name: "*******TO_COMPLETE*******", column_data: "*******TO_COMPLETE*******"},
        {column_name: "*******TO_COMPLETE*******", column_data: "*******TO_COMPLETE*******"},
        // ...
    ],
    // {Array} javascript array of the names of the columns given as input 
    headers: "*******TO_COMPLETE*******",
}

/**
 * Object used to contain the model's training specifications
 */
export const training_information = {
    // {String} model's identification name
    model_id: "*******TO_COMPLETE*******",
    // {Number} port of the peerjs server
    port: 0,
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
}

/**
 * This functions takes as input a file (of type File) uploaded by the reader and checks 
 * if the said file meets the constraints requirements and if so prepare the training data. 
 * @param {File} file file uploaded by the user
 * @returns an object of the form: {accepted: Boolean, Xtrain: training data, ytrain: data's labels}
 */
export async function data_processing(file) {

    // object to return 
    return {accepted: false, Xtrain: "", ytrain: ""}
}
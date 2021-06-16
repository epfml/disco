
import * as d3 from "d3";
import * as tf from "@tensorflow/tfjs";
import { checkData } from "../helpers/data_validation_script/helpers-csv-tasks"
import { storeModel } from "../helpers/my_memory_script/indexedDB_script"
import { serverManager } from "../helpers/communication_script/server_manager"

/**
 * Dummy class to hold the Titanic Task information
 */
export class TitanicTask {
    constructor(taskId, displayInformation, trainingInformation) {
        this.taskId = taskId
        this.displayInformation = displayInformation
        this.trainingInformation = trainingInformation
    }
    /**
     * This functions takes as input a file (of type File) uploaded by the reader and checks
     * if the said file meets the constraints requirements and if so prepare the training data.
     * @param {File} file file uploaded by the user
     * @returns an object of the form: {accepted: Boolean, Xtrain: training data, ytrain: data's labels}
     */
    async dataPreprocessing(file, headers) {
        console.log("Start: Processing Uploaded File");
        var Xtrain = null;
        var ytrain = null;

        // Check some basic prop. in the user's uploaded file

        var checkResult = await checkData(file, headers)
        var startTraining = checkResult.accepted
        var headerCopied = checkResult.userHeader;

        // If user's file respects our format, parse it and start training
        if (startTraining) {
            console.log("User File Validated. Start parsing.");
            console.log(headerCopied);
            let Xcsv = d3.csvParse(
                file.target.result,
                function (d) {
                    return [
                        +d[headerCopied[0]], // PassengerId
                        +d[headerCopied[1]], // Survived
                        d[headerCopied[3]] == "male" ? 1 : 0, // Sex
                        +d[headerCopied[4]], // Age
                        +d[headerCopied[5]], // SibSp
                        +d[headerCopied[6]], // Parch
                        +d[headerCopied[8]], // Fare
                        +d[headerCopied[11]], // Pclass
                    ];
                },
                function (error, rows) {
                    console.log(rows);
                }
            );

            let ycsv = d3.csvParse(
                file.target.result,
                function (d) {
                    return +d[headerCopied[1]];
                },
                function (error, rows) {
                    console.log(rows);
                }
            );


            Xtrain = tf.tensor2d(Xcsv);
            ytrain = tf.tensor1d(ycsv);
            // object to return
        } else {
            console.log("Cannot start training.")
        }
        return { accepted: startTraining, Xtrain: Xtrain, ytrain: ytrain }
    }

    /**
     * Defintion of the model associated to the task
     */
    async createModel() {
        // To be put in a titanic task specific model
        let newModel = await serverManager.getTaskModel(this.taskId)
        newModel.summary();
        const savePathDb = 'indexeddb://working_' + this.trainingInformation.modelId;

        // only keep this here
        await newModel.save(savePathDb);
    }
}

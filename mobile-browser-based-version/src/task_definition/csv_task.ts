import * as d3 from 'd3';
import * as tf from '@tensorflow/tfjs';
import { checkData } from '../helpers/data_validation/helpers_csv_tasks';
import { Task } from './task.js';

/**
 * Dummy class to hold the Titanic Task information
 */
export class CsvTask extends Task {
  trainingInformation: any;
  /**
   * This functions takes as input a file (of type File) uploaded by the reader and checks
   * if the said file meets the constraints requirements and if so prepare the training data.
   * @param {File} file file uploaded by the user
   * @returns an object of the form: {accepted: Boolean, Xtrain: training data, ytrain: data's labels}
   */
  async dataPreprocessing(
    file: { target: { result: string } },
    headers: any[]
  ) {
    console.log('Start: Processing Uploaded File');
    let Xtrain = null;
    let ytrain = null;

    // Check some basic prop. in the user's uploaded file

    const checkResult = await checkData(file, headers);
    const startTraining = checkResult.accepted;
    const headerCopied = checkResult.userHeader;

    // If user's file respects our format, parse it and start training
    if (startTraining) {
      console.log('User File Validated. Start parsing.');
      console.log(headerCopied);

      const originalHeaders = headers.map(
        (element: { [x: string]: any }) => element['userHeader']
      );
      const inputColumns = this.trainingInformation.inputColumns;
      const indices = Array.from({ length: headers.length }, (x, i) => i);
      const inputIndices = indices.filter((i) =>
        inputColumns.includes(originalHeaders[i])
      );
      const Xcsv = d3.csvParse(file.target.result, function (d) {
        const result = inputIndices.map((i) => +d[headerCopied[i]]);
        return result;
      });
      const yIdx = originalHeaders.indexOf(
        this.trainingInformation.outputColumn
      );
      const ycsv = d3.csvParse(file.target.result, function (d) {
        return +d[headerCopied[yIdx]] as any;
      });

      Xtrain = tf.tensor2d(Xcsv);
      ytrain = tf.tensor1d(ycsv as any);
      // object to return
    } else {
      console.log('Cannot start training.');
    }
    return { accepted: startTraining, Xtrain: Xtrain, ytrain: ytrain };
  }

  async predict(file: { target: { result: string } }, headers: any[]) {
    let loadedModel = null;
    try {
      loadedModel = await this.getModelFromStorage();
    } catch {
      console.log('No model found.');
      return null;
    }

    console.log('Start: Processing Uploaded File');

    // Check some basic prop. in the user's uploaded file

    const checkResult = await checkData(file, headers);
    const startTesting = checkResult.accepted;
    const headerCopied = checkResult.userHeader;

    // If user's file respects our format, parse it and start training
    if (startTesting) {
      console.log('User File Validated. Start parsing.');
      console.log(headerCopied);

      const originalHeaders = headers.map(
        (element: { [x: string]: any }) => element['userHeader']
      );
      const inputColumns = this.trainingInformation.inputColumns;
      const indices = Array.from({ length: headers.length }, (x, i) => i);
      const inputIndices = indices.filter((i) =>
        inputColumns.includes(originalHeaders[i])
      );
      const Xcsv = d3.csvParse(file.target.result, function (d) {
        const result = inputIndices.map((i) => +d[headerCopied[i]]);
        return result;
      });
      const xTest = tf.tensor2d(Xcsv);
      let predictions = loadedModel.predict(xTest);
      predictions = await predictions.data();
      predictions = predictions.map((p: number) => (p >= 0.5 ? 1 : 0));
      return predictions;
    } else {
      console.log('Cannot start testing.');
    }
  }
}

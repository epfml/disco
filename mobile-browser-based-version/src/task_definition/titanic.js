import * as d3 from 'd3';
import * as tf from '@tensorflow/tfjs';
import { checkData } from '../helpers/data_validation_script/helpers-csv-tasks';

/**
 * Dummy class to hold the Titanic Task information
 */
export class TitanicTask {
  constructor() {
    this.displayInformation = displayInformation;
    this.trainingInformation = trainingInformation;
  }
  /**
   * This functions takes as input a file (of type File) uploaded by the reader and checks
   * if the said file meets the constraints requirements and if so prepare the training data.
   * @param {File} file file uploaded by the user
   * @returns an object of the form: {accepted: Boolean, Xtrain: training data, ytrain: data's labels}
   */
  async dataPreprocessing(file, headers) {
    console.log('Start: Processing Uploaded File');
    var Xtrain = null;
    var ytrain = null;

    // Check some basic prop. in the user's uploaded file

    var checkResult = await checkData(file, headers);
    var startTraining = checkResult.accepted;
    var headerCopied = checkResult.userHeader;

    // If user's file respects our format, parse it and start training
    if (startTraining) {
      console.log('User File Validated. Start parsing.');
      console.log(headerCopied);
      let Xcsv = d3.csvParse(
        file.target.result,
        function(d) {
          return [
            +d[headerCopied[0]], // PassengerId
            +d[headerCopied[1]], // Survived
            d[headerCopied[3]] == 'male' ? 1 : 0, // Sex
            +d[headerCopied[4]], // Age
            +d[headerCopied[5]], // SibSp
            +d[headerCopied[6]], // Parch
            +d[headerCopied[8]], // Fare
            +d[headerCopied[11]], // Pclass
          ];
        },
        function(error, rows) {
          console.log(rows);
        }
      );

      let ycsv = d3.csvParse(
        file.target.result,
        function(d) {
          return +d[headerCopied[1]];
        },
        function(error, rows) {
          console.log(rows);
        }
      );

      Xtrain = tf.tensor2d(Xcsv);
      ytrain = tf.tensor1d(ycsv);
      // object to return
    } else {
      console.log('Cannot start training.');
    }
    return { accepted: startTraining, Xtrain: Xtrain, ytrain: ytrain };
  }

  /**
   * Defintion of the model associated to the task
   */
  async createModel() {
    // To be put in a titanic task specific model
    let newModel = tf.sequential();
    newModel.add(
      tf.layers.dense({
        inputShape: [8],
        units: 124,
        activation: 'relu',
        kernelInitializer: 'leCunNormal',
      })
    );
    newModel.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    newModel.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    newModel.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
    const savePathDb = 'indexeddb://working_'.concat(
      trainingInformation.modelId
    );

    // only keep this here
    await newModel.save(savePathDb);
  }
}

/**
 * Object used to contain information about the task in general, the model's limitations
 * and the data accepted by the model
 */
export const displayInformation = {
  // {String} title of the task (keep it short ex: Titanic)
  taskTitle: 'Titanic',
  // {String} informal summary of the task (used by tasks' list)
  summary:
    'In this challenge, we ask you to build a predictive model that answers the question: “what sorts of people were more likely to survive?” using passenger data (ie name, age, gender, socio-economic class, etc...).',
  // {String} simple overview of the task (i.e what is the goal of the model? Why its usefull ...)
  overview:
    'We all know the unfortunate story of the Titanic: this flamboyant new transatlantic boat that sunk in 1912 in the North Atlantic Ocean. Today, we revist this tragedy by trying to predict the survival odds of the passenger given some basic features.',
  // {String} potential limitations of the model
  limitations:
    'The current form of the model does not normalize the given data and applies a very simple pre-processing of the data.',
  // {String} trade-offs of the model
  tradeoffs:
    'We are using a small model for this task: 2 connected layers with few nodes and we are using no optimization techniques implemented. This allows fast training but can yield to poor performance.',
  // {String} information about expected data
  dataFormatInformation:
    'This model takes as input a CSV file with 12 columns. In essence, the data taken as input general information about the passenger (sex, age, name ...) and specific related Titanic data such as the ticket class bought by the passenger, its cabin number ... \n pclass: A proxy for socio-economic status (SES) \n 1st = Upper \n 2nd = Middle \n 3rd = Lower \n \n age: Age is fractional if less than 1. If the age is estimated, is it in the form of xx.5 \n \n sibsp: The dataset defines family relations in this way... \n Sibling = brother, sister, stepbrother, stepsister \n Spouse = husband, wife (mistresses and fiancés were ignored) \n \n parch: The dataset defines family relations in this way.. \n Parent = mother, father \n Child = daughter, son, stepdaughter, stepson \n Some children travelled only with a nanny, therefore parch=0 for them.',
  // {String} description of the datapoint given as example
  dataExampleText:
    'Below one can find an example of a datapoint taken as input by our model. In this datapoint, the person is young man named Owen Harris that unfortunnalty perished with the Titanic. He boarded the boat in South Hamptons and was a 3rd class passenger.',
  // {Array} a simple datapoint given as example. Respect the format
  dataExample: [
    { columnName: 'PassengerId', columnData: '1' },
    { columnName: 'Survived', columnData: '0' },
    { columnName: 'Name', columnData: 'Braund, Mr. Owen Harris' },
    { columnName: 'Sex', columnData: 'male' },
    { columnName: 'Age', columnData: '22' },
    { columnName: 'SibSp', columnData: '1' },
    { columnName: 'Parch', columnData: '0' },
    { columnName: 'Ticket', columnData: '1/5 21171' },
    { columnName: 'Fare', columnData: '7.25' },
    { columnName: 'Cabin', columnData: 'E46' },
    { columnName: 'Embarked', columnData: 'S' },
    { columnName: 'Pclass', columnData: '3' },
  ],
  // {Array} javascript array of the names of the columns given as input
  headers: [
    'PassengerId',
    'Survived',
    'Name',
    'Sex',
    'Age',
    'SibSp',
    'Parch',
    'Ticket',
    'Fare',
    'Cabin',
    'Embarked',
    'Pclass',
  ],
};

/**
 * Object used to contain the model's training specifications
 */
export const trainingInformation = {
  // {String} model's identification name
  modelId: 'titanic-model',
  // {Number} port of the peerjs server
  port: 9000,
  // {Number} number of epoch used for training
  epoch: 10,
  // {Number} validation split
  validationSplit: 0.2,
  // {Number} batchsize
  batchSize: 30,
  // {Object} Compiling information
  modelCompileData: {
    optimizer: 'rmsprop',
    loss: 'binaryCrossentropy',
    metrics: ['accuracy'],
  },
  // {Object} Training information
  modelTrainData: {
    epochs: 10,
  },
  // how much weights must be received before averaging
  threshold: 1,
  // choose between 'csv' and 'images'
  dataType: 'csv',
};

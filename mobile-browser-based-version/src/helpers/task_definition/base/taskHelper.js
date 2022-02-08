/**
 * Abstract Class TaskHelper.
 * Defines the abstract method that any task Helper should have
 * to correctly excute the method in the correding task object
 * in a browser enviroment.
 *
 * @class TaskHelper
 */
export class TaskHelper {
  constructor(task) {
    this.task = task;
    this.context = this.createContext();
  }

  /**
   * Creates a state that can store information across different
   * Vue frames in a reactive way (e.g. updated headers in CSVTrainingFrame.)
   */
  createContext() {
    throw new Error("Method 'createContext()' must be implemented.");
  }
  /**
   * 1. Reads the files in fileselement
   * 2. Uses the task.dataPreprocessing method to preprocess the data and turn the input
   * data into Xtrain and ytain objects.
   * @param {Object | List[Object]} filesElement - file or list of files that should be preprocessed
   */
  dataPreprocessing(filesElement) {
    throw new Error("Method 'dataPreprocessing()' must be implemented.");
  }
  /**
   * 1. Reads the files in fileselement
   * 2. Use the task.predict method to generate predictions
   * 3. Convert them in a text format
   * @param {Object | List[Object]} filesElement
   * @returns Array of prediction (one each data point)
   */
  async makePredictions(filesElement) {
    throw new Error("Method 'makePredictions()' must be implemented.");
  }
  /**
   * Converts the result of 'makePredictions' into csv format
   * @param {Array} predictions
   */
  async predictionsToCsv(predictions) {
    throw new Error("Method 'predictionsToCsv()' must be implemented.");
  }
}

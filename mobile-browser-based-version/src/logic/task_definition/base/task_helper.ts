import { Task } from './task'

/**
 * Abstract Class TaskHelper.
 * Defines the abstract method that any task Helper should have
 * to correctly excute the method in the correding task object
 * in a browser enviroment.
 *
 * @class TaskHelper
 */
export abstract class TaskHelper<T extends Task> {
  task: T;

  constructor (task: T) {
    this.task = task
  }

  /**
   * 1. Reads the files in fileselement
   * 2. Uses the task.dataPreprocessing method to preprocess the data and turn the input
   * data into Xtrain and ytain objects.
   * @param {Object | List[Object]} filesElement - file or list of files that should be preprocessed
   */
  abstract dataPreprocessing(filesElement: any): Promise<{ accepted: Boolean, Xtrain: any, ytrain: any }>;
  /**
   * 1. Reads the files in fileselement
   * 2. Use the task.predict method to generate predictions
   * 3. Convert them in a text format
   * @param {Object | any[]} filesElement
   * @returns Array of prediction (one each data point)
   */
  abstract makePredictions(filesElement : any): Promise<any[]>;
  /**
   * Converts the result of 'makePredictions' into csv format
   * @param {any[]} predictions
   */
  abstract predictionsToCsv(predictions: any[]): Promise<String>;

  /**
   * Checks if the validity of the recieved filesElements
   * @param filesElement - file or list of files that should be preprocessed
   * @returns {accepted: true} if all files meet the requirements
   */
  async preCheckData (filesElement: any): Promise<{ accepted: Boolean, nbAccepted: Number }> {
    // default implementation => always returns true
    return { accepted: true, nbAccepted: 0 }
  }
}

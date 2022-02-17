import { ModelActor } from '../model_actor'
export class Tester extends ModelActor {
  /**
   * Constructor for Tester
   * @param {Task} task - task on which the tasking shall be performed
   * @param {Logger} logger - logging system (e.g. toaster)
   * @param {TaskHelper} helper - helper containing task specific functions (e.g. preprocessing)
   */
  constructor (task, logger, helper) {
    super(task, logger, 1, helper)
  }

  async testModel (downloadPredictions) {
    // callback function that downloads the predictions
    const nbrFiles = this.fileUploadManager.numberOfFiles()
    // Check that the user indeed gave a file
    if (nbrFiles === 0) {
      this.logger.error('Testing aborted. No uploaded file given as input.')
    } else {
      // Assume we only read the first file
      this.logger.success(
        'Thank you for your contribution. Testing has started'
      )
      const filesElement =
        nbrFiles > 1
          ? this.fileUploadManager.getFilesList()
          : this.fileUploadManager.getFirstFile()
      // prediction
      const predictions = await this.taskHelper.makePredictions(filesElement)
      this.logger.success('Predictions are computed available')
      // reset fileloader
      this.fileUploadManager.clear()
      if (predictions) {
        const csvContent = await this.taskHelper.predictionsToCsv(predictions)
        await downloadPredictions(csvContent)
      }
    }
  }
}

export default Tester

import { TaskHelper } from '../base/taskHelper'
import { CsvTask } from './csv_task'

export class CsvTaskHelper extends TaskHelper<CsvTask> {
  loadFile<E> (filesElement, callback): Promise<E> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        // Preprocess the data and get object of the form {accepted: True/False, Xtrain: training data, ytrain: lavels}
        const res = await callback(e)
        resolve(res)
      }
      reader.readAsText(filesElement)
    })
  }

  async dataPreprocessing (filesElement) {
    return this.loadFile<{ accepted: Boolean, Xtrain: any, ytrain: any }>(filesElement, (e) => this.task.dataPreprocessing(e))
  }

  async predictionsToCsv (predictions : any[]) {
    const pred:String = predictions.join('\n')
    const csvContent = this.task.classColumn + '\n' + pred
    return csvContent
  }

  async makePredictions (filesElement): Promise<any[]> {
    return this.loadFile<any[]>(filesElement, (e) => this.task.predict(e))
  }
}

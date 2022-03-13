import { TaskHelper } from '../base/task_helper'
import { TextTask } from './text_task'

export class TextTaskHelper extends TaskHelper<TextTask> {
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
    return this.loadFile<{ accepted: boolean, Xtrain: any, ytrain: any }>(filesElement, (e: any) => this.task.dataPreprocessing(e))
  }

  async predictionsToCsv (predictions: any[]) {
    const pred: string = predictions.join('\n')
    const csvContent = this.task.classColumn + '\n' + pred
    return csvContent
  }

  async makePredictions (filesElement): Promise<any[]> {
    return this.loadFile<any[]>(filesElement, (e: any) => this.task.predict(e))
  }
}

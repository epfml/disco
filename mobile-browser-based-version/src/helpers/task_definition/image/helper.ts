import { TaskHelper } from '../base/taskHelper'
import { ImageTask } from './image_task'

export class ImageTaskHelper extends TaskHelper<ImageTask> {
  async dataPreprocessing (filesElement) {
    return this.task.dataPreprocessing(filesElement)
  }

  async predictionsToCsv (predictions: any[]) {
    let pred = ''
    let headerLength = 0
    // eslint-disable-next-line no-unused-vars
    for (const [id, prediction] of Object.entries(predictions)) {
      headerLength = prediction.length
      pred += `id,${prediction
        .map((dict) => dict.className + ',' + dict.probability)
        .join(',')} \n`
    }
    let header = 'id,'
    for (let i = 1; i <= headerLength; ++i) {
      header += `top ${i},probability${i !== headerLength ? ',' : '\n'}`
    }
    const csvContent = header + pred
    return csvContent
  }

  async makePredictions (filesElement): Promise<any[]> {
    this.task.testing.classes = await this.task.predict(filesElement)
    const ids = Object.keys(this.task.testing.classes)
    let predictions
    if (ids.length === 1) {
      // display results in the component
      this.task.testing.classes = this.task.testing.classes[ids[0]]
      this.task.testing.gotResults = true
    } else {
      predictions = this.task.testing.classes
    }
    return predictions
  }
}

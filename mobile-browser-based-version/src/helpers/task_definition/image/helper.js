import { TaskHelper } from '../task.js';
import {
  checkData,
  getExampleImage,
} from '../../data_validation/helpers_image_tasks.js';

export class ImageTaskHelper extends TaskHelper {
  createContext() {
    this.preCheckData = checkData;
    this.getExampleImage = getExampleImage;
    return {
      testing: {
        classes: [],
        gotResults: false,
      },
    };
  }
  dataPreprocessing(filesElement) {
    return new Promise((resolve, reject) => {
      let processedData = this.task.dataPreprocessing(filesElement);
      resolve(processedData);
    });
  }

  async predictionsToCsv(predictions) {
    let pred = '';
    let header_length = 0;
    for (const [id, prediction] of Object.entries(predictions)) {
      header_length = prediction.length;
      pred += `id,${prediction
        .map((dict) => dict['className'] + ',' + dict['probability'])
        .join(',')} \n`;
    }
    let header = 'id,';
    for (let i = 1; i <= header_length; ++i) {
      header += `top ${i},probability${i != header_length ? ',' : '\n'}`;
    }
    const csvContent = header + pred;
    return csvContent;
  }

  async makePredictions(filesElement) {
    this.context.testing.classes = await this.task.predict(filesElement);
    const ids = Object.keys(this.context.testing.classes);
    var predictions;
    if (ids.length == 1) {
      // display results in the component
      this.context.testing.classes = this.context.testing.classes[ids[0]];
      this.context.testing.gotResults = true;
    } else {
      predictions = this.context.testing.classes;
    }
    return predictions;
  }
}

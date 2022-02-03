import { TaskHelper } from '../task.js';
import { checkData } from '../../data_validation/helpers_image_tasks.js';

export class ImageTaskHelper extends TaskHelper {
  createContext() {
    this.preCheckData = checkData;
    return {};
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
}

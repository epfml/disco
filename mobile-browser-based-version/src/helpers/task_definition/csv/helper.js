import { TaskHelper } from '../task.js';

export class CsvTaskHelper extends TaskHelper {
  createContext() {
    const context = { headers: [] };
    this.task.displayInformation.headers.forEach((item) => {
      context.headers.push({ id: item, userHeader: item });
    });
    context.classColumn = this.task.trainingInformation.outputColumn;
    return context;
  }
  dataPreprocessing(filesElement) {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.onload = async (e) => {
        // Preprocess the data and get object of the form {accepted: True/False, Xtrain: training data, ytrain: lavels}
        var processedData = await this.task.dataPreprocessing(
          e,
          this.context.headers
        );
        resolve(processedData);
      };
      reader.readAsText(filesElement);
    });
  }

  async predictionsToCsv(predictions) {
    let pred = predictions.join('\n');
    const csvContent = this.context.classColumn + '\n' + pred;
    return csvContent;
  }

  async makePredictions(filesElement) {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.onload = async (e) => {
        // Preprocess the data and get object of the form {accepted: True/False, Xtrain: training data, ytrain: lavels}
        var predictions = await this.task.predict(e, this.context.headers);
        resolve(predictions);
      };
      reader.readAsText(filesElement);
    });
  }
}

import type { Model, Task, TaskProvider } from '../index.js'
import { data, models } from '../index.js'

export const wikitext: TaskProvider = {
  getTask (): Task {
    return {
      id: 'wikitext-103',
      displayInformation: {
        taskTitle: 'Language modelling on wikitext',
        summary: {
          preview: 'In this challenge, we ask you to do next word prediction on a dataset of Wikipedia articles.',
          overview: 'Wikitext-103-raw is a dataset comprising unprocessed text excerpts from Wikipedia articles, designed for tasks related to natural language processing and language modeling.'
        },
        dataFormatInformation: 'The dataset is organized as a large text file, with each line representing a segment of raw text from Wikipedia articles.',
        dataExampleText: 'An example excerpt from the dataset could be: "The history of artificial intelligence dates back to ancient times, with philosophical discussions on the nature of thought and reasoning."',
        sampleDatasetLink: 'https://dax-cdn.cdn.appdomain.cloud/dax-wikitext-103/1.0.1/wikitext-103.tar.gz'
      },
      trainingInformation: {
        dataType: 'text',
        modelID: 'wikitext-103-raw-model',
        preprocessingFunctions: [data.TextPreprocessing.Tokenize, data.TextPreprocessing.LeftPadding],
        scheme: 'federated',
        epochs: 5,
        // Unused by wikitext because data already comes split
        // But if set to 0 then the webapp doesn't display the validation metrics
        validationSplit: 0.1, 
        roundDuration: 2,
        batchSize: 1, // If set too high (e.g. 16) then firefox raises a WebGL error
        tokenizer: 'Xenova/gpt2',
        maxSequenceLength: 128,
        tensorBackend: 'gpt'
      }
    }
  },

  getModel (): Promise<Model> {
    return Promise.resolve(new models.GPT())
  }
}

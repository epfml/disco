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
        validationSplit: 0.2, // TODO: is this used somewhere? because train, eval and test are already split in dataset
        epochs: 5,
        scheme: 'federated',
        noiseScale: undefined,
        decentralizedSecure: true,
        minimumReadyPeers: 3,
        maxShareValue: 100,
        roundDuration: 10,
        batchSize: 16,
        tokenizer: 'Xenova/gpt2',
        maxSequenceLength: 128
      }
    }
  },

  getModel (): Promise<Model> {
    return Promise.resolve(new models.GPT())
  }
}

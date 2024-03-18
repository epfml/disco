import type { Model, Task, TaskProvider } from '../index.js'
import { models } from '../index.js'

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
        limitations: 'The dataset may contain noise, inconsistencies, and unstructured content due to its raw nature, potentially posing challenges for certain NLP tasks.',
        tradeoffs: 'The raw format may lack structured annotations and may require additional preprocessing for specific applications.',
        dataFormatInformation: 'The dataset is organized as a large text file, with each line representing a segment of raw text from Wikipedia articles.',
        dataExampleText: 'An example excerpt from the dataset could be: "The history of artificial intelligence dates back to ancient times, with philosophical discussions on the nature of thought and reasoning."'
      },
      trainingInformation: {
        dataType: 'text',
        modelID: 'wikitext-103-raw-model',
        validationSplit: 0.2, // TODO: is this used somewhere? because train, eval and test are already split in dataset
        epochs: 10,
        // constructing a batch is taken care automatically in the dataset to make things faster
        // so we fake a batch size of 1
        batchSize: 1,
        scheme: 'federated',
        noiseScale: undefined,
        decentralizedSecure: true,
        minimumReadyPeers: 3,
        maxShareValue: 100,
        roundDuration: 10
      }
    }
  },

  getModel (): Promise<Model> {
    return Promise.resolve(new models.GPT())
  }
}

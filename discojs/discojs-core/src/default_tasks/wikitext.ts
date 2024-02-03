import { tf, Task, TaskProvider, TrainingSchemes } from '..'
import * as gpt from '../training/models/gpt'
import { TFJSModel, Model } from '../training/model'

const modelConfig: gpt.GPTConfig = {
    modelType: 'gpt-nano',
    epochs: 10,
    maxIter: 10_000,
    batchSize: 4,
    blockSize: 128,
    lr: 0.001,
    vocabSize: 50258, // TODO: think it should be 50257 but somehow the tokenizer sometimes returns 50258, need to test (it appears in tiny-shakespeare)
    evaluate: true,
    maxEvalBatches: 12,
    evaluateEvery: 100,
} as const

export const wikitext: TaskProvider<gpt.GPTConfig> = {
    getTask(): Task<gpt.GPTConfig> {
        return {
            id: 'wikitext-103',
            displayInformation: {
                taskTitle: 'Wikitext 103 Raw',
                summary: {
                    preview:
                        'In this challenge, we ask you to do next word prediction on a dataset of Wikipedia articles.',
                    overview:
                        'Wikitext-103-raw is a dataset comprising unprocessed text excerpts from Wikipedia articles, designed for tasks related to natural language processing and language modeling.',
                },
                limitations:
                    'The dataset may contain noise, inconsistencies, and unstructured content due to its raw nature, potentially posing challenges for certain NLP tasks.',
                tradeoffs:
                    'The raw format may lack structured annotations and may require additional preprocessing for specific applications.',
                dataFormatInformation:
                    'The dataset is organized as a large text file, with each line representing a segment of raw text from Wikipedia articles.',
                dataExampleText:
                    'An example excerpt from the dataset could be: "The history of artificial intelligence dates back to ancient times, with philosophical discussions on the nature of thought and reasoning."',
            },
            trainingInformation: {
                dataType: 'text',
                modelID: 'wikitext-103-raw-model',
                validationSplit: 0.2, // TODO: is this used somewhere? because train, eval and test are already split in dataset
                maxIterations: modelConfig.maxIter,
                epochs: modelConfig.epochs ?? 1,
                // constructing a batch is taken care automatically in the dataset to make things faster
                // so we fake a batch size of 1
                batchSize: 0,
                // this is the real batch size used by the core text loader
                datasetBatchSize: modelConfig.batchSize,
                learningRate: modelConfig.lr,
                modelCompileData: {
                    optimizer: 'adam',
                    loss: 'categoricalCrossentropy',
                    metrics: [], // 'precision', 'mse' ,    'perplexity' doesnt exist
                },
                modelConfig,
                /**
                 * preprocessing is done prior to training so it is not needed in my case
                 * but otherwise, one can use the following template to use a custom tokenizer
                 * and the predefined preprocessing functions
                 */
                // import tokenizer from 'gpt-tokenizer/model/text-davinci-003'
                // ...
                // tokenizer,
                // preprocessingFunctions: [
                //     data.TextPreprocessing.Tokenize,
                //     data.TextPreprocessing.Padding,
                // ],
                // vocabSize: 50258
                // blockSize: 64
                scheme: TrainingSchemes.DECENTRALIZED, // FIXME: FEDERATED / DECENTRALIZED is broken because of Bun I think
                noiseScale: undefined,
                decentralizedSecure: true,
                minimumReadyPeers: 3,
                maxShareValue: 100,
                roundDuration: 10,
            },
        }
    },

    async getModel(): Promise<Model> {
        console.log('[wikitext-103 task] GPT Config:', modelConfig)
        const model = gpt.GPT(modelConfig)
        return new TFJSModel(this.getTask(), model as any as tf.LayersModel)
    },
}

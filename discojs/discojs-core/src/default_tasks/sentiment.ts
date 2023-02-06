import { tf, Task,data, TaskProvider } from '..'

export const titanic: TaskProvider = {
  getTask (): Task {
    return {
      taskID: 'sentiment',
      displayInformation: {
        taskTitle: 'Sentiment',
        summary: {
          preview: "We showcase the ease of applying NLP to Disco with a simple sentiment analysis model.",
          overview: ''
        },
        model: 'We use an LSTM. Long short-term memory (LSTM) networks are the type of recurrent neural network capable of learning order dependence in sequence prediction problems',
        tradeoffs: 'We are using a small model for this task, a basic LSTM does not compare to the large language models we see today based on Transformer architectures.',
        dataFormatInformation: 'This model takes as input a CSV file with 2 columns. The features are the sentences to be classified in the first column, and one of five categorical label between 0 and 4 describing the sentiment. 0 -> negative, 1 -> somewhat negative, 2 -> neutral, 3 -> somewhat positive, 4 -> positive ',
        dataExampleText: 'Below one can find an example of a datapoint taken as input by our model. In this datapoint, the sentence is "I am proud of your achievements". On the testing & validation page, the data should not contain the label column 2 (face_with_tears_of_joy).',
        dataExample: [
          { columnName: 'Phrase', columnData: 'A series of escapades demonstrating the adage that what is good for the goose is also good for the gander , some of which occasionally amuses but none of which amounts to much of a story .' },
          { columnName: 'Sentiment', columnData: '1' }
        ],
        headers: [
          'Phrase',
          'Sentiment'
        ]
      },
      trainingInformation: {
        modelID: 'sentiment-model',
        epochs: 50,
        roundDuration: 10,
        validationSplit: 0,
        batchSize: 30,
        preprocessingFunctions: [data.TextPreprocessing.Tokenize],
        modelCompileData: {
          optimizer: 'adam',
          loss: 'categoricalCrossentropy',
          metrics: ['accuracy']
        },
        dataType: 'tabular',
        inputColumns: [
          'Phrase'
        ],
        outputColumns: [
          'Sentiment'
        ],
        scheme: 'Federated', // secure aggregation not yet implemented for FeAI
        noiseScale: undefined,
        clippingRadius: undefined
      }
    }
  },

  async getModel (): Promise<tf.LayersModel> {
    const maxLength = 64;

    const model = tf.sequential();
    model.add(tf.layers.embedding({
      inputDim: maxLength,
      outputDim: 128,
      inputLength: maxLength
    }));
    model.add(tf.layers.lstm({
      units: 64,
      returnSequences: false
    }));
    model.add(tf.layers.dense({units: 5, activation: 'softmax'}));
    model.name('sentiment')
    return model

  }

}



import * as tf from '@tensorflow/tfjs'

import type { Model, Task, TaskProvider } from '../index.js'
import { data, models } from '../index.js'

export const titanic: TaskProvider = {
  getTask (): Task {
    return {
      id: 'titanic',
      displayInformation: {
        taskTitle: 'Titanic Prediction',
        summary: {
          preview: "The Titanic classification task is one of the main entrypoints into machine learning. Using passenger data (name, age, gender, socio-economic class, etc), the goal is to identify who was more likely to survive the infamous shipwreck.",
          overview: "The original competition can be found on <a  target='_blank' class='underline text-blue-400' href='https://www.kaggle.com/c/titanic'>Kaggle</a> and a link to the training set can be found here <a target='_blank' class='underline text-blue-400' href='https://storage.googleapis.com/deai-313515.appspot.com/example_training_data/titanic_train.csv'>here</a>."
        },
        model: 'The model is a simple 5-layer feedforward network with ReLU activations. The model is optimized with Adam and binary cross-entropy loss. The preprocessing only fills missing value with a placeholder value (0).',
        dataFormatInformation: 'The expected format for the tabular dataset is exactly the same as the sample data provided above or in the Kaggle competition. It is a CSV file with 12 columns. The features are general information about the passenger (sex, age, name, etc.) and specific related Titanic data such as the ticket class bought by the passenger, its cabin number, etc.<br>The first line of the CSV contains the header: "PassengerId, Survived, Pclass, Name, Sex, Age, SibSp, Parch, Ticket, Fare, Cabin, Embarked"<br>Each subsequent row contains passenger data.',
        dataExampleText: "Here's an example of one data point:",
        dataExample: [
          { columnName: 'PassengerId', columnData: '1' },
          { columnName: 'Survived', columnData: '0' },
          { columnName: 'Name', columnData: 'Braund, Mr. Owen Harris' },
          { columnName: 'Sex', columnData: 'male' },
          { columnName: 'Age', columnData: '22' },
          { columnName: 'SibSp', columnData: '1' },
          { columnName: 'Parch', columnData: '0' },
          { columnName: 'Ticket', columnData: '1/5 21171' },
          { columnName: 'Fare', columnData: '7.25' },
          { columnName: 'Cabin', columnData: 'E46' },
          { columnName: 'Embarked', columnData: 'S' },
          { columnName: 'Pclass', columnData: '3' }
        ],
        headers: [
          'PassengerId',
          'Survived',
          'Name',
          'Sex',
          'Age',
          'SibSp',
          'Parch',
          'Ticket',
          'Fare',
          'Cabin',
          'Embarked',
          'Pclass'
        ],
        sampleDatasetLink: "https://storage.googleapis.com/deai-313515.appspot.com/example_training_data/titanic_train.csv",
        sampleDatasetInstructions: 'Opening the link should start downloading a CSV file which you can drag and drop in the field below.'
      },
      trainingInformation: {
        epochs: 10,
        roundDuration: 2,
        validationSplit: 0.2,
        batchSize: 30,
        preprocessingFunctions: [data.TabularPreprocessing.Sanitize],
        dataType: 'tabular',
        inputColumns: [
          'Age',
          'SibSp',
          'Parch',
          'Fare',
          'Pclass'
        ],
        outputColumn: 'Survived',
        scheme: 'federated',
        aggregationStrategy: 'mean',
        minNbOfParticipants: 2,
        tensorBackend: 'tfjs'
      }
    }
  },

  getModel (): Promise<Model<'tabular'>> {
    const model = tf.sequential()

    model.add(
      tf.layers.dense({
        inputShape: [5],
        units: 124,
        activation: 'relu',
        kernelInitializer: 'leCunNormal'
      })
    )
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }))
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }))
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }))

    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    })

    return Promise.resolve(new models.TFJS('tabular', model))
  }
}

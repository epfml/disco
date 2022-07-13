import * as tf from '@tensorflow/tfjs'

import { Task } from '..'

export const task: Task = {
  taskID: 'titanic',
  displayInformation: {
    taskTitle: 'Titanic',
    summary: "Test our platform by using a publicly available <b>tabular</b> dataset. <br><br> Download the passenger list from the Titanic shipwreck <a class='underline text-primary-dark dark:text-primary-light' href='https://www.kaggle.com/c/titanic'>here</a>. <br> This model predicts the type of person most likely to survive/die based on their characteristics (sex, age, class etc.).",
    overview: 'We all know the unfortunate story of the Titanic: this flamboyant new transatlantic boat that sunk in 1912 in the North Atlantic Ocean. Today, we revist this tragedy by trying to predict the survival odds of the passenger given some basic features.',
    model: 'The current form of the model does not normalize the given data and applies a very simple pre-processing of the data.',
    tradeoffs: 'We are using a small model for this task: 2 connected layers with few nodes and we are using no optimization techniques implemented. This allows fast training but can yield to poor performance.',
    dataFormatInformation: 'This model takes as input a CSV file with 12 columns.  general information about the passenger (sex, age, name ...) and specific related Titanic data such as the ticket class bought by the passenger, its cabin number ... \n pclass: A proxy for socio-economic status (SES) \n 1st = Upper \n 2nd = Middle \n 3rd = Lower \n \n age: Age is fractional if less than 1. If the age is estimated, is it in the form of xx.5 \n \n sibsp: The dataset defines family relations in this way... \n Sibling = brother, sister, stepbrother, stepsister \n Spouse = husband, wife (mistresses and fiancés were ignored) \n \n parch: The dataset defines family relations in this way.. \n Parent = mother, father \n Child = daughter, son, stepdaughter, stepson \n Some children travelled only with a nanny, therefore parch=0 for them. <br><br> The first line of the csv contains the header: <br> PassengerId, Survived, Pclass, Name, Sex, Age, SibSp, Parch, Ticket, Fare, Cabin, Embarked <br> Each susequent row contains the corresponding data.',
    dataExampleText: 'Below one can find an example of a datapoint taken as input by our model. In this datapoint, the person is young man named Owen Harris that unfortunnalty perished with the Titanic. He boarded the boat in South Hamptons and was a 3rd class passenger.On the testing page, the data should not contain the class column (Survived).',
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
    ]
  },
  trainingInformation: {
    modelID: 'titanic-model',
    epochs: 20,
    roundDuration: 10,
    validationSplit: 0,
    batchSize: 30,
    preprocessFunctions: [],
    modelCompileData: {
      optimizer: 'rmsprop',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    },
    receivedMessagesThreshold: 1,
    dataType: 'tabular',
    inputColumns: [
      'PassengerId',
      'Age',
      'SibSp',
      'Parch',
      'Fare',
      'Pclass'
    ],
    outputColumns: [
      'Survived'
    ],
    scheme: 'Federated'
  }
}

export function model (): tf.LayersModel {
  const model = tf.sequential()

  model.add(
    tf.layers.dense({
      inputShape: [6],
      units: 124,
      activation: 'relu',
      kernelInitializer: 'leCunNormal'
    })
  )
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }))

  return model
}

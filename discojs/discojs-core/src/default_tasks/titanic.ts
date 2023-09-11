import { tf, training, Task, TaskProvider } from '..'

export const titanic: TaskProvider = {
  getTask (): Task {
    return {
      taskID: 'titanic',
      displayInformation: {
        taskTitle: 'Titanic',
        summary: {
          preview: "Test our platform by using a publicly available <b>tabular</b> dataset. <br><br> Download the passenger list from the Titanic shipwreck here: <a class='underline text-primary-dark dark:text-primary-light' href='https://github.com/epfml/disco/raw/develop/example_training_data/titanic_train.csv'>titanic_train.csv</a> (more info <a class='underline text-primary-dark dark:text-primary-light' href='https://www.kaggle.com/c/titanic'>here</a>). <br> This model predicts the type of person most likely to survive/die in the historic ship accident, based on their characteristics (sex, age, class etc.).",
          overview: 'We all know the unfortunate story of the Titanic: this flamboyant new transatlantic boat that sunk in 1912 in the North Atlantic Ocean. Today, we revist this tragedy by trying to predict the survival odds of the passenger given some basic features.'
        },
        model: 'The current model does not normalize the given data and applies only a very simple pre-processing of the data.',
        tradeoffs: 'We are using a small model for this task: 4 fully connected layers with few neurons. This allows fast training but can yield to reduced accuracy.',
        dataFormatInformation: 'This model takes as input a CSV file with 12 columns. The features are general information about the passenger (sex, age, name, etc.) and specific related Titanic data such as the ticket class bought by the passenger, its cabin number, etc.<br><br>pclass: A proxy for socio-economic status (SES)<br>1st = Upper<br>2nd = Middle<br>3rd = Lower<br><br>age: Age is fractional if less than 1. If the age is estimated, it is in the form of xx.5<br><br>sibsp: The dataset defines family relations in this way:<br>Sibling = brother, sister, stepbrother, stepsister<br>Spouse = husband, wife (mistresses and fiancés were ignored)<br><br>parch: The dataset defines family relations in this way:<br>Parent = mother, father<br>Child = daughter, son, stepdaughter, stepson<br>Some children travelled only with a nanny, therefore parch=0 for them.<br><br>The first line of the CSV contains the header:<br> PassengerId, Survived, Pclass, Name, Sex, Age, SibSp, Parch, Ticket, Fare, Cabin, Embarked<br><br>Each susequent row contains the corresponding data.',
        dataExampleText: 'Below one can find an example of a datapoint taken as input by our model. In this datapoint, the person is young man named Owen Harris that unfortunnalty perished with the Titanic. He boarded the boat in South Hamptons and was a 3rd class passenger. On the testing & validation page, the data should not contain the label column (Survived).',
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
        validationSplit: 0.2,
        batchSize: 30,
        preprocessingFunctions: [],
        modelCompileData: {
          optimizer: 'sgd',
          loss: 'binaryCrossentropy',
          metrics: ['accuracy']
        },
        dataType: 'tabular',
        inputColumns: [
          'Age',
          'SibSp',
          'Parch',
          'Fare',
          'Pclass'
        ],
        outputColumns: [
          'Survived'
        ],
        scheme: 'Federated', // secure aggregation not yet implemented for FeAI
        noiseScale: undefined,
        clippingRadius: undefined
      }
    }
  },

  async getModel (): Promise<training.model.Model> {
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

    return new training.model.TFJSModel(this.getTask(), model)
  }
}

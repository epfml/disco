import * as tf from "@tensorflow/tfjs";

import type { Model, TaskProvider } from "../index.js";
import { models } from "../index.js";

export const titanic: TaskProvider<"tabular", "federated"> = {
  getTask() {
    return Promise.resolve({
      id: "titanic",
      dataType: "tabular",
      displayInformation: {
        title: "Titanic Prediction",
        summary: {
          preview:
            "The Titanic classification task is one of the main entrypoints into machine learning. Using passenger data (name, age, gender, socio-economic class, etc), the goal is to identify who was more likely to survive the infamous shipwreck.",
          overview:
            "The original competition can be found on Kaggle (https://www.kaggle.com/c/titanic) and a link to the training set can be found here: https://storage.googleapis.com/deai-313515.appspot.com/example_training_data/titanic_train.csv",
        },
        model:
          "The model is a simple 5-layer feedforward network with ReLU activations. The model is optimized with Adam and binary cross-entropy loss. The preprocessing only fills missing value with a placeholder value (0).",
        dataFormatInformation:
          'The expected format for the tabular dataset is exactly the same as the sample data provided above or in the Kaggle competition. It is a CSV file with 12 columns. The features are general information about the passenger (sex, age, name, etc.) and specific related Titanic data such as the ticket class bought by the passenger, its cabin number, etc. The first line of the CSV contains the header: "PassengerId, Survived, Pclass, Name, Sex, Age, SibSp, Parch, Ticket, Fare, Cabin, Embarked". Each subsequent row contains passenger data.',
        dataExample: [
          { name: "PassengerId", data: "1" },
          { name: "Survived", data: "0" },
          { name: "Name", data: "Braund, Mr. Owen Harris" },
          { name: "Sex", data: "male" },
          { name: "Age", data: "22" },
          { name: "SibSp", data: "1" },
          { name: "Parch", data: "0" },
          { name: "Ticket", data: "1/5 21171" },
          { name: "Fare", data: "7.25" },
          { name: "Cabin", data: "E46" },
          { name: "Embarked", data: "S" },
          { name: "Pclass", data: "3" },
        ],
        sampleDataset: {
          link: "https://storage.googleapis.com/deai-313515.appspot.com/example_training_data/titanic_train.csv",
          instructions:
            "Opening the link should start downloading a CSV file which you can drag and drop in the field below.",
        },
      },
      trainingInformation: {
        epochs: 10,
        roundDuration: 2,
        validationSplit: 0.2,
        batchSize: 30,
        inputColumns: ["Age", "SibSp", "Parch", "Fare", "Pclass"],
        outputColumn: "Survived",
        scheme: "federated",
        aggregationStrategy: "mean",
        minNbOfParticipants: 2,
        tensorBackend: "tfjs",
      },
    });
  },

  getModel(): Promise<Model<"tabular">> {
    const model = tf.sequential();

    model.add(
      tf.layers.dense({
        inputShape: [5],
        units: 124,
        activation: "relu",
        kernelInitializer: "leCunNormal",
      }),
    );
    model.add(tf.layers.dense({ units: 64, activation: "relu" }));
    model.add(tf.layers.dense({ units: 32, activation: "relu" }));
    model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

    model.compile({
      optimizer: "adam",
      loss: "binaryCrossentropy",
      metrics: ["accuracy"],
    });

    return Promise.resolve(new models.TFJS("tabular", model));
  },

  modelCard: models.cards.TitanicClassifier,
};

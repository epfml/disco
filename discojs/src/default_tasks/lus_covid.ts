import type { TaskProvider } from "#task/index";
import { cards } from "#models/index";

export const lusCovid: TaskProvider<"image", "federated"> = {
  getTask() {
    return Promise.resolve({
      id: "lus_covid",
      dataType: "image",
      displayInformation: {
        title: "Lung Ultrasound Image Classification",
        summary: {
          preview:
            "Medical images are a typical example of data that exists in huge quantity yet that can't be shared due to confidentiality reasons. Medical applications would immensely benefit from training on data currently locked. More data diversity leads to better generalization and bias mitigation.",
          overview:
            "Disco allows data owners to collaboratively train machine learning models using their respective data without any privacy breach. This example problem is about diagnosing whether patients are positive or negative to COVID-19 from lung ultrasounds images. You can find a link to a sample dataset at the next step.",
        },
        model:
          "The model is a simple Convolutional Neural Network composed of two convolutional layers with ReLU activations and max pooling layers, followed by a fully connected output layer. The data preprocessing reshapes images into 100x100 pixels and normalizes values between 0 and 1",
        dataFormatInformation:
          "This model takes as input an image dataset of lung ultrasounds. The images are resized automatically.",
        dataExample:
          "https://storage.googleapis.com/deai-313515.appspot.com/example_training_data/2_QAID_1.masked.reshaped.squared.224.png",
        sampleDataset: {
          link: "https://drive.switch.ch/index.php/s/zM5ZrUWK3taaIly",
          instructions:
            'Opening the link will take you to a Switch Drive folder. You can click on the Download button in the top right corner. Unzip the file and you will get two subfolders: "COVID-" and "COVID+". You can connect the data by using the Group option and selecting each image group in its respective field.',
        },
      },
      trainingInformation: {
        epochs: 50,
        roundDuration: 2,
        validationSplit: 0.2,
        batchSize: 5,
        IMAGE_H: 100,
        IMAGE_W: 100,
        LABEL_LIST: ["COVID-Positive", "COVID-Negative"],
        scheme: "federated",
        aggregationStrategy: "mean",
        minNbOfParticipants: 2,
        tensorBackend: "tfjs",
      },
    });
  },

  // Model architecture from tensorflow.js docs:
  // https://codelabs.developers.google.com/codelabs/tfjs-training-classfication/index.html#4
  modelCard: cards.LUSClassifier,
};
